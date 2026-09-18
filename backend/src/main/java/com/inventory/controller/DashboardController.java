package com.inventory.controller;

import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.DashboardSummaryResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> summary() {
        Long tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(ApiResponse.<DashboardSummaryResponse>builder()
                .success(true).message("Dashboard summary").data(dashboardService.getSummary(tenantId)).build());
    }
}
