package com.inventory.repository;

import com.inventory.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByIdAndTenantId(Long id, Long tenantId);

    @Query("select c from Customer c where c.tenantId = :tenantId " +
           "and (cast(:q as String) is null or lower(c.name) like concat('%', lower(cast(:q as String)), '%'))")
    Page<Customer> search(@Param("tenantId") Long tenantId, @Param("q") String q, Pageable pageable);

    Optional<Customer> findByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}
