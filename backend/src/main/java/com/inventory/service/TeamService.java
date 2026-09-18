package com.inventory.service;

import com.inventory.dto.request.ChangePasswordRequest;
import com.inventory.dto.request.TeamMemberRequest;
import com.inventory.dto.request.UpdateRoleRequest;
import com.inventory.dto.response.ResetPasswordResponse;
import com.inventory.dto.response.TeamMemberResponse;
import com.inventory.entity.User;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.UserRepository;
import com.inventory.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamService {

    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepo;
    private final AuditService audit;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> list(Long tenantId) {
        return userRepo.findByTenantIdOrderByCreatedAtAsc(tenantId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TeamMemberResponse invite(Long tenantId, TeamMemberRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new BusinessException("An account with this email already exists");
        }
        User user = userRepo.save(User.builder()
                .tenantId(tenantId)
                .email(req.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .role(req.getRole() != null ? req.getRole() : "STAFF")
                .isActive(true)
                .build());
        audit.log("TEAM", user.getId(), "INVITE", "Added " + req.getFirstName() + " " + req.getLastName() + " as " + user.getRole());
        return toResponse(user);
    }

    public TeamMemberResponse updateRole(Long tenantId, Long userId, UpdateRoleRequest req) {
        User user = find(tenantId, userId);
        guardAgainstSelfDemotion(userId, "change your own role");
        user.setRole(req.getRole());
        audit.log("TEAM", user.getId(), "ROLE_CHANGE", "Changed " + user.getEmail() + "'s role to " + req.getRole());
        return toResponse(userRepo.save(user));
    }

    public TeamMemberResponse setActive(Long tenantId, Long userId, boolean active) {
        User user = find(tenantId, userId);
        if (!active) {
            guardAgainstSelfDemotion(userId, "deactivate your own account");
        }
        user.setIsActive(active);
        audit.log("TEAM", user.getId(), active ? "ACTIVATE" : "DEACTIVATE", (active ? "Activated " : "Deactivated ") + user.getEmail());
        return toResponse(userRepo.save(user));
    }

    /** Admin-initiated reset: generates a fresh temporary password, shown once so the
     * admin can share it with the team member directly (no email delivery). */
    public ResetPasswordResponse resetPassword(Long tenantId, Long userId) {
        User user = find(tenantId, userId);
        String temp = generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(temp));
        userRepo.save(user);
        audit.log("TEAM", user.getId(), "PASSWORD_RESET", "Reset password for " + user.getEmail());
        return ResetPasswordResponse.builder().temporaryPassword(temp).build();
    }

    /** Self-service: a logged-in user changing their own password, verifying the current one first. */
    public void changeOwnPassword(Long userId, ChangePasswordRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);
        audit.log("TEAM", user.getId(), "PASSWORD_CHANGE", user.getEmail() + " changed their password");
    }

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(PASSWORD_CHARS.charAt(RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private void guardAgainstSelfDemotion(Long targetUserId, String action) {
        Long currentId = CurrentUser.id();
        if (currentId != null && currentId.equals(targetUserId)) {
            throw new BusinessException("You can't " + action + ". Ask another admin to do this.");
        }
    }

    private User find(Long tenantId, Long id) {
        return userRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found"));
    }

    private TeamMemberResponse toResponse(User u) {
        return TeamMemberResponse.builder()
                .id(u.getId())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .email(u.getEmail())
                .role(u.getRole())
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
