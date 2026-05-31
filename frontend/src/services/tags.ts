/**
 * 태그 관리 API fetcher
 *
 * 백엔드 API 명세:
 *  - POST /api/tags { tagName } → { tagId, tagName }
 *  - DELETE /api/tags/{tagId} → 200 (본문 없음)
 *
 * TODO: 태그 정책 협의 더 필요
 * 
 * 정책:
 *  - 사용자당 최대 20개
 *  - tagName: 1~20자, 한글/영문/숫자만 허용
 *  - 중복 태그: 409 TAG_DUPLICATE
 */

import apiClient from './api';

// ─── 타입 ──────────────────────────────────────────────────────────

import type { UserTag } from '@/src/types/auth';

/** 태그 생성 요청 */
interface CreateTagRequest {
  tagName: string;
}

/** 태그 생성 응답 */
export interface CreateTagResponse {
  tagId: number;
  tagName: string;
}

// ─── 에러 코드 ────────────────────────────────────────────────────

export type TagErrorCode =
  | 'INVALID_INPUT'
  | 'TAG_LIMIT_EXCEEDED'
  | 'TAG_DUPLICATE'
  | 'TAG_NOT_FOUND';

/** 에러 응답에서 코드 추출 */
export function extractTagErrorCode(error: unknown): TagErrorCode | null {
  if (
    error != null &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const axiosError = error as { response?: { data?: { code?: string } } };
    const code = axiosError.response?.data?.code;
    if (code === 'INVALID_INPUT') return 'INVALID_INPUT';
    if (code === 'TAG_LIMIT_EXCEEDED') return 'TAG_LIMIT_EXCEEDED';
    if (code === 'TAG_DUPLICATE') return 'TAG_DUPLICATE';
    if (code === 'TAG_NOT_FOUND') return 'TAG_NOT_FOUND';
  }
  return null;
}

/** 에러 코드 → 한글 메시지 매핑 */
export function getTagErrorMessage(code: TagErrorCode): string {
  switch (code) {
    case 'INVALID_INPUT':
      return '태그명이 올바르지 않습니다 (1~20자, 한글/영문/숫자만)';
    case 'TAG_LIMIT_EXCEEDED':
      return '태그 개수 한도(20개)를 초과했습니다';
    case 'TAG_DUPLICATE':
      return '이미 등록된 태그입니다';
    case 'TAG_NOT_FOUND':
      return '태그를 찾을 수 없습니다';
  }
}

// ─── API 호출 ─────────────────────────────────────────────────────

/**
 * 태그 생성
 * POST /api/tags
 */
export async function createTag(tagName: string): Promise<CreateTagResponse> {
  const body: CreateTagRequest = { tagName };
  const { data } = await apiClient.post<CreateTagResponse>('/api/tags', body);
  return data;
}

/**
 * 태그 삭제
 * DELETE /api/tags/{tagId}
 */
export async function deleteTag(tagId: number): Promise<void> {
  await apiClient.delete(`/api/tags/${tagId}`);
}

/**
 * 태그 목록 전체 조회
 * GET /api/tags
 */
export async function getTags(): Promise<UserTag[]> {
  const { data } = await apiClient.get<UserTag[]>('/api/tags');
  return data;
}
