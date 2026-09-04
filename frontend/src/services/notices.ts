/**
 * 공지 서비스 레이어 — 실제 백엔드 API fetcher
 *
 * Mock 전환 방법:
 *   훅에서 import 경로만 교체하면 됨
 *   import { fetchNotices } from '@/src/services/notices';
 *   ↓ (Mock으로 되돌릴 때)
 *   import { getMockNotices } from '@/src/mocks/notices';
 *
 * 매핑 규칙 (백엔드 → 프론트):
 *   noticeId (number)  → id (string)
 *   publishedAt        → postedAt
 *   viewCount 미포함   → 기본값 0
 *   tags 미포함        → 기본값 []
 *   aiSummary          → JSON 배열 문자열 그대로 전달 (파싱은 컴포넌트에서)
 *
 * JWT 토큰:
 *   apiClient 인터셉터에서 자동 주입 (Sprint 2 활성화 예정)
 *   현재 TODO 주석 상태 — useAuthStore 연동 시 주석 해제만 하면 됨
 */

import apiClient from '@/src/services/api';
import type {
  BookmarkToggleResponse,
  BookmarkedNoticeListParams,
  Notice,
  NoticeCategory,
  NoticeListParams,
  NoticeSearchParams,
  PageResponse,
  SearchNoticeListItem,
} from '@/src/types/api';

/** 허용되는 카테고리 enum (백엔드 협의: enum 외 값은 null로 변환) */
const KNOWN_CATEGORIES: readonly NoticeCategory[] = ['일반', '장학', '학사', '취창업'];

/** 백엔드 category 문자열을 NoticeCategory | null로 정규화 */
function normalizeCategory(raw: string | null | undefined): NoticeCategory | null {
  if (raw == null) return null;
  return (KNOWN_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as NoticeCategory)
    : null;
}

// ─── 백엔드 응답 원본 타입 (매핑 전) ────────────────────────────────

/** 백엔드 공지 목록 응답의 개별 아이템 */
interface BackendNoticeListItem {
  noticeId: string;
  category: string;
  title: string;
  department: string;
  publishedAt: string;
  aiSummary: string | null;
  aiSummaryStatus?: string;
  url: string;
  deadlineAt?: string | null;
  isBookmarked: boolean;
  tags?: string[];
}

/**
 * 백엔드 공지 검색 응답의 슬림 아이템
 * 목록/상세보다 적은 슬림 아이템 — aiSummary/url/tags 미포함
 * (검색 결과는 행 단위 빠른 스캔 UX, 행 탭 시 상세에서 재조회)
 */
interface BackendSearchListItem {
  noticeId: string;
  category: string;
  title: string;
  department: string;
  publishedAt: string;
  deadlineAt?: string | null;
  isBookmarked: boolean;
}

/** 백엔드 공지 상세 응답 */
interface BackendNoticeDetail {
  noticeId: string;
  category: string;
  title: string;
  department: string;
  publishedAt: string;
  aiSummary: string | null;
  aiSummaryStatus: string;
  url: string;
  viewCount: number;
  deadlineAt?: string | null;
  isBookmarked: boolean;
}

/** 백엔드 페이지 응답 래퍼 */
interface BackendPageResponse<T> {
  content: T[];
  page: number;
  size: number;
  hasNext: boolean;
}

// ─── 매핑 함수 ──────────────────────────────────────────────────────

/** 백엔드 목록 아이템 → 프론트 Notice 변환 */
function mapListItemToNotice(item: BackendNoticeListItem): Notice {
  return {
    id: item.noticeId,
    title: item.title,
    category: normalizeCategory(item.category),
    department: item.department,
    postedAt: item.publishedAt,
    url: item.url,
    aiSummary: item.aiSummary,
    aiSummaryStatus: (item.aiSummaryStatus as Notice['aiSummaryStatus']) ?? 'PENDING',
    deadlineAt: item.deadlineAt ?? null,
    isBookmarked: item.isBookmarked,
    // 백엔드 미포함 시 기본값
    viewCount: 0,
    tags: item.tags ?? [],
  };
}

/** 백엔드 검색 슬림 아이템 → 프론트 SearchNoticeListItem */
function mapSearchItem(item: BackendSearchListItem): SearchNoticeListItem {
  return {
    id: item.noticeId,
    category: normalizeCategory(item.category),
    title: item.title,
    department: item.department,
    postedAt: item.publishedAt,
    deadlineAt: item.deadlineAt ?? null,
    isBookmarked: item.isBookmarked,
  };
}

