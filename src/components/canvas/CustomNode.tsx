import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  useStore,
  AppNode,
  CustomNodeData,
  findAncestors,
} from "../../store/useStore";
import {
  Image as ImageIcon,
  Terminal,
  StickyNote,
  Box,
  Palette,
  MoreHorizontal,
  Trash2,
  Copy,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const TYPE_CONFIG = {
  identity: {
    icon: Palette,
    color: "from-pink-500 to-rose-600",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    label: "Marca",
  },
  aiImage: {
    icon: ImageIcon,
    color: "from-purple-500 to-indigo-600",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    label: "IA Visual",
  },
  textPrompt: {
    icon: Terminal,
    color: "from-green-500 to-emerald-600",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    label: "Prompt",
  },
  note: {
    icon: StickyNote,
    color: "from-yellow-400 to-orange-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    label: "Nota",
  },
  placeholder: {
    icon: Box,
    color: "from-slate-400 to-slate-600",
    bg: "bg-slate-500/10",
    border: "border-white/10",
    label: "Esboço",
  },
};

export function CustomNode({ id, data, selected }: NodeProps<AppNode>) {
  const updateNode = useStore((state) => state.updateNode);
  const deleteNode = useStore((state) => state.deleteNode);
  const duplicateNode = useStore((state) => state.duplicateNode);
  const addNode = useStore((state) => state.addNode);
  const addEdge = useStore((state) => state.addEdge);
  const edges = useStore((state) => state.edges);
  const nodes = useStore((state) => state.nodes);

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const config = TYPE_CONFIG[data.type] || TYPE_CONFIG.placeholder;
  const Icon = config.icon;

  const targetEdge = edges.find(
    (e) => e.source === id && (e.sourceHandle === "right" || !e.sourceHandle),
  );
  const targetNode = targetEdge
    ? nodes.find((n) => n.id === targetEdge.target && n.data.type === "aiImage")
    : null;

  const handleRunPrompt = async () => {
    if (data.isGenerating) return;

    const ancestors = findAncestors(
      id,
      useStore.getState().nodes,
      useStore.getState().edges,
    );

    let activeNodeId = targetNode?.id;

    if (!activeNodeId) {
      const currentNode = nodes.find((n) => n.id === id);
      activeNodeId = addNode(
        "aiImage",
        {
          x: (currentNode?.position.x || 0) + 380,
          y: currentNode?.position.y || 0,
        },
        {
          title: "IA SINTETIZANDO...",
          status: "generating",
          isGenerating: true,
        },
      );

      addEdge({
        id: `e-${id}-right-${activeNodeId}-left-${Date.now()}`,
        source: id,
        target: activeNodeId,
        sourceHandle: "right",
        targetHandle: "left",
        type: "bezier",
        animated: true,
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });
    } else {
      updateNode(activeNodeId, { status: "generating", isGenerating: true });
    }

    try {
      updateNode(id, { isGenerating: true, status: "generating" });
      const { generateImage } = await import("../../services/ai");
      const imageUrl = await generateImage(
        data.prompt || data.content || "",
        ancestors,
        data.imageModel || "gemini-3.1-flash-image-preview",
      );

      const nodeData =
        (useStore.getState().nodes.find((n) => n.id === activeNodeId)?.data as Partial<CustomNodeData>) ||
        ({} as Partial<CustomNodeData>);
      const history =
        nodeData.imageHistory ||
        (nodeData.imageUrl ? [nodeData.imageUrl as string] : []);
      const newHistory = [...history, imageUrl];

      updateNode(activeNodeId, {
        imageUrl,
        imageHistory: newHistory,
        historyIndex: newHistory.length - 1,
        title: "SÍNTESE COMPLETA",
        isGenerating: false,
        status: "completed",
      });
      updateNode(id, { isGenerating: false, status: "completed" });
    } catch (e) {
      updateNode(activeNodeId, {
        title: "ERRO DE SÍNTESE",
        isGenerating: false,
        status: "error",
      });
      updateNode(id, { isGenerating: false, status: "error" });
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative min-w-[240px] max-w-[320px] transition-all duration-300 ${
        selected ? "z-[100]" : "z-10"
      }`}
    >
      <div
        className={`overflow-hidden rounded-3xl bg-[#0d0f14]/80 backdrop-blur-3xl border-2 transition-all duration-500 shadow-2xl ${
          selected
            ? "border-blue-500/80 shadow-[0_0_40px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/20"
            : "border-white/5 hover:border-white/20"
        }`}
      >
        <div
          className={`flex items-center justify-between px-4 py-3 border-b border-white/5 ${selected ? "bg-blue-600/5" : "bg-white/[0.02]"}`}
        >
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg group/icon relative overflow-hidden`}
            >
              <Icon className="w-4 h-4 text-white relative z-10" />
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/icon:opacity-100 transition-opacity"></div>
            </motion.div>

            <div className="flex flex-col">
              {isEditingTitle ? (
                <input
                  autoFocus
                  value={data.title}
                  onBlur={() => setIsEditingTitle(false)}
                  onChange={(e) => updateNode(id, { title: e.target.value })}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setIsEditingTitle(false)
                  }
                  className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-[0.2em] text-white w-full"
                />
              ) : (
                <span
                  onDoubleClick={() => setIsEditingTitle(true)}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white cursor-text transition-colors"
                >
                  {data.title || config.label}
                </span>
              )}
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                {config.label} NODE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {data.status === "generating" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
            <div
              className={`w-1.5 h-1.5 rounded-full ${data.status === "completed" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-700"}`}
            ></div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {data.type === "aiImage" && (
            <div className={`relative w-full rounded-2xl bg-black/40 border border-white/5 overflow-hidden group/img group/canvas ${!data.imageUrl ? 'aspect-square flex items-center justify-center' : ''}`}>
              {data.imageUrl ? (
                <>
                  <img
                    src={data.imageUrl}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover transition-all duration-700 group-hover/img:scale-105"
                  />

                  {data.imageHistory && data.imageHistory.length > 1 && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-all z-20 shadow-xl border border-white/10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newIdx = Math.max(
                            0,
                            (data.historyIndex || 0) - 1,
                          );
                          updateNode(id, {
                            historyIndex: newIdx,
                            imageUrl: data.imageHistory![newIdx],
                          });
                        }}
                        disabled={(data.historyIndex || 0) === 0}
                        className="text-white hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] text-white font-mono font-bold tracking-widest">
                        {(data.historyIndex || 0) + 1}/
                        {data.imageHistory.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newIdx = Math.min(
                            data.imageHistory!.length - 1,
                            (data.historyIndex || 0) + 1,
                          );
                          updateNode(id, {
                            historyIndex: newIdx,
                            imageUrl: data.imageHistory![newIdx],
                          });
                        }}
                        disabled={
                          (data.historyIndex || 0) ===
                          data.imageHistory!.length - 1
                        }
                        className="text-white hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-end p-4">
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white transition-all">
                      <Download className="w-3.5 h-3.5" /> Salvar
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-20">
                  <ImageIcon className="w-12 h-12" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    SÍNTESE PENDENTE
                  </span>
                </div>
              )}
            </div>
          )}

          {data.type === "identity" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[10px] font-black uppercase text-pink-500/50 tracking-widest">
                  DIRETRIZES DE MARCA
                </span>
              </div>
              <textarea
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-xs text-slate-300 outline-none focus:border-pink-500/30 transition-all placeholder-slate-700 resize-none min-h-[80px]"
                placeholder="Defina o DNA visual..."
                value={data.content || data.prompt || ""}
                onChange={(e) =>
                  updateNode(id, {
                    content: e.target.value,
                    prompt: e.target.value,
                  })
                }
              />
            </div>
          )}

          {(data.type === "textPrompt" || data.type === "note") && (
            <textarea
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 outline-none focus:border-blue-500/30 transition-all placeholder-slate-700 resize-none min-h-[120px] leading-relaxed"
              placeholder={
                data.type === "textPrompt"
                  ? "Comando para IA..."
                  : "Sua anotação..."
              }
              value={data.prompt || data.content || ""}
              onChange={(e) =>
                updateNode(
                  id,
                  data.type === "textPrompt"
                    ? { prompt: e.target.value }
                    : { content: e.target.value },
                )
              }
            />
          )}
        </div>

        <div className="px-4 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {data.type === "textPrompt" && (
              <>
                <button
                  onClick={handleRunPrompt}
                  disabled={data.isGenerating}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/20 shrink-0"
                >
                  {data.isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  {targetNode ? "Regerar" : "Gerar"}
                </button>
                <select
                  value={data.imageModel || "gemini-2.5-flash"}
                  onChange={(e) =>
                    updateNode(id, { imageModel: e.target.value })
                  }
                  className="bg-black/40 text-[9px] font-bold text-slate-500 rounded-lg border border-white/10 px-2 py-1 outline-none hover:border-blue-500/50 transition-all uppercase tracking-tighter w-full max-w-[105px]"
                >
                  <option value="gemini-2.5-flash">2.5 Flash</option>
                  <option value="gemini-3.1-flash-image-preview">
                    3.1 Image
                  </option>
                  <option value="imagen-3">Imagen 3</option>
                </select>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => duplicateNode(id)}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Duplicar"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteNode(id)}
              className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-[#06070a] !border-2 !border-blue-500/50 !shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all hover:!scale-150"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-[#06070a] !border-2 !border-blue-500/50 !shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all hover:!scale-150"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-[#06070a] !border-2 !border-white/10 transition-all hover:!scale-150"
      />
    </motion.div>
  );
}
