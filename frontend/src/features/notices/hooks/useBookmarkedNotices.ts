/**
 * useBookmarkedNotices — 로그인 사용자의 북마크 공지 목록 조회 hook
 */

import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/src/store/useAuthStore';
import { NOTICE_PAGE_SIZE } from '@/src/constants/api';
import { fetchBookmarkedNotices } from '@/src/services/notices';
import type { Notice, PageResponse } from '@/src/types/api';

export function useBookmarkedNotices() {
  const isMember = useAuthStore((s) => s.status === 'authenticated');
  return useInfiniteQuery<PageResponse<Notice>>({
    queryKey: ['bookmarkedNotices'],
    enabled: isMember,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchBookmarkedNotices({
        page: pageParam as number,
        size: NOTICE_PAGE_SIZE,
      }, signal),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
  });
}
