/**
 * 알림 리스트 Mock 데이터 — 백엔드 GET /api/notifications 준비 전 UI 개발용
 *
 * 실제 API 연동 시 services/notifications.ts의 USE_MOCK 플래그만 false로 바꾸면 됨.
 * fetchNotificationsMock은 실제 fetcher와 동일한 시그니처
 * ({ cursor, size }) → Promise<NotificationPage> 를 지키므로 호출부 수정이 없다.
 *
 * 데이터는 alertHistoryId 내림차순(최신순)으로 정렬돼 있다고 가정한다.
 * 커서 = "마지막으로 받은 alertHistoryId" → 그보다 작은 항목부터 다음 페이지.
 */

import type { NotificationListItem, NotificationPage } from '@/src/types/notifications';

/** 다양한 UI 케이스를 담은 mock 알림 목록 (alertHistoryId 내림차순) */
export const MOCK_NOTIFICATIONS: NotificationListItem[] = [
  {
    alertHistoryId: 112,
    noticeId: 1042,
    title: '2026학년도 1학기 국가장학금 신청 안내',
    matchedTag: '국가장학',
    deadlineAt: '2026-06-10', // 임박(D-7 이내일 수 있음)
    isRead: false,
    createdAt: '2026-06-03T10:52:00',
  },
  {
    alertHistoryId: 109,
    noticeId: 1039,
    title: '2026 하계 해외 연수 프로그램 참가자 모집 — 미국·영국·독일 등 12개국 협약 대학',
    matchedTag: '해외연수',
    deadlineAt: '2026-06-20',
    isRead: false,
    createdAt: '2026-06-03T09:14:00',
  },
  {
    alertHistoryId: 104,
    noticeId: 1031,
    title: '교내 근로장학생 2차 모집 공고',
    matchedTag: '근로장학',
    deadlineAt: '2026-06-05', // 곧 마감
    isRead: true, // 읽음 처리 도입 전엔 항상 false지만, UI 변형 확인용
    createdAt: '2026-06-02T17:40:00',
  },
  {
    alertHistoryId: 98,
    noticeId: 1024,
    title: 'AI융합전공 신설 설명회 개최 안내',
    matchedTag: 'AI융합',
    deadlineAt: null, // 마감일 없음 → D-day 뱃지 미표시
    isRead: false,
    createdAt: '2026-06-02T11:05:00',
  },
  {
    alertHistoryId: 91,
    noticeId: 1018,
    title: '제2전공(복수전공) 신청 기간 종료 D-1',
    matchedTag: '복수전공',
    deadlineAt: '2026-05-30', // 이미 지남 → "마감"
    isRead: false,
    createdAt: '2026-06-01T08:30:00',
  },
  {
    alertHistoryId: 85,
    noticeId: 1009,
    title: '컴퓨터정보공학부 캡스톤 디자인 경진대회 안내',
    matchedTag: '캡스톤',
    deadlineAt: '2026-06-25',
    isRead: false,
    createdAt: '2026-05-31T14:20:00',
  },
  {
    alertHistoryId: 77,
    noticeId: 994,
    title: '교환학생 파견 프로그램 2차 선발 결과 발표',
    matchedTag: '교환학생',
    deadlineAt: null,
    isRead: true,
    createdAt: '2026-05-30T16:00:00',
  },
  {
    alertHistoryId: 70,
    noticeId: 988,
    title: '취업 역량 강화 특강 — 자기소개서 클리닉',
    matchedTag: '취업특강',
    deadlineAt: '2026-06-12',
    isRead: false,
    createdAt: '2026-05-29T10:10:00',
  },
];

/** mock 네트워크 지연(ms) — 로딩 인디케이터 확인용 */
const MOCK_DELAY_MS = 350;

interface FetchParams {
  cursor?: number | null;
  size?: number;
}

/**
 * 실제 fetcher와 동일 시그니처의 mock.
 * cursor(=마지막으로 받은 alertHistoryId) 다음부터 size개를 잘라 반환한다.
 */
export async function fetchNotificationsMock(
  { cursor, size = 20 }: FetchParams = {},
): Promise<NotificationPage> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  // cursor가 없으면 처음부터, 있으면 그 alertHistoryId 미만(=더 오래된)부터
  const startIndex =
    cursor == null
      ? 0
      : MOCK_NOTIFICATIONS.findIndex((n) => n.alertHistoryId < cursor);

  // findIndex가 -1이면 더 이상 없음 → 빈 페이지
  const safeStart = startIndex === -1 ? MOCK_NOTIFICATIONS.length : startIndex;
  const slice = MOCK_NOTIFICATIONS.slice(safeStart, safeStart + size);

  const hasNext = safeStart + size < MOCK_NOTIFICATIONS.length;
  const nextCursor =
    hasNext && slice.length > 0 ? slice[slice.length - 1].alertHistoryId : null;

  return { alerts: slice, nextCursor, hasNext };
}
