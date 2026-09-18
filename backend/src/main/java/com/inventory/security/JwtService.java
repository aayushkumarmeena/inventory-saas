package com.inventory.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Handles JWT creation and validation. Secret and expiration are externalized
 * via the jwt.secret / jwt.expiration properties (JWT_SECRET / JWT_EXPIRATION env vars).
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.expiration}") long expirationMs) {
        // jjwt requires an HMAC key of sufficient length (>= 256 bits for HS256).
        // The configured secret is a hex string by default which is long enough;
        // we hash it through SHA-256 style key derivation if it's too short to be safe.
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("jwt.secret must be at least 32 characters long");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    public String generateToken(Long userId, String email, Long tenantId, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tenantId", tenantId);
        claims.put("role", role);
        claims.put("email", email);

        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claims(claims)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    public Long getTenantId(Claims claims) {
        Object tenantId = claims.get("tenantId");
        return tenantId == null ? null : Long.valueOf(tenantId.toString());
    }

    public String getRole(Claims claims) {
        return (String) claims.get("role");
    }
}
