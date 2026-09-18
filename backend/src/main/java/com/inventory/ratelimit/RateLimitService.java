package com.inventory.ratelimit;

import com.inventory.exception.RateLimitExceededException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Simple fixed-window rate limiter backed by Redis (already a dependency for
 * caching, so no new infrastructure). Used to slow down credential stuffing /
 * brute-force attempts against the unauthenticated auth endpoints, which sit
 * behind permitAll() in SecurityConfig and have no other throttling.
 *
 * Fixed-window means a caller could in principle send 2x the limit across a
 * window boundary (e.g. limit-worth of requests at 0:59 and again at 1:01).
 * That's an acceptable trade-off here — the goal is blunting automated
 * brute-force, not exact quota enforcement — and it keeps this to a single
 * INCR+EXPIRE instead of a sliding-window/token-bucket implementation.
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * @param bucket     logical name for what's being limited, e.g. "login"
     * @param identifier caller identity within that bucket, e.g. client IP
     * @param maxAttempts max requests allowed per window
     * @param window     window length
     * @throws RateLimitExceededException if this call pushes the caller over the limit
     */
    public void checkAndIncrement(String bucket, String identifier, int maxAttempts, Duration window) {
        String key = "ratelimit:" + bucket + ":" + identifier;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, window);
        }
        if (count != null && count > maxAttempts) {
            throw new RateLimitExceededException(
                    "Too many " + bucket + " attempts. Please wait a minute and try again.");
        }
    }
}
