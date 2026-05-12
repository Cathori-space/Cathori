/**
 * 공지 Mock 데이터 — 백엔드 API 준비 전 UI 개발용
 * 실제 API 연동 시 이 파일의 fetcher 함수만 교체하면 됨
 */

import type { Notice, PageResponse } from '@/src/types/api';

export const MOCK_NOTICES: Notice[] = [
  {
    id: '1',
    title: '2026학년도 1학기 국가장학금 신청 안내',
    sourceType: 'MAIN',
    category: '장학',
    department: '학생지원팀',
    url: 'https://www.catholic.ac.kr/ko/campuslife/notice.do',
    postedAt: '2026-03-28',
    createdAt: '2026-03-28T09:05:00Z',
    viewCount: 1240,
    aiSummary:
      '• 1차 신청 기간은 4월 15일까지입니다.\n• 성적 기준 충족 시 최대 전액 수혜 가능합니다.\n• 한국장학재단 앱 또는 홈페이지에서 신청하세요.\n• 소득분위 8구간 이하 학생이 대상입니다.',
    aiSummaryStatus: 'DONE',
    deadlineAt: '2026-04-15',
    tags: ['국가장학', '장학금'],
    isBookmarked: false,
  },
  {
    id: '2',
    title: '2026 하계 해외 연수 프로그램 참가자 모집',
    sourceType: 'MAIN',
    category: '취창업',
    department: '국제교류팀',
    url: 'https://www.catholic.ac.kr/ko/campuslife/notice.do',
    postedAt: '2026-03-27',
    createdAt: '2026-03-27T10:05:00Z',
    viewCount: 834,
    aiSummary:
      '• 미국, 영국, 독일 등 12개국 24개 대학 협약 프로그램입니다.\n• 어학 성적 우수자가 우대됩니다.\n• 장학생으로 선발 시 항공료 및 현지 생활비 일부 지원됩니다.',
    aiSummaryStatus: 'DONE',
    deadlineAt: null,
    tags: ['교환학생', '해외연수'],
    isBookmarked: false,
  },
  {
    id: '3',
    title: '성적우수 핵심인재 장학금 지급 규정 변경',
    sourceType: 'MAIN',
    category: '학사',
    department: '교무팀',
    url: 'https://www.catholic.ac.kr/ko/campuslife/notice.do',
    postedAt: '2026-03-26',
    createdAt: '2026-03-26T11:05:00Z',
    viewCount: 567,
    aiSummary:
      '• 직전 학기 평점 평균 4.0 이상 대상자 중 상위 5% 이내 지급으로 요건이 강화되었습니다.\n• 변경 시점은 2026학년도 1학기부터입니다.\n• 이의신청 기간은 3월 30일까지입니다.',
    aiSummaryStatus: 'DONE',
    deadlineAt: '2026-04-09',
    tags: ['장학금', '성적우수'],
    isBookmarked: true,
  },
  {
    id: '4',
    title: '2026-1학기 수강신청 정정 기간 안내',
    sourceType: 'MAIN',
    category: '학사',
    department: '교학처',
    url: 'https://www.catholic.ac.kr/ko/campuslife/notice.do',
    postedAt: '2026-03-08',
    createdAt: '2026-03-08T09:05:00Z',
    viewCount: 2103,
    // AI 요약 생성 중 상태 예시 — PENDING일 때 UI 스켈레톤 표시
    aiSummary: null,
    aiSummaryStatus: 'PENDING',
    deadlineAt: '2026-03-14',
    tags: ['수강신청'],
    isBookmarked: false,
  },
  {
    id: '5',
    title: '2026 캡스톤디자인 경진대회 참가팀 모집',
    sourceType: 'MAIN',
    category: '일반',
    department: '산학협력단',
    url: 'https://www.catholic.ac.kr/ko/campuslife/notice.do',
    postedAt: '2026-04-01',
    createdAt: '2026-04-01T09:05:00Z',
    viewCount: 451,
    aiSummary:
      '• 접수 기간: 4월 30일까지\n• 팀당 3~5명 구성, 지도교수 필수\n• 우수팀에게 총장상 및 장학금 수여',
    aiSummaryStatus: 'DONE',
    deadlineAt: '2026-04-30',
    tags: ['공모전', '캡스톤'],
    isBookmarked: false,
  },
];

/**
 * 공지 목록 Mock fetcher
 * 실제 API로 교체 시 이 함수만 수정
 */
export function getMockNotices(params: {
  category?: string;
  tags?: string;
  page: number;
  size: number;
}): PageResponse<Notice> {
  // 카테고리 필터
  let filtered = MOCK_NOTICES;
  if (params.category) {
    filtered = filtered.filter((n) => n.category === params.category);
  }
  // 태그 필터
  if (params.tags && params.tags !== '#전체') {
    const tagKeyword = params.tags.replace('#', '');
    filtered = filtered.filter((n) =>
      n.tags.some((t) => t.includes(tagKeyword)),
    );
  }

  const start = (params.page - 1) * params.size;
  const content = filtered.slice(start, start + params.size);

  return {
    content,
    page: params.page,
    size: params.size,
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / params.size),
    hasNext: start + params.size < filtered.length,
  };
}

