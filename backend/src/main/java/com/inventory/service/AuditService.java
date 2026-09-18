package com.inventory.service;

import com.inventory.entity.AuditLog;
import com.inventory.repository.AuditLogRepository;
import com.inventory.repository.UserRepository;
import com.inventory.security.CurrentUser;
import com.inventory.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Resolves the current authenticated user's id and display name for
 * audit-trail stamping (createdBy fields on sales, purchases, stock
 * adjustments, payments, invoice cancellations), and writes entries to the
 * unified activity feed (audit_logs).
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final UserRepository userRepo;
    private final AuditLogRepository auditLogRepo;

    public Long userId() {
        return CurrentUser.id();
    }

    public String userName() {
        Long id = CurrentUser.id();
        if (id == null) return "System";
        return userRepo.findById(id)
                .map(u -> (u.getFirstName() != null ? u.getFirstName() : "") + " " + (u.getLastName() != null ? u.getLastName() : ""))
                .map(String::trim)
                .filter(n -> !n.isEmpty())
                .orElse("Unknown user");
    }

    /**
     * Writes one entry to the activity feed. Runs in the same transaction
     * as the caller (no REQUIRES_NEW) so a log entry never gets committed
     * for an action that itself rolled back.
     */
    public void log(String entityType, Long entityId, String action, String description) {
        auditLogRepo.save(AuditLog.builder()
                .tenantId(TenantContext.getCurrentTenant())
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .description(description)
                .userId(userId())
                .userName(userName())
                .build());
    }
}
