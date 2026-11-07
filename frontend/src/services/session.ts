import { CanceledError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

let sessionId = 0;
let controller = new AbortController();

export const getSessionId = () => sessionId;
export const isCurrentSession = (id: number) => id === sessionId;

export function assertCurrentSession(id: number) {
  if (!isCurrentSession(id)) throw new CanceledError('이전 세션의 요청입니다.');
}

export function rotateSession() {
  sessionId += 1;
  controller.abort();
  controller = new AbortController();
  return sessionId;
}

export type SessionConfig = InternalAxiosRequestConfig & {
  sessionId?: number;
  requestSignal?: InternalAxiosRequestConfig['signal'];
  releaseSessionSignal?: () => void;
};

export function installSessionInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config: SessionConfig) => {
    if (config.sessionId === undefined) {
      config.sessionId = sessionId;
      config.requestSignal = config.signal;
    }
    assertCurrentSession(config.sessionId);
    const requestController = new AbortController();
    const signals = [controller.signal, config.requestSignal];
    const abort = () => requestController.abort();
    signals.forEach((signal) => {
      if (signal?.aborted) abort();
      else signal?.addEventListener?.('abort', abort);
    });
    config.signal = requestController.signal;
    config.releaseSessionSignal = () => {
      signals.forEach((signal) => signal?.removeEventListener?.('abort', abort));
    };
    return config;
  });
  client.interceptors.response.use(
    (response) => {
      const config = response.config as SessionConfig;
      config.releaseSessionSignal?.();
      assertCurrentSession(config.sessionId!);
      return response;
    },
    (error) => {
      const config = error.config as SessionConfig | undefined;
      config?.releaseSessionSignal?.();
      if (config?.sessionId !== undefined) assertCurrentSession(config.sessionId);
      return Promise.reject(error);
    },
  );
}
