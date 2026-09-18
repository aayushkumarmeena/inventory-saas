package com.inventory.repository;
import com.inventory.entity.GstInvoice;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
public interface GstInvoiceRepository extends JpaRepository<GstInvoice,Long> {
    Page<GstInvoice> findByTenantId(Long t, Pageable p);
    Optional<GstInvoice> findByIdAndTenantId(Long id, Long t);
    Optional<GstInvoice> findBySaleIdAndTenantId(Long saleId, Long t);
    boolean existsByTenantIdAndInvoiceNumber(Long t, String n);

    @Query("SELECT i FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to ORDER BY i.invoiceDate DESC")
    List<GstInvoice> findByPeriod(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);

    @Query("SELECT i FROM GstInvoice i WHERE i.tenantId=:t AND i.invoiceType=:type AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    List<GstInvoice> findByPeriodAndType(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to,@Param("type") String type);

    @Query("SELECT COALESCE(SUM(i.taxableValue),0) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    BigDecimal sumTaxable(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Query("SELECT COALESCE(SUM(i.cgstAmount),0) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    BigDecimal sumCgst(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Query("SELECT COALESCE(SUM(i.sgstAmount),0) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    BigDecimal sumSgst(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Query("SELECT COALESCE(SUM(i.igstAmount),0) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    BigDecimal sumIgst(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Query("SELECT COALESCE(SUM(i.cessAmount),0) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    BigDecimal sumCess(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Query("SELECT COALESCE(SUM(i.totalAmount),0) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    BigDecimal sumTotal(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);

    @Query("SELECT COUNT(i) FROM GstInvoice i WHERE i.tenantId=:t AND i.invoiceType=:type AND i.isCancelled=false AND i.invoiceDate BETWEEN :from AND :to")
    long countByType(@Param("t") Long t,@Param("type") String type,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Query("SELECT COUNT(i) FROM GstInvoice i WHERE i.tenantId=:t AND i.isCancelled=true AND i.invoiceDate BETWEEN :from AND :to")
    long countCancelled(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);

    @Query(value="SELECT DATE_TRUNC('month',invoice_date) AS month,SUM(taxable_value) AS taxable,SUM(cgst_amount) AS cgst,SUM(sgst_amount) AS sgst,SUM(igst_amount) AS igst,SUM(total_amount) AS total FROM gst_invoices WHERE tenant_id=:t AND is_cancelled=false AND invoice_date BETWEEN :from AND :to GROUP BY DATE_TRUNC('month',invoice_date) ORDER BY month",nativeQuery=true)
    List<Map<String,Object>> monthlyTrend(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);

    @Query(value="SELECT ii.cgst_rate,ii.sgst_rate,ii.igst_rate,SUM(ii.taxable_value) AS taxable,SUM(ii.cgst_amount) AS cgst,SUM(ii.sgst_amount) AS sgst,SUM(ii.igst_amount) AS igst FROM gst_invoice_items ii JOIN gst_invoices i ON ii.invoice_id=i.id WHERE i.tenant_id=:t AND i.is_cancelled=false AND i.invoice_date BETWEEN :from AND :to GROUP BY ii.cgst_rate,ii.sgst_rate,ii.igst_rate ORDER BY ii.igst_rate",nativeQuery=true)
    List<Map<String,Object>> taxSlabBreakdown(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);

    @Query(value="SELECT ii.hsn_sac_code,SUM(ii.quantity) AS qty,SUM(ii.taxable_value) AS taxable,SUM(ii.cgst_amount) AS cgst,SUM(ii.sgst_amount) AS sgst,SUM(ii.igst_amount) AS igst,SUM(ii.total_amount) AS total FROM gst_invoice_items ii JOIN gst_invoices i ON ii.invoice_id=i.id WHERE i.tenant_id=:t AND i.is_cancelled=false AND i.invoice_date BETWEEN :from AND :to GROUP BY ii.hsn_sac_code",nativeQuery=true)
    List<Map<String,Object>> hsnSummary(@Param("t") Long t,@Param("from") LocalDate from,@Param("to") LocalDate to);
}