/** 백엔드 상세 응답 → 프론트 Notice 변환 */
function mapDetailToNotice(detail: BackendNoticeDetail): Notice {
  return {
    id: detail.noticeId,
    title: detail.title,
    category: normalizeCategory(detail.category),
    department: detail.department,
    postedAt: detail.publishedAt,
    url: detail.url,
    aiSummary: detail.aiSummary,
    aiSummaryStatus: detail.aiSummaryStatus as Notice['aiSummaryStatus'],
    deadlineAt: detail.deadlineAt ?? null,
    isBookmarked: detail.isBookmarked,
    viewCount: detail.viewCount,
    tags: [],
  };
}

// ─── Fetcher 함수 ──────────────────────────────────────────────────

/**
 * 공지 목록 조회 fetcher
 * 프론트 page는 1-based → API 호출 시 0-based로 변환
 */
export async function fetchNotices(
  params: NoticeListParams,
): Promise<PageResponse<Notice>> {
  const { data } = await apiClient.get<BackendPageResponse<BackendNoticeListItem>>(
    '/api/notices',
    {
      params: {
        category: params.category,
        tags: params.tags,
        page: params.page - 1, // 프론트 1-based → 백엔드 0-based
        size: params.size,
      },
    },
  );

  return {
    content: data.content.map(mapListItemToNotice),
    page: data.page + 1, // 백엔드 0-based → 프론트 1-based로 복원
    size: data.size,
    hasNext: data.hasNext,
  };
}

/**
 * 로그인 사용자의 북마크 공지 목록 조회 fetcher
 * 프론트 page는 1-based → API 호출 시 0-based로 변환
 */
export async function fetchBookmarkedNotices(
  params: BookmarkedNoticeListParams,
): Promise<PageResponse<Notice>> {
  const { data } = await apiClient.get<BackendPageResponse<BackendNoticeListItem>>(
    '/api/notices/bookmarks',
    {
      params: {
        page: params.page - 1,
        size: params.size,
      },
    },
  );

  return {
    content: data.content.map(mapListItemToNotice),
    page: data.page + 1,
    size: data.size,
    hasNext: data.hasNext,
  };
}

/**
 * 공지 상세 조회 fetcher
 */
export async function fetchNoticeById(id: string): Promise<Notice> {
  const { data } = await apiClient.get<BackendNoticeDetail>(
    `/api/notices/${id}`,
  );

  return mapDetailToNotice(data);
}

/**
 * 공지 검색 fetcher — 슬림 응답
 * - URL: /api/notices/search (백엔드 실제 구현 기준)
 * - 반환: PageResponse<SearchNoticeListItem> — Pick으로 좁힌 슬림 타입
 * - 페이지 양방향 변환: 요청 page-1, 응답 page+1
 */
export async function fetchSearchNotices(
  params: NoticeSearchParams,
): Promise<PageResponse<SearchNoticeListItem>> {
  const { data } = await apiClient.get<BackendPageResponse<BackendSearchListItem>>(
    '/api/notices/search',
    {
      params: {
        q: params.q,
        page: params.page - 1, // 프론트 1-based → 백엔드 0-based
        size: params.size,
      },
    },
  );

  return {
    content: data.content.map(mapSearchItem),
    page: data.page + 1, // 백엔드 0-based → 프론트 1-based로 복원
    size: data.size,
    hasNext: data.hasNext,
  };
}

/**
 * 즐겨찾기 토글 fetcher — 단일 POST
 *
 * 정책: 등록/해제를 별도 엔드포인트로 분리하지 않고, 동일 POST 호출이
 * 현재 상태의 반대를 적용. 응답의 `isBookmarked`가 토글 후 최종 상태.
 *
 * 호출 예시 (인증 활성화 후 Sprint 2):
 *   const mutation = useMutation({
 *     mutationFn: toggleBookmark,
 *     onMutate: async (noticeId) => {
 *       // 낙관적 업데이트: 캐시에서 현재 isBookmarked 즉시 반전
 *     },
 *     onError: (_err, _id, ctx) => {
 *       // 롤백
 *     },
 *     onSettled: () => queryClient.invalidateQueries(...),
 *   });
 * 
 * TODO: 추후 헬퍼 함수 noticeId -> id가 일관성 있게 되도록 수정
 */
export async function toggleBookmark(
  noticeId: string
): Promise<BookmarkToggleResponse> {
  const { data } = await apiClient.post<BookmarkToggleResponse>(
    `/api/notices/${noticeId}/bookmark`,
  );

  return data;
}
