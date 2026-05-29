/**
 * useToggleBookmark — 즐겨찾기 토글 TanStack Query mutation 훅
 *
 * 동작 흐름:
 *  1. onMutate: 낙관적 업데이트 — 캐시에서 즉시 isBookmarked 반전 (체감 속도 향상)
 *  2. mutationFn: POST /api/notices/{id}/bookmark — 서버에서 토글 처리
 *  3. onError: 서버 실패 시 롤백 — 낙관적 업데이트 전 스냅샷으로 복원
 *  4. onSettled: 성공/실패 불문 캐시 무효화 — 서버 상태와 동기화
 *
 * 캐시 무효화 대상:
 *  - ['notices', ...] — 메인 목록의 isBookmarked 상태 갱신
 *  - ['notice', noticeId] — 상세 화면의 isBookmarked 상태 갱신
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toggleBookmark } from '@/src/services/notices';
import type { Notice, PageResponse } from '@/src/types/api';

/** 낙관적 업데이트 롤백용 컨텍스트 */
interface ToggleBookmarkContext {
  /** 낙관적 업데이트 전 스냅샷 (목록 캐시) */
  previousNoticesQueries: Array<{
    queryKey: readonly unknown[];
    data: PageResponse<Notice> | undefined;
  }>;
  /** 낙관적 업데이트 전 스냅샷 (상세 캐시) */
  previousDetail: Notice | undefined;
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: string) => toggleBookmark(noticeId),

    onMutate: async (noticeId): Promise<ToggleBookmarkContext> => {
      // 진행 중인 관련 쿼리 취소 (충돌 방지)
      await queryClient.cancelQueries({ queryKey: ['notices'] });
      await queryClient.cancelQueries({ queryKey: ['notice', noticeId] });

      // ── 목록 캐시 스냅샷 + 낙관적 업데이트 ──
      const noticesQueries = queryClient.getQueriesData<PageResponse<Notice>>({
        queryKey: ['notices'],
      });

      // getQueriesData가 반환하는 형태가 [queryKey, data][] 튜플 배열이기 때문에 매핑을 통해 분리
      const previousNoticesQueries = noticesQueries.map(([queryKey, data]) => ({
        queryKey,
        data,
      }));

      // 모든 목록 캐시에서 해당 공지의 isBookmarked 반전
      noticesQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<PageResponse<Notice>>(queryKey, {
          ...data,
          content: data.content.map((notice) =>
            notice.id === noticeId
              ? { ...notice, isBookmarked: !notice.isBookmarked }
              : notice,
          ),
        });
      });

      // ── 상세 캐시 스냅샷 + 낙관적 업데이트 ──
      const previousDetail = queryClient.getQueryData<Notice>(['notice', noticeId]);

      if (previousDetail) {
        queryClient.setQueryData<Notice>(['notice', noticeId], {
          ...previousDetail,
          isBookmarked: !previousDetail.isBookmarked,
        });
      }

      return { previousNoticesQueries, previousDetail };
    },

    onError: (_error, noticeId, context) => {
      if (!context) return;

      // 목록 캐시 롤백
      context.previousNoticesQueries.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });

      // 상세 캐시 롤백
      if (context.previousDetail) {
        queryClient.setQueryData(['notice', noticeId], context.previousDetail);
      }
    },

    onSettled: (_data, _error, noticeId) => {
      // 서버 상태와 동기화 — 성공/실패 불문
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice', noticeId] });
    },
  });
}
