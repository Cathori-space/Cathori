import { create } from 'axios';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import type { ReissueResponse } from '@/src/types/auth';

const refreshClient = create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });
let reissue: { sessionId: number; accessToken: Promise<string> } | null = null;

export function refreshSession(
  sessionId: number,
  refreshToken: string,
  save: (tokens: ReissueResponse) => Promise<void>,
): Promise<string> {
  if (reissue?.sessionId === sessionId) return reissue.accessToken;

  const response = refreshClient.post<ReissueResponse>('/api/auth/reissue', { refreshToken })
    .then(({ data }) => data)
    .catch(() => { throw new Error('인증을 갱신하지 못했습니다.'); });
  const accessToken = response.then(async (tokens) => {
    await save(tokens);
    return tokens.accessToken;
  }).finally(() => {
    if (reissue?.accessToken === accessToken) reissue = null;
  });
  reissue = { sessionId, accessToken };
  return accessToken;
}
