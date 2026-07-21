import { create } from "zustand";

interface PlayerState {
  /** Current walk target on the floor (x, z). Null = standing still. */
  target: [number, number] | null;
  setTarget: (target: [number, number]) => void;
  clearTarget: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  clearTarget: () => set({ target: null }),
}));
