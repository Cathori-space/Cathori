import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteToken, getMessaging, getToken, registerDeviceForRemoteMessages, setAutoInitEnabled, unregisterDeviceForRemoteMessages } from '@react-native-firebase/messaging';
import { CanceledError } from 'axios';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const RESET_REQUIRED_KEY = 'cathori-push-reset-required';
let nativeTask: Promise<unknown> = Promise.resolve();
let resetRequired = false;
let issuedToken: string | null = null;
let retiredToken: string | null = null;

function enqueueNative<T>(operation: () => Promise<T>): Promise<T> {
  const pending = nativeTask.then(operation, operation);
  nativeTask = pending.catch(() => {});
  return pending;
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

export function invalidateDevicePushToken(afterServer: Promise<unknown>): Promise<void> {
  resetRequired = true;
  // 진행 중인 발급이 끝난 뒤 삭제하므로 늦은 발급 결과가 삭제를 되돌리지 못한다.
  return enqueueNative(async () => {
    await afterServer;
    await resetDeviceRegistration();
  });
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
    await setAutoInitEnabled(messaging, true);
    assertActive();
    if (Platform.OS === 'ios' && !messaging.isDeviceRegisteredForRemoteMessages) {
      await registerDeviceForRemoteMessages(messaging);
      assertActive();
    }
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
