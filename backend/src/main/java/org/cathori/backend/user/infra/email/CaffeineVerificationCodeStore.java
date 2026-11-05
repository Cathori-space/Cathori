package org.cathori.backend.user.infra.email;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.cathori.backend.user.application.email.VerificationCode;
import org.cathori.backend.user.application.email.VerificationCodeStore;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * 인증번호 저장소 — Caffeine, {@code expireAfterWrite}.
 *
 * <p>만료 판정은 값의 {@code expiresAt}으로 한다. 캐시 TTL은 다시 쓸 때마다 리셋되므로 버려진 항목을 치우는 용도다.
 */
@Component
public class CaffeineVerificationCodeStore implements VerificationCodeStore {

    private final Cache<VerificationKey, VerificationCode> cache;

    public CaffeineVerificationCodeStore(@Value("${auth.email.code-ttl:PT3M}") Duration ttl) {
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(ttl)
                .build();
    }

    @Override
    public void save(VerificationPurpose purpose, String email, VerificationCode code) {
        cache.put(new VerificationKey(purpose, email), code);
    }

    @Override
    public Optional<VerificationCode> find(VerificationPurpose purpose, String email) {
        return Optional.ofNullable(cache.getIfPresent(new VerificationKey(purpose, email)));
    }

    @Override
    public void remove(VerificationPurpose purpose, String email) {
        cache.invalidate(new VerificationKey(purpose, email));
    }
}
