package com.inventory.repository;
import com.inventory.entity.HsnSacCode;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface HsnSacCodeRepository extends JpaRepository<HsnSacCode,Long> {
    Page<HsnSacCode> findByTenantIdAndIsActive(Long t, Boolean active, Pageable p);
    List<HsnSacCode> findByTenantIdAndIsActive(Long t, Boolean active);
    Optional<HsnSacCode> findByIdAndTenantId(Long id, Long t);
    Optional<HsnSacCode> findByTenantIdAndCode(Long t, String code);
    boolean existsByTenantIdAndCode(Long t, String code);
    @Query("SELECT h FROM HsnSacCode h WHERE h.tenantId=:t AND h.isActive=true AND (LOWER(h.code) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(h.description) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<HsnSacCode> search(@Param("t") Long t, @Param("q") String q, Pageable p);
}
