/**
 * 알림 리스트 API fetcher
 *
 * 백엔드 API 명세(정본: personal_docs/api/API_알림이력조회.md):
 *  - GET /api/notifications?cursor={마지막 alert_history.id}&size={개수}
 *    → { alerts, nextCursor, hasNext } (커서 페이지네이션, 최신순)
 *
 * ⚠️ 백엔드 GET /api/notifications가 아직 미구현이라 현재는 mock으로 동작한다.
 *    실제 연동 시 아래 USE_MOCK 플래그만 false로 바꾸면 된다. (호출부 수정 불필요)
 */

import { fetchNotificationsMock } from '@/src/mocks/notifications';
import type { NotificationPage } from '@/src/types/notifications';

import apiClient from './api';

/** 한 페이지 기본 조회 개수 */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** true면 mock 데이터, false면 실제 백엔드 호출 */
const USE_MOCK = true;

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
