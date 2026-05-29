/**
 * useNoticeDetail — 공지 상세 조회 TanStack Query hook
 * 실 API fetcher 기반
 */

import { useQuery } from '@tanstack/react-query';

import { fetchNoticeById } from '@/src/services/notices';
import type { Notice } from '@/src/types/api';

/**
 * 공지 상세를 조회한다.
 * @param id 공지 ID
 */
export function useNoticeDetail(id: string) {
  return useQuery<Notice | undefined>({
    queryKey: ['notice', id],
    queryFn: () => fetchNoticeById(id),
    enabled: id != null && id !== '', // id가 유효할 때만 실행
  });
}

