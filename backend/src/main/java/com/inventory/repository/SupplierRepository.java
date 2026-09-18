package com.inventory.repository;

import com.inventory.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    Optional<Supplier> findByIdAndTenantId(Long id, Long tenantId);

    @Query("select s from Supplier s where s.tenantId = :tenantId " +
           "and (cast(:q as String) is null or lower(s.name) like concat('%', lower(cast(:q as String)), '%'))")
    Page<Supplier> search(@Param("tenantId") Long tenantId, @Param("q") String q, Pageable pageable);

    Optional<Supplier> findByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}
