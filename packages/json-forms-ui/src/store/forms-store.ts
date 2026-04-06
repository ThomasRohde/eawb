import { create } from 'zustand';

interface FormsState {
  selectedSchemaId: string | null;
  setSelectedSchemaId: (id: string | null) => void;
}

export const useFormsStore = create<FormsState>((set) => ({
  selectedSchemaId: null,
  setSelectedSchemaId: (id) => set({ selectedSchemaId: id }),
}));
