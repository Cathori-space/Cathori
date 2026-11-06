import { create } from 'zustand';

export const useMembershipPromptStore = create<{
  visible: boolean;
  open: () => void;
  close: () => void;
}>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
