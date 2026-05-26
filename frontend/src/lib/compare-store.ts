import { create } from "zustand";

import { candidateApi } from "./api";
import type { CompareResponse } from "../types/api";

type CompareState = {
  selectedIds: number[];
  drawerOpen: boolean;
  compareResult: CompareResponse | null;
  compareError: Error | null;
  isComparing: boolean;
  toggleCandidate: (candidateId: number) => void;
  selectMany: (candidateIds: number[]) => void;
  deselectMany: (candidateIds: number[]) => void;
  clearSelected: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  runCompare: () => Promise<void>;
};

export const useCompareStore = create<CompareState>((set, get) => ({
  selectedIds: [],
  drawerOpen: false,
  compareResult: null,
  compareError: null,
  isComparing: false,

  toggleCandidate: (candidateId: number) => {
    set((state) => {
      if (state.selectedIds.includes(candidateId)) {
        return { selectedIds: state.selectedIds.filter((id) => id !== candidateId) };
      }
      if (state.selectedIds.length >= 3) return { selectedIds: state.selectedIds };
      return { selectedIds: [...state.selectedIds, candidateId] };
    });
  },

  selectMany: (candidateIds: number[]) => {
    set((state) => {
      const newIds = candidateIds.filter((id) => !state.selectedIds.includes(id));
      const combined = [...state.selectedIds, ...newIds].slice(0, 3);
      return { selectedIds: combined };
    });
  },

  deselectMany: (candidateIds: number[]) => {
    set((state) => ({
      selectedIds: state.selectedIds.filter((id) => !candidateIds.includes(id)),
    }));
  },

  clearSelected: () => {
    set({ selectedIds: [], compareResult: null, compareError: null });
  },

  openDrawer: () => set({ drawerOpen: true }),

  closeDrawer: () => set({ drawerOpen: false }),

  runCompare: async () => {
    const { selectedIds } = get();
    if (selectedIds.length < 2) return;
    set({ isComparing: true, compareError: null });
    try {
      const result = await candidateApi.compare(selectedIds);
      set({ compareResult: result, drawerOpen: true, isComparing: false });
    } catch (error) {
      set({
        compareError: error instanceof Error ? error : new Error(String(error)),
        isComparing: false,
      });
    }
  },
}));
