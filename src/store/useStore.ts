import { create } from "zustand";
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as xyflowAddEdge,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { persist } from "zustand/middleware";

export type CustomNodeType = "aiImage" | "placeholder" | "textPrompt" | "note" | "identity";

export interface CustomNodeData extends Record<string, unknown> {
  title: string;
  type: CustomNodeType;
  content?: string;
  imageUrl?: string;
  prompt?: string;
  isGenerating?: boolean;
  imageModel?: string;
  status?: "idle" | "generating" | "completed" | "error" | "unseen";
}

export type AppNode = Node<CustomNodeData>;

export interface MenuConfig {
  show: boolean;
  x: number;
  y: number;
  screenX?: number;
  screenY?: number;
  sourceNodeId?: string;
  sourceHandle?: string;
  targetEdgeId?: string;
}

export interface ProjectData {
   id: string;
   name: string;
   nodes: AppNode[];
   edges: Edge[];
   updatedAt: number;
}

interface AppState {
  projects: ProjectData[];
  currentProjectId: string | null;

  nodes: AppNode[];
  edges: Edge[];
  chatModel: string;
  menuConfig: MenuConfig;

  loadProject: (id: string) => void;
  createProject: (name?: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  initProjectIfNeeded: () => void;

  setMenuConfig: (config: Partial<MenuConfig>) => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addEdge: (edge: Edge) => void;
  addNode: (type: CustomNodeType, position: { x: number; y: number }, data?: Partial<CustomNodeData>) => string;
  insertNodeOnEdge: (edgeId: string, type: CustomNodeType) => string;
  updateNode: (id: string, data: Partial<CustomNodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
}

const syncProject = (state: AppState, newNodes?: AppNode[], newEdges?: Edge[]) => {
  if (!state.currentProjectId) return {};
  const nodes = newNodes || state.nodes;
  const edges = newEdges || state.edges;
  
  return {
    projects: state.projects.map(p => 
      p.id === state.currentProjectId 
        ? { ...p, nodes, edges, updatedAt: Date.now() }
        : p
    ),
    nodes,
    edges
  };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      nodes: [],
      edges: [],
      chatModel: "gemini-3.1-flash-lite",
      menuConfig: { show: false, x: 0, y: 0 },

      initProjectIfNeeded: () => {
        const state = get();
        if (state.projects.length === 0) {
          if (state.nodes.length > 0) {
            const id = uuidv4();
            set({
              projects: [{ id, name: "Projeto Original", nodes: state.nodes, edges: state.edges, updatedAt: Date.now() }],
              currentProjectId: id,
            });
          } else {
             get().createProject("Novo Projeto");
          }
        } else if (!state.currentProjectId) {
           get().loadProject(state.projects[0].id);
        }
      },

      loadProject: (id) => {
        const project = get().projects.find(p => p.id === id);
        if (project) {
          set({ currentProjectId: id, nodes: project.nodes, edges: project.edges });
        }
      },

      createProject: (name = "Novo Projeto") => {
        const id = uuidv4();
        const newProject: ProjectData = {
          id, name, nodes: [], edges: [], updatedAt: Date.now()
        };
        set(state => ({
          projects: [...state.projects, newProject],
          currentProjectId: id,
          nodes: [],
          edges: [],
        }));
      },

      renameProject: (id, name) => {
        set(state => ({
          projects: state.projects.map(p => p.id === id ? { ...p, name, updatedAt: Date.now() } : p)
        }));
      },

      deleteProject: (id) => {
        set(state => {
          const newProjects = state.projects.filter(p => p.id !== id);
          if (newProjects.length === 0) {
             const newId = uuidv4();
             const newProject: ProjectData = {
                id: newId, name: "Novo Projeto", nodes: [], edges: [], updatedAt: Date.now()
             };
             return { projects: [newProject], currentProjectId: newId, nodes: [], edges: [] };
          }
          if (state.currentProjectId === id) {
             const nextProject = newProjects[0];
             return { projects: newProjects, currentProjectId: nextProject.id, nodes: nextProject.nodes, edges: nextProject.edges };
          }
          return { projects: newProjects };
        });
      },

      setMenuConfig: (config) => set((state) => ({ menuConfig: { ...state.menuConfig, ...config } })),
      
      onNodesChange: (changes: NodeChange<AppNode>[]) => {
        set((state) => {
          const nextNodes = applyNodeChanges(changes, state.nodes) as AppNode[];
          return syncProject(state, nextNodes, state.edges);
        });
      },
      
      onEdgesChange: (changes: EdgeChange[]) => {
        set((state) => {
          const nextEdges = applyEdgeChanges(changes, state.edges);
          return syncProject(state, state.nodes, nextEdges);
        });
      },
      
      onConnect: (connection: Connection) => {
        set((state) => {
          const sourceNode = state.nodes.find(n => n.id === connection.source);
          const isIdentity = sourceNode?.data.type === "identity";
          
          const newEdge: Edge = {
            ...connection,
            id: `e-${connection.source}-${connection.target}`,
            type: "bezier",
            animated: true,
            style: isIdentity 
              ? { strokeWidth: 2, stroke: '#f472b6', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.6))', strokeDasharray: '5,5' }
              : { strokeWidth: 2, stroke: '#3b82f6', filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }
          };
          
          const nextEdges = xyflowAddEdge(newEdge, state.edges);
          return syncProject(state, state.nodes, nextEdges);
        });
      },
      
      addEdge: (edge) => {
        set((state) => {
          const nextEdges = [...state.edges, edge];
          return syncProject(state, state.nodes, nextEdges);
        });
      },
      
      addNode: (type, position, data) => {
        const id = uuidv4();
        set((state) => {
          const newNode: AppNode = {
            id,
            type: "customNode",
            position,
            data: {
              title: data?.title || `Novo ${type}`,
              type,
              content: data?.content || "",
              imageUrl: data?.imageUrl,
              prompt: data?.prompt || "",
              isGenerating: data?.isGenerating || false,
              status: data?.status || "idle",
              imageModel: data?.imageModel
            },
          };
          const nextNodes = [...state.nodes, newNode];
          return syncProject(state, nextNodes, state.edges);
        });
        return id;
      },
      
      insertNodeOnEdge: (edgeId, type) => {
        let newNodeId = "";
        set((state) => {
          const edge = state.edges.find(e => e.id === edgeId);
          if (!edge) return state;
          
          const sourceNode = state.nodes.find(n => n.id === edge.source);
          const targetNode = state.nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return state;

          const x = (sourceNode.position.x + targetNode.position.x) / 2;
          const y = (sourceNode.position.y + targetNode.position.y) / 2 + 50;

          newNodeId = uuidv4();
          const newNode: AppNode = {
            id: newNodeId,
            type: "customNode",
            position: { x, y },
            data: {
              title: `Novo ${type}`,
              type,
              content: "",
              prompt: "",
              isGenerating: false,
              status: "idle",
            },
          };

          const edge1: Edge = {
            id: `e-${sourceNode.id}-${newNodeId}`,
            source: sourceNode.id,
            target: newNodeId,
            sourceHandle: edge.sourceHandle,
            targetHandle: "left",
            type: "bezier",
            animated: true,
            style: edge.style
          };

          const edge2: Edge = {
            id: `e-${newNodeId}-${targetNode.id}`,
            source: newNodeId,
            target: targetNode.id,
            sourceHandle: "right",
            targetHandle: edge.targetHandle,
            type: "bezier",
            animated: true,
            style: edge.style
          };

          const nextEdges = [...state.edges.filter(e => e.id !== edgeId), edge1, edge2];
          const nextNodes = [...state.nodes, newNode];
          
          return syncProject(state, nextNodes, nextEdges);
        });
        return newNodeId;
      },
      
      updateNode: (id, data) => {
        set((state) => {
          const nextNodes = state.nodes.map((node) =>
               node.id === id ? { ...node, data: { ...node.data, ...data } } : node
          ) as AppNode[];
          return syncProject(state, nextNodes, state.edges);
        });
      },
      
      deleteNode: (id) => {
        set((state) => {
          const nextNodes = state.nodes.filter((node) => node.id !== id);
          const nextEdges = state.edges.filter((edge) => edge.source !== id && edge.target !== id);
          return syncProject(state, nextNodes, nextEdges);
        });
      },
      
      duplicateNode: (id) => {
        set((state) => {
          const nodeToDuplicate = state.nodes.find((node) => node.id === id);
          if (!nodeToDuplicate) return state;
          
          const newId = uuidv4();
          const newNode: AppNode = {
            ...nodeToDuplicate,
            id: newId,
            selected: false,
            position: {
              x: nodeToDuplicate.position.x + 50,
              y: nodeToDuplicate.position.y + 50,
            },
            data: { ...nodeToDuplicate.data },
          };
          const nextNodes = [...state.nodes, newNode];
          return syncProject(state, nextNodes, state.edges);
        });
      },
    }),
    {
      name: "node-editor-storage",
      // TODO: futuro: Atualizar pra DB de verdade quando quiser!
    }
  )
);
