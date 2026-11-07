package org.cathori.backend.user.infra.email;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.cathori.backend.user.application.email.SendRateLimiter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 발송 이력 저장소 — 이메일별 발송 시각 목록. 키는 이메일 하나다 (purpose 무관, ADR D4).
 *
 * <p>1분·1시간 판정은 목록의 시각으로 한다. 캐시 TTL(1시간)은 더 쓸 일이 없는 목록을 치우는 용도다.
 */
@Component
public class CaffeineSendRateLimiter implements SendRateLimiter {

    private final Cache<String, List<Instant>> cache;
    private final Duration retention;

    public CaffeineSendRateLimiter(@Value("${auth.email.send-log-ttl:PT1H}") Duration retention) {
        this.retention = retention;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(retention)
                .build();
    }

    /** compute는 키 단위로 원자적이라 동시 발송 기록이 유실되지 않는다 — 조회·저장으로 나누지 말 것. */
    @Override
    public void record(String email) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(retention);
        cache.asMap().compute(email, (key, history) -> {
            List<Instant> next = new ArrayList<>();
            if (history != null) {
                history.stream().filter(at -> at.isAfter(cutoff)).forEach(next::add);
            }
            next.add(now);
            return List.copyOf(next);
        });
    }

    @Override
    public int countWithin(String email, Duration window) {
        List<Instant> history = cache.getIfPresent(email);
        if (history == null) {
            return 0;
        }
        Instant cutoff = Instant.now().minus(window);
        return (int) history.stream().filter(at -> at.isAfter(cutoff)).count();
    }

    @Override
    public void clear(String email) {
        cache.invalidate(email);
    }
}
