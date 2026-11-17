import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_SELECTION_KEY = 'cathori.auth.guest-selected';

export async function saveGuestSelection(): Promise<void> {
  await AsyncStorage.setItem(GUEST_SELECTION_KEY, 'true');
}

export async function getGuestSelection(): Promise<boolean> {
  return (await AsyncStorage.getItem(GUEST_SELECTION_KEY)) === 'true';
}

export async function clearGuestSelection(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_SELECTION_KEY);
}
