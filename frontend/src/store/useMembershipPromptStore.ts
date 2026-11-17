import { create } from 'zustand';

export type MembershipFeature = 'general' | 'bookmark' | 'keyword';

export const useMembershipPromptStore = create<{
  visible: boolean;
  feature: MembershipFeature;
  open: (feature?: MembershipFeature) => void;
  close: () => void;
}>((set) => ({
  visible: false,
  feature: 'general',
  open: (feature = 'general') => set({ visible: true, feature }),
  close: () => set({ visible: false, feature: 'general' }),
}));
