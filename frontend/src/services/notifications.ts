/**
 * 알림 리스트 API fetcher
 *
 * 백엔드 API 명세(정본: personal_docs/api/API_알림이력조회.md):
 *  - GET /api/notifications?cursor={마지막 alert_history.id}&size={개수}
 *    → { alerts, nextCursor, hasNext } (커서 페이지네이션, 최신순)
 *  - GET /api/notifications/unread-exists
 *    → { hasUnread } (읽지 않은 알림 존재 여부)
 *  - PATCH  /api/notifications/{alertHistoryId}/read
 *    → 204 No Content
 *  - PATCH  /api/notifications/read
 *    → { readAlertHistoryIds } (현재 사용자의 여러 알림 읽음 처리)
 *  - PATCH  /api/notifications/notices/{noticeId}/read
 *    → 204 No Content (푸시로 선택한 알림 읽음 처리)
 *  - DELETE /api/notifications/{alertHistoryId}
 *    → 204 No Content
 */

import { fetchNotificationsMock } from '@/src/mocks/notifications';
import type {
  MarkNotificationsReadResponse,
  NotificationPage,
  UnreadNotificationStatus,
} from '@/src/types/notifications';

import apiClient from './api';

/** 한 페이지 기본 조회 개수 */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** true면 mock 데이터, false면 실제 백엔드 호출 */
const USE_MOCK = false;

interface FetchNotificationsParams {
  /** 직전 페이지의 nextCursor. 첫 페이지는 생략(null) */
  cursor?: number | null;
  /** 페이지 크기 (기본 20) */
  size?: number;
}

/** 실제 백엔드 호출 — GET /api/notifications */
async function fetchNotificationsReal(
  { cursor, size = NOTIFICATIONS_PAGE_SIZE }: FetchNotificationsParams,
): Promise<NotificationPage> {
  const { data } = await apiClient.get<NotificationPage>('/api/notifications', {
    // cursor가 null/undefined면 파라미터 자체를 보내지 않음 → 첫 페이지
    params: { cursor: cursor ?? undefined, size },
  });

  return data;
}

/**
 * 인증 사용자의 알림 목록 한 페이지 조회
 * GET /api/notifications
 */
export async function fetchNotifications(
  params: FetchNotificationsParams = {},
): Promise<NotificationPage> {
  return USE_MOCK ? fetchNotificationsMock(params) : fetchNotificationsReal(params);
}

/**
 * 인증 사용자의 미읽음 알림 존재 여부 조회
 * GET /api/notifications/unread-exists
 */
export async function fetchUnreadNotificationStatus(): Promise<UnreadNotificationStatus> {
  const { data } = await apiClient.get<UnreadNotificationStatus>(
    '/api/notifications/unread-exists',
  );
  return data;
}

/**
 * 인증 사용자의 특정 알림 읽음 처리
 * PATCH /api/notifications/{alertHistoryId}/read
 */
export async function markNotificationRead(alertHistoryId: number): Promise<void> {
  await apiClient.patch(`/api/notifications/${alertHistoryId}/read`);
}

/**
 * 인증 사용자의 여러 알림 읽음 처리
 * PATCH /api/notifications/read
 */
export async function markNotificationsRead(
  alertHistoryIds: number[],
): Promise<number[]> {
  const { data } = await apiClient.patch<MarkNotificationsReadResponse>(
    '/api/notifications/read',
    { alertHistoryIds },
  );
  return data.readAlertHistoryIds;
}

/**
 * 인증 사용자가 푸시로 선택한 공지의 알림 읽음 처리
 * PATCH /api/notifications/notices/{noticeId}/read
 */
export async function markNotificationReadByNoticeId(
  noticeId: number,
): Promise<void> {
  await apiClient.patch(`/api/notifications/notices/${noticeId}/read`);
}

/**
 * 인증 사용자의 특정 알림 삭제
 * DELETE /api/notifications/{alertHistoryId}
 */
export async function deleteNotification(alertHistoryId: number): Promise<void> {
  await apiClient.delete(`/api/notifications/${alertHistoryId}`);
}
