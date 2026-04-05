import { create } from 'zustand';

interface Snapshot {
  label: string;
  data: unknown;
}

interface UndoState {
  past: Snapshot[];
  future: Snapshot[];
  push: (snapshot: Snapshot) => void;
  undo: () => Snapshot | undefined;
  redo: () => Snapshot | undefined;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  past: [],
  future: [],

  push: (snapshot) =>
    set((state) => ({
      past: [...state.past.slice(-49), snapshot],
      future: [],
    })),

  undo: () => {
    const { past } = get();
    if (past.length === 0) return undefined;
    const snapshot = past[past.length - 1];
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [snapshot, ...state.future],
    }));
    return snapshot;
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return undefined;
    const snapshot = future[0];
    set((state) => ({
      past: [...state.past, snapshot],
      future: state.future.slice(1),
    }));
    return snapshot;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));
