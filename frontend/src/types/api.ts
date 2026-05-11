/**
 * Cathori API 공통 타입 정의
 * 백엔드 계약(CLAUDE.md API Endpoints) 기반
 */

// ─── 도메인 타입 ────────────────────────────────────────────────────

/** 공지 대분류 카테고리 */
export type NoticeCategory = '일반' | '장학' | '학사' | '취창업';

/** 공지 출처 레벨 */
export type SourceLevel = 'UNIVERSITY' | 'DEPARTMENT';
// COMMUNITY(인스타그램/에브리타임)는 아키텍처만 설계, MVP 미구현

/** 공지 알림 빈도 */
export type NotificationFrequency = 'INSTANT' | 'DAILY'; // * 향후 변경 가능성 있음

// ─── 공지 타입 ──────────────────────────────────────────────────────

/** 공지 엔티티 */
export interface Notice {
  id: string;
  title: string;
  /** 공지 본문 (상세 화면에서만 사용) */
  content?: string;
  /** AI 요약 — lazy 생성, 첫 진입 시 null일 수 있음 */
  summary?: string | null;
  category: NoticeCategory;
  tags: string[];
  sourceLevel: SourceLevel;
  sourceUrl: string;
  publishedAt: string;   // ISO 8601
  /** 마감일 — AI가 본문에서 추출, 없으면 undefined */
  deadlineAt?: string;   // ISO 8601
  crawledAt: string;
  /** 즐겨찾기 여부 (로그인 사용자 기준) */
  isBookmarked: boolean;
  /** 조회수 */
  viewCount?: number;
  /** 작성 부서 */
  department?: string;
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
