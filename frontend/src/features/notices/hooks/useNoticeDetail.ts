/**
 * useNoticeDetail — 공지 상세 조회 TanStack Query hook
 * 실 API fetcher 기반
 */

import { useAuthStore } from '@/src/store/useAuthStore';
import { fetchPublicNoticeById } from '@/src/services/publicNotices';
import { useQuery } from '@tanstack/react-query';

import { fetchNoticeById } from '@/src/services/notices';
import type { Notice } from '@/src/types/api';

/**
 * 공지 상세를 조회한다.
 * @param id 공지 ID
 */
export function useNoticeDetail(id: string) {
  const status = useAuthStore((s) => s.status);
  const canRead = status === 'guest' || status === 'authenticated';
  return useQuery<Notice | undefined>({
    queryKey: ['notice', id],
    queryFn: ({ signal }) => (status === 'guest' ? fetchPublicNoticeById : fetchNoticeById)(id, signal),
    retry: false,
    enabled: canRead && /^\d+$/.test(id) && !/^0+$/.test(id), // id가 유효할 때만 실행
  });
}

