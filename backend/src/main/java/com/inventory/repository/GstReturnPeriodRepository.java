package com.inventory.repository;
import com.inventory.entity.GstReturnPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface GstReturnPeriodRepository extends JpaRepository<GstReturnPeriod,Long> {
    List<GstReturnPeriod> findByTenantIdOrderByYearDescMonthDesc(Long t);
    Optional<GstReturnPeriod> findByTenantIdAndPeriodTypeAndMonthAndYear(Long t,String type,Integer month,Integer year);
    Optional<GstReturnPeriod> findByIdAndTenantId(Long id,Long t);
}
