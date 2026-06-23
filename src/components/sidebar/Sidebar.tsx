import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../../store/useStore";
import { 
  Send, 
  Bot, 
  Sparkles, 
  Image as ImageIcon, 
  MessageSquare, 
  Layers, 
  Plus, 
  User as UserIcon,
  ChevronDown,
  PanelRightClose,
} from "lucide-react";
import { processPromptWithContext, generateImage } from "../../services/ai";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";

type Tab = "chat" | "assets";

interface SidebarProps {
  onCollapse?: () => void;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const [activeTab, setActiveTab ] = useState<Tab>("chat");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Olá! Sou seu Arquiteto de IA. Selecione nós no canvas para que eu possa usá-los como contexto para gerar prompts ou imagens." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const addNode = useStore((state) => state.addNode);
  const chatModel = useStore((state) => state.chatModel);
  const setChatModel = (model: string) => useStore.setState({ chatModel: model });

  const selectedNodes = nodes.filter((n) => n.selected);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const isImageCommand = input.toLowerCase().startsWith("/generate") || input.toLowerCase().startsWith("/image");
    const userMessage = input;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      if (isImageCommand) {
        const generationPrompt = userMessage.replace(/^\/(generate|image)/i, '').trim();
        setMessages((prev) => [...prev, { role: "ai", content: `✨ **Iniciando síntese visual:** "${generationPrompt}"...` }]);
        
        const imageUrl = await generateImage(generationPrompt, selectedNodes, "gemini-3.1-flash-image-preview");
        
        addNode("aiImage", { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 }, {
          title: "IA Gerada",
          imageUrl,
        });

        setMessages((prev) => [...prev, { role: "ai", content: "Processamento concluído. Nó de imagem injetado no canvas. ✨" }]);
      } else {
        const response = await processPromptWithContext(userMessage, selectedNodes, edges, chatModel);
        setMessages((prev) => [...prev, { role: "ai", content: response }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: "🔴 **Erro de processamento:** Não foi possível completar a operação." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-black/20 overflow-hidden relative">
      <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header Info */}
          <div className="px-4 py-3 bg-blue-500/5 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-500/20"></div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">IA Conectada</span>
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="bg-black/40 text-[9px] font-bold text-slate-500 rounded-lg border border-white/10 px-2.5 py-1 outline-none hover:border-blue-500/50 transition-all uppercase tracking-tighter"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
              >
                <option value="gemini-2.0-flash">Hyper Flash (2.0)</option>
                <option value="gemini-1.5-pro">Deep Pro (1.5)</option>
              </select>
              {onCollapse && (
                <button
                  onClick={onCollapse}
                  className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-lg transition-all"
                  title="Fechar Chat"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                key={idx} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${msg.role === 'ai' ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-800 border-white/10'}`}>
                  {msg.role === 'ai' ? <Bot className="w-4 h-4 text-blue-400" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 text-slate-300 rounded-tl-none backdrop-blur-md'}`}>
                  <div className="prose prose-sm prose-invert max-w-none prose-p:leading-snug prose-p:my-1">
                     <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context Selector Overlay */}
          {selectedNodes.length > 0 && (
            <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 backdrop-blur-xl shrink-0 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-black uppercase text-blue-300 tracking-widest">Contexto Ativo ({selectedNodes.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {selectedNodes.map(node => (
                  <div key={node.id} className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 py-1 gap-2 shrink-0 max-w-[120px]">
                    <span className="text-[10px] text-slate-400 truncate font-semibold uppercase">{node.data.title as string || 'Nó'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-[#090a0f]/60 backdrop-blur-xl border-t border-white/5 shrink-0 relative z-20">
            <div className="relative flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl focus-within:border-blue-500/50 focus-within:bg-white/10 transition-all p-2 pr-2 ring-1 ring-white/5 shadow-lg shadow-black/20 group/input">
               <textarea
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Comando neural..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-200 p-2 resize-none max-h-32 placeholder-slate-600 custom-scrollbar leading-relaxed"
              />
              <div className="flex flex-col gap-1 pb-1 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className={`p-2 rounded-xl transition-all ${isLoading || !input.trim() ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'}`}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            <p className="mt-3 text-[9px] text-slate-600 text-center uppercase tracking-[0.2em] font-black opacity-30">
               /IMAGE PARA GERAR • CTRL+ENTER NOVA LINHA
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

