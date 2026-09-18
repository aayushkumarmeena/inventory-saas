package com.inventory.controller;

import com.inventory.dto.request.LoginRequest;
import com.inventory.dto.request.RegisterRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.AuthResponse;
import com.inventory.dto.response.UserResponse;
import com.inventory.ratelimit.RateLimitService;
import com.inventory.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimitService rateLimitService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest req,
                                                                HttpServletRequest request) {
        // Registration creates a new tenant, so it's rate limited tighter than login.
        rateLimitService.checkAndIncrement("register", clientIp(request), 5, Duration.ofMinutes(1));
        UserResponse user = authService.register(req);
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true).message("Account created successfully").data(user).build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req,
                                                             HttpServletRequest request) {
        // Per-IP fixed window. Blunts scripted credential stuffing without needing
        // captchas or account lockouts, which have their own UX/DoS trade-offs.
        rateLimitService.checkAndIncrement("login", clientIp(request), 10, Duration.ofMinutes(1));
        AuthResponse auth = authService.login(req);
        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
                .success(true).message("Login successful").data(auth).build());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        Long userId = (Long) org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        UserResponse user = authService.me(userId);
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true).message("OK").data(user).build());
    }

    /**
     * NOTE: if this is deployed behind a reverse proxy/load balancer, configure
     * server.forward-headers-strategy=framework (or native) so getRemoteAddr()
     * resolves the real client IP from X-Forwarded-For instead of the proxy's
     * own address — otherwise every request appears to come from one IP and
     * the limiter above effectively rate-limits all users together.
     */
    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
