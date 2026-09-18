package com.inventory.controller;

import com.inventory.dto.request.StockAdjustmentRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.StockAdjustmentResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping("/adjustments")
    public ResponseEntity<ApiResponse<Page<StockAdjustmentResponse>>> list(
            @RequestParam(required = false) Long productId, Pageable pageable) {
        return ok("Stock adjustments", stockService.list(tid(), productId, pageable));
    }

    @PostMapping("/adjustments")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> adjust(@Valid @RequestBody StockAdjustmentRequest req) {
        return ok("Stock adjusted", stockService.adjust(tid(), req));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
