package com.inventory.repository;

import com.inventory.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    List<Warehouse> findByTenantIdAndIsActiveOrderByIdAsc(Long tenantId, Boolean isActive);
    Optional<Warehouse> findByIdAndTenantId(Long id, Long tenantId);
    Optional<Warehouse> findByTenantIdAndIsDefaultTrue(Long tenantId);
    boolean existsByTenantIdAndCode(Long tenantId, String code);
}
