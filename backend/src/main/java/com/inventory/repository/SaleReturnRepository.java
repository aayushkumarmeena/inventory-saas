package com.inventory.repository;

import com.inventory.entity.SaleReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface SaleReturnRepository extends JpaRepository<SaleReturn, Long> {
    List<SaleReturn> findBySaleIdOrderByCreatedAtDesc(Long saleId);

    // Batch fetch for list endpoints — avoids one query per row (N+1).
    List<SaleReturn> findBySaleIdIn(java.util.Collection<Long> saleIds);

    @Query("select coalesce(sum(r.totalRefund), 0) from SaleReturn r where r.saleId = :saleId")
    BigDecimal sumBySaleId(@Param("saleId") Long saleId);
}
