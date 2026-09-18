package com.inventory.controller;

import com.inventory.dto.request.PurchaseRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.PurchaseResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.PurchaseService;
import com.inventory.util.CsvUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PurchaseResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String supplier,
            Pageable pageable) {
        Pageable effective = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"))
                : pageable;
        return ok("Purchases", purchaseService.list(tid(), from, to, status, supplier, effective));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseResponse>> get(@PathVariable Long id) {
        return ok("Purchase", purchaseService.get(tid(), id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseResponse>> create(@Valid @RequestBody PurchaseRequest req) {
        return ok("Purchase recorded", purchaseService.create(tid(), req));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<PurchaseResponse>> cancel(@PathVariable Long id) {
        return ok("Purchase cancelled and stock reversed", purchaseService.cancel(tid(), id));
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<ApiResponse<PurchaseResponse>> receive(@PathVariable Long id) {
        return ok("Purchase received, stock added", purchaseService.receive(tid(), id));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String supplier) {
        List<PurchaseResponse> all = purchaseService.list(tid(), from, to, status, supplier, PageRequest.of(0, 10_000)).getContent();
        List<String> header = List.of("PO #", "Date", "Supplier", "Total", "Status", "Recorded By");
        List<Object[]> rows = new ArrayList<>();
        for (PurchaseResponse p : all) {
            rows.add(new Object[]{p.getPurchaseNumber(), p.getPurchaseDate(), p.getSupplierName(), p.getTotalAmount(), p.getStatus(), p.getCreatedByName()});
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"purchases.csv\"")
                .body(CsvUtil.build(header, rows).getBytes(StandardCharsets.UTF_8));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
