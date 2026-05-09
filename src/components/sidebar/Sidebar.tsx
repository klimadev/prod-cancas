import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import { Send, Bot, Sparkles, Image as ImageIcon } from "lucide-react";
import { processPromptWithContext, generateImage } from "../../services/ai";
import Markdown from "react-markdown";

export function Sidebar() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Olá! Posso ajudar a gerar imagens ou debater ideias com base no contexto do seu canvas. Selecione os nós para incluí-los no contexto!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const addNode = useStore((state) => state.addNode);
  const chatModel = useStore((state) => state.chatModel);

  const selectedNodes = nodes.filter((n) => n.selected);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Check if it's an explicit image generation command
    const isImageCommand = input.toLowerCase().startsWith("/generate") || input.toLowerCase().startsWith("/image");

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      if (isImageCommand) {
        const generationPrompt = userMessage.replace(/^\/(generate|image)/i, '').trim();
        setMessages((prev) => [...prev, { role: "ai", content: `Gerando imagem para: "${generationPrompt}"...` }]);
        
        const imageUrl = await generateImage(generationPrompt, selectedNodes, "gemini-3.1-flash-image-preview");
        
        // Add node to center of screen roughly
        addNode("aiImage", { x: window.innerWidth / 2, y: window.innerHeight / 2 }, {
          title: "IA Gerada",
          imageUrl,
        });

        setMessages((prev) => [...prev, { role: "ai", content: "Imagem gerada e adicionada ao canvas! ✨" }]);
      } else {
        const response = await processPromptWithContext(userMessage, selectedNodes, edges, chatModel);
        setMessages((prev) => [...prev, { role: "ai", content: response }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: "Ops, ocorreu um erro ao processar sua solicitação." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-72 h-full glass-card flex flex-col z-50 border-y-0 border-r-0 border-l border-white/10 relative">
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa]"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Arquiteto de IA</span>
        </div>
        <select 
          className="bg-black/30 text-[10px] text-slate-300 rounded border border-white/10 px-2 py-1 outline-none w-28"
          value={useStore.getState().chatModel || "gemini-3.1-flash-lite"}
          onChange={(e) => useStore.setState({ chatModel: e.target.value })}
          title="Chat Model"
        >
          <option value="gemini-3.1-flash-lite">Flash Lite (3.1)</option>
          <option value="gemini-flash-latest">Flash (Latest)</option>
          <option value="gemini-3.1-pro-preview">Pro (3.1)</option>
        </select>
      </div>

      {/* Selected Context Indicator */}
      {selectedNodes.length > 0 && (
        <div className="px-3 py-3 bg-blue-500/5 border-b border-blue-500/20 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 opacity-80">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">
              Contexto Anexado ({selectedNodes.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
            {selectedNodes.map(n => (
              <div key={n.id} className="flex flex-col bg-white/5 border border-white/10 rounded overflow-hidden max-w-[80px]">
                {n.data.type === 'aiImage' && n.data.imageUrl ? (
                  <img src={n.data.imageUrl as string} className="w-full h-8 object-cover" />
                ) : n.data.type === 'identity' && n.data.imageUrl ? (
                  <img src={n.data.imageUrl as string} className="w-full h-8 object-cover opacity-80" />
                ) : null}
                <div className="text-[9px] text-slate-300 truncate px-1.5 py-1 whitespace-nowrap" title={n.data.title as string}>
                  {n.data.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[90%] ${
              msg.role === "user" ? "self-end items-end" : "self-start items-start"
            }`}
          >
            <div
              className={`px-4 py-2.5 rounded-lg border text-sm ${
                msg.role === "user"
                  ? "bg-blue-600/20 border-blue-500/20 text-slate-200 rounded-br-none shadow-sm"
                  : "bg-white/5 border-white/10 text-slate-300 rounded-bl-none"
              }`}
            >
              {msg.role === "ai" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-snug prose-p:my-1 text-slate-300">
                  <Markdown>{msg.content}</Markdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="self-start flex gap-2 items-center text-sm bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg rounded-bl-none">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></span>
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Mensagem para IA..."
            className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pl-4 pr-12 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-all resize-none overflow-hidden h-10 placeholder-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1.5 p-1.5 text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 text-center px-4">
          Dica: Use <span className="font-mono bg-white/5 px-1 py-0.5 rounded text-white/50">/image [prompt]</span> para gerar diretamente.
        </div>
      </div>
    </aside>
  );
}
