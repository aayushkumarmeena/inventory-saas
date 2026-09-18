package com.inventory.controller;

import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.AuditLogResponse;
import com.inventory.repository.AuditLogRepository;
import com.inventory.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/activity")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> list(Pageable pageable) {
        Long tenantId = TenantContext.getCurrentTenant();
        Page<AuditLogResponse> page = auditLogRepo.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(a -> AuditLogResponse.builder()
                        .id(a.getId())
                        .entityType(a.getEntityType())
                        .entityId(a.getEntityId())
                        .action(a.getAction())
                        .description(a.getDescription())
                        .userName(a.getUserName())
                        .createdAt(a.getCreatedAt())
                        .build());
        return ResponseEntity.ok(ApiResponse.<Page<AuditLogResponse>>builder()
                .success(true).message("Activity").data(page).build());
    }
}
