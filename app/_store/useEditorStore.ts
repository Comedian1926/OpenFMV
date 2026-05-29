import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
} from '@xyflow/react';

import { AppNode, AppEdge } from '../_types';
import { addGraphEdge, addNodeAndGraphEdge, filterEdgesForNodes } from '../_utils/graphRules';

export type EdgeCurveStyle = 'smoothstep' | 'bezier' | 'straight';

const isQuotaExceededError = (error: unknown) => {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

const createSafeLocalStorage = () => ({
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error;
      localStorage.removeItem(name);
      try {
        localStorage.setItem(name, value);
      } catch (retryError) {
        if (!isQuotaExceededError(retryError)) throw retryError;
      }
    }
  },
  removeItem: (name: string) => localStorage.removeItem(name),
});

const createInitialNodes = (): AppNode[] => [
  {
    id: 'start-node',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { type: 'start', label: 'Start' },
  },
];

const DEFAULT_AUTO_SAVE_ENABLED = true;

const ensureNodes = (nodes: AppNode[] | undefined): AppNode[] => {
  return Array.isArray(nodes) && nodes.length > 0 ? nodes : createInitialNodes();
};

interface EditorState {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  onConnect: OnConnect;
  addNode: (node: AppNode) => void;
  addNodeAndConnect: (node: AppNode, connection: Connection) => void;
  updateNodeData: (id: string, data: Partial<AppNode['data']>) => void;
  removeNode: (id: string) => void;
  selectedNodeId: string | null;
  selectedNode: AppNode | null;
  setSelectedNodeId: (id: string | null) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  reset: () => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  isAssetPickerOpen: boolean;
  setAssetPickerOpen: (isOpen: boolean) => void;
  targetNodeIdForAsset: string | null;
  setTargetNodeIdForAsset: (id: string | null) => void;
  edgeCurveStyle: EdgeCurveStyle;
  setEdgeCurveStyle: (style: EdgeCurveStyle) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      nodes: createInitialNodes(),
      edges: [],
      selectedNodeId: null,
      selectedNode: null,
      currentProjectId: null,
      autoSaveEnabled: DEFAULT_AUTO_SAVE_ENABLED,
      isAssetPickerOpen: false,
      targetNodeIdForAsset: null,
      edgeCurveStyle: 'bezier',

      setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
      setAssetPickerOpen: (isOpen) => set({ isAssetPickerOpen: isOpen }),
      setTargetNodeIdForAsset: (id) => set({ targetNodeIdForAsset: id }),
      setEdgeCurveStyle: (style) => set({ edgeCurveStyle: style }),
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      setNodes: (nodes) => {
        const ensuredNodes = ensureNodes(nodes);
        set({ nodes: ensuredNodes, edges: filterEdgesForNodes(get().edges, ensuredNodes) });
      },
      setEdges: (edges) => set({ edges: filterEdgesForNodes(edges, get().nodes) }),

      onNodesChange: (changes) => {
        const nodes = applyNodeChanges(changes, get().nodes) as AppNode[];
        set({ nodes, edges: filterEdgesForNodes(get().edges, nodes) });
      },

      onEdgesChange: (changes) => {
        const edges = applyEdgeChanges(changes, get().edges) as AppEdge[];
        set({ edges: filterEdgesForNodes(edges, get().nodes) });
      },

      onConnect: (connection) => {
        const { nodes, edges } = get();
        set({ edges: addGraphEdge(connection, edges, nodes) });
      },

      addNode: (node) => {
        set({ nodes: [...get().nodes, node] });
      },

      addNodeAndConnect: (node, connection) => {
        const { nodes, edges } = get();
        set(addNodeAndGraphEdge(node, connection, nodes, edges));
      },

      updateNodeData: (id, data) => {
        const { selectedNodeId } = get();
        const updatedNodes = get().nodes.map((node) => {
          if (node.id !== id) return node;
          return {
            ...node,
            data: { ...node.data, ...data } as AppNode['data'],
          };
        });
        const updatedSelectedNode = selectedNodeId === id ? (updatedNodes.find((node) => node.id === id) ?? null) : get().selectedNode;
        set({ nodes: updatedNodes, selectedNode: updatedSelectedNode });
      },

      removeNode: (id) => {
        const { selectedNodeId } = get();
        set({
          nodes: get().nodes.filter((node) => node.id !== id),
          edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
          ...(selectedNodeId === id ? { selectedNodeId: null, selectedNode: null } : {}),
        });
      },

      setSelectedNodeId: (id) => {
        const selectedNode = id ? (get().nodes.find((node) => node.id === id) ?? null) : null;
        set({ selectedNodeId: id, selectedNode });
      },

      reset: () => {
        set({
          nodes: createInitialNodes(),
          edges: [],
          selectedNodeId: null,
          selectedNode: null,
          currentProjectId: null,
        });
      },
    }),
    {
      name: 'openfmv-editor-storage',
      version: 2,
      storage: createJSONStorage(createSafeLocalStorage),
      partialize: (state) => ({
        autoSaveEnabled: state.autoSaveEnabled,
        currentProjectId: state.currentProjectId,
        edgeCurveStyle: state.edgeCurveStyle,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<EditorState>;
        return {
          autoSaveEnabled: state.autoSaveEnabled ?? DEFAULT_AUTO_SAVE_ENABLED,
          currentProjectId: state.currentProjectId,
          edgeCurveStyle: state.edgeCurveStyle,
        };
      },
      merge: (persistedState, currentState) => {
        const state = { ...currentState, ...(persistedState as Partial<EditorState>) };
        const nodes = ensureNodes(state.nodes);
        return {
          ...state,
          nodes,
          edges: filterEdgesForNodes(state.edges, nodes),
          selectedNodeId: null,
          selectedNode: null,
        };
      },
    }
  )
);
