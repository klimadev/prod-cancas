import React from "react";
import { Handle, Position, NodeProps, addEdge, Node } from "@xyflow/react";
import { CustomNodeData, useStore, AppNode } from "../../store/useStore";
import { cn } from "../../lib/utils";
import { Image as ImageIcon, FileText, StickyNote, Box, Terminal, Edit3, Type, Play, Trash2, Copy, Loader2, Palette } from "lucide-react";

export function CustomNode({
  id,
  data,
  selected,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<AppNode> & { positionAbsoluteX?: number; positionAbsoluteY?: number }) {
  const updateNode = useStore((state) => state.updateNode);
  const deleteNode = useStore((state) => state.deleteNode);
  const duplicateNode = useStore((state) => state.duplicateNode);

  const [isHovered, setIsHovered] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(data.title);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    updateNode(id, { title: titleValue });
  };

  const getIcon = () => {
    switch (data.type) {
      case "aiImage":
        return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case "placeholder":
        return <Box className="w-4 h-4 text-blue-500" />;
      case "textPrompt":
        return <Terminal className="w-4 h-4 text-green-500" />;
      case "note":
        return <StickyNote className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div
      className={cn(
        "relative w-64 glass-card rounded-xl transition-all duration-200 z-20",
        selected ? "node-active" : 
        data.status === "unseen" ? "border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]" :
        data.isGenerating ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-pulse" : "border-white/5 hover:border-white/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => {
        // e.preventDefault(); // Uncomment to build a custom right-click menu
      }}
    >
      {/* Handles N, S, W, E */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={cn("port transition-opacity", !isHovered && !selected ? "opacity-20" : "opacity-100")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn("port transition-opacity", !isHovered && !selected ? "opacity-20" : "opacity-100")}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={cn("port transition-opacity", !isHovered && !selected ? "opacity-20" : "opacity-100")}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={cn("port transition-opacity", !isHovered && !selected ? "opacity-20" : "opacity-100")}
      />

      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {getIcon()}
          {isEditingTitle ? (
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-[10px] uppercase font-bold tracking-widest text-slate-300 w-[120px]"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
            />
          ) : (
            <span
              className={cn(
                "text-[10px] uppercase font-bold tracking-widest cursor-text hover:text-slate-300 transition-colors",
                data.status === "completed" || data.status === "unseen" ? "text-green-400" : "text-slate-400"
              )}
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              {data.title}
            </span>
          )}
        </div>
        {data.isGenerating && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse hidden sm:block"></div>
        )}
        {data.status === "unseen" && (
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
        )}
      </div>

      {/* Body Content */}
      <div 
        className="p-4 flex flex-col gap-3 group"
        onClick={() => {
          if (data.status === "unseen") {
            updateNode(id, { status: "completed" });
          }
        }}
      >
        {data.type === "aiImage" && (
          <div className="w-full aspect-video bg-black/40 flex items-center justify-center relative rounded-xl overflow-hidden group-hover:bg-black/50 transition-colors">
            {data.isGenerating ? (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center">
                 <div className="text-center z-10 w-full px-4">
                    <div className="text-[10px] text-white/50 mb-1">Gerando...</div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-full animate-pulse [animation-duration:1s]"></div>
                    </div>
                  </div>
              </div>
            ) : data.imageUrl ? (
              <img src={data.imageUrl} alt="IA Gerada" className="w-full h-full object-cover relative z-10" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40">
                Sem Imagem
              </div>
            )}
          </div>
        )}

        {(data.type === "textPrompt" || data.type === "note") && (
          <textarea
            className="w-full bg-black/20 rounded-xl p-3 text-sm text-slate-300 placeholder-white/30 border border-white/5 outline-none focus:border-blue-500/50 resize-none transition-all leading-relaxed"
            rows={4}
            placeholder={data.type === "textPrompt" ? "Digite o prompt..." : "Faça uma anotação..."}
            value={data.type === "textPrompt" ? data.prompt : data.content}
            onChange={(e) => 
              updateNode(id, data.type === "textPrompt" ? { prompt: e.target.value } : { content: e.target.value })
            }
          />
        )}

        {data.type === "placeholder" && (
          <div className="w-full h-24 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-xs font-semibold text-white/40 bg-white/5">
            Solte o arquivo aqui
          </div>
        )}

        {data.type === "identity" && (
          <div className="w-full flex flex-col gap-2">
			      <div className="w-full flex items-center gap-2 mb-1 group/ident cursor-text">
				      <Palette className="w-4 h-4 text-pink-400 group-hover/ident:scale-110 transition-transform" />
				      <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">Identidade de Estilo</span>
			      </div>
            <textarea
              className="w-full h-16 bg-black/20 text-slate-300 text-xs p-2 rounded-lg outline-none resize-none placeholder-slate-500 border border-transparent focus:border-pink-500/30 transition-all pointer-events-auto"
              placeholder="Diretrizes de marca, humor, estilo..."
              value={data.prompt || ""}
              onChange={(e) => updateNode(id, { prompt: e.target.value })}
            />
            {data.imageUrl ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden group/img">
                <img src={data.imageUrl} alt="Referência" className="w-full h-full object-cover" />
                <button 
                  onClick={() => updateNode(id, { imageUrl: undefined })}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold tracking-wider text-pink-200 uppercase pointer-events-auto shadow-inner"
                >
                  Remover Imagem
                </button>
              </div>
            ) : (
              <div 
                className="w-full h-12 border-2 border-dashed border-pink-500/20 bg-pink-500/5 rounded-lg flex flex-col items-center justify-center text-[10px] text-pink-300/60 cursor-pointer hover:bg-pink-500/10 hover:border-pink-500/40 transition-colors pointer-events-auto"
                onClick={() => {
                   const url = prompt("Insira a URL da imagem de referência:");
                   if (url) updateNode(id, { imageUrl: url });
                }}
              >
                <span className="font-semibold tracking-wide">Adicionar Imagem</span>
                <span className="text-[8px] opacity-70">Clique para colar a URL</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar (Visible on Hover/Select) */}
      {(isHovered || selected) && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 glass-card px-3 py-1.5 rounded-xl flex items-center gap-2">
          {data.type === "textPrompt" && (
             <>
               <select 
                 className="bg-black/30 text-[10px] text-slate-300 rounded border border-white/10 px-2 py-1 outline-none"
                 value={data.imageModel || 'gemini-2.5-flash-image'}
                 onChange={(e) => updateNode(id, { imageModel: e.target.value })}
                 title="Modelo de Geração de Imagem"
               >
                  <option value="gemini-2.5-flash-image">Nano Banana (2.5 Flash)</option>
                  <option value="gemini-3.1-flash-image-preview">Flash Image (3.1)</option>
                  <option value="gemini-3-pro-image-preview">Pro Image (3.0)</option>
               </select>
               <button 
                  className={cn("p-1.5 rounded-lg transition-colors", data.isGenerating ? "text-slate-500 cursor-not-allowed" : "hover:bg-white/10 text-blue-400")} 
                  title="Executar Prompt"
                  disabled={data.isGenerating}
                  onClick={async () => {
                    const addNode = useStore.getState().addNode;
                    
                    // Pre-create the node and edge
                    const newNodeId = addNode('aiImage', { x: (positionAbsoluteX || 0) + 320, y: (positionAbsoluteY || 0) }, {
                      title: "Gerando Imagem...",
                      status: "generating",
                      isGenerating: true,
                    });
                      
                    const newEdge = { 
                       id: "e-" + id + "-" + newNodeId, 
                       source: id, 
                       target: newNodeId, 
                       targetHandle: 'left', 
                       sourceHandle: 'right', 
                       type: "bezier", 
                       animated: true,
                       style: { strokeWidth: 2, stroke: 'url(#edgeGradient)', filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }
                    };
                    useStore.getState().addEdge(newEdge);

                    try {
                      updateNode(id, { isGenerating: true, status: "generating" });
                      const { generateImage } = await import('../../services/ai');
                      const imageUrl = await generateImage(data.prompt || "", [], data.imageModel || "gemini-2.5-flash-image");
                      
                      updateNode(newNodeId, {
                        imageUrl,
                        title: "Imagem Gerada",
                        isGenerating: false,
                        status: "unseen" // Mark as new so user notices it
                      });
                    } catch (e) {
                      console.error("Falha ao gerar", e);
                      updateNode(id, { status: "error" });
                      updateNode(newNodeId, { title: "Erro na Geração", isGenerating: false, status: "error" });
                    } finally {
                      updateNode(id, { isGenerating: false });
                    }
                  }}
               >
                 {data.isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
              </>
           )}
           <button className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors" title="Duplicar" onClick={() => duplicateNode(id)}>
             <Copy className="w-4 h-4" />
           </button>
           <button className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Excluir" onClick={() => deleteNode(id)}>
             <Trash2 className="w-4 h-4" />
           </button>
         </div>
       )}
    </div>
  );
}
