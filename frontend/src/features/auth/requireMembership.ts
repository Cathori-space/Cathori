import { useAuthStore } from '@/src/store/useAuthStore';
import { useMembershipPromptStore } from '@/src/store/useMembershipPromptStore';

export function requireMembership(): boolean {
  const { status } = useAuthStore.getState();
  if (status === 'authenticated') return true;
  if (status === 'guest') useMembershipPromptStore.getState().open();
  return false;
}
