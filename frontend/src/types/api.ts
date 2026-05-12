/**
 * Cathori API 공통 타입 정의
 * 백엔드 계약(CLAUDE.md API Endpoints) 기반
 */

// ─── 도메인 타입 ────────────────────────────────────────────────────

/** 공지 대분류 카테고리 */
export type NoticeCategory = '일반' | '장학' | '학사' | '취창업';

/** 공지 출처 레벨 — ERD v2 source_type 허용값 */
export type SourceType = 'MAIN' | 'DEPARTMENT';
// COMMUNITY(인스타그램/에브리타임)는 아키텍처만 설계, MVP 미구현

/**
 * AI 요약 생성 상태 — ERD v2 ai_summary_status 허용값
 * - PENDING: 요약 생성 전 (최초 조회 시)
 * - PROCESSING: 생성 중
 * - DONE: 생성 완료
 * - FAILED: 생성 실패
 */
export type AiSummaryStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

/** 공지 알림 빈도 */
export type NotificationFrequency = 'INSTANT' | 'DAILY'; // * 향후 변경 가능성 있음

// ─── 공지 타입 ──────────────────────────────────────────────────────

/** 공지 엔티티 — ERD v2 notice 테이블 기준 */
export interface Notice {
  id: string;
  title: string;
  /** 공지 출처 타입 (MAIN: 학교 공식, DEPARTMENT: 학과) */
  sourceType: SourceType;
  category: NoticeCategory;
  /** 작성 부서 (ERD NOT NULL) */
  department: string;
  /** 공지 원문 링크 */
  url: string;
  /** 공지 원문 등록일 (ISO 8601 date) */
  postedAt: string;
  /** DB 저장 시각 (ISO 8601 timestamp) */
  createdAt: string;
  /** 조회수 */
  viewCount: number;

  // ─── AI 요약 관련 ────────────────────────────────────────────────
  /** AI 요약 결과 — DONE 상태일 때만 존재 */
  aiSummary: string | null;
  /** AI 요약 생성 상태 */
  aiSummaryStatus: AiSummaryStatus;

  // ─── 선택적 필드 ────────────────────────────────────────────────
  /** 마감일 — ERD v2 deadline_at, 없으면 null */
  deadlineAt: string | null;
  /** 공지 본문 텍스트 — 상세 화면에서만 사용, ERD v2 body_text */
  bodyText?: string | null;
  /** 공지 이미지 URL 목록 — ERD v2 image_urls (JSON 문자열로 저장) */
  imageUrls?: string[] | null;

  // ─── API 조합 필드 (tags는 추후에 ERD가 수정되더라도 api를 통해서 보내주는 걸로 유지될 예정) ──────
  /** 백엔드에서 매칭한 태그 목록 */
  tags: string[];
  /** 즐겨찾기 여부 — 로그인 사용자 기준, erd에 추후에 추가하기로 합의함 */
  isBookmarked: boolean;
}

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

/** 페이지네이션 응답 래퍼 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/** 단일 아이템 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}
