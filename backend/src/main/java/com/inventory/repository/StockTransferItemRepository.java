package com.inventory.repository;

import com.inventory.entity.StockTransferItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockTransferItemRepository extends JpaRepository<StockTransferItem, Long> {
    List<StockTransferItem> findByTransferId(Long transferId);
}
