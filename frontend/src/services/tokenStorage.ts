import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'cathori.auth.access-token';
const REFRESH_TOKEN_KEY = 'cathori.auth.refresh-token';
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
};

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(
        ACCESS_TOKEN_KEY,
        tokens.accessToken,
        SECURE_STORE_OPTIONS,
      ),
      SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        tokens.refreshToken,
        SECURE_STORE_OPTIONS,
      ),
    ]);
  } catch (error) {
    // Do not leave a partially written token pair behind.
    await Promise.allSettled([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
    ]);
    throw error;
  }
}

export async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
  ]);

  if (!accessToken || !refreshToken) {
    if (accessToken || refreshToken) {
      await clearTokens();
    }
    return null;
  }

  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
  ]);
}
