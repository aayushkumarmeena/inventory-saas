package com.inventory.repository;

import com.inventory.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    List<SaleItem> findBySaleId(Long saleId);

    // Batch fetch for list endpoints — avoids one query per row (N+1).
    List<SaleItem> findBySaleIdIn(java.util.Collection<Long> saleIds);

    @Query(value = "SELECT si.product_id as productId, si.product_name as productName, " +
            "SUM(si.quantity) as totalQuantity, SUM(si.line_total) as totalRevenue " +
            "FROM sale_items si JOIN sales s ON si.sale_id = s.id " +
            "WHERE s.tenant_id = :tenantId AND s.payment_status <> 'CANCELLED' AND s.sale_date >= :since " +
            "GROUP BY si.product_id, si.product_name " +
            "ORDER BY totalRevenue DESC " +
            "LIMIT :limit",
            nativeQuery = true)
    List<TopProductProjection> topProducts(@Param("tenantId") Long tenantId, @Param("since") LocalDate since, @Param("limit") int limit);

    @Query(value = "SELECT si.product_id as productId, si.product_name as productName, " +
            "SUM(si.quantity) as totalQuantity, SUM(si.line_total) as totalRevenue, " +
            "COALESCE(cost.avg_cost, 0) as avgCost, " +
            "SUM(si.line_total) - (SUM(si.quantity) * COALESCE(cost.avg_cost, 0)) as grossProfit, " +
            "CASE WHEN SUM(si.line_total) > 0 THEN ROUND(((SUM(si.line_total) - (SUM(si.quantity) * COALESCE(cost.avg_cost, 0))) / SUM(si.line_total) * 100), 2) ELSE 0 END as marginPct " +
            "FROM sale_items si JOIN sales s ON si.sale_id = s.id " +
            "LEFT JOIN (SELECT pi.product_id, AVG(pi.unit_cost) as avg_cost FROM purchase_items pi JOIN purchases p ON pi.purchase_id = p.id WHERE p.tenant_id = :tenantId AND p.status <> 'CANCELLED' GROUP BY pi.product_id) cost ON si.product_id = cost.product_id " +
            "WHERE s.tenant_id = :tenantId AND s.payment_status <> 'CANCELLED' AND s.sale_date >= :since " +
            "GROUP BY si.product_id, si.product_name, cost.avg_cost " +
            "ORDER BY grossProfit DESC " +
            "LIMIT :limit",
            nativeQuery = true)
    List<ProductProfitProjection> profitByProduct(@Param("tenantId") Long tenantId, @Param("since") LocalDate since, @Param("limit") int limit);

    @Query(value = "SELECT s.sale_date as day, " +
            "COALESCE(SUM(si.line_total), 0) as revenue, " +
            "COALESCE(SUM(si.quantity * COALESCE(cost.avg_cost, 0)), 0) as cost, " +
            "COALESCE(SUM(si.line_total - (si.quantity * COALESCE(cost.avg_cost, 0))), 0) as profit " +
            "FROM sales s JOIN sale_items si ON si.sale_id = s.id " +
            "LEFT JOIN (SELECT pi.product_id, AVG(pi.unit_cost) as avg_cost FROM purchase_items pi JOIN purchases p ON pi.purchase_id = p.id WHERE p.tenant_id = :tenantId AND p.status <> 'CANCELLED' GROUP BY pi.product_id) cost ON si.product_id = cost.product_id " +
            "WHERE s.tenant_id = :tenantId AND s.payment_status <> 'CANCELLED' AND s.sale_date >= :since " +
            "GROUP BY s.sale_date ORDER BY s.sale_date",
            nativeQuery = true)
    List<ProfitTrendProjection> profitTrend(@Param("tenantId") Long tenantId, @Param("since") LocalDate since);
}
