package org.cathori.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_SESSION_VERSION = "sv";
    private static final String TOKEN_TYPE_ACCESS = "access";
    private static final String TOKEN_TYPE_REFRESH = "refresh";

    @Value("${jwt.secret-key}")
    private String secretKey;

    @Value("${jwt.access-token-expiry}")
    private long accessTokenExpiry;

    @Value("${jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;


    /**
     * application.yml의 Base64 문자열 시크릿 키를
     * HMAC-SHA256 서명에 사용할 수 있는 SecretKey 객체로 변환한다.
     * 토큰 생성/검증/파싱 시 공통으로 사용된다.
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }

    public String generateAccessToken(Long userId, long sessionVersion) {
        return generateToken(userId, sessionVersion, TOKEN_TYPE_ACCESS, accessTokenExpiry);
    }

    public String generateRefreshToken(Long userId, long sessionVersion) {
        return generateToken(userId, sessionVersion, TOKEN_TYPE_REFRESH, refreshTokenExpiry);
    }

    private String generateToken(Long userId, long sessionVersion, String type, long expiry) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, type)
                .claim(CLAIM_SESSION_VERSION, sessionVersion)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiry))
                .signWith(getSigningKey())
                .compact();
    }

    public Optional<TokenSession> parseAccessToken(String token) {
        return parseToken(token, TOKEN_TYPE_ACCESS);
    }

    public Optional<TokenSession> parseRefreshToken(String token) {
        return parseToken(token, TOKEN_TYPE_REFRESH);
    }

    private Optional<TokenSession> parseToken(String token, String type) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Date expiration = claims.getExpiration();
            if (!type.equals(claims.get(CLAIM_TYPE, String.class))
                    || expiration == null || !expiration.after(new Date())) {
                return Optional.empty();
            }
            Object version = claims.get(CLAIM_SESSION_VERSION);
            if (!(version instanceof Integer || version instanceof Long)) {
                return Optional.empty();
            }
            long sessionVersion = ((Number) version).longValue();
            long userId = Long.parseLong(claims.getSubject());
            if (userId <= 0 || sessionVersion < 0) {
                return Optional.empty();
            }
            return Optional.of(new TokenSession(userId, sessionVersion, expiration.toInstant()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public record TokenSession(long userId, long sessionVersion, Instant expiresAt) {}
}
