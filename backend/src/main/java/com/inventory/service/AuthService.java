package com.inventory.service;

import com.inventory.dto.request.LoginRequest;
import com.inventory.dto.request.RegisterRequest;
import com.inventory.dto.response.AuthResponse;
import com.inventory.dto.response.UserResponse;
import com.inventory.entity.Tenant;
import com.inventory.entity.User;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.TenantRepository;
import com.inventory.repository.UserRepository;
import com.inventory.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepo;
    private final TenantRepository tenantRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new BusinessException("An account with this email already exists");
        }

        Tenant tenant = tenantRepo.save(Tenant.builder()
                .name(req.getTenantName())
                .isActive(true)
                .build());

        User user = userRepo.save(User.builder()
                .tenantId(tenant.getId())
                .email(req.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .role("ADMIN")
                .isActive(true)
                .build());

        return toUserResponse(user, tenant);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> new BusinessException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BusinessException("This account has been deactivated");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Invalid email or password");
        }

        Tenant tenant = tenantRepo.findById(user.getTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getTenantId(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .user(toUserResponse(user, tenant))
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Tenant tenant = tenantRepo.findById(user.getTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
        return toUserResponse(user, tenant);
    }

    private UserResponse toUserResponse(User user, Tenant tenant) {
        return UserResponse.builder()
                .id(user.getId())
                .tenantId(user.getTenantId())
                .tenantName(tenant.getName())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build();
    }
}
