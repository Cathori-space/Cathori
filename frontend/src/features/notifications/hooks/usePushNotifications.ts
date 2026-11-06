import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError, isCancel } from 'axios';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getDevicePushToken, requestNotificationPermission } from '@/src/services/notification';
import { isPushSessionActive, registerDeviceToken } from '@/src/services/pushToken';
import { isCurrentSession } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';

const REGISTRATION_RETRY_DELAYS = [1_000, 3_000];

function canRetryRegistration(error: unknown) {
  if (!isAxiosError(error) || isCancel(error)) return false;
  const status = error.response?.status;
  return status === undefined || status === 408 || (status >= 500 && status <= 599);
}

export function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const registeredSession = useRef<number | null>(null);
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
    const canHandle = () => active && isCurrentSession(sessionId)
      && useAuthStore.getState().status === 'authenticated';
    const invalidate = () => {
      if (canHandle()) void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    const navigate = (response: Notifications.NotificationResponse) => {
      if (!canHandle()) return;
      const data = response.notification.request.content.data;
      const id = data?.noticeId;
      if ((typeof id === 'string' || typeof id === 'number') && /^[1-9]\d*$/.test(String(id))) {
        invalidate();
        router.push(`/notice/${id}` as Href);
      }
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const received = Notifications.addNotificationReceivedListener(invalidate);
    const tapped = Notifications.addNotificationResponseReceivedListener(navigate);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') invalidate();
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigate(response);
    }).catch(() => {});
    return () => {
      active = false;
      received.remove();
      tapped.remove();
      foreground.remove();
    };
  }, [status, sessionId, queryClient, router]);
}
