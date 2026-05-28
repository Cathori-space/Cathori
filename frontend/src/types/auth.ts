/**
 * Cathori 인증 도메인 타입 정의
 * 백엔드 API 명세 기반
 */

// ─── 사용자 태그 ──────────────────────────────────────────────────────

/** 사용자 태그 — 로그인 응답에 포함되는 태그 정보 */
export interface UserTag {
  tagId: number;
  tagName: string;
}

// ─── 로그인 ──────────────────────────────────────────────────────────

/** 로그인 요청 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 로그인 응답
 * JWT 2종 + 사용자 정보 + 태그 한 번에 반환
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  /** 주전공 */
  major: string;
  /** 복수/부전공 (없으면 null) */
  secondMajor: string | null;
  /** 학년 (1~4) */
  grade: number;
  /** 재학 상태 */
  enrollmentStatus: string;
  /** 사용자가 등록한 태그 목록 */
  tags: UserTag[];
}

// ─── 회원가입 ────────────────────────────────────────────────────────

/** 회원가입 요청 */
export interface RegisterRequest {
  email: string;
  password: string;
  /** 주전공 */
  major1: string;
  /** 복수/부전공 (없으면 null) */
  major2: string | null;
  /** 학년 (1~4) */
  grade: number;
  /** 재학 상태 (재학 / 휴학) */
  status: string;
}

/** 회원가입 응답 — JWT 미포함! 가입 후 자동 로그인은 프론트에서 login 별도 호출 */
export interface RegisterResponse {
  userId: number;
  email: string;
}

// ─── 이메일 인증 ─────────────────────────────────────────────────────

/** 이메일 인증번호 발송 요청 */
export interface EmailSendRequest {
  email: string;
}

/** 이메일 인증번호 발송 응답 */
export interface EmailSendResponse {
  email: string;
}

/** 이메일 인증번호 검증 요청 */
export interface EmailVerifyRequest {
  email: string;
  code: string;
}

/** 이메일 인증번호 검증 응답 */
export interface EmailVerifyResponse {
  email: string;
}

// ─── 인증 스토어용 사용자 정보 ────────────────────────────────────────

/**
 * useAuthStore에 저장되는 사용자 프로필 정보
 * LoginResponse에서 토큰·태그를 제외한 순수 사용자 정보
 */
export interface AuthUser {
  userId: number;
  email: string;
  major: string;
  secondMajor: string | null;
  grade: number;
  enrollmentStatus: string;
}
