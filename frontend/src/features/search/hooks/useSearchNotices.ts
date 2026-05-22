/**
 * useSearchNotices — 공지 검색 TanStack Query 무한스크롤 훅
 *
 * - q가 비어있으면 enabled:false로 쿼리 자체를 차단 (불필요한 요청 방지)
 * - initialPageParam: 1, getNextPageParam: hasNext일 때만 다음 페이지 반환
 *
 * [자동 처리 — 직접 구현 불필요]
 * - q가 바뀌면 queryKey 변경으로 자동 re-fetch (이전 in-flight 요청은 abandon)
 * - fetchNextPage 호출 시 새 페이지 누적 → data.pages[]에 PageResponse 배열로 보관
 * - 컴포넌트 언마운트 시 진행 중 요청 자동 취소
 */

import { useInfiniteQuery } from '@tanstack/react-query';

import { NOTICE_PAGE_SIZE } from '@/src/constants/api';
import { getMockSearchNotices } from '@/src/mocks/notices';

export function useSearchNotices(q: string) {
  const trimmed = q.trim();

  return useInfiniteQuery({
    queryKey: ['search', trimmed],
    enabled: trimmed.length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getMockSearchNotices({
        q: trimmed,
        page: pageParam,
        size: NOTICE_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
  });
}
