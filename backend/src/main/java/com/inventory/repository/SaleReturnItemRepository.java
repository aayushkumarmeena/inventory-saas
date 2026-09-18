package com.inventory.repository;

import com.inventory.entity.SaleReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface SaleReturnItemRepository extends JpaRepository<SaleReturnItem, Long> {
    List<SaleReturnItem> findBySaleReturnId(Long saleReturnId);

    // Batch fetch for list endpoints — avoids one query per return (N+1).
    List<SaleReturnItem> findBySaleReturnIdIn(java.util.Collection<Long> saleReturnIds);

    @Query("select coalesce(sum(i.quantity), 0) from SaleReturnItem i where i.saleItemId = :saleItemId")
    BigDecimal sumReturnedQuantityBySaleItemId(@Param("saleItemId") Long saleItemId);
}
