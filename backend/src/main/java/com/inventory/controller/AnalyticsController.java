package com.inventory.controller;

import com.inventory.dto.response.ApiResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> overview(@RequestParam(defaultValue = "30") int days) {
        int clamped = Math.max(1, Math.min(days, 365));
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .success(true).message("Analytics overview").data(analyticsService.getOverview(tid(), clamped)).build());
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }
}
