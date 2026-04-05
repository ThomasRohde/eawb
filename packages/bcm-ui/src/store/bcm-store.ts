import { create } from 'zustand';

interface BcmState {
  activeModelId: string | null;
  selectedNodeId: string | null;
  expandedNodes: Set<string>;

  setActiveModel: (id: string | null) => void;
  selectNode: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
}

export const useBcmStore = create<BcmState>((set) => ({
  activeModelId: null,
  selectedNodeId: null,
  expandedNodes: new Set<string>(),

  setActiveModel: (id) => set({ activeModelId: id, selectedNodeId: null }),

  selectNode: (id) => set({ selectedNodeId: id }),

  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedNodes);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedNodes: next };
    }),

  expandAll: (ids) =>
    set((state) => {
      const next = new Set(state.expandedNodes);
      ids.forEach((id) => next.add(id));
      return { expandedNodes: next };
    }),

  collapseAll: () => set({ expandedNodes: new Set() }),
}));
