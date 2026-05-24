/**
 * Cathori API 공통 타입 정의
 * 백엔드 계약(ERD v2 + _from_backend 명세) 기반
 */

// ─── 도메인 타입 ────────────────────────────────────────────────────

/** 공지 대분류 카테고리 */
export type NoticeCategory = '일반' | '장학' | '학사' | '취창업';

/**
 * AI 요약 생성 상태 — ERD v2 ai_summary_status 허용값
 * - PENDING: 요약 생성 전 (최초 조회 시)
 * - SUCCESS: 요약 생성 완료
 * - SKIPPED: 일시 스킵 (백엔드가 일괄 재시도 예정) — 프론트에서는 FAILED와 동일 표시
 * - FAILED: 최종 실패
 */
export type AiSummaryStatus = 'PENDING' | 'SUCCESS' | 'SKIPPED' | 'FAILED';

/** 공지 알림 빈도 */
export type NotificationFrequency = 'INSTANT' | 'DAILY'; // * 향후 변경 가능성 있음

// ─── 공지 타입 ──────────────────────────────────────────────────────

/**
 * 공지 엔티티 — 프론트 내부 표현
 *
 * 백엔드 응답과 필드명이 다른 부분은 서비스 레이어(fetchNotices 등)에서 매핑:
 *   noticeId (number) → id (string)
 *   publishedAt       → postedAt
 */
export interface Notice {
  id: string;
  title: string;
  category: NoticeCategory | string; // 백엔드에서 '학과공지' 등 추가 값 가능성이 있지만 그 부분들은 현재는 null로 보내주기로 함
  /** 작성 부서 (ERD NOT NULL) */
  department: string;
  /** 공지 원문 링크 */
  url: string;
  /** 공지 원문 등록일 (ISO 8601 date) — 백엔드 필드명: publishedAt */
  postedAt: string;

  // ─── AI 요약 관련 ────────────────────────────────────────────────
  /** AI 요약 결과 — SUCCESS 상태일 때만 존재. JSON 배열 문자열 또는 bullet 텍스트 */
  aiSummary: string | null;
  /** AI 요약 생성 상태 */
  aiSummaryStatus: AiSummaryStatus;

  // ─── 선택적 필드 (백엔드 응답에 포함되지 않을 수 있음) ───────────
  /** 마감일 — ERD v2 deadline_at, ISO date. 없으면 null */
  deadlineAt?: string | null;
  /** 조회수 — 추후 구현, 백엔드 미포함 시 기본값 0 */
  viewCount?: number;
  /** 백엔드에서 매칭한 태그 목록 — 목록에서는 포함, 상세에서는 보류 */
  tags?: string[];
  /** 즐겨찾기 여부 — 로그인 사용자 기준 */
  isBookmarked: boolean;
}

/**
 * 검색 결과 슬림 페이로드
 * 백엔드 GET /api/notices/search 응답이 카드형이 아닌 행형 UI(SearchResultItem)에 맞춰
 * 6필드만 내려옴. aiSummary/url/isBookmarked/tags는 미포함 — 행 탭 시 상세에서 재조회.
 *
 * Pick으로 좁혀두어 검색 결과를 다루는 코드가 무심코 aiSummary 등을 참조하면
 * TS 컴파일 단계에서 차단된다. (실수 사전 방지)
 */
export type SearchNoticeListItem = Pick<
  Notice,
  'id' | 'category' | 'title' | 'department' | 'postedAt' | 'deadlineAt'
>;

/** 공지 목록 API 요청 파라미터 */
export interface NoticeListParams {
  category?: NoticeCategory;
  tags?: string;
  page: number;
  size: number;
}

/** 공지 검색 API 요청 파라미터 */
export interface NoticeSearchParams {
  q: string;
  page: number;
  size: number;
}

// ─── 사용자 타입 ────────────────────────────────────────────────────

/** 사용자 프로필 — ERD v2 users 테이블 기준 */
export interface UserProfile {
  id: string;
  email: string;
  /** 제1전공 */
  major: string;
  /** 제2전공 (복수전공/전공심화, 없으면 null) */
  secondMajor: string | null;
  grade: number;
  enrollmentStatus: '재학' | '휴학';
}

/** 사용자 설정 */
export interface UserSettings {
  /** 메인 탭 순서 (사용자 커스터마이징) */
  categoryOrder: NoticeCategory[];
  /** 선택한 키워드 태그 목록 */
  tags: string[];
  notificationFrequency: NotificationFrequency;
  nightBlockEnabled: boolean;
}

// ─── API 응답 공통 래퍼 ─────────────────────────────────────────────

/**
 * 페이지네이션 응답 래퍼
 * 백엔드는 totalElements/totalPages 미지원 → hasNext만 사용
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  hasNext: boolean;
}

/** 즐겨찾기 토글 응답 */
export interface BookmarkToggleResponse {
  noticeId: number;
  isBookmarked: boolean;
}

/** 단일 아이템 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** API 에러 응답 */
export interface ApiError {
  code: string;
  message: string;
}
