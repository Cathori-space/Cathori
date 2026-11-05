package org.cathori.backend.user.infra.email;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.cathori.backend.user.application.email.SendRateLimiter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

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
        return within(email, window).size();
    }

    @Override
    public Optional<Duration> retryAfter(String email, Duration window, int limit) {
        List<Instant> recent = within(email, window);
        if (recent.size() < limit) {
            return Optional.empty();
        }
        // 한도를 벗어나려면 가장 오래된 (size - limit + 1)개가 윈도우 밖으로 나가야 한다.
        // 그 마지막 한 건이 빠지는 시각이 재시도 가능 시점이다.
        recent.sort(Comparator.naturalOrder());
        Instant freesAt = recent.get(recent.size() - limit).plus(window);
        Duration remaining = Duration.between(Instant.now(), freesAt);
        return Optional.of(remaining.isNegative() ? Duration.ZERO : remaining);
    }

    @Override
    public void clear(String email) {
        cache.invalidate(email);
    }

    /** 윈도우 안의 발송 시각들. 반환 목록은 호출 측이 정렬해도 되는 사본이다. */
    private List<Instant> within(String email, Duration window) {
        List<Instant> history = cache.getIfPresent(email);
        if (history == null) {
            return new ArrayList<>();
        }
        Instant cutoff = Instant.now().minus(window);
        List<Instant> recent = new ArrayList<>();
        history.stream().filter(at -> at.isAfter(cutoff)).forEach(recent::add);
        return recent;
    }
}
