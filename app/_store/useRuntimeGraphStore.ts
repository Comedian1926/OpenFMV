import { create } from 'zustand';
import { AppEdge, AppNode, OpenFMVGraph } from '../_types';
import { getEntryNodeId } from '../_utils/graphRuntime';

interface RuntimeGraphState {
  nodes: AppNode[];
  edges: AppEdge[];
  entryNodeId: string | null;
  setGraph: (graph: OpenFMVGraph, entryNodeId?: string | null) => void;
  resetGraph: () => void;
}

export const useRuntimeGraphStore = create<RuntimeGraphState>((set) => ({
  nodes: [],
  edges: [],
  entryNodeId: null,
  setGraph: (graph, entryNodeId) => set({
    nodes: graph.nodes,
    edges: graph.edges,
    entryNodeId: getEntryNodeId(graph, entryNodeId),
  }),
  resetGraph: () => set({ nodes: [], edges: [], entryNodeId: null }),
}));
