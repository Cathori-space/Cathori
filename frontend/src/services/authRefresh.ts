import { create } from 'axios';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import type { ReissueResponse } from '@/src/types/auth';

const refreshClient = create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });
let reissue: { sessionId: number; response: Promise<ReissueResponse>; accessToken: Promise<string> } | null = null;

export function getPendingRefresh(sessionId: number) {
  return reissue?.sessionId === sessionId ? reissue.response : undefined;
}

export function refreshSession(
  sessionId: number,
  refreshToken: string,
  save: (tokens: ReissueResponse) => Promise<void>,
): Promise<string> {
  if (reissue?.sessionId === sessionId) return reissue.accessToken;

  // 이미 전송된 재발급의 응답은 로그아웃에서 사용할 수 있다. 저장은 세션을 확인한 호출부에서만 한다.
  const response = refreshClient.post<ReissueResponse>('/api/auth/reissue', { refreshToken })
    .then(({ data }) => data)
    .catch(() => { throw new Error('인증을 갱신하지 못했습니다.'); });
  const accessToken = response.then(async (tokens) => {
    await save(tokens);
    return tokens.accessToken;
  }).finally(() => {
    if (reissue?.response === response) reissue = null;
  });
  reissue = { sessionId, response, accessToken };
  return accessToken;
}
