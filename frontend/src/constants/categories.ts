/**
 * 공지 카테고리 관련 상수
 * 대분류 태그 순서 및 소분류 태그 기본 목록 정의
 */

import type { NoticeCategory } from '@/src/types/api';

/** 대분류 탭 순서 (기본값) */
export const CATEGORY_TABS: NoticeCategory[] = ['일반', '장학', '학사', '취창업'];

/** 대분류별 소분류 태그 기본 목록 */
export const SUB_TAGS: Record<NoticeCategory, string[]> = {
  일반: ['#전체', '#학사일정', '#행사', '#공모전'],
  장학: ['#전체', '#국가장학', '#교내장학', '#근로장학생', '#등록금', '#외부장학'],
  학사: ['#전체', '#수강신청', '#졸업', '#성적', '#교환학생'],
  취창업: ['#전체', '#취업', '#인턴십', '#창업', '#공모전'],
};

/** 소분류 전체 선택 태그값 */
export const ALL_TAG = '#전체';
