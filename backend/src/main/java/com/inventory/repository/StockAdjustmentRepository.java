package com.inventory.repository;

import com.inventory.entity.StockAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {
    Page<StockAdjustment> findByTenantIdOrderByCreatedAtDesc(Long tenantId, Pageable pageable);
    Page<StockAdjustment> findByTenantIdAndProductIdOrderByCreatedAtDesc(Long tenantId, Long productId, Pageable pageable);
}
