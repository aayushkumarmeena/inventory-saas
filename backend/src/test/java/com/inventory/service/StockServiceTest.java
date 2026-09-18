package com.inventory.service;

import com.inventory.dto.request.StockAdjustmentRequest;
import com.inventory.dto.response.StockAdjustmentResponse;
import com.inventory.entity.Product;
import com.inventory.entity.StockAdjustment;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.StockAdjustmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers the actual business rule in StockService: stock can never go
 * negative, and IN/OUT correctly move stockQuantity in opposite directions.
 * This is the core correctness guarantee of the whole inventory system, and
 * previously had zero test coverage.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StockService.adjust() — stock math and floor")
class StockServiceTest {

    @Mock StockAdjustmentRepository adjustmentRepo;
    @Mock ProductRepository productRepo;
    @Mock AuditService audit;

    @InjectMocks
    StockService stockService;

    static final Long TENANT = 1L;

    Product product;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .id(10L).tenantId(TENANT).sku("SKU-1").name("Widget")
                .price(java.math.BigDecimal.TEN).stockQuantity(50).build();
    }

    @Test
    @DisplayName("OUT reduces stock by the requested quantity")
    void out_reducesStock() {
        when(productRepo.findByIdAndTenantId(10L, TENANT)).thenReturn(Optional.of(product));
        when(adjustmentRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StockAdjustmentResponse resp = stockService.adjust(TENANT, request(10L, "OUT", 20));

        assertThat(product.getStockQuantity()).isEqualTo(30);
        assertThat(resp.getResultingStock()).isEqualTo(30);
        verify(productRepo).save(product);
    }

    @Test
    @DisplayName("IN increases stock by the requested quantity")
    void in_increasesStock() {
        when(productRepo.findByIdAndTenantId(10L, TENANT)).thenReturn(Optional.of(product));
        when(adjustmentRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StockAdjustmentResponse resp = stockService.adjust(TENANT, request(10L, "IN", 15));

        assertThat(product.getStockQuantity()).isEqualTo(65);
        assertThat(resp.getResultingStock()).isEqualTo(65);
    }

    @Test
    @DisplayName("OUT larger than available stock is rejected and stock is left unchanged")
    void out_exceedingStock_throwsAndLeavesStockUnchanged() {
        when(productRepo.findByIdAndTenantId(10L, TENANT)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> stockService.adjust(TENANT, request(10L, "OUT", 999)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("only 50 in stock");

        // Product must not be saved / mutated on the rejected path.
        assertThat(product.getStockQuantity()).isEqualTo(50);
        verify(productRepo, never()).save(any());
        verify(adjustmentRepo, never()).save(any());
    }

    @Test
    @DisplayName("OUT exactly equal to current stock brings it to zero (boundary, not an error)")
    void out_exactlyAvailableStock_bringsToZero() {
        when(productRepo.findByIdAndTenantId(10L, TENANT)).thenReturn(Optional.of(product));
        when(adjustmentRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StockAdjustmentResponse resp = stockService.adjust(TENANT, request(10L, "OUT", 50));

        assertThat(resp.getResultingStock()).isZero();
    }

    @Test
    @DisplayName("adjusting a product that doesn't exist (or belongs to another tenant) is a 404, not silently ignored")
    void unknownOrCrossTenantProduct_throwsNotFound() {
        when(productRepo.findByIdAndTenantId(999L, TENANT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockService.adjust(TENANT, request(999L, "OUT", 1)))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(adjustmentRepo);
    }

    private StockAdjustmentRequest request(Long productId, String direction, int quantity) {
        StockAdjustmentRequest req = new StockAdjustmentRequest();
        req.setProductId(productId);
        req.setDirection(direction);
        req.setQuantity(quantity);
        req.setReason("test");
        return req;
    }
}
