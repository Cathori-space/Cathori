import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getDevicePushToken, requestNotificationPermission } from '@/src/services/notification';
import { registerDeviceToken } from '@/src/services/pushToken';
import { isCurrentSession } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';

export function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const sessionId = useAuthStore((s) => s.sessionId);

  const registeredRef = useRef<number | null>(null); // 등록여부 확인 플래그
  // 1) 로그인 직후 디바이스 토큰 등록
  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) {
      registeredRef.current = null; // 로그아웃 → 재로그인 시 재등록 가능하도록 리셋
      return;
    }
    if (registeredRef.current === sessionId) return;
    registeredRef.current = sessionId;
    const canHandle = () => isCurrentSession(sessionId) && useAuthStore.getState().status === 'authenticated';

    (async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted || !canHandle()) return;
        const token = await getDevicePushToken();
        if (!token || !canHandle()) return;
        // 테스트 중에는 콘솔에 찍힌 토큰을 복사해 DB users.device_token에 수기 입력할 수 있다.
        // console.log('[push] device token =', token);
        await registerDeviceToken(token);
      } catch {
        // 토큰 등록 실패해도 앱 흐름은 진행. 다음 accessToken 변화에서 재시도.
        if (canHandle()) registeredRef.current = null;
      }
    })();
  }, [accessToken, sessionId, status]);

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
