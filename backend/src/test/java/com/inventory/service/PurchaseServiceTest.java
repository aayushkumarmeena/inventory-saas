package com.inventory.service;

import com.inventory.entity.Product;
import com.inventory.entity.Purchase;
import com.inventory.entity.PurchaseItem;
import com.inventory.exception.BusinessException;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.PurchaseItemRepository;
import com.inventory.repository.PurchaseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers the ORDERED -> RECEIVED -> (optionally) CANCELLED workflow that is
 * this app's actual purchase-order model (see the class-level note on
 * PurchaseService): stock must only move on receive(), and cancel() must
 * correctly reverse it only if it was actually added in the first place.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PurchaseService — receive/cancel stock workflow")
class PurchaseServiceTest {

    @Mock PurchaseRepository purchaseRepo;
    @Mock PurchaseItemRepository purchaseItemRepo;
    @Mock ProductRepository productRepo;
    @Mock SupplierService supplierService;
    @Mock AuditService audit;

    @InjectMocks
    PurchaseService purchaseService;

    static final Long TENANT = 1L;

    Product product;
    Purchase purchase;
    PurchaseItem item;

    @BeforeEach
    void setUp() {
        product = Product.builder().id(20L).tenantId(TENANT).sku("SKU-2").name("Gadget")
                .price(BigDecimal.TEN).stockQuantity(5).build();
        purchase = Purchase.builder().id(100L).tenantId(TENANT).purchaseNumber("PO-2026-00001")
                .totalAmount(BigDecimal.valueOf(50)).status("ORDERED").build();
        item = PurchaseItem.builder().id(1L).purchaseId(100L).productId(20L)
                .quantity(BigDecimal.valueOf(10)).unitCost(BigDecimal.valueOf(5))
                .lineTotal(BigDecimal.valueOf(50)).build();
    }

    @Test
    @DisplayName("receive() on an ORDERED purchase adds each item's quantity to stock")
    void receive_addsStock() {
        when(purchaseRepo.findByIdAndTenantId(100L, TENANT)).thenReturn(Optional.of(purchase));
        when(purchaseItemRepo.findByPurchaseId(100L)).thenReturn(List.of(item));
        when(productRepo.findByIdAndTenantId(20L, TENANT)).thenReturn(Optional.of(product));

        purchaseService.receive(TENANT, 100L);

        assertThat(product.getStockQuantity()).isEqualTo(15); // 5 + 10
        assertThat(purchase.getStatus()).isEqualTo("RECEIVED");
        verify(purchaseRepo).save(purchase);
    }

    @Test
    @DisplayName("receive() on a non-ORDERED purchase is rejected")
    void receive_wrongStatus_throws() {
        purchase.setStatus("RECEIVED");
        when(purchaseRepo.findByIdAndTenantId(100L, TENANT)).thenReturn(Optional.of(purchase));

        assertThatThrownBy(() -> purchaseService.receive(TENANT, 100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only an ordered purchase");
        verifyNoInteractions(productRepo);
    }

    @Test
    @DisplayName("cancel() on an ORDERED purchase does not touch stock (nothing was added yet)")
    void cancel_fromOrdered_leavesStockUntouched() {
        when(purchaseRepo.findByIdAndTenantId(100L, TENANT)).thenReturn(Optional.of(purchase));
        when(purchaseItemRepo.findByPurchaseId(100L)).thenReturn(List.of(item));

        purchaseService.cancel(TENANT, 100L);

        assertThat(purchase.getStatus()).isEqualTo("CANCELLED");
        verifyNoInteractions(productRepo);
    }

    @Test
    @DisplayName("cancel() on a RECEIVED purchase reverses the stock it had added")
    void cancel_fromReceived_reversesStock() {
        product.setStockQuantity(15); // as if receive() already ran (5 base + 10 received)
        purchase.setStatus("RECEIVED");
        when(purchaseRepo.findByIdAndTenantId(100L, TENANT)).thenReturn(Optional.of(purchase));
        when(purchaseItemRepo.findByPurchaseId(100L)).thenReturn(List.of(item));
        when(productRepo.findByIdAndTenantId(20L, TENANT)).thenReturn(Optional.of(product));

        purchaseService.cancel(TENANT, 100L);

        assertThat(product.getStockQuantity()).isEqualTo(5); // reversed back
        assertThat(purchase.getStatus()).isEqualTo("CANCELLED");
    }

    @Test
    @DisplayName("cancel() on a RECEIVED purchase refuses to push stock negative (some may already be sold)")
    void cancel_fromReceived_wouldGoNegative_throwsAndStaysReceived() {
        product.setStockQuantity(3); // less than the 10 that was received — some must have been sold
        purchase.setStatus("RECEIVED");
        when(purchaseRepo.findByIdAndTenantId(100L, TENANT)).thenReturn(Optional.of(purchase));
        when(purchaseItemRepo.findByPurchaseId(100L)).thenReturn(List.of(item));
        when(productRepo.findByIdAndTenantId(20L, TENANT)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> purchaseService.cancel(TENANT, 100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("negative");

        assertThat(purchase.getStatus()).isEqualTo("RECEIVED"); // never got to CANCELLED
        verify(purchaseRepo, never()).save(any());
    }

    @Test
    @DisplayName("cancel() on an already-cancelled purchase is rejected")
    void cancel_alreadyCancelled_throws() {
        purchase.setStatus("CANCELLED");
        when(purchaseRepo.findByIdAndTenantId(100L, TENANT)).thenReturn(Optional.of(purchase));

        assertThatThrownBy(() -> purchaseService.cancel(TENANT, 100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already cancelled");
        verifyNoInteractions(purchaseItemRepo);
    }
}
