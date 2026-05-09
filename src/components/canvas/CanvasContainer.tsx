import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  OnConnectStart,
  OnConnectEnd,
  SelectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore, CustomNodeType } from '../../store/useStore';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { Image as ImageIcon, Terminal, StickyNote, Box, Palette, MousePointer2, Hand, Keyboard } from 'lucide-react';
import { v4 as uuidv4 } from "uuid";

const nodeTypes = {
  customNode: CustomNode,
};

const edgeTypes = {
  bezier: CustomEdge,
  default: CustomEdge,
};

function FlowCanvas() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const addNode = useStore((state) => state.addNode);
  const addEdge = useStore((state) => state.addEdge);
  const insertNodeOnEdge = useStore((state) => state.insertNodeOnEdge);
  const menuConfig = useStore((state) => state.menuConfig);
  const setMenuConfig = useStore((state) => state.setMenuConfig);

  const [interactionMode, setInteractionMode] = useState<'select' | 'pan'>('select');

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);
  const justConnected = useRef<boolean>(false);
  
  const handlePaneClick = (e: React.MouseEvent) => {
    if (justConnected.current) {
      justConnected.current = false;
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handlePaneContextMenu(e);
      return;
    }
    setMenuConfig({ show: false, targetEdgeId: undefined, sourceNodeId: undefined, sourceHandle: undefined });
  };

  const handlePaneContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const position = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    const screenX = e.clientX - (bounds?.left || 0);
    const screenY = e.clientY - (bounds?.top || 0);

    setMenuConfig({
      show: true,
      x: position.x,
      y: position.y,
      screenX,
      screenY,
      targetEdgeId: undefined,
      sourceNodeId: undefined,
      sourceHandle: undefined
    });
  };

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectingNodeId.current = params.nodeId;
    connectingHandleId.current = params.handleId;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      const target = event.target as Element;
      const isPane = target?.classList?.contains('react-flow__pane');

      if ((!connectionState.isValid || isPane) && connectingNodeId.current) {
        justConnected.current = true;
        setTimeout(() => { justConnected.current = false; }, 200);

        const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : (event as MouseEvent).clientX;
        const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : (event as MouseEvent).clientY;
        const position = screenToFlowPosition({ x: clientX, y: clientY });
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        const screenX = clientX - (bounds?.left || 0);
        const screenY = clientY - (bounds?.top || 0);
        
        setMenuConfig({
            show: true,
            x: position.x,
            y: position.y,
            screenX,
            screenY,
            sourceNodeId: connectingNodeId.current,
            sourceHandle: connectingHandleId.current || undefined
        });
      }
      
      connectingNodeId.current = null;
      connectingHandleId.current = null;
    },
    [screenToFlowPosition, setMenuConfig]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Check for Ctrl+A or Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        // Select all nodes and edges
        useStore.setState((state) => ({
          nodes: state.nodes.map((node) => ({ ...node, selected: true })),
          edges: state.edges.map((edge) => ({ ...edge, selected: true }))
        }));
      }

      if (e.key.toLowerCase() === 'v') {
        setInteractionMode('select');
      } else if (e.key.toLowerCase() === 'h') {
        setInteractionMode('pan');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddNode = (type: CustomNodeType) => {
    if (menuConfig.targetEdgeId) {
      insertNodeOnEdge(menuConfig.targetEdgeId, type);
    } else {
      const newNodeId = addNode(type, { x: menuConfig.x, y: menuConfig.y });
      
      if (menuConfig.sourceNodeId) {
        // Connect to the new node
        const sourceNode = nodes.find(n => n.id === menuConfig.sourceNodeId);
        const isIdentity = sourceNode?.data.type === "identity";

        const newEdge = {
          id: `e-${menuConfig.sourceNodeId}-${newNodeId}`,
          source: menuConfig.sourceNodeId,
          sourceHandle: menuConfig.sourceHandle || 'right',
          target: newNodeId,
          targetHandle: 'left',
          type: 'bezier',
          animated: true,
          style: isIdentity 
             ? { strokeWidth: 2, stroke: '#f472b6', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.6))', strokeDasharray: '5,5' }
             : { strokeWidth: 2, stroke: '#3b82f6', filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }
        };
        addEdge(newEdge);
      }
    }
    
    setMenuConfig({ show: false, targetEdgeId: undefined, sourceNodeId: undefined, sourceHandle: undefined });
  };

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes as any}
        edges={edges}
        onNodesChange={onNodesChange as any}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onDragOver={onDragOver}
        fitView
        className="bg-transparent"
        minZoom={0.1}
        maxZoom={2}
        selectionOnDrag={interactionMode === 'select'}
        panOnDrag={interactionMode === 'pan' ? true : [1, 2]}
        panActivationKeyCode="Space" // Or by holding Space
        multiSelectionKeyCode={["Control", "Meta", "Shift"]} // Multi-select using Ctrl, Cmd or Shift
        selectionMode={SelectionMode.Partial} // Select nodes partially inside selection bounding box
        defaultEdgeOptions={{
          type: 'bezier',
          animated: true,
          style: { strokeWidth: 2, stroke: 'url(#edgeGradient)', filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' },
        }}
      >
        <svg className="absolute inset-0 pointer-events-none w-0 h-0">
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.8}} />
              <stop offset="100%" style={{stopColor: '#60a5fa', stopOpacity: 0.8}} />
            </linearGradient>
          </defs>
        </svg>
        <Background gap={24} size={2} color="transparent" className="hidden" /> {/* Background handled by app layout */}
        <Controls className="fill-white shadow-md border-white/10 !bg-white/5 backdrop-blur-md [&_button]:!bg-transparent [&_button]:!border-white/10 hover:[&_button]:!bg-white/10" />
        <MiniMap 
          className="rounded-xl border border-white/10 shadow-md !bg-[#090a0f]/80 backdrop-blur-md mask-image-[radial-gradient(ellipse_at_center,black,transparent)]" 
          nodeColor={(n) => {
            if (n.data?.type === 'aiImage') return '#a855f7';
            if (n.data?.type === 'textPrompt') return '#22c55e';
            if (n.data?.type === 'note') return '#eab308';
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
        />

        <Panel position="bottom-center" className="mb-4">
          <div className="flex items-center gap-1 p-1 bg-[#1e1f24]/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl">
            <button
              onClick={() => setInteractionMode('select')}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                interactionMode === 'select'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Ferramenta de Selecionar (V)"
            >
              <MousePointer2 className="w-4 h-4" />
              <span className="text-xs font-semibold px-1">Selecionar</span>
            </button>
            <button
              onClick={() => setInteractionMode('pan')}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                interactionMode === 'pan'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Mover Câmera (H)"
            >
              <Hand className="w-4 h-4" />
              <span className="text-xs font-semibold px-1">Mover</span>
            </button>
            
            <div className="w-px h-6 bg-white/10 mx-1 border-none" />
            
            <div className="relative group">
              <button className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                <Keyboard className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#090a0f]/95 backdrop-blur-3xl border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[220px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Atalhos</h4>
                <div className="flex flex-col gap-2 text-xs text-slate-300">
                  <div className="flex justify-between items-center gap-4">
                    <span>Várias Seleções</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Shift</span>
                      <span>+</span>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Click</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span>Seleção em Caixa</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Arrastar</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span>Selecionar Tudo</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Ctrl</span>
                      <span>+</span>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">A</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span>Mover Câmera</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Espaço</span>
                      <span>+</span>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Arrastar</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span>Menu de Contexto</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Direito</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {menuConfig.show && (
        <div 
           className="absolute top-0 left-0 z-50 pointer-events-auto"
           style={{ 
             transform: `translate(${menuConfig.screenX || 0}px, ${menuConfig.screenY || 0}px)`,
           }}
        >
          <div className="bg-[#090a0f]/95 backdrop-blur-3xl border border-white/10 p-1.5 rounded-xl flex flex-col gap-0.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] min-w-[200px] animate-in fade-in zoom-in-95 duration-100 ease-out origin-top-left">
            <div className="px-3 py-2 select-none flex justify-between items-center mb-1 border-b border-white/5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
                {menuConfig.sourceNodeId ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ring-2 ring-blue-500/30" /> Conectando</>
                ) : menuConfig.targetEdgeId ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ring-2 ring-green-500/30" /> Inserindo Nó</>
                ) : (
                  'Adicionar Nó'
                )}
              </span>
            </div>
            <button onClick={() => handleAddNode('identity')} className="flex items-center gap-3 p-2 hover:bg-pink-500/10 text-slate-300 rounded-lg transition-all w-full text-left group">
              <div className="bg-[#1e1f24] p-1.5 rounded-md group-hover:bg-transparent transition-colors border border-white/5 group-hover:border-transparent">
                <Palette className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <span className="text-xs font-medium tracking-wide">Identidade / Estilo</span>
            </button>
            <button onClick={() => handleAddNode('aiImage')} className="flex items-center gap-3 p-2 hover:bg-purple-500/10 text-slate-300 rounded-lg transition-all w-full text-left group">
               <div className="bg-[#1e1f24] p-1.5 rounded-md group-hover:bg-transparent transition-colors border border-white/5 group-hover:border-transparent">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-xs font-medium tracking-wide">Nó de Imagem</span>
            </button>
            <button onClick={() => handleAddNode('textPrompt')} className="flex items-center gap-3 p-2 hover:bg-green-500/10 text-slate-300 rounded-lg transition-all w-full text-left group">
               <div className="bg-[#1e1f24] p-1.5 rounded-md group-hover:bg-transparent transition-colors border border-white/5 group-hover:border-transparent">
                <Terminal className="w-3.5 h-3.5 text-green-400" />
              </div>
              <span className="text-xs font-medium tracking-wide">Nó de Prompt</span>
            </button>
            <button onClick={() => handleAddNode('note')} className="flex items-center gap-3 p-2 hover:bg-yellow-500/10 text-slate-300 rounded-lg transition-all w-full text-left group">
               <div className="bg-[#1e1f24] p-1.5 rounded-md group-hover:bg-transparent transition-colors border border-white/5 group-hover:border-transparent">
                <StickyNote className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <span className="text-xs font-medium tracking-wide">Nó de Nota</span>
            </button>
            <div className="my-1 border-t border-white/5" />
            <button onClick={() => handleAddNode('placeholder')} className="flex items-center gap-3 p-2 hover:bg-white/10 text-slate-400 rounded-lg transition-all w-full text-left group">
               <div className="bg-[#1e1f24] p-1.5 rounded-md group-hover:bg-transparent transition-colors border border-white/5 group-hover:border-transparent">
                <Box className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-xs font-medium tracking-wide">Esboço</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CanvasContainer() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
