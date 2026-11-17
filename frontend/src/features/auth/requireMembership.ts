import { useAuthStore } from '@/src/store/useAuthStore';
import { useMembershipPromptStore, type MembershipFeature } from '@/src/store/useMembershipPromptStore';

export function requireMembership(feature: MembershipFeature = 'general'): boolean {
  const { status } = useAuthStore.getState();
  if (status === 'authenticated') return true;
  if (status === 'guest') useMembershipPromptStore.getState().open(feature);
  return false;
}
