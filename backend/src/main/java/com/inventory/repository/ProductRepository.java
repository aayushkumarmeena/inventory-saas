package com.inventory.repository;

import com.inventory.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
