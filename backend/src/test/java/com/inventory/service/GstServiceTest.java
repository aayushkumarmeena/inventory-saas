package com.inventory.service;

import com.inventory.dto.request.*;
import com.inventory.dto.response.*;
import com.inventory.entity.*;
import com.inventory.exception.*;
import com.inventory.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GstService — unit tests")
class GstServiceTest {

    @Mock GstConfigRepository gstConfigRepo;
    @Mock GstInvoiceRepository invoiceRepo;
    @Mock GstReturnPeriodRepository returnRepo;
    @Mock HsnSacCodeRepository hsnRepo;

    @InjectMocks GstService svc;

    static final Long T = 42L;

    GstConfig cfg() {
        return GstConfig.builder().id(1L).tenantId(T).gstin("27AABCU9603R1ZX")
                .legalName("Demo Store").state("Maharashtra").stateCode("27")
                .filingFrequency("MONTHLY").isComposition(false).build();
    }

    @Test @DisplayName("getConfig — found returns mapped DTO")
    void getConfig_found() {
        when(gstConfigRepo.findByTenantId(T)).thenReturn(Optional.of(cfg()));
        GstConfigResponse r = svc.getConfig(T);
        assertThat(r.getGstin()).isEqualTo("27AABCU9603R1ZX");
    }

    @Test @DisplayName("getConfig — missing throws ResourceNotFoundException")
    void getConfig_missing() {
        when(gstConfigRepo.findByTenantId(T)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.getConfig(T)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test @DisplayName("calculateTax — INTRA 18% exclusive splits CGST+SGST")
    void tax_intra18() {
        TaxCalculationResponse r = svc.calculateTax(BigDecimal.valueOf(1000), BigDecimal.valueOf(18), false, "INTRA");
        assertThat(r.getCgstAmount()).isEqualByComparingTo("90.00");
        assertThat(r.getSgstAmount()).isEqualByComparingTo("90.00");
        assertThat(r.getTotalAmount()).isEqualByComparingTo("1180.00");
    }

    @Test @DisplayName("calculateTax — INTER 18% uses IGST only")
    void tax_inter18() {
        TaxCalculationResponse r = svc.calculateTax(BigDecimal.valueOf(1000), BigDecimal.valueOf(18), false, "INTER");
        assertThat(r.getIgstAmount()).isEqualByComparingTo("180.00");
        assertThat(r.getCgstAmount()).isEqualByComparingTo("0.00");
    }

    @Test @DisplayName("calculateTax — tax-inclusive extracts correct taxable value")
    void tax_inclusive() {
        TaxCalculationResponse r = svc.calculateTax(BigDecimal.valueOf(1180), BigDecimal.valueOf(18), true, "INTRA");
        assertThat(r.getTaxableValue()).isEqualByComparingTo("1000.00");
    }

    @Test @DisplayName("createHsnSac — duplicate throws BusinessException")
    void createHsn_duplicate() {
        when(hsnRepo.existsByTenantIdAndCode(T, "8518")).thenReturn(true);
        HsnSacRequest req = new HsnSacRequest();
        req.setCode("8518"); req.setType("HSN"); req.setDescription("x");
        req.setCgstRate(BigDecimal.valueOf(9)); req.setSgstRate(BigDecimal.valueOf(9)); req.setIgstRate(BigDecimal.valueOf(18));
        assertThatThrownBy(() -> svc.createHsnSac(T, req)).isInstanceOf(BusinessException.class);
    }

    @Test @DisplayName("generateInvoice — missing GST config throws")
    void genInvoice_noConfig() {
        when(invoiceRepo.findBySaleIdAndTenantId(1L, T)).thenReturn(Optional.empty());
        when(gstConfigRepo.findByTenantId(T)).thenReturn(Optional.empty());
        GstInvoiceRequest req = new GstInvoiceRequest();
        req.setSaleId(1L); req.setPlaceOfSupply("27");
        assertThatThrownBy(() -> svc.generateInvoice(T, req)).isInstanceOf(BusinessException.class);
    }

    @Test @DisplayName("cancelInvoice — already cancelled throws")
    void cancel_alreadyCancelled() {
        GstInvoice inv = GstInvoice.builder().id(5L).tenantId(T).isCancelled(true).build();
        when(invoiceRepo.findByIdAndTenantId(5L, T)).thenReturn(Optional.of(inv));
        assertThatThrownBy(() -> svc.cancelInvoice(T, 5L, "x")).isInstanceOf(BusinessException.class);
    }

    @Test @DisplayName("getSummary — aggregates totals")
    void summary_aggregates() {
        LocalDate from = LocalDate.of(2026,5,1), to = LocalDate.of(2026,5,31);
        when(invoiceRepo.sumTaxable(T,from,to)).thenReturn(BigDecimal.valueOf(100000));
        when(invoiceRepo.sumCgst(T,from,to)).thenReturn(BigDecimal.valueOf(9000));
        when(invoiceRepo.sumSgst(T,from,to)).thenReturn(BigDecimal.valueOf(9000));
        when(invoiceRepo.sumIgst(T,from,to)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepo.sumCess(T,from,to)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepo.sumTotal(T,from,to)).thenReturn(BigDecimal.valueOf(118000));
        when(invoiceRepo.countByType(eq(T),anyString(),any(),any())).thenReturn(5L);
        when(invoiceRepo.countCancelled(eq(T),any(),any())).thenReturn(1L);
        when(invoiceRepo.taxSlabBreakdown(anyLong(),any(),any())).thenReturn(List.of());
        when(invoiceRepo.monthlyTrend(anyLong(),any(),any())).thenReturn(List.of());
        GstSummaryResponse r = svc.getSummary(T, from, to);
        assertThat(r.getTotalTax()).isEqualByComparingTo("18000");
    }
}
