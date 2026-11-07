import publicApiClient from '@/src/services/publicApi';
import type { AiSummaryStatus, Notice, NoticeCategory, NoticeListParams, NoticeSearchParams, PageResponse, SearchNoticeListItem } from '@/src/types/api';

export interface PublicSearchItem {
  noticeId: string;
  category: string;
  title: string;
  department: string;
  publishedAt: string;
  deadlineAt: string | null;
}

export interface PublicNotice extends PublicSearchItem {
  aiSummary: string | null;
  aiSummaryStatus: string;
  url: string;
  viewCount: number;
}

const CATEGORIES: readonly string[] = ['일반', '장학', '학사', '취창업'];
const STATUSES: readonly string[] = ['PENDING', 'SUCCESS', 'SKIPPED', 'FAILED'];

export function mapPublicSearchItem(item: PublicSearchItem): SearchNoticeListItem {
  return {
    id: item.noticeId,
    category: CATEGORIES.includes(item.category) ? item.category as NoticeCategory : null,
    title: item.title,
    department: item.department,
    postedAt: item.publishedAt,
    deadlineAt: item.deadlineAt ?? null,
    isBookmarked: false,
  };
}

export function mapPublicNotice(item: PublicNotice): Notice {
  const status = STATUSES.includes(item.aiSummaryStatus) ? item.aiSummaryStatus as AiSummaryStatus : 'FAILED';
  return {
    ...mapPublicSearchItem(item),
    aiSummary: status === 'SUCCESS' ? item.aiSummary : null,
    aiSummaryStatus: status,
    url: item.url,
    viewCount: item.viewCount,
    tags: [],
  };
}

export async function fetchPublicNotices(params: NoticeListParams, signal?: AbortSignal): Promise<PageResponse<Notice>> {
  const { data } = await publicApiClient.get<PageResponse<PublicNotice>>('/api/public/notices', {
    params: { category: params.category, page: params.page - 1, size: params.size }, signal,
  });
  return { ...data, page: data.page + 1, content: data.content.map(mapPublicNotice) };
}

export async function fetchPublicSearchNotices(params: NoticeSearchParams, signal?: AbortSignal): Promise<PageResponse<SearchNoticeListItem>> {
  const { data } = await publicApiClient.get<PageResponse<PublicSearchItem>>('/api/public/notices/search', {
    params: { q: params.q.trim(), page: params.page - 1, size: params.size }, signal,
  });
  return { ...data, page: data.page + 1, content: data.content.map(mapPublicSearchItem) };
}

export async function fetchPublicNoticeById(id: string, signal?: AbortSignal): Promise<Notice> {
  const { data } = await publicApiClient.get<PublicNotice>(`/api/public/notices/${encodeURIComponent(id)}`, { signal });
  return mapPublicNotice(data);
}
