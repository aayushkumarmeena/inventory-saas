package com.inventory.repository;

import com.inventory.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByTenantIdAndIsActive(Long tenantId, Boolean isActive, Pageable pageable);

    Optional<Product> findByIdAndTenantId(Long id, Long tenantId);

    Optional<Product> findByTenantIdAndSkuAndIsActive(Long tenantId, String sku, Boolean isActive);

    Optional<Product> findByTenantIdAndBarcodeAndIsActive(Long tenantId, String barcode, Boolean isActive);

    boolean existsByTenantIdAndSku(Long tenantId, String sku);

    long countByTenantIdAndIsActive(Long tenantId, Boolean isActive);

    @Query("select p from Product p where p.tenantId = :tenantId and p.isActive = true " +
           "and (lower(p.name) like concat('%', lower(cast(:q as String)), '%') or lower(p.sku) like concat('%', lower(cast(:q as String)), '%'))")
    Page<Product> search(@Param("tenantId") Long tenantId, @Param("q") String q, Pageable pageable);

    @Query("select p from Product p where p.tenantId = :tenantId and p.isActive = true " +
           "and p.stockQuantity <= p.reorderLevel")
    List<Product> findLowStock(@Param("tenantId") Long tenantId);

    @Query("select count(p) from Product p where p.tenantId = :tenantId and p.isActive = true " +
           "and p.stockQuantity <= p.reorderLevel")
    long countLowStock(@Param("tenantId") Long tenantId);

    @Query(value = "SELECT COALESCE(category, 'Uncategorized') as category, COUNT(*) as productCount, " +
            "SUM(stock_quantity * price) as stockValue " +
            "FROM products WHERE tenant_id = :tenantId AND is_active = true " +
            "GROUP BY category ORDER BY stockValue DESC",
            nativeQuery = true)
    List<CategoryBreakdownProjection> categoryBreakdown(@Param("tenantId") Long tenantId);

    @Query(value = "SELECT " +
            "p.id as id, " +
            "p.name as name, " +
            "p.sku as sku, " +
            "COALESCE(p.category, 'Uncategorized') as category, " +
            "p.price as price, " +
            "p.stock_quantity as stockQuantity, " +
            "p.reorder_level as reorderLevel, " +
            "COALESCE(cost.avg_cost, 0) as unitCost, " +
            "COALESCE(s30.units_sold, 0) as unitsSold30d, " +
            "COALESCE(s30.revenue, 0) as revenue30d, " +
            "last_sale.last_sold_date as lastSoldDate " +
            "FROM products p " +
            "LEFT JOIN (SELECT si.product_id, SUM(si.quantity) as units_sold, SUM(si.line_total) as revenue " +
            "           FROM sale_items si JOIN sales s ON si.sale_id = s.id " +
            "           WHERE s.tenant_id = :tenantId AND s.payment_status <> 'CANCELLED' AND s.sale_date >= :since30 " +
            "           GROUP BY si.product_id) s30 ON p.id = s30.product_id " +
            "LEFT JOIN (SELECT si.product_id, MAX(s.sale_date) as last_sold_date " +
            "           FROM sale_items si JOIN sales s ON si.sale_id = s.id " +
            "           WHERE s.tenant_id = :tenantId AND s.payment_status <> 'CANCELLED' " +
            "           GROUP BY si.product_id) last_sale ON p.id = last_sale.product_id " +
            "LEFT JOIN (SELECT pi.product_id, AVG(pi.unit_cost) as avg_cost " +
            "           FROM purchase_items pi JOIN purchases pu ON pi.purchase_id = pu.id " +
            "           WHERE pu.tenant_id = :tenantId AND pu.status <> 'CANCELLED' " +
            "           GROUP BY pi.product_id) cost ON p.id = cost.product_id " +
            "WHERE p.tenant_id = :tenantId AND p.is_active = true " +
            "ORDER BY p.name ASC",
            nativeQuery = true)
    List<ProductIntelProjection> inventoryIntel(@Param("tenantId") Long tenantId, @Param("since30") LocalDate since30);
}
