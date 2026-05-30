/**
 * useTags — 태그 추가/삭제 TanStack Query mutation 훅
 *
 * 동작 흐름:
 *  - useCreateTag: POST /api/tags → 낙관적 업데이트 → useAuthStore.updateTags
 *  - useDeleteTag: DELETE /api/tags/{tagId} → 낙관적 업데이트 → useAuthStore.updateTags
 *
 * 정책:
 *  - 별도 "저장" 버튼 없음 — 추가/삭제 즉시 서버 반영 (낙관적 업데이트)
 *  - 실패 시 롤백 — 이전 태그 목록으로 복원
 *  - useAuthStore.tags를 단일 진실 원천(Single Source of Truth)으로 사용
 */

import { useMutation } from '@tanstack/react-query';

import {
  createTag,
  deleteTag,
  extractTagErrorCode,
  getTagErrorMessage,
} from '@/src/services/tags';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { UserTag } from '@/src/types/auth';

// ─── 태그 추가 훅 ────────────────────────────────────────────────

interface CreateTagContext {
  /** 낙관적 업데이트 전 태그 목록 */
  previousTags: UserTag[];
}

export function useCreateTag() {
  const tags = useAuthStore((s) => s.tags);
  const updateTags = useAuthStore((s) => s.updateTags);

  return useMutation({
    mutationFn: createTag,

    onMutate: (tagName): CreateTagContext => {
      const previousTags = [...tags];

      // 낙관적 업데이트 — 임시 tagId로 즉시 UI 반영
      const optimisticTag: UserTag = {
        tagId: -Date.now(), // 음수 임시 ID (서버 응답으로 교체됨)
        tagName,
      };
      updateTags([...tags, optimisticTag]);

      return { previousTags };
    },

    onSuccess: (data) => {
      // 서버 응답의 진짜 tagId로 교체
      const currentTags = useAuthStore.getState().tags;
      const updatedTags = currentTags.map((tag) =>
        tag.tagId < 0 && tag.tagName === data.tagName
          ? { tagId: data.tagId, tagName: data.tagName }
          : tag,
      );
      updateTags(updatedTags);
    },

    onError: (_error, _tagName, context) => {
      // 롤백
      if (context) {
        updateTags(context.previousTags);
      }
    },
  });
}

// ─── 태그 삭제 훅 ────────────────────────────────────────────────

interface DeleteTagContext {
  /** 낙관적 업데이트 전 태그 목록 */
  previousTags: UserTag[];
}

export function useDeleteTag() {
  const tags = useAuthStore((s) => s.tags);
  const updateTags = useAuthStore((s) => s.updateTags);

  return useMutation({
    mutationFn: deleteTag,

    onMutate: (tagId): DeleteTagContext => {
      const previousTags = [...tags];

      // 낙관적 삭제 — 즉시 UI에서 제거
      updateTags(tags.filter((tag) => tag.tagId !== tagId));

      return { previousTags };
    },

    onError: (_error, _tagId, context) => {
      // 롤백
      if (context) {
        updateTags(context.previousTags);
      }
    },
  });
}

// ─── 에러 유틸 re-export ─────────────────────────────────────────

export { extractTagErrorCode, getTagErrorMessage };
