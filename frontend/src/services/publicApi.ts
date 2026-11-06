import { create } from 'axios';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import { installSessionInterceptors } from '@/src/services/session';

const publicApiClient = create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

publicApiClient.interceptors.request.use((config) => {
  config.headers.delete('Authorization');
  return config;
});
installSessionInterceptors(publicApiClient);

export default publicApiClient;
