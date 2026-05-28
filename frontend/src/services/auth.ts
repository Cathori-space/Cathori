/**
 * 인증 서비스 레이어 — /api/auth/* fetcher 4종
 *
 * 엔드포인트:
 *   POST /api/auth/login         — 이메일/비밀번호 로그인, JWT + 사용자 정보 반환
 *   POST /api/auth/register      — 회원가입 (JWT 미포함!)
 *   POST /api/auth/email/send    — 이메일 인증번호 발송
 *   POST /api/auth/email/verify  — 이메일 인증번호 검증
 *
 * 주의:
 *   - 인증 API 4종은 모두 공개 엔드포인트 (JWT 불필요)
 *   - 회원가입 응답에 JWT가 없으므로 가입 후 자동 로그인은
 *     프론트에서 동일 자격증명으로 login을 별도 호출해야 함 (트랩 #7)
 */

import apiClient from '@/src/services/api';
import type {
  EmailSendRequest,
  EmailSendResponse,
  EmailVerifyRequest,
  EmailVerifyResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/src/types/auth';

/**
 * 로그인 — JWT + 사용자 정보 + 태그 한 번에 반환
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    '/api/auth/login',
    req,
  );
  return data;
}

/**
 * 회원가입 — JWT 미포함 응답. 가입 후 자동 로그인은 login 별도 호출 필요
 */
export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>(
    '/api/auth/register',
    req,
  );
  return data;
}

/**
 * 이메일 인증번호 발송 — 6자리 인증번호를 이메일로 전송 (유효 3분)
 */
export async function sendVerificationEmail(
  req: EmailSendRequest,
): Promise<EmailSendResponse> {
  const { data } = await apiClient.post<EmailSendResponse>(
    '/api/auth/email/send',
    req,
  );
  return data;
}

/**
 * 이메일 인증번호 검증 — 성공 시 백엔드에 "인증 완료" 상태 기록
 */
export async function verifyEmail(
  req: EmailVerifyRequest,
): Promise<EmailVerifyResponse> {
  const { data } = await apiClient.post<EmailVerifyResponse>(
    '/api/auth/email/verify',
    req,
  );
  return data;
}
