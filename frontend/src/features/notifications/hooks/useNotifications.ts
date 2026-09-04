/**
 * useNotifications — 알림 리스트 조회 TanStack Query 훅 (커서 페이지네이션)
 *
 * 백엔드 GET /api/notifications가 { alerts, nextCursor, hasNext } 형태로
 * 커서 페이지네이션을 반환하므로 useInfiniteQuery로 구성한다.
 * 화면에서는 data.pages.flatMap(p => p.alerts)로 평탄화해 사용한다.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  deleteNotification,
  fetchNotifications,
} from '@/src/services/notifications';
import type { NotificationPage } from '@/src/types/notifications';

interface DeleteNotificationContext {
  previousNotificationQueries: {
    queryKey: readonly unknown[];
    data: InfiniteData<NotificationPage> | undefined;
  }[];
}

function isNotificationInfiniteData(
  data: unknown,
): data is InfiniteData<NotificationPage> {
  return (
    data != null &&
    typeof data === 'object' &&
    'pages' in data &&
    Array.isArray((data as InfiniteData<NotificationPage>).pages)
  );
}

function removeNotificationFromPages(
  data: InfiniteData<NotificationPage>,
  alertHistoryId: number,
): InfiniteData<NotificationPage> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      alerts: page.alerts.filter(
        (notification) => notification.alertHistoryId !== alertHistoryId,
      ),
    })),
  };
}

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

export function useHasNotifications() {
  return useQuery({
    queryKey: ['notifications', 'hasAny'],
    queryFn: () => fetchNotifications({ size: 1 }),
    select: (page) => page.alerts.length > 0,
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,

    onMutate: async (alertHistoryId): Promise<DeleteNotificationContext> => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const notificationQueries = queryClient
        .getQueriesData<unknown>({ queryKey: ['notifications'] })
        .filter(
          (query): query is [readonly unknown[], InfiniteData<NotificationPage>] =>
            isNotificationInfiniteData(query[1]),
        );

      const previousNotificationQueries = notificationQueries.map(
        ([queryKey, data]) => ({ queryKey, data }),
      );

      notificationQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<InfiniteData<NotificationPage>>(
          queryKey,
          removeNotificationFromPages(data, alertHistoryId),
        );
      });

      return { previousNotificationQueries };
    },

    onError: (_error, _alertHistoryId, context) => {
      if (!context) return;

      context.previousNotificationQueries.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
