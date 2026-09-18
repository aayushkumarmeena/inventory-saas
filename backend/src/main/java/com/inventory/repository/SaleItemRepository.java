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
}
