package org.cathori.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final String CLAIM_TYPE = "type";
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

    /**
     * 액세스 토큰을 생성한다. (최초 로그인 시 호출)
     * payload에 userId를 subject로 담고, 서명 후 문자열로 반환한다.
     * 만료시간: application.yml의 jwt.access-token-expiry 값 (1시간)
     */
    public String generateAccessToken(Long userId) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, TOKEN_TYPE_ACCESS)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiry))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * 리프레시 토큰을 생성한다. (최초 로그인 시 호출)
     * 구조는 액세스 토큰과 동일하며, 만료시간만 다르다.
     * 만료시간: application.yml의 jwt.refresh-token-expiry 값 (30일)
     */
    public String generateRefreshToken(Long userId) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, TOKEN_TYPE_REFRESH)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiry))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * 서명/포맷/허용 알고리즘을 검증하고 claims를 반환한다.
     * exp가 지났더라도 type 클레임은 먼저 확인할 수 있도록,
     * 만료 예외는 잡아서 claims를 그대로 반환한다 (만료 여부는 호출부에서 별도 판단).
     */
    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        }
    }

    /**
     * 액세스 토큰 검증: 형식/서명/알고리즘 -> type=access -> 만료기한 순으로 확인한다.
     * (subject의 사용자 유효성은 JwtFilter에서 DB 조회로 별도 확인한다)
     */
    public boolean validateAccessToken(String token) {
        try {
            Claims claims = parseClaims(token);
            if (!TOKEN_TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class))) {
                return false;
            }
            Date expiration = claims.getExpiration();
            return expiration != null && expiration.after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * 리프레시 토큰 여부 검증: 형식/서명/알고리즘 -> type=refresh 순으로 확인한다.
     * DB 일치 여부, 만료기한(DB 기준), subject 사용자 유효성은 AuthService에서 확인한다.
     */
    public boolean isRefreshToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return TOKEN_TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long extractUserId(String token) {
        String subject = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
        return Long.parseLong(subject);
    }
}
