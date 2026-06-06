/**
 * useNotifications — 알림 리스트 조회 TanStack Query 훅 (커서 페이지네이션)
 *
 * 백엔드 GET /api/notifications가 { alerts, nextCursor, hasNext } 형태로
 * 커서 페이지네이션을 반환하므로 useInfiniteQuery로 구성한다.
 * 화면에서는 data.pages.flatMap(p => p.alerts)로 평탄화해 사용한다.
 */

import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchNotifications } from '@/src/services/notifications';
import type { NotificationPage } from '@/src/types/notifications';

export function useNotifications() {
  return useInfiniteQuery<NotificationPage>({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      fetchNotifications({ cursor: pageParam as number | null }),
    // 첫 페이지는 커서 없음
    initialPageParam: null,
    // hasNext가 false거나 nextCursor가 null이면 undefined를 반환해 페이징 종료
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor ?? undefined : undefined,
  });
}
