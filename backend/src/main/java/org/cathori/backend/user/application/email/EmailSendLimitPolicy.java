package org.cathori.backend.user.application.email;

import java.time.Duration;
import java.time.Instant;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 인증번호 메일 발송 횟수 제한 (ADR D2·D4). 이메일 하나당 1분 {@code perMinute}번, 1시간 {@code perHour}번까지,
 * purpose와 무관하게 센다.
 */
@Component
public class EmailSendLimitPolicy {

    static final Duration MINUTE_WINDOW = Duration.ofMinutes(1);
    static final Duration HOUR_WINDOW = Duration.ofHours(1);

    private final SendRateLimiter sendRateLimiter;
    private final int perMinute;
    private final int perHour;

    public EmailSendLimitPolicy(SendRateLimiter sendRateLimiter,
                                @Value("${auth.email.send-limit-per-minute:3}") int perMinute,
                                @Value("${auth.email.send-limit-per-hour:10}") int perHour) {
        // 잘못된 한도 설정이면 기동 시점에 멈춘다.
        if (perMinute <= 0 || perHour <= 0 || perMinute > perHour) {
            throw new IllegalArgumentException(
                    "발송 한도 설정이 잘못됐다: perMinute=" + perMinute + ", perHour=" + perHour);
        }
        this.sendRateLimiter = sendRateLimiter;
        this.perMinute = perMinute;
        this.perHour = perHour;
    }

    /**
     * 한도를 확인하고, 통과하면 발송 1건을 바로 기록해 둔다(선점). 보낼 수 없으면 429.
     * 둘 다 걸리면 더 보수적인 1시간 상한을 알린다.
     *
     * <p>확인과 기록을 한 번에 해야 동시에 온 요청이 같은 빈자리를 보고 함께 통과하지 않는다.
     * 메일 발송(수 초)은 이 잠금 밖에서 한다 — 잠금 안에는 메모리 연산만 있다.
     * 서버 1대 전제다. 여러 대로 늘리면 공유 저장소(Redis 등)의 원자 연산으로 옮긴다.
     *
     * @return 선점한 기록. 발송에 실패하면 {@link #release}에 넘긴다.
     */
    public synchronized Instant reserve(String email) {
        if (sendRateLimiter.countWithin(email, HOUR_WINDOW) >= perHour) {
            throw new BusinessException(UserErrorCode.EMAIL_SEND_LIMIT_EXCEEDED);
        }
        if (sendRateLimiter.countWithin(email, MINUTE_WINDOW) >= perMinute) {
            throw new BusinessException(UserErrorCode.EMAIL_SEND_TOO_FREQUENT);
        }
        return sendRateLimiter.record(email);
    }

    /** 발송에 실패하면 선점한 1건을 되돌린다 — 실패한 발송은 횟수에 넣지 않는다. */
    public void release(String email, Instant reservedAt) {
        sendRateLimiter.remove(email, reservedAt);
    }
}
