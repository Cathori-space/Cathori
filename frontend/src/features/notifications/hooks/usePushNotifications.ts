import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDevicePushToken, requestNotificationPermission } from '@/src/services/notification';
import { markNotificationReadByNoticeId } from '@/src/services/notifications';
import { registerDeviceToken } from '@/src/services/pushToken';
import { isCurrentSession } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';

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
