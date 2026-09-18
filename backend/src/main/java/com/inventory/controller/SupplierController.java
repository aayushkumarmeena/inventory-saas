package com.inventory.controller;

import com.inventory.dto.request.SupplierRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.SupplierResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SupplierResponse>>> list(
            @RequestParam(required = false) String q, Pageable pageable) {
        return ok("Suppliers", supplierService.list(tid(), q, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponse>> get(@PathVariable Long id) {
        return ok("Supplier", supplierService.get(tid(), id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupplierResponse>> create(@Valid @RequestBody SupplierRequest req) {
        return ok("Supplier created", supplierService.create(tid(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponse>> update(@PathVariable Long id, @Valid @RequestBody SupplierRequest req) {
        return ok("Supplier updated", supplierService.update(tid(), id, req));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
