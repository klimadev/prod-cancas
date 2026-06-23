import { useEffect, useState } from "react";
import { CanvasContainer } from "./components/canvas/CanvasContainer";
import { Sidebar } from "./components/sidebar/Sidebar";
import { useStore } from "./store/useStore";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  MessageSquare,
  Plus,
  Folder,
  Share2,
  Zap,
  Trash2,
  History,
  MoreHorizontal,
} from "lucide-react";

export default function App() {
  const {
    initProjectIfNeeded,
    projects,
    currentProjectId,
    loadProject,
    createProject,
    renameProject,
    deleteProject,
    nodes,
  } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    initProjectIfNeeded();
  }, [initProjectIfNeeded]);

  const activeProject = projects.find((p) => p.id === currentProjectId);

  const handleRename = () => {
    if (!activeProject) return;
    const newName = prompt("Nome do projeto:", activeProject.name);
    if (newName && newName.trim()) {
      renameProject(activeProject.id, newName.trim());
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir projeto "${name}" permanentemente?`)) {
      deleteProject(id);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#07080c] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-200 relative">
      {/* Main Viewport */}
      <main className="flex-1 relative flex flex-col min-w-0 transition-all duration-500">
        {/* HUD Superior - Flutuante e Glassmorphism */}
        <header className="absolute top-6 left-6 right-6 z-[100] transition-all duration-500">
          <div className="bg-[#090a0f]/60 backdrop-blur-3xl border border-white/10 rounded-3xl px-6 py-4 flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/5 min-w-0">
            <div className="flex items-center gap-6 shrink-0">
              {/* Logo Section */}
              <div
                className="flex items-center gap-4 group cursor-pointer shrink-0"
                onClick={() => window.location.reload()}
              >
                <motion.button
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/40 relative overflow-hidden group/logo"
                >
                  <Zap className="w-5 h-5 text-white fill-current relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/logo:translate-x-full transition-transform duration-700"></div>
                </motion.button>
                <div className="hidden lg:flex flex-col">
                  <h1 className="text-[14px] font-black uppercase tracking-[0.3em] text-white">
                    NeuralCanvas
                  </h1>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                    SaaS Professional • v2026
                  </span>
                </div>
              </div>

              <div className="hidden lg:block h-6 w-px bg-white/10 shrink-0" />

              {/* Project Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative group/proj-menu">
                  <button className="flex items-center gap-3 px-3 py-1.5 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 group">
                    <div className="flex flex-col items-start translate-y-[1px]">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-left">
                        Projeto Ativo
                      </span>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors max-w-[150px] truncate">
                        {activeProject?.name || "Iniciando..."}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-all group-hover:rotate-180 shrink-0" />
                  </button>

                  {/* Dropdown Projects */}
                  <div className="absolute top-full left-0 mt-3 w-72 bg-[#090a0f]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover/proj-menu:opacity-100 group-hover/proj-menu:visible transition-all z-[110] p-3 ring-1 ring-white/5 origin-top scale-95 group-hover/proj-menu:scale-100">
                    <div className="flex items-center justify-between px-3 py-2 mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
                        Workspaces
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => createProject()}
                        className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-600/30 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar px-1">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 group/item"
                        >
                          <button
                            onClick={() => loadProject(p.id)}
                            className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${p.id === currentProjectId ? "bg-blue-600/10 text-blue-400 border border-blue-500/30" : "hover:bg-white/5 text-slate-500 hover:text-slate-200 border border-transparent"}`}
                          >
                            <span className="truncate max-w-[180px] text-left">
                              {p.name}
                            </span>
                            <span className="text-[9px] opacity-40 font-mono italic">
                              #{p.id.slice(0, 4)}
                            </span>
                          </button>
                          {projects.length > 1 && (
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="p-2 opacity-0 group-hover/item:opacity-100 hover:bg-red-500/10 text-red-500 rounded-xl transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 45 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRename}
                  className="p-2 text-slate-600 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all"
                  title="Renomear Workspace"
                >
                  <History className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="mr-4 hidden items-center gap-6 xl:flex">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">
                    Sincronização
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-green-400">
                    <div className="h-1 w-1 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                    LOCAL-DB
                  </span>
                </div>
              </div>

              {!isSidebarOpen && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSidebarOpen(true)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 transition-all hover:border-white/30 hover:text-white text-slate-400 shadow-lg"
                  title="Abrir Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </div>
        </header>

        <CanvasContainer />
      </main>

      {/* Modern Retractable Sidebar Panel */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: 0.45,
              ease: "easeInOut",
            }}
            className="h-full border-l border-white/5 bg-[#090a0f]/80 backdrop-blur-[60px] z-[90] relative shadow-[-40px_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5 overflow-hidden shrink-0 flex flex-col"
          >
            <div className="w-[360px] h-full flex flex-col shrink-0">
              <Sidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Aesthetics */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[1000] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
    </div>
  );
}

function ChevronDown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
