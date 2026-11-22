/**
 * useNotices — 공지 목록 조회 TanStack Query 무한 스크롤 hook
 *
 * [정책 5/13] category/tag 모두 null(미선택) 가능.
 * 둘 다 null → 전체 공지, 하나만 선택 → 단일 필터, 둘 다 선택 → AND 필터
 */

import { useAuthStore } from '@/src/store/useAuthStore';
import { fetchPublicNotices } from '@/src/services/publicNotices';
import { useInfiniteQuery } from '@tanstack/react-query';

import { NOTICE_PAGE_SIZE } from '@/src/constants/api';
import { fetchNotices } from '@/src/services/notices';
import type { Notice, NoticeCategory, PageResponse } from '@/src/types/api';

interface UseNoticesParams {
  category: NoticeCategory | null;
  tag: string | null;
}

/**
 * 공지 목록을 무한 스크롤로 조회한다.
 */
export function useNotices({ category, tag }: UseNoticesParams) {
  const status = useAuthStore((s) => s.status);
  const canRead = status === 'guest' || status === 'authenticated';
  return useInfiniteQuery<PageResponse<Notice>>({
    queryKey: ['notices', category, status === 'guest' ? null : tag],
    enabled: canRead,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      (status === 'guest' ? fetchPublicNotices : fetchNotices)({
        category: category ?? undefined,
        tags: status === 'authenticated' ? tag ?? undefined : undefined,
        page: pageParam as number,
        size: NOTICE_PAGE_SIZE,
      }, signal),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
  });
}
