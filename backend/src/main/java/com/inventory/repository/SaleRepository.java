package com.inventory.repository;

import com.inventory.entity.Sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    Page<Sale> findByTenantIdOrderByCreatedAtDesc(Long tenantId, Pageable pageable);

    Optional<Sale> findByIdAndTenantId(Long id, Long tenantId);

    long countByTenantId(Long tenantId);

    @Query("select coalesce(sum(s.totalAmount), 0) from Sale s where s.tenantId = :tenantId and s.paymentStatus <> 'CANCELLED'")
    BigDecimal sumRevenue(@Param("tenantId") Long tenantId);

    @Query("select s from Sale s where s.tenantId = :tenantId " +
           "and (cast(:from as java.time.LocalDate) is null or s.saleDate >= :from) " +
           "and (cast(:to as java.time.LocalDate) is null or s.saleDate <= :to) " +
           "and (cast(:status as String) is null or s.paymentStatus = :status) " +
           "and (cast(:customer as String) is null or lower(s.customerName) like concat('%', lower(cast(:customer as String)), '%'))")
    Page<Sale> search(@Param("tenantId") Long tenantId, @Param("from") LocalDate from, @Param("to") LocalDate to,
                       @Param("status") String status, @Param("customer") String customer, Pageable pageable);

    @Query(value = "SELECT sale_date as day, SUM(total_amount) as revenue, COUNT(*) as salesCount " +
            "FROM sales WHERE tenant_id = :tenantId AND payment_status <> 'CANCELLED' AND sale_date >= :since " +
            "GROUP BY sale_date ORDER BY sale_date",
            nativeQuery = true)
    List<RevenuePointProjection> revenueTrend(@Param("tenantId") Long tenantId, @Param("since") LocalDate since);

    @Query("select count(s) from Sale s where s.customerId = :customerId and s.paymentStatus <> 'CANCELLED'")
    long countByCustomerId(@Param("customerId") Long customerId);

    @Query("select coalesce(sum(s.totalAmount), 0) from Sale s where s.customerId = :customerId and s.paymentStatus <> 'CANCELLED'")
    BigDecimal sumPaidByCustomerId(@Param("customerId") Long customerId);

    @Query(value = "SELECT COALESCE(SUM(s.total_amount - COALESCE(p.paid, 0)), 0) " +
            "FROM sales s LEFT JOIN (SELECT sale_id, SUM(amount) as paid FROM payments GROUP BY sale_id) p " +
            "ON p.sale_id = s.id " +
            "WHERE s.customer_id = :customerId AND s.payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')",
            nativeQuery = true)
    BigDecimal sumOutstandingByCustomerId(@Param("customerId") Long customerId);
}
