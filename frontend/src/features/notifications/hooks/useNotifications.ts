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
  fetchUnreadNotificationStatus,
  fetchNotifications,
  markNotificationRead,
} from '@/src/services/notifications';
import { requireMember, useAuthStore } from '@/src/store/useAuthStore';
import { assertCurrentSession, isCurrentSession } from '@/src/services/session';
import type { NotificationPage } from '@/src/types/notifications';

interface DeleteNotificationContext {
  sessionId: number;
  previousNotificationQueries: {
    queryKey: readonly unknown[];
    data: InfiniteData<NotificationPage> | undefined;
  }[];
}

interface MarkNotificationReadContext {
  sessionId: number;
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

function markNotificationReadInPages(
  data: InfiniteData<NotificationPage>,
  alertHistoryId: number,
): InfiniteData<NotificationPage> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      alerts: page.alerts.map((notification) =>
        notification.alertHistoryId === alertHistoryId
          ? { ...notification, isRead: true }
          : notification,
      ),
    })),
  };
}

export function useNotifications() {
  const isMember = useAuthStore((s) => s.status === 'authenticated');
  return useInfiniteQuery<NotificationPage>({
    queryKey: ['notifications'],
    enabled: isMember,
    queryFn: ({ pageParam, signal }) =>
      fetchNotifications({ cursor: pageParam as number | null }, signal),
    // 첫 페이지는 커서 없음
    initialPageParam: null,
    // hasNext가 false거나 nextCursor가 null이면 undefined를 반환해 페이징 종료
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor ?? undefined : undefined,
  });
}

export function useHasNotifications() {
  const isMember = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: ['notifications', 'hasUnread'],
    enabled: isMember,
    queryFn: ({ signal }) => fetchUnreadNotificationStatus(signal),
    select: (status) => status.hasUnread,
  });
}

export function useMarkNotificationRead() {
  const hookSessionId = useAuthStore((s) => s.sessionId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      assertCurrentSession(hookSessionId);
      requireMember();
      return markNotificationRead(id);
    },

    onMutate: async (alertHistoryId): Promise<MarkNotificationReadContext> => {
      assertCurrentSession(hookSessionId);
      const sessionId = requireMember();
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      assertCurrentSession(sessionId);

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
          markNotificationReadInPages(data, alertHistoryId),
        );
      });

      return { sessionId, previousNotificationQueries };
    },

    onError: (_error, _alertHistoryId, context) => {
      if (!context || !isCurrentSession(context.sessionId)) return;

      context.previousNotificationQueries.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
    },

    onSettled: (_data, _error, _id, context) => {
      if (!context || !isCurrentSession(context.sessionId)) return;
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const hookSessionId = useAuthStore((s) => s.sessionId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      assertCurrentSession(hookSessionId);
      requireMember();
      return deleteNotification(id);
    },

    onMutate: async (alertHistoryId): Promise<DeleteNotificationContext> => {
      assertCurrentSession(hookSessionId);
      const sessionId = requireMember();
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      assertCurrentSession(sessionId);

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

      return { sessionId, previousNotificationQueries };
    },

    onError: (_error, _alertHistoryId, context) => {
      if (!context || !isCurrentSession(context.sessionId)) return;

      context.previousNotificationQueries.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
    },

    onSettled: (_data, _error, _id, context) => {
      if (!context || !isCurrentSession(context.sessionId)) return;
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
