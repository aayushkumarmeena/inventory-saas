package com.inventory.controller;

import com.inventory.dto.request.CustomerRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.CustomerResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CustomerResponse>>> list(
            @RequestParam(required = false) String q, Pageable pageable) {
        return ok("Customers", customerService.list(tid(), q, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> get(@PathVariable Long id) {
        return ok("Customer", customerService.get(tid(), id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponse>> create(@Valid @RequestBody CustomerRequest req) {
        return ok("Customer created", customerService.create(tid(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> update(@PathVariable Long id, @Valid @RequestBody CustomerRequest req) {
        return ok("Customer updated", customerService.update(tid(), id, req));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
