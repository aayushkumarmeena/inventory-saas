package com.inventory.service;

import com.inventory.dto.request.PurchaseItemRequest;
import com.inventory.dto.request.PurchaseRequest;
import com.inventory.dto.response.PurchaseItemResponse;
import com.inventory.dto.response.PurchaseResponse;
import com.inventory.entity.Product;
import com.inventory.entity.Purchase;
import com.inventory.entity.PurchaseItem;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.PurchaseItemRepository;
import com.inventory.repository.PurchaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Purchases follow a small order workflow: a new purchase starts as
 * ORDERED (no stock movement yet — you've ordered from the supplier but
 * nothing has arrived), and only adds stock once explicitly marked
 * RECEIVED. This matches how a real purchase actually happens instead of
 * assuming stock shows up the instant you record the order.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PurchaseService {

    private final PurchaseRepository purchaseRepo;
    private final PurchaseItemRepository purchaseItemRepo;
    private final ProductRepository productRepo;
    private final SupplierService supplierService;
    private final AuditService audit;

    @CacheEvict(value = "dashboard", allEntries = true)
    public PurchaseResponse create(Long tenantId, PurchaseRequest req) {
        BigDecimal total = BigDecimal.ZERO;
        List<PurchaseItem> lineItems = new ArrayList<>();

        for (PurchaseItemRequest itemReq : req.getItems()) {
            Product product = productRepo.findByIdAndTenantId(itemReq.getProductId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + itemReq.getProductId()));

            BigDecimal lineTotal = itemReq.getUnitCost().multiply(itemReq.getQuantity());
            total = total.add(lineTotal);

            lineItems.add(PurchaseItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitCost(itemReq.getUnitCost())
                    .lineTotal(lineTotal)
                    .build());
            // Stock is NOT added here — only when the purchase is marked RECEIVED.
        }

        Purchase purchase = purchaseRepo.save(Purchase.builder()
                .tenantId(tenantId)
                .purchaseNumber(generatePurchaseNumber(tenantId))
                .supplierName(req.getSupplierName())
                .supplierId(resolveSupplierId(tenantId, req.getSupplierId(), req.getSupplierName()))
                .purchaseDate(LocalDate.now())
                .totalAmount(total)
                .status("ORDERED")
                .createdByUserId(audit.userId())
                .createdByName(audit.userName())
                .build());

        for (PurchaseItem item : lineItems) {
            item.setPurchaseId(purchase.getId());
        }
        purchaseItemRepo.saveAll(lineItems);

        audit.log("PURCHASE", purchase.getId(), "CREATE", "Ordered " + purchase.getPurchaseNumber() + " for " + total);

        return toResponse(purchase, lineItems);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseResponse> list(Long tenantId, LocalDate from, LocalDate to, String status, String supplier, Pageable pageable) {
        Page<Purchase> page = purchaseRepo.search(tenantId, from, to, status, supplier, pageable);
        List<Long> purchaseIds = page.getContent().stream().map(Purchase::getId).collect(Collectors.toList());
        if (purchaseIds.isEmpty()) {
            return page.map(p -> toResponse(p, List.of()));
        }

        // Batch-fetch items for the whole page instead of one query per row (N+1).
        Map<Long, List<PurchaseItem>> itemsByPurchase = purchaseItemRepo.findByPurchaseIdIn(purchaseIds).stream()
                .collect(Collectors.groupingBy(PurchaseItem::getPurchaseId));

        return page.map(p -> toResponse(p, itemsByPurchase.getOrDefault(p.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public PurchaseResponse get(Long tenantId, Long id) {
        Purchase p = find(tenantId, id);
        return toResponse(p, purchaseItemRepo.findByPurchaseId(p.getId()));
    }

    /** Marks an ORDERED purchase as RECEIVED, adding its items to stock. */
    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public PurchaseResponse receive(Long tenantId, Long id) {
        Purchase purchase = find(tenantId, id);

        if (!"ORDERED".equals(purchase.getStatus())) {
            throw new BusinessException("Only an ordered purchase can be marked received (this one is " + purchase.getStatus() + ")");
        }

        List<PurchaseItem> items = purchaseItemRepo.findByPurchaseId(purchase.getId());
        for (PurchaseItem item : items) {
            if (item.getProductId() == null) continue;
            productRepo.findByIdAndTenantId(item.getProductId(), tenantId).ifPresent(p -> {
                p.setStockQuantity(p.getStockQuantity() + item.getQuantity().intValue());
                productRepo.save(p);
            });
        }

        purchase.setStatus("RECEIVED");
        purchaseRepo.save(purchase);
        audit.log("PURCHASE", purchase.getId(), "RECEIVE", "Received " + purchase.getPurchaseNumber() + ", stock added");
        return toResponse(purchase, items);
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public PurchaseResponse cancel(Long tenantId, Long id) {
        Purchase purchase = find(tenantId, id);

        if ("CANCELLED".equals(purchase.getStatus())) {
            throw new BusinessException("This purchase is already cancelled");
        }

        // Only reverse stock if it was actually added (i.e. purchase had been received).
        if ("RECEIVED".equals(purchase.getStatus())) {
            List<PurchaseItem> items = purchaseItemRepo.findByPurchaseId(purchase.getId());
            for (PurchaseItem item : items) {
                if (item.getProductId() == null) continue;
                Product product = productRepo.findByIdAndTenantId(item.getProductId(), tenantId).orElse(null);
                if (product == null) continue;
                int newStock = product.getStockQuantity() - item.getQuantity().intValue();
                if (newStock < 0) {
                    throw new BusinessException("Cannot cancel — '" + product.getName() + "' stock would go negative (some of it may already be sold)");
                }
                product.setStockQuantity(newStock);
                productRepo.save(product);
            }
        }

        purchase.setStatus("CANCELLED");
        purchaseRepo.save(purchase);
        audit.log("PURCHASE", purchase.getId(), "CANCEL", "Cancelled " + purchase.getPurchaseNumber());
        return toResponse(purchase, purchaseItemRepo.findByPurchaseId(purchase.getId()));
    }

    private Purchase find(Long tenantId, Long id) {
        return purchaseRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found"));
    }

    private String generatePurchaseNumber(Long tenantId) {
        long count = purchaseRepo.countByTenantId(tenantId) + 1;
        return "PO-" + LocalDate.now().getYear() + "-" + String.format("%05d", count);
    }

    private Long resolveSupplierId(Long tenantId, Long supplierId, String supplierName) {
        if (supplierId != null) return supplierId;
        if (supplierName != null && !supplierName.isBlank()) {
            return supplierService.findOrCreateByName(tenantId, supplierName.trim()).getId();
        }
        return null;
    }

    private PurchaseResponse toResponse(Purchase p, List<PurchaseItem> items) {
        return PurchaseResponse.builder()
                .id(p.getId())
                .purchaseNumber(p.getPurchaseNumber())
                .supplierName(p.getSupplierName())
                .supplierId(p.getSupplierId())
                .purchaseDate(p.getPurchaseDate())
                .totalAmount(p.getTotalAmount())
                .status(p.getStatus())
                .createdByName(p.getCreatedByName())
                .items(items.stream().map(i -> PurchaseItemResponse.builder()
                        .id(i.getId())
                        .productId(i.getProductId())
                        .productName(i.getProductName())
                        .quantity(i.getQuantity())
                        .unitCost(i.getUnitCost())
                        .lineTotal(i.getLineTotal())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
