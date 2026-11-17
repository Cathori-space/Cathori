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
  // 닫힘 애니메이션 중에는 기존 안내 문구를 유지한다.
  close: () => set({ visible: false }),
}));
