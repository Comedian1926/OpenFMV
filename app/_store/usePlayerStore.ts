import { create } from 'zustand';
import { AppNode, NodeData } from '../_types';

interface PlayerState {
  isPlaying: boolean;
  currentNodeId: string | null;
  history: string[];
  variables: Record<string, any>;
  
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentNode: (nodeId: string) => void;
  addToHistory: (nodeId: string) => void;
  setVariable: (key: string, value: any) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentNodeId: null,
  history: [],
  variables: {},
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
  
  addToHistory: (nodeId) => set((state) => ({ 
    history: [...state.history, nodeId] 
  })),
  
  setVariable: (key, value) => set((state) => ({
    variables: { ...state.variables, [key]: value }
  })),
  
  reset: () => set({ isPlaying: false, currentNodeId: null, history: [], variables: {} }),
}));
