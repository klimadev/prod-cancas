import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
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
  SelectionMode,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore, CustomNodeType } from "../../store/useStore";
import { CustomNode } from "./CustomNode";
import { CustomEdge } from "./CustomEdge";
import {
  Image as ImageIcon,
  Terminal,
  StickyNote,
  Box,
  Palette,
  MousePointer2,
  Hand,
  Keyboard,
  Maximize,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "motion/react";

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

  const [interactionMode, setInteractionMode] = useState<"select" | "pan">(
    "select",
  );

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
    setMenuConfig({
      show: false,
      targetEdgeId: undefined,
      sourceNodeId: undefined,
      sourceHandle: undefined,
    });
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
      sourceHandle: undefined,
    });
  };

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectingNodeId.current = params.nodeId;
    connectingHandleId.current = params.handleId;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      const target = event.target as Element;
      const isPane = target?.classList?.contains("react-flow__pane");

      if ((!connectionState.isValid || isPane) && connectingNodeId.current) {
        justConnected.current = true;
        setTimeout(() => {
          justConnected.current = false;
        }, 200);

        const clientX =
          "changedTouches" in event
            ? event.changedTouches[0].clientX
            : (event as MouseEvent).clientX;
        const clientY =
          "changedTouches" in event
            ? event.changedTouches[0].clientY
            : (event as MouseEvent).clientY;
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
          sourceHandle: connectingHandleId.current || undefined,
        });
      }

      connectingNodeId.current = null;
      connectingHandleId.current = null;
    },
    [screenToFlowPosition, setMenuConfig],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // Check for Ctrl+A or Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        // Select all nodes and edges
        useStore.setState((state) => ({
          nodes: state.nodes.map((node) => ({ ...node, selected: true })),
          edges: state.edges.map((edge) => ({ ...edge, selected: true })),
        }));
      }

      if (e.key.toLowerCase() === "v") {
        setInteractionMode("select");
      } else if (e.key.toLowerCase() === "h") {
        setInteractionMode("pan");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddNode = (type: CustomNodeType) => {
    if (menuConfig.targetEdgeId) {
      insertNodeOnEdge(menuConfig.targetEdgeId, type);
    } else {
      const newNodeId = addNode(type, { x: menuConfig.x, y: menuConfig.y });

      if (menuConfig.sourceNodeId) {
        // Connect to the new node
        const sourceNode = nodes.find((n) => n.id === menuConfig.sourceNodeId);
        const isIdentity = sourceNode?.data.type === "identity";

        const newEdge = {
          id: `e-${menuConfig.sourceNodeId}-${menuConfig.sourceHandle || "right"}-${newNodeId}-left-${Date.now()}`,
          source: menuConfig.sourceNodeId,
          sourceHandle: menuConfig.sourceHandle || "right",
          target: newNodeId,
          targetHandle: "left",
          type: "bezier",
          animated: true,
          style: isIdentity
            ? {
                strokeWidth: 2,
                stroke: "#f472b6",
                filter: "drop-shadow(0 0 4px rgba(244, 114, 182, 0.6))",
                strokeDasharray: "5,5",
              }
            : {
                strokeWidth: 2,
                stroke: "#3b82f6",
                filter: "drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))",
              },
        };
        addEdge(newEdge);
      }
    }

    setMenuConfig({
      show: false,
      targetEdgeId: undefined,
      sourceNodeId: undefined,
      sourceHandle: undefined,
    });
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
        selectionOnDrag={interactionMode === "select"}
        panOnDrag={interactionMode === "pan" ? true : [1, 2]}
        panActivationKeyCode="Space" // Or by holding Space
        multiSelectionKeyCode={["Control", "Meta", "Shift"]} // Multi-select using Ctrl, Cmd or Shift
        selectionMode={SelectionMode.Partial} // Select nodes partially inside selection bounding box
        defaultEdgeOptions={{
          type: "bezier",
          animated: true,
          style: {
            strokeWidth: 2,
            stroke: "url(#edgeGradient)",
            filter: "drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))",
          },
        }}
      >
        <svg className="absolute inset-0 pointer-events-none w-0 h-0">
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                style={{ stopColor: "#3b82f6", stopOpacity: 0.8 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "#60a5fa", stopOpacity: 0.8 }}
              />
            </linearGradient>
          </defs>
        </svg>
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls showInteractive={false} className="hidden" />

        {/* HUD MiniMap */}
        <Panel
          position="bottom-right"
          className="mr-6 mb-8 pointer-events-none"
        >
          <div className="p-2 bg-[#090a0f]/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all hover:bg-[#090a0f]/80 group/minimap ring-1 ring-white/5 pointer-events-auto cursor-pointer">
            <MiniMap
              maskColor="rgba(0,0,0,0.4)"
              style={{
                width: 120,
                height: 80,
                background: "transparent",
              }}
              nodeStrokeWidth={3}
              nodeColor={(n) => {
                if (n.data?.type === "aiImage") return "#a855f7";
                if (n.data?.type === "identity") return "#ec4899";
                if (n.data?.type === "textPrompt") return "#22c55e";
                return "#64748b";
              }}
              className="!m-0 opacity-40 group-hover/minimap:opacity-100 transition-opacity"
            />
          </div>
        </Panel>

        {/* Global HUD Toolbar */}
        <Panel
          position="bottom-center"
          className="mb-10 pointer-events-none flex justify-center !w-full"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
              delay: 0.1,
            }}
            className="flex items-center gap-1.5 p-1.5 bg-[#090a0f]/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/5 pointer-events-auto"
          >
            <div className="flex bg-white/5 rounded-xl p-1 items-center">
              <button
                onClick={() => setInteractionMode("select")}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                  interactionMode === "select"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                title="Ferramenta de Selecionar (V)"
              >
                <MousePointer2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider px-1">
                  Selecionar
                </span>
              </button>
              <button
                onClick={() => setInteractionMode("pan")}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                  interactionMode === "pan"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                title="Mover Câmera (H)"
              >
                <Hand className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider px-1">
                  Mover
                </span>
              </button>
            </div>

            <div className="w-[1px] h-6 bg-white/10 mx-1" />

            <button
              onClick={() => useReactFlow().fitView({ duration: 800 })}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="Ajustar Tela"
            >
              <Maximize className="w-4 h-4" />
            </button>

            <div className="relative group/help">
              <button className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <Keyboard className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-[#090a0f]/95 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all duration-300 min-w-[240px] origin-bottom scale-95 group-hover/help:scale-100 ring-1 ring-white/5 pointer-events-none">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Atalhos
                  </h4>
                </div>
                <div className="flex flex-col gap-2.5 text-[11px] text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      Multiseleção
                    </span>
                    <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[9px]">
                      SHIFT
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      Mover Câmera
                    </span>
                    <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[9px]">
                      ESPAÇO
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      Selecionar Tudo
                    </span>
                    <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[9px]">
                      CTRL+A
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Panel>
      </ReactFlow>

      <AnimatePresence>
        {menuConfig.show && (
          <div
            className="absolute top-0 left-0 z-[150] pointer-events-auto"
            style={{
              transform: `translate(${menuConfig.screenX || 0}px, ${menuConfig.screenY || 0}px)`,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-[#090a0f]/95 backdrop-blur-3xl border border-white/10 p-2 rounded-2xl flex flex-col gap-1 shadow-[0_20px_60px_rgba(0,0,0,0.8)] min-w-[220px] ring-1 ring-white/5"
            >
              <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {menuConfig.sourceNodeId ? "Conectar" : "Adicionar"}
                  </span>
                </div>
              </div>

              {[
                {
                  id: "identity",
                  icon: Palette,
                  label: "Estilo de Marca",
                  color: "#ec4899",
                },
                {
                  id: "aiImage",
                  icon: ImageIcon,
                  label: "Geração Visual",
                  color: "#a855f7",
                },
                {
                  id: "textPrompt",
                  icon: Terminal,
                  label: "Engenharia Prompt",
                  color: "#22c55e",
                },
                {
                  id: "note",
                  icon: StickyNote,
                  label: "Nota Rápida",
                  color: "#eab308",
                },
                {
                  id: "placeholder",
                  icon: Box,
                  label: "Asset / Esboço",
                  color: "#64748b",
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddNode(item.id as any)}
                  className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-all group/item text-left relative overflow-hidden"
                >
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5 group-hover/item:border-white/20 transition-all">
                    <item.icon
                      className="w-3.5 h-3.5"
                      style={{ color: item.color }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 group-hover/item:text-white transition-colors">
                    {item.label}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-white/5 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
