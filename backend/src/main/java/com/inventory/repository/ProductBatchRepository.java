package com.inventory.repository;

import com.inventory.entity.ProductBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProductBatchRepository extends JpaRepository<ProductBatch, Long> {

    Optional<ProductBatch> findByIdAndTenantId(Long id, Long tenantId);

    Optional<ProductBatch> findByTenantIdAndProductIdAndBatchNumber(Long tenantId, Long productId, String batchNumber);

    List<ProductBatch> findByTenantIdAndProductIdOrderByExpiryDateAsc(Long tenantId, Long productId);

    // FEFO: fetch active batches with available stock sorted by earliest expiry date first
    List<ProductBatch> findByTenantIdAndProductIdAndQuantityGreaterThanAndStatusOrderByExpiryDateAsc(
            Long tenantId, Long productId, Integer quantity, String status);

    @Query("SELECT b FROM ProductBatch b WHERE b.tenantId = :tenantId " +
           "AND (:productId IS NULL OR b.productId = :productId) " +
           "AND (:status IS NULL OR b.status = :status) " +
           "AND (:query IS NULL OR LOWER(b.batchNumber) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY b.expiryDate ASC")
    Page<ProductBatch> searchBatches(
            @Param("tenantId") Long tenantId,
            @Param("productId") Long productId,
            @Param("status") String status,
            @Param("query") String query,
            Pageable pageable);

    @Query("SELECT b FROM ProductBatch b WHERE b.tenantId = :tenantId " +
           "AND b.quantity > 0 " +
           "AND b.expiryDate <= :targetDate " +
           "ORDER BY b.expiryDate ASC")
    List<ProductBatch> findExpiringBatches(
            @Param("tenantId") Long tenantId,
            @Param("targetDate") LocalDate targetDate);

    @Query("SELECT COUNT(b) FROM ProductBatch b WHERE b.tenantId = :tenantId AND b.quantity > 0 AND b.expiryDate < CURRENT_DATE")
    long countExpired(@Param("tenantId") Long tenantId);

    @Query("SELECT COUNT(b) FROM ProductBatch b WHERE b.tenantId = :tenantId AND b.quantity > 0 AND b.expiryDate BETWEEN CURRENT_DATE AND :horizon")
    long countExpiringSoon(@Param("tenantId") Long tenantId, @Param("horizon") LocalDate horizon);

    @Query("SELECT COUNT(b) FROM ProductBatch b WHERE b.tenantId = :tenantId AND b.quantity > 0 AND b.expiryDate >= CURRENT_DATE")
    long countActive(@Param("tenantId") Long tenantId);
}
