package com.inventory.repository;
import com.inventory.entity.GstConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface GstConfigRepository extends JpaRepository<GstConfig,Long> {
    Optional<GstConfig> findByTenantId(Long tenantId);
    boolean existsByTenantId(Long tenantId);
}
