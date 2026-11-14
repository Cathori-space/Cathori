package org.cathori.backend.user.infra.email;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * 인증 완료 상태 저장소 — Caffeine, {@code expireAfterWrite} 기본 30분.
 *
 * <p>기존 구현에는 만료가 없어서, 인증만 하고 가입하지 않은 이메일이 서버 재시작 전까지
 * 언제든 가입 가능한 상태로 남았다 (PRD F-04).
 *
 * <p>값으로 {@link Instant}를 들고 있는 이유: 존재 여부만 필요하지만, 운영 중 덤프를 볼 때
 * "언제 인증했는지"가 있어야 만료 동작을 사후에 확인할 수 있다. {@code Boolean.TRUE}는
 * 아무것도 알려주지 않는다.
 */
@Component
public class CaffeineVerifiedEmailStore implements VerifiedEmailStore {

    private final Cache<VerificationKey, Instant> cache;

    public CaffeineVerifiedEmailStore(@Value("${auth.email.verified-ttl:PT30M}") Duration ttl) {
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(ttl)
                .build();
    }

    @Override
    public void markVerified(VerificationPurpose purpose, String email) {
        cache.put(new VerificationKey(purpose, email), Instant.now());
    }

    @Override
    public boolean isVerified(VerificationPurpose purpose, String email) {
        return cache.getIfPresent(new VerificationKey(purpose, email)) != null;
    }

    @Override
    public void remove(VerificationPurpose purpose, String email) {
        cache.invalidate(new VerificationKey(purpose, email));
    }
}
