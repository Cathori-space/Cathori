package org.cathori.backend.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

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
                .subject(String.valueOf(userId))
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
                .subject(String.valueOf(userId))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiry))
                .signWith(getSigningKey())
                .compact();
    }


    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * 토큰의 유효성을 검증한다. (로그인 이후 매 요청 시 JwtFilter에서 호출)
     * 서명이 올바른지, 만료되지 않았는지 확인한다.
     * 검증 실패 시 JwtException이 발생하며 false를 반환한다.
     */
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
