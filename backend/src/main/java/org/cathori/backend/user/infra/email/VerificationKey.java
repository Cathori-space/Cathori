package org.cathori.backend.user.infra.email;

import org.cathori.backend.user.application.email.VerificationPurpose;

/**
 * Caffeine 캐시의 복합 키. 인증번호·인증완료 저장소가 공유한다.
 * (발송 이력은 purpose와 무관하게 이메일 단위로 세므로 쓰지 않는다 — ADR D4)
 *
 * <p>record라 {@code equals}/{@code hashCode}가 자동이고, 키 조립 실수를
 * 문자열 연결("purpose:email")처럼 조용히 넘기지 않는다.
 */
record VerificationKey(VerificationPurpose purpose, String email) {
}
