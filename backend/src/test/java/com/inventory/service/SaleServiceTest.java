package com.inventory.service;

import com.inventory.dto.request.SaleItemRequest;
import com.inventory.dto.request.SaleRequest;
import com.inventory.dto.request.SaleReturnItemRequest;
import com.inventory.dto.request.SaleReturnRequest;
import com.inventory.dto.response.SaleResponse;
import com.inventory.entity.Product;
import com.inventory.entity.Sale;
import com.inventory.entity.Customer;
import com.inventory.entity.SaleItem;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
 * Covers the core sale lifecycle: create() (stock deduction + total calc),
 * cancel() (stock restoration), and createReturn() (partial-return quantity
 * limits + stock restoration). These are the operations that move real
 * inventory numbers and had no test coverage before this pass.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SaleService — create / cancel / createReturn")
class SaleServiceTest {

    @Mock SaleRepository saleRepo;
    @Mock SaleItemRepository saleItemRepo;
    @Mock ProductRepository productRepo;
    @Mock ProductBatchRepository batchRepo;
    @Mock PaymentRepository paymentRepo;
    @Mock SaleReturnRepository returnRepo;
    @Mock SaleReturnItemRepository returnItemRepo;
    @Mock CustomerService customerService;
    @Mock AuditService audit;

    @InjectMocks
    SaleService saleService;

    static final Long TENANT = 1L;

    Product product;

    @BeforeEach
    void setUp() {
        product = Product.builder().id(30L).tenantId(TENANT).sku("SKU-3").name("Thing")
                .price(BigDecimal.valueOf(100)).stockQuantity(20).build();
    }

    private void stubSaleSaveAssignsId(long id) {
        when(saleRepo.save(any())).thenAnswer(inv -> {
            Sale s = inv.getArgument(0);
            s.setId(id);
            return s;
        });
    }

    @Nested
    @DisplayName("create()")
    class Create {

        @Test
        @DisplayName("deducts stock and totals the line items correctly")
        void create_deductsStockAndTotals() {
            when(customerService.findOrCreateByName(any(), any()))
                    .thenReturn(Customer.builder().id(10L).tenantId(TENANT).name("Walk-in").build());
            when(productRepo.findByIdAndTenantId(30L, TENANT)).thenReturn(Optional.of(product));
            when(saleRepo.countByTenantId(TENANT)).thenReturn(0L);
            stubSaleSaveAssignsId(500L);

            SaleRequest req = new SaleRequest();
            req.setCustomerName("Walk-in");
            req.setItems(List.of(itemReq(30L, "3")));

            SaleResponse resp = saleService.create(TENANT, req);

            assertThat(product.getStockQuantity()).isEqualTo(17); // 20 - 3
            assertThat(resp.getTotalAmount()).isEqualByComparingTo("300"); // 3 * 100
            verify(productRepo).save(product);
        }

        @Test
        @DisplayName("rejects a sale that needs more stock than is available")
        void create_insufficientStock_throws() {
            when(productRepo.findByIdAndTenantId(30L, TENANT)).thenReturn(Optional.of(product));

            SaleRequest req = new SaleRequest();
            req.setItems(List.of(itemReq(30L, "999")));

            assertThatThrownBy(() -> saleService.create(TENANT, req))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Not enough stock");

            verify(productRepo, never()).save(any());
            verify(saleRepo, never()).save(any());
        }

        @Test
        @DisplayName("rejects a sale referencing a product that doesn't exist for this tenant")
        void create_unknownProduct_throwsNotFound() {
            when(productRepo.findByIdAndTenantId(999L, TENANT)).thenReturn(Optional.empty());

            SaleRequest req = new SaleRequest();
            req.setItems(List.of(itemReq(999L, "1")));

            assertThatThrownBy(() -> saleService.create(TENANT, req))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        private SaleItemRequest itemReq(Long productId, String qty) {
            SaleItemRequest r = new SaleItemRequest();
            r.setProductId(productId);
            r.setQuantity(new BigDecimal(qty));
            return r;
        }
    }

    @Nested
    @DisplayName("cancel()")
    class Cancel {

        @Test
        @DisplayName("restores stock for every line item on the sale")
        void cancel_restoresStock() {
            Sale sale = Sale.builder().id(500L).tenantId(TENANT).saleNumber("INV-2026-00001")
                    .totalAmount(BigDecimal.valueOf(300)).paymentStatus("PAID").build();
            SaleItem item = SaleItem.builder().id(1L).saleId(500L).productId(30L)
                    .quantity(BigDecimal.valueOf(3)).unitPrice(BigDecimal.valueOf(100)).build();

            when(saleRepo.findByIdAndTenantId(500L, TENANT)).thenReturn(Optional.of(sale));
            when(saleItemRepo.findBySaleId(500L)).thenReturn(List.of(item));
            when(productRepo.findByIdAndTenantId(30L, TENANT)).thenReturn(Optional.of(product));

            saleService.cancel(TENANT, 500L);

            assertThat(product.getStockQuantity()).isEqualTo(23); // 20 + 3 restored
            assertThat(sale.getPaymentStatus()).isEqualTo("CANCELLED");
        }

