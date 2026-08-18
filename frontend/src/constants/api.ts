/**
 * API 관련 상수 (Expo 환경 변수 적용)
 */

/** 백엔드 API 기본 URL — 환경 변수가 없으면 localhost를 fallback(기본값)으로 사용 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

/** API 타임아웃 (ms) */
export const API_TIMEOUT = process.env.EXPO_PUBLIC_API_TIMEOUT 
  ? Number(process.env.EXPO_PUBLIC_API_TIMEOUT) 
  : 10_000;

/** 공지 목록 한 페이지 크기 */
export const NOTICE_PAGE_SIZE = process.env.EXPO_PUBLIC_NOTICE_PAGE_SIZE 
  ? Number(process.env.EXPO_PUBLIC_NOTICE_PAGE_SIZE) 
  : 20;
