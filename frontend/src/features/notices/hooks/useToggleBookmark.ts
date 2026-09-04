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
 *  - ['search', ...] — 검색 목록의 isBookmarked 상태 갱신
 *  - ['bookmarkedNotices'] — 북마크 목록 갱신
 *  - ['notice', noticeId] — 상세 화면의 isBookmarked 상태 갱신
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import { toggleBookmark } from '@/src/services/notices';
import type { Notice, PageResponse } from '@/src/types/api';

/** 낙관적 업데이트 롤백용 컨텍스트 */
interface ToggleBookmarkContext {
  /** 낙관적 업데이트 전 스냅샷 (목록 캐시) */
  previousNoticesQueries: {
    queryKey: readonly unknown[];
    data: InfiniteData<PageResponse<Notice>> | undefined;
  }[];
  /** 낙관적 업데이트 전 스냅샷 (북마크 목록 캐시) */
  previousBookmarkedQueries: {
    queryKey: readonly unknown[];
    data: InfiniteData<PageResponse<Notice>> | undefined;
  }[];
  /** 낙관적 업데이트 전 스냅샷 (상세 캐시) */
  previousDetail: Notice | undefined;
}

function updateNoticeBookmarkInPages(
  data: InfiniteData<PageResponse<Notice>>,
  noticeId: string,
  isBookmarked: boolean,
): InfiniteData<PageResponse<Notice>> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: page.content.map((notice) =>
        notice.id === noticeId ? { ...notice, isBookmarked } : notice,
      ),
    })),
  };
}

function removeNoticeFromPages(
  data: InfiniteData<PageResponse<Notice>>,
  noticeId: string,
): InfiniteData<PageResponse<Notice>> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: page.content.filter((notice) => notice.id !== noticeId),
    })),
  };
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: string) => toggleBookmark(noticeId),

    onMutate: async (noticeId): Promise<ToggleBookmarkContext> => {
      // 진행 중인 관련 쿼리 취소 (충돌 방지)
      await queryClient.cancelQueries({ queryKey: ['notices'] });
      await queryClient.cancelQueries({ queryKey: ['bookmarkedNotices'] });
      await queryClient.cancelQueries({ queryKey: ['notice', noticeId] });

      // ── 목록 캐시 스냅샷 + 낙관적 업데이트 ──
      const noticesQueries = queryClient.getQueriesData<InfiniteData<PageResponse<Notice>>>({
        queryKey: ['notices'],
      });
      const bookmarkedQueries = queryClient.getQueriesData<InfiniteData<PageResponse<Notice>>>({
        queryKey: ['bookmarkedNotices'],
      });

      // getQueriesData가 반환하는 형태가 [queryKey, data][] 튜플 배열이기 때문에 매핑을 통해 분리
      const previousNoticesQueries = noticesQueries.map(([queryKey, data]) => ({
        queryKey,
        data,
      }));
      const previousBookmarkedQueries = bookmarkedQueries.map(([queryKey, data]) => ({
        queryKey,
        data,
      }));

      const previousDetail = queryClient.getQueryData<Notice>(['notice', noticeId]);
      const cachedNotice = noticesQueries
        .flatMap(([, data]) => data?.pages.flatMap((page) => page.content) ?? [])
        .find((notice) => notice.id === noticeId);
      const isCurrentlyBookmarked =
        previousDetail?.isBookmarked ?? cachedNotice?.isBookmarked ?? true;
      const nextIsBookmarked = !isCurrentlyBookmarked;

      // 모든 목록 캐시에서 해당 공지의 isBookmarked 반전
      noticesQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<InfiniteData<PageResponse<Notice>>>(
          queryKey,
          updateNoticeBookmarkInPages(data, noticeId, nextIsBookmarked),
        );
      });

      bookmarkedQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<InfiniteData<PageResponse<Notice>>>(
          queryKey,
          nextIsBookmarked
            ? updateNoticeBookmarkInPages(data, noticeId, true)
            : removeNoticeFromPages(data, noticeId),
        );
      });

      if (previousDetail) {
        queryClient.setQueryData<Notice>(['notice', noticeId], {
          ...previousDetail,
          isBookmarked: nextIsBookmarked,
        });
      }

      return { previousNoticesQueries, previousBookmarkedQueries, previousDetail };
    },

    onError: (_error, noticeId, context) => {
      if (!context) return;

      // 목록 캐시 롤백
      context.previousNoticesQueries.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });

      // 북마크 목록 캐시 롤백
      context.previousBookmarkedQueries.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });

      // 상세 캐시 롤백
      if (context.previousDetail) {
        queryClient.setQueryData(['notice', noticeId], context.previousDetail);
      }
    },

    onSuccess: (data, noticeId) => {
      const noticesQueries = queryClient.getQueriesData<InfiniteData<PageResponse<Notice>>>({
        queryKey: ['notices'],
      });
      const bookmarkedQueries = queryClient.getQueriesData<InfiniteData<PageResponse<Notice>>>({
        queryKey: ['bookmarkedNotices'],
      });

      noticesQueries.forEach(([queryKey, queryData]) => {
        if (!queryData) return;
        queryClient.setQueryData<InfiniteData<PageResponse<Notice>>>(
          queryKey,
          updateNoticeBookmarkInPages(queryData, noticeId, data.isBookmarked),
        );
      });

      bookmarkedQueries.forEach(([queryKey, queryData]) => {
        if (!queryData) return;
        queryClient.setQueryData<InfiniteData<PageResponse<Notice>>>(
          queryKey,
          data.isBookmarked
            ? updateNoticeBookmarkInPages(queryData, noticeId, true)
            : removeNoticeFromPages(queryData, noticeId),
        );
      });

      const previousDetail = queryClient.getQueryData<Notice>(['notice', noticeId]);
      if (previousDetail) {
        queryClient.setQueryData<Notice>(['notice', noticeId], {
          ...previousDetail,
          isBookmarked: data.isBookmarked,
        });
      }
    },

    onSettled: (_data, _error, noticeId) => {
      // 서버 상태와 동기화 — 성공/실패 불문
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarkedNotices'] });
      queryClient.invalidateQueries({ queryKey: ['notice', noticeId] });
    },
  });
}
