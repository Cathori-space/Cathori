import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteToken, getAPNSToken, getMessaging, getToken, registerDeviceForRemoteMessages, setAPNSToken, setAutoInitEnabled, unregisterDeviceForRemoteMessages } from '@react-native-firebase/messaging';
import { CanceledError } from 'axios';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const RESET_REQUIRED_KEY = 'cathori-push-reset-required';
const APNS_REGISTRATION_TIMEOUT_MS = 10_000;
let nativeTask: Promise<unknown> = Promise.resolve();
let resetRequired = false;
let issuedToken: string | null = null;
let retiredToken: string | null = null;

function enqueueNative<T>(operation: () => Promise<T>): Promise<T> {
  const pending = nativeTask.then(operation, operation);
  nativeTask = pending.catch(() => {});
  return pending;
}

async function withApnsTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // APNs 응답이 없어도 다음 세션의 기기 정리 큐를 무기한 막지 않는다.
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(
          new Error('APNs 기기 등록 응답을 기다리는 시간이 초과됐습니다.'),
          { code: 'push/apns-registration-timeout' },
        )), APNS_REGISTRATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function resetDeviceRegistration() {
  const messaging = getMessaging();
  const failures: unknown[] = [];
  // 삭제 실패를 재실행 후에도 기억하여 이전 회원의 토큰을 새 회원에게 등록하지 않는다.
  const operations = [
    () => AsyncStorage.setItem(RESET_REQUIRED_KEY, 'true'),
    () => setAutoInitEnabled(messaging, false),
    () => deleteToken(messaging),
    ...(Platform.OS === 'ios' ? [() => unregisterDeviceForRemoteMessages(messaging)] : []),
    () => Notifications.dismissAllNotificationsAsync(),
    () => Notifications.clearLastNotificationResponseAsync(),
  ];
  for (const operation of operations) {
    try { await operation(); } catch (error) { failures.push(error); }
  }
  retiredToken = issuedToken ?? retiredToken;
  issuedToken = null;
  if (failures.length) throw new Error('기기 푸시 무효화가 완료되지 않았습니다.');
  await AsyncStorage.removeItem(RESET_REQUIRED_KEY);
  resetRequired = false;
}

export function invalidateDevicePushToken() {
  resetRequired = true;
  const intent = AsyncStorage.setItem(RESET_REQUIRED_KEY, 'true');
  // 정리 의도는 서버 응답과 발급 큐를 기다리지 않고 기록한다.
  const completion = enqueueNative(async () => {
    await intent.catch(() => {}); // 네이티브 정리 단계에서 표시 저장을 다시 시도한다.
    await resetDeviceRegistration();
  });
  return { intent, completion };
}

export function getManagedDevicePushToken(canUse: () => boolean): Promise<string> {
  return enqueueNative(async () => {
    const assertActive = () => {
      if (!canUse()) throw new CanceledError('종료된 회원의 푸시 발급을 차단했습니다.');
    };
    assertActive();
    const persistedReset = await AsyncStorage.getItem(RESET_REQUIRED_KEY);
    assertActive();
    if (resetRequired || persistedReset === 'true') await resetDeviceRegistration();
    assertActive();
    const messaging = getMessaging();
    if (Platform.OS === 'ios') {
      // 미등록 기기에서는 getAPNSToken 자체가 거부될 수 있으므로 등록 여부를 먼저 확인한다.
      let apnsToken = messaging.isDeviceRegisteredForRemoteMessages
        ? await getAPNSToken(messaging).catch((error: unknown) => {
          if (error != null && typeof error === 'object' && 'code' in error
              && error.code === 'messaging/unregistered') return null;
          throw error;
        })
        : null;
      assertActive();
      if (!messaging.isDeviceRegisteredForRemoteMessages || !apnsToken) {
        // SDK 등록 플래그는 시도 시점에 true가 되므로 APNs 토큰 준비를 보장하지 않는다.
        if (messaging.isDeviceRegisteredForRemoteMessages && !apnsToken) {
          await unregisterDeviceForRemoteMessages(messaging);
          assertActive();
        }
        await withApnsTimeout(registerDeviceForRemoteMessages(messaging));
        assertActive();
        apnsToken = await getAPNSToken(messaging);
        assertActive();
      }
      if (!apnsToken) {
        // Expo가 받은 실제 APNs 토큰을 Firebase에 연결한다. 서버 등록에는 이 값을 쓰지 않는다.
        const nativeToken = await withApnsTimeout(Notifications.getDevicePushTokenAsync());
        assertActive();
        if (nativeToken.type !== 'ios' || typeof nativeToken.data !== 'string'
            || !/^[0-9a-f]+$/i.test(nativeToken.data) || nativeToken.data.length % 2 !== 0) {
          throw Object.assign(new Error('유효한 iOS APNs 기기 토큰을 받지 못했습니다.'), { code: 'push/invalid-apns-token' });
        }
        await setAPNSToken(messaging, nativeToken.data);
        assertActive();
        apnsToken = await getAPNSToken(messaging);
        assertActive();
        if (!apnsToken) {
          throw Object.assign(new Error('Firebase에 APNs 기기 토큰이 반영되지 않았습니다.'), { code: 'push/apns-token-not-ready' });
        }
      }
    }
    await setAutoInitEnabled(messaging, true);
    assertActive();
    // 양 플랫폼에서 서버에 등록하는 값과 삭제하는 값을 기본 Firebase 앱의 FCM 토큰으로 통일한다.
    const token = await getToken(messaging);
    issuedToken = token;
    assertActive();
    if (token === retiredToken) {
      resetRequired = true;
      await AsyncStorage.setItem(RESET_REQUIRED_KEY, 'true');
      throw new Error('이전 회원의 푸시 토큰 재사용을 차단했습니다.');
    }
    return token;
  });
}
