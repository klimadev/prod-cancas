import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from '@xyflow/react';
import { useStore, MenuConfig } from '../../store/useStore';
import { X, Plus } from 'lucide-react';

export function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const deleteEdge = () => {
    useStore.setState((state) => ({ edges: state.edges.filter(e => e.id !== id) }));
  };

  const openInsertMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Open menu near mouse click using screen coordinates
    const bounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    const screenX = e.clientX - (bounds?.left || 0);
    const screenY = e.clientY - (bounds?.top || 0);

    // Open menu at edge center
    useStore.setState({
      menuConfig: {
        show: true,
        x: labelX,
        y: labelY,
        screenX,
        screenY,
        targetEdgeId: id,
        sourceNodeId: source,
      }
    });
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-[#090a0f]/80 backdrop-blur-md border border-white/20 rounded-lg p-1 z-50 shadow-xl"
        >
          <button onClick={openInsertMenu} className="p-1 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Inserir Nó">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-white/20"></div>
          <button onClick={deleteEdge} className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Excluir Conexão">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
