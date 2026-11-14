import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError, isCancel } from 'axios';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDevicePushToken, requestNotificationPermission } from '@/src/services/notification';
import { markNotificationReadByNoticeId } from '@/src/services/notifications';
import { invalidateDevicePushToken } from '@/src/services/pushDevice';
import { isPushSessionActive, registerDeviceToken } from '@/src/services/pushToken';
import { isCurrentSession } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';

const REGISTRATION_RETRY_DELAYS = [1_000, 3_000];

function canRetryRegistration(error: unknown) {
  if (!isAxiosError(error) || isCancel(error)) return false;
  const status = error.response?.status;
  return status === undefined || status === 408 || (status >= 500 && status <= 599);
}

/** 알림 payload의 noticeId를 안전하게 숫자로 변환 */
function getNoticeId(data: unknown): number | null {
  if (data != null && typeof data === 'object' && 'noticeId' in data) {
    const rawNoticeId = (data as { noticeId?: unknown }).noticeId;
    const noticeId = Number(rawNoticeId);
    if (Number.isSafeInteger(noticeId) && noticeId > 0) return noticeId;
  }
  return null;
}

export function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const registeredSession = useRef<number | null>(null);
  const rotatedForConflict = useRef<number | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const sessionId = useAuthStore((s) => s.sessionId);

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) {
      registeredSession.current = null;
      return;
    }
    if (registeredSession.current === sessionId) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let registering = false;
    let recoverOnForeground = false;
    const canHandle = () => active && isCurrentSession(sessionId)
      && isPushSessionActive(sessionId)
      && useAuthStore.getState().status === 'authenticated';
    const submit = async (token: string, attempt = 0) => {
      if (!canHandle()) return;
      registering = true;
      try {
        await registerDeviceToken(token, sessionId);
        if (canHandle()) registeredSession.current = sessionId;
        recoverOnForeground = false;
      } catch (error) {
        if (canHandle() && isAxiosError(error) && error.response?.status === 409
            && error.response.data?.code === 'DEVICE_TOKEN_OWNERSHIP_CONFLICT'
            && rotatedForConflict.current !== sessionId) {
          rotatedForConflict.current = sessionId;
          try {
            await invalidateDevicePushToken().completion;
            const replacement = canHandle() ? await getDevicePushToken() : null;
            if (replacement && replacement !== token) await submit(replacement);
          } catch {
            // 저장한 기기 정리 의도는 다음 실행 또는 로그인에서 재시도한다.
          }
          return;
        }
        recoverOnForeground = canHandle() && canRetryRegistration(error);
        const delay = REGISTRATION_RETRY_DELAYS[attempt];
        if (recoverOnForeground && delay !== undefined) {
          retryTimer = setTimeout(() => {
            retryTimer = undefined;
            void submit(token, attempt + 1);
          }, delay);
        }
      } finally {
        registering = false;
      }
    };
    const start = async () => {
      if (!canHandle() || registering || retryTimer !== undefined || registeredSession.current === sessionId) return;
      registering = true;
      try {
        const granted = await requestNotificationPermission();
        if (!granted || !canHandle()) return;
        const token = await getDevicePushToken();
        if (!token || !canHandle()) return;
        await submit(token);
      } catch {
        // 권한 확인 실패는 다음 인증 상태 변경이나 앱 재시작 시 다시 확인한다.
      } finally {
        registering = false;
      }
    };
    void start();
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active' && recoverOnForeground) void start();
    });
    return () => {
      active = false;
      clearTimeout(retryTimer);
      foreground.remove();
    };
  }, [status, sessionId, accessToken]);

  useEffect(() => {
    if (status !== 'authenticated') {
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      return;
    }
    let active = true;
    let previousAppState: AppStateStatus = AppState.currentState;
    const handledNotificationIds = new Set<string>();
    const canHandle = () => active && isCurrentSession(sessionId)
      && useAuthStore.getState().status === 'authenticated';
    const invalidate = () => {
      if (canHandle()) void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    const navigate = async (response: Notifications.NotificationResponse) => {
      if (!canHandle()) return;
      const notificationId = response.notification.request.identifier;
      if (handledNotificationIds.has(notificationId)) return;
      const noticeId = getNoticeId(response.notification.request.content.data);
      if (noticeId == null) return;
      handledNotificationIds.add(notificationId);

      try {
        await markNotificationReadByNoticeId(noticeId);
      } catch {
        // 저장 실패 시 서버의 미읽음 상태를 유지하되 공지 상세 이동은 허용한다.
      } finally {
        // 읽음 처리 중 계정이 전환되면 이전 세션의 화면 이동과 캐시 갱신을 막는다.
        if (canHandle()) {
          invalidate();
          router.push(`/notice/${noticeId}` as Href);
          void Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      }
    };
    const received = Notifications.addNotificationReceivedListener(invalidate);
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      void navigate(response);
    });
    const foreground = AppState.addEventListener('change', (state) => {
      const wasBackground = previousAppState.match(/inactive|background/);
      previousAppState = state;
      if (wasBackground && state === 'active') invalidate();
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void navigate(response);
    }).catch(() => {});
    return () => {
      active = false;
      received.remove();
      tapped.remove();
      foreground.remove();
    };
  }, [status, sessionId, queryClient, router]);
}
