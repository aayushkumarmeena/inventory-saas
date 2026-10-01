package com.inventory.controller;

import com.inventory.dto.request.StockTransferRequest;
import com.inventory.dto.request.WarehouseRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.StockTransferResponse;
import com.inventory.dto.response.WarehouseResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> list() {
        return ok("Warehouses", warehouseService.listWarehouses(tid()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WarehouseResponse>> create(@Valid @RequestBody WarehouseRequest req) {
        return ok("Warehouse created", warehouseService.createWarehouse(tid(), req));
    }

    @GetMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStock(@PathVariable Long id) {
        return ok("Warehouse stock", warehouseService.getWarehouseStock(tid(), id));
    }

    @GetMapping("/transfers")
    public ResponseEntity<ApiResponse<Page<StockTransferResponse>>> listTransfers(Pageable pageable) {
        return ok("Stock transfers", warehouseService.listTransfers(tid(), pageable));
    }

    @PostMapping("/transfers")
    public ResponseEntity<ApiResponse<StockTransferResponse>> transfer(@Valid @RequestBody StockTransferRequest req) {
        return ok("Stock transferred successfully", warehouseService.transferStock(tid(), req));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
