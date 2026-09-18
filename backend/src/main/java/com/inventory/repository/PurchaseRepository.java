package com.inventory.repository;

import com.inventory.entity.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    Optional<Purchase> findByIdAndTenantId(Long id, Long tenantId);

    long countByTenantId(Long tenantId);

    @Query("select p from Purchase p where p.tenantId = :tenantId " +
           "and (cast(:from as java.time.LocalDate) is null or p.purchaseDate >= :from) " +
           "and (cast(:to as java.time.LocalDate) is null or p.purchaseDate <= :to) " +
           "and (cast(:status as String) is null or p.status = :status) " +
           "and (cast(:supplier as String) is null or lower(p.supplierName) like concat('%', lower(cast(:supplier as String)), '%'))")
    Page<Purchase> search(@Param("tenantId") Long tenantId, @Param("from") LocalDate from, @Param("to") LocalDate to,
                           @Param("status") String status, @Param("supplier") String supplier, Pageable pageable);

    @Query("select count(p) from Purchase p where p.supplierId = :supplierId and p.status <> 'CANCELLED'")
    long countBySupplierId(@Param("supplierId") Long supplierId);

    @Query("select coalesce(sum(p.totalAmount), 0) from Purchase p where p.supplierId = :supplierId and p.status <> 'CANCELLED'")
    java.math.BigDecimal sumBySupplierId(@Param("supplierId") Long supplierId);
}
