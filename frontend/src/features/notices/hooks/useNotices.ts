/**
 * useNotices — 공지 목록 조회 TanStack Query hook
 *
 * [정책 5/13] category/tag 모두 null(미선택) 가능.
 * 둘 다 null → 전체 공지, 하나만 선택 → 단일 필터, 둘 다 선택 → AND 필터
 */

import { useQuery } from '@tanstack/react-query';

import { NOTICE_PAGE_SIZE } from '@/src/constants/api';
import { getMockNotices } from '@/src/mocks/notices';
import type { Notice, NoticeCategory, PageResponse } from '@/src/types/api';

interface UseNoticesParams {
  category: NoticeCategory | null;
  tag: string | null;
  page?: number;
}

/**
 * 공지 목록을 조회한다.
 *
 * [자동 처리 — 직접 구현 불필요]
 * - 재요청: category/tag/page 중 하나라도 바뀌면 queryKey 변경 감지 후 자동 re-fetch
 * - 중복 제거: 같은 queryKey로 여러 컴포넌트가 동시에 마운트돼도 fetch는 1번만 실행
 * - 캐시: 동일 queryKey 결과를 메모리에 보관 → 같은 조건으로 돌아오면 즉시 반환
 * - 상태 관리: isLoading / isError / data 를 자동으로 관리 (useState 불필요)
 * - 재시도: fetch 실패 시 최대 3회 자동 재시도 (기본값)
 * - 정리: 컴포넌트 언마운트 시 진행 중인 요청 자동 취소 (메모리 누수 방지)
 */
export function useNotices({ category, tag, page = 1 }: UseNoticesParams) {
  return useQuery<PageResponse<Notice>>({
    queryKey: ['notices', category, tag, page],
    queryFn: () =>
      getMockNotices({
        category: category ?? undefined,
        tags: tag ?? undefined,
        page,
        size: NOTICE_PAGE_SIZE,
      }),
  });
}