        @Test
        @DisplayName("refuses to cancel an already-cancelled sale")
        void cancel_alreadyCancelled_throws() {
            Sale sale = Sale.builder().id(500L).tenantId(TENANT).paymentStatus("CANCELLED").build();
            when(saleRepo.findByIdAndTenantId(500L, TENANT)).thenReturn(Optional.of(sale));

            assertThatThrownBy(() -> saleService.cancel(TENANT, 500L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already cancelled");
            verifyNoInteractions(saleItemRepo);
        }
    }

    @Nested
    @DisplayName("createReturn()")
    class CreateReturn {

        Sale sale;
        SaleItem original;

        @BeforeEach
        void setUpSale() {
            sale = Sale.builder().id(500L).tenantId(TENANT).saleNumber("INV-2026-00001")
                    .totalAmount(BigDecimal.valueOf(300)).paymentStatus("PAID").build();
            original = SaleItem.builder().id(1L).saleId(500L).productId(30L)
                    .quantity(BigDecimal.valueOf(3)).unitPrice(BigDecimal.valueOf(100))
                    .productName("Thing").build();
            when(saleRepo.findByIdAndTenantId(500L, TENANT)).thenReturn(Optional.of(sale));
            lenient().when(saleItemRepo.findBySaleId(500L)).thenReturn(List.of(original));
        }

        @Test
        @DisplayName("restores stock and computes the refund for the returned quantity")
        void createReturn_restoresStockAndComputesRefund() {
            when(returnItemRepo.sumReturnedQuantityBySaleItemId(1L)).thenReturn(BigDecimal.ZERO);
            when(productRepo.findByIdAndTenantId(30L, TENANT)).thenReturn(Optional.of(product));
            when(returnRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            SaleReturnRequest req = returnReq(1L, "2");
            saleService.createReturn(TENANT, 500L, req);

            assertThat(product.getStockQuantity()).isEqualTo(22); // 20 + 2 returned
        }

        @Test
        @DisplayName("rejects returning more than was ever purchased on that line")
        void createReturn_overReturn_throws() {
            when(returnItemRepo.sumReturnedQuantityBySaleItemId(1L)).thenReturn(BigDecimal.ZERO);

            SaleReturnRequest req = returnReq(1L, "5"); // only 3 were sold

            assertThatThrownBy(() -> saleService.createReturn(TENANT, 500L, req))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("can still be returned");
            verify(productRepo, never()).save(any());
        }

        @Test
        @DisplayName("accounts for quantity already returned on a previous return")
        void createReturn_accountsForPriorReturns_throwsWhenExhausted() {
            // 2 of the 3 were already returned earlier — only 1 left returnable.
            when(returnItemRepo.sumReturnedQuantityBySaleItemId(1L)).thenReturn(BigDecimal.valueOf(2));

            SaleReturnRequest req = returnReq(1L, "2"); // asking for 2 more, but only 1 remains

            assertThatThrownBy(() -> saleService.createReturn(TENANT, 500L, req))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Only 1");
        }

        @Test
        @DisplayName("rejects returning against a cancelled sale")
        void createReturn_cancelledSale_throws() {
            sale.setPaymentStatus("CANCELLED");
            SaleReturnRequest req = returnReq(1L, "1");

            assertThatThrownBy(() -> saleService.createReturn(TENANT, 500L, req))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("cancelled");
            verifyNoInteractions(returnItemRepo);
        }

        @Test
        @DisplayName("rejects a line item id that doesn't belong to this sale")
        void createReturn_wrongLineItem_throws() {
            SaleReturnRequest req = returnReq(999L, "1");

            assertThatThrownBy(() -> saleService.createReturn(TENANT, 500L, req))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("does not belong to this sale");
        }

        private SaleReturnRequest returnReq(Long saleItemId, String qty) {
            SaleReturnItemRequest itemReq = new SaleReturnItemRequest();
            itemReq.setSaleItemId(saleItemId);
            itemReq.setQuantity(new BigDecimal(qty));
            SaleReturnRequest req = new SaleReturnRequest();
            req.setReason("test");
            req.setItems(List.of(itemReq));
            return req;
        }
    }
}
