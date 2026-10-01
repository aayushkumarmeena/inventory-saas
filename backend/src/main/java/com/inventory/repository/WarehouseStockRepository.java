package com.inventory.repository;

import com.inventory.entity.WarehouseStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, Long> {
    List<WarehouseStock> findByTenantIdAndWarehouseId(Long tenantId, Long warehouseId);
    Optional<WarehouseStock> findByWarehouseIdAndProductId(Long warehouseId, Long productId);
    List<WarehouseStock> findByTenantIdAndProductId(Long tenantId, Long productId);
}
