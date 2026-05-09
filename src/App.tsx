/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { CanvasContainer } from "./components/canvas/CanvasContainer";
import { Sidebar } from "./components/sidebar/Sidebar";
import { useStore } from "./store/useStore";

export default function App() {
  const { initProjectIfNeeded, projects, currentProjectId, loadProject, createProject, renameProject, deleteProject } = useStore();

  useEffect(() => {
    initProjectIfNeeded();
  }, [initProjectIfNeeded]);

  const activeProject = projects.find(p => p.id === currentProjectId);

  const handleRename = () => {
    if (!activeProject) return;
    const newName = prompt("Nome do projeto:", activeProject.name);
    if (newName && newName.trim()) {
      renameProject(activeProject.id, newName.trim());
    }
  };

  const handleDelete = () => {
    if (!activeProject) return;
    if (confirm(`Tem certeza que deseja excluir o projeto "${activeProject.name}"?`)) {
      deleteProject(activeProject.id);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#090a0f] text-slate-200 font-sans overflow-hidden flex flex-col select-none relative">
      <div className="absolute inset-0 mesh-gradient pointer-events-none z-0"></div>
      <div className="absolute inset-0 dot-pattern pointer-events-none z-0"></div>

      {/* Topbar */}
      <nav className="h-14 flex items-center justify-between px-6 glass-card z-50 relative">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white italic">F</div>
          <div className="h-4 w-[1px] bg-white/10"></div>
          
          <div className="flex items-center gap-2 group">
             <button onClick={handleRename} className="font-medium text-sm tracking-wide hover:bg-white/10 px-2 py-1 rounded transition-colors" title="Renomear Projeto">
               {activeProject?.name || "Carregando..."}
             </button>
             <select 
               className="bg-transparent text-xs opacity-50 hover:opacity-100 outline-none w-4 shadow-none" 
               value={currentProjectId || ""}
               onChange={(e) => {
                 if (e.target.value === "new") {
                   createProject();
                 } else {
                   loadProject(e.target.value);
                 }
               }}
               title="Trocar Projeto"
             >
               {projects.map(p => (
                 <option key={p.id} value={p.id} className="bg-[#1e1f24] text-white py-1">{p.name}</option>
               ))}
               <option value="new" className="bg-[#1e1f24] text-blue-400 font-semibold">+ Novo Projeto</option>
             </select>
             {projects.length > 1 && (
                <button onClick={handleDelete} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 text-xs" title="Excluir Projeto">Excluir</button>
             )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 rounded-md p-1 border border-white/5">
            <button className="px-3 py-1 hover:bg-white/10 rounded text-xs">Desfazer</button>
            <button className="px-3 py-1 hover:bg-white/10 rounded text-xs opacity-50">Refazer</button>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors">Exportar Grafo</button>
        </div>
      </nav>

      <main className="flex-1 flex relative">
        {/* Main Canvas Area */}
        <div className="flex-1 relative z-10 w-full h-full">
          <CanvasContainer />
        </div>

        {/* Right Sidebar */}
        <Sidebar />
      </main>

      {/* Visual Indicators Footer */}
      <div className="h-6 bg-blue-600/10 border-t border-white/5 flex items-center px-4 justify-between text-[10px] text-white/40 z-50 relative">
        <div className="flex items-center gap-4">
          <span>GPU: A100-80GB (Ativa)</span>
          <span>Latência: 142ms</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Zoom: 100%</span>
          <span>Projeto: {activeProject?.name || "..."}</span>
        </div>
      </div>
    </div>
  );
}
