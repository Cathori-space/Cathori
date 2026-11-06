package org.cathori.backend.user.application.email;

import java.time.Duration;

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

    /** 보낼 수 없으면 429. 남은 시간은 계산하지 않으므로 둘 다 걸리면 더 보수적인 1시간 상한을 알린다. */
    public void requireSendable(String email) {
        if (sendRateLimiter.countWithin(email, HOUR_WINDOW) >= perHour) {
            throw new BusinessException(UserErrorCode.EMAIL_SEND_LIMIT_EXCEEDED);
        }
        if (sendRateLimiter.countWithin(email, MINUTE_WINDOW) >= perMinute) {
            throw new BusinessException(UserErrorCode.EMAIL_SEND_TOO_FREQUENT);
        }
    }

    /** 메일을 실제로 보낸 뒤에 호출한다. 발송에 실패한 요청은 횟수에 넣지 않는다. */
    public void recordSent(String email) {
        sendRateLimiter.record(email);
    }
}
