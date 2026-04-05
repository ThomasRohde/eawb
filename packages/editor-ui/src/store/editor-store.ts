import { create } from 'zustand';

interface EditorState {
  openDocIds: string[];
  activeDocId: string | null;
  dirtyDocs: Set<string>;
  openDocument: (id: string) => void;
  closeDocument: (id: string) => void;
  setActiveDoc: (id: string | null) => void;
  markDirty: (id: string) => void;
  markClean: (id: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  openDocIds: [],
  activeDocId: null,
  dirtyDocs: new Set(),

  openDocument: (id) =>
    set((state) => {
      if (state.openDocIds.includes(id)) {
        return { activeDocId: id };
      }
      return { openDocIds: [...state.openDocIds, id], activeDocId: id };
    }),

  closeDocument: (id) =>
    set((state) => {
      const openDocIds = state.openDocIds.filter((d) => d !== id);
      const dirtyDocs = new Set(state.dirtyDocs);
      dirtyDocs.delete(id);
      const activeDocId =
        state.activeDocId === id ? (openDocIds[openDocIds.length - 1] ?? null) : state.activeDocId;
      return { openDocIds, activeDocId, dirtyDocs };
    }),

  setActiveDoc: (id) => set({ activeDocId: id }),

  markDirty: (id) =>
    set((state) => {
      const dirtyDocs = new Set(state.dirtyDocs);
      dirtyDocs.add(id);
      return { dirtyDocs };
    }),

  markClean: (id) =>
    set((state) => {
      const dirtyDocs = new Set(state.dirtyDocs);
      dirtyDocs.delete(id);
      return { dirtyDocs };
    }),
}));
