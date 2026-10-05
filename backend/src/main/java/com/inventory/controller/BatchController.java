package com.inventory.controller;

import com.inventory.dto.request.BatchAdjustmentRequest;
import com.inventory.dto.request.ProductBatchRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.BatchSummaryResponse;
import com.inventory.dto.response.ProductBatchResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProductBatchResponse>>> list(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String query,
            Pageable pageable) {
        return ok("Batches retrieved", batchService.list(tid(), productId, filter, query, pageable));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<BatchSummaryResponse>> getSummary() {
        return ok("Batch summary", batchService.getSummary(tid()));
    }

    @GetMapping("/product/{productId}/fefo")
    public ResponseEntity<ApiResponse<List<ProductBatchResponse>>> getFefoBatches(@PathVariable Long productId) {
        return ok("FEFO batches", batchService.getFefoBatches(tid(), productId));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductBatchResponse>> create(@Valid @RequestBody ProductBatchRequest req) {
        return ok("Batch created successfully", batchService.create(tid(), req));
    }

    @PostMapping("/{id}/adjust")
    public ResponseEntity<ApiResponse<ProductBatchResponse>> adjust(
            @PathVariable Long id,
            @Valid @RequestBody BatchAdjustmentRequest req) {
        return ok("Batch adjusted successfully", batchService.adjust(tid(), id, req));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
