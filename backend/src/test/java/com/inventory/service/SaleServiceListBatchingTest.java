package com.inventory.service;

import com.inventory.entity.Sale;
import com.inventory.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * SaleService.list() used to fetch each sale's items/payments/returns with a
 * separate query per row (N+1) — a 20-row page meant 100+ queries. It was
 * rewritten to batch-fetch for the whole page instead. This test pins that:
 * it fails if list() goes back to querying per-row.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SaleService.list() — batches instead of querying per row")
class SaleServiceListBatchingTest {

    @Mock SaleRepository saleRepo;
    @Mock SaleItemRepository saleItemRepo;
    @Mock ProductRepository productRepo;
    @Mock PaymentRepository paymentRepo;
    @Mock SaleReturnRepository returnRepo;
    @Mock SaleReturnItemRepository returnItemRepo;
    @Mock CustomerService customerService;
    @Mock AuditService audit;

    static final Long TENANT = 42L;

    @Test
    @DisplayName("a 3-row page triggers one batched query per related table, not one per row")
    void list_batchesInsteadOfPerRow() {
        SaleService svc = new SaleService(saleRepo, saleItemRepo, productRepo, paymentRepo,
                returnRepo, returnItemRepo, customerService, audit);

        List<Sale> sales = List.of(
                sale(1L), sale(2L), sale(3L)
        );
        Pageable pageable = PageRequest.of(0, 20);
        Page<Sale> page = new PageImpl<>(sales, pageable, sales.size());

        when(saleRepo.search(eq(TENANT), any(), any(), any(), any(), eq(pageable))).thenReturn(page);
        when(saleItemRepo.findBySaleIdIn(anyList())).thenReturn(List.of());
        when(paymentRepo.findBySaleIdIn(anyList())).thenReturn(List.of());
        when(returnRepo.findBySaleIdIn(anyList())).thenReturn(List.of());

        svc.list(TENANT, LocalDate.now().minusDays(30), LocalDate.now(), null, null, pageable);

        // Exactly one batched call per related table, regardless of page size...
        verify(saleItemRepo, times(1)).findBySaleIdIn(anyList());
        verify(paymentRepo, times(1)).findBySaleIdIn(anyList());
        verify(returnRepo, times(1)).findBySaleIdIn(anyList());
        // ...and never the old per-row single-id lookups.
        verify(saleItemRepo, never()).findBySaleId(anyLong());
        verify(paymentRepo, never()).findBySaleIdOrderByPaymentDateDesc(anyLong());
        verify(returnRepo, never()).findBySaleIdOrderByCreatedAtDesc(anyLong());
        verify(returnItemRepo, never()).findBySaleReturnId(anyLong());
    }

    private Sale sale(Long id) {
        return Sale.builder()
                .id(id)
                .tenantId(TENANT)
                .saleNumber("INV-2026-0000" + id)
                .totalAmount(BigDecimal.valueOf(1000))
                .paymentStatus("PAID")
                .build();
    }
}
