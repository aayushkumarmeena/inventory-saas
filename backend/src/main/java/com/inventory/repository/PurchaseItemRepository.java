package com.inventory.repository;

import com.inventory.entity.PurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {
    List<PurchaseItem> findByPurchaseId(Long purchaseId);

    // Batch fetch for list endpoints — avoids one query per row (N+1).
    List<PurchaseItem> findByPurchaseIdIn(java.util.Collection<Long> purchaseIds);
}
