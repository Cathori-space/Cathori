/**
 * 알림 리스트 API 계약 타입
 *
 * 백엔드 `GET /api/notifications`(커서 페이지네이션) 응답을 미러링한다.
 * 정본 명세: personal_docs/api/API_알림이력조회.md
 */

export interface NotificationListItem {
  /** alert_history PK — 리스트 key, 읽음 처리(Phase 6 PATCH) 식별자, 커서 산출 기준 */
  alertHistoryId: number;
  /** 연결된 공지 ID — 카드 탭 시 공지 상세로 이동 */
  noticeId: number;
  /** 공지 제목 */
  title: string;
  /** 발송 시점에 매칭됐던 관심 태그 (alert_history.matched_tag) — 없으면 null */
  matchedTag: string | null;
  /** 공지 마감일 (없으면 null) — 표시는 date.ts로 연산 */
  deadlineAt: string | null;
  /** 읽음 여부 — Phase 5에서는 읽음 처리 미구현으로 항상 false */
  isRead: boolean;
  /** 알림 수신 시각 (ISO 8601) */
  createdAt: string;
}

/**
 * 커서 페이지네이션 응답 한 페이지
 * - cursor에 직전 페이지의 nextCursor를 넣어 다음 페이지를 요청한다.
 */
export interface NotificationPage {
  /** 이 페이지의 알림 카드 목록 */
  alerts: NotificationListItem[];
  /** 다음 페이지 커서(마지막 alert_history.id). 다음 페이지 없으면 null */
  nextCursor: number | null;
  /** 다음 페이지 존재 여부 */
  hasNext: boolean;
}
