package com.inventory.controller;

import com.inventory.dto.request.PaymentRequest;
import com.inventory.dto.request.SaleRequest;
import com.inventory.dto.request.SaleReturnRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.SaleResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.SaleService;
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
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SaleResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customer,
            Pageable pageable) {
        Pageable effective = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"))
                : pageable;
        return ok("Sales", saleService.list(tid(), from, to, status, customer, effective));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SaleResponse>> get(@PathVariable Long id) {
        return ok("Sale", saleService.get(tid(), id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SaleResponse>> create(@Valid @RequestBody SaleRequest req) {
        return ok("Sale recorded", saleService.create(tid(), req));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<SaleResponse>> cancel(@PathVariable Long id) {
        return ok("Sale cancelled and stock restored", saleService.cancel(tid(), id));
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<ApiResponse<SaleResponse>> recordPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest req) {
        return ok("Payment recorded", saleService.recordPayment(tid(), id, req));
    }

    @PostMapping("/{id}/returns")
    public ResponseEntity<ApiResponse<SaleResponse>> createReturn(@PathVariable Long id, @Valid @RequestBody SaleReturnRequest req) {
        return ok("Return recorded, stock restored", saleService.createReturn(tid(), id, req));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customer) {
        List<SaleResponse> all = saleService.list(tid(), from, to, status, customer, PageRequest.of(0, 10_000)).getContent();
        List<String> header = List.of("Sale #", "Date", "Customer", "Total", "Amount Paid", "Balance Due", "Status", "Recorded By");
        List<Object[]> rows = new ArrayList<>();
        for (SaleResponse s : all) {
            rows.add(new Object[]{s.getSaleNumber(), s.getSaleDate(), s.getCustomerName(), s.getTotalAmount(),
                    s.getAmountPaid(), s.getBalanceDue(), s.getPaymentStatus(), s.getCreatedByName()});
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sales.csv\"")
                .body(CsvUtil.build(header, rows).getBytes(StandardCharsets.UTF_8));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
