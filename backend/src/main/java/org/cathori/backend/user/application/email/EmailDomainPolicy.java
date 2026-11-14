package org.cathori.backend.user.application.email;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 신규 가입 이메일 도메인 정책
 *
 * <p>{@code @} 뒤가 허용 도메인과 <b>정확히</b> 일치해야 한다 — 대소문자 포함.
 * 서브도메인({@code x.catholic.ac.kr})·유사 도메인({@code catholic.ac.kr.evil.com})은 거부한다.
 * {@code @} 앞(아이디)의 형식은 검사하지 않는다. 아이디는 학생이 정한 값이라 형식을 알 수 없고,
 * 학교 소속 여부는 도메인만으로 충분히 판단된다. 다만 아이디가 비어 있거나 주소에 공백이 섞인 것은
 * 형식 이전에 주소가 아니므로 거부한다.
 *
 * <p>{@link VerificationPurpose#SIGNUP}에만 적용한다. 비밀번호 재설정은 기존 비학교 회원의
 * 복구 경로이므로 이 정책을 거치지 않는다.
 */
@Component
public class EmailDomainPolicy {

    // 빈 설정값("")이 [""]로 바인딩될 수 있어 공백 항목을 걸러낸다. 값 자체는 trim만 하고 대소문자는 바꾸지 않는다.
    private static Set<String> normalize(Collection<String> values) {
        if (values == null) {
            return Set.of();
        }
        return values.stream()
                .map(String::trim)
                .filter(v -> !v.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }
    private final Set<String> allowedDomains;

    private final Set<String> allowedAddresses;

    public EmailDomainPolicy(
            @Value("${auth.email.allowed-domains:catholic.ac.kr}") Collection<String> allowedDomains,
            @Value("${auth.email.allowed-addresses:}") Collection<String> allowedAddresses) {
        this.allowedDomains = normalize(allowedDomains);
        this.allowedAddresses = normalize(allowedAddresses);
    }

    public boolean isAllowed(String email) {
        if (email == null) {
            return false;
        }
        if (allowedAddresses.contains(email)) {
            return true;
        }
        // 요청 DTO의 @Email 검증에 기대지 않고 정책 자체로 막는다:
        // 공백 없음, @는 정확히 하나, 아이디(@ 앞)와 도메인(@ 뒤) 모두 비어 있지 않음.
        if (email.chars().anyMatch(Character::isWhitespace)) {
            return false;
        }
        int at = email.indexOf('@');
        if (at <= 0 || at != email.lastIndexOf('@') || at == email.length() - 1) {
            return false;
        }
        return allowedDomains.contains(email.substring(at + 1));
    }

    /** 가입 목적일 때만 검사한다. 허용되지 않으면 {@code USER_EMAIL_DOMAIN_NOT_ALLOWED}. */
    public void requireAllowed(VerificationPurpose purpose, String email) {
        if (purpose == VerificationPurpose.SIGNUP && !isAllowed(email)) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        }
    }
}
