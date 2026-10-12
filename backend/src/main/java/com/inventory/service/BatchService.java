package com.inventory.service;

import com.inventory.dto.request.BatchAdjustmentRequest;
import com.inventory.dto.request.ProductBatchRequest;
import com.inventory.dto.response.BatchSummaryResponse;
import com.inventory.dto.response.ProductBatchResponse;
import com.inventory.entity.Product;
import com.inventory.entity.ProductBatch;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.ProductBatchRepository;
import com.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BatchService {

    private final ProductBatchRepository batchRepo;
    private final ProductRepository productRepo;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public Page<ProductBatchResponse> list(Long tenantId, Long productId, String filter, String query, Pageable pageable) {
        Page<ProductBatch> page;
        if (productId != null) {
            page = batchRepo.findByTenantIdAndProductIdOrderByExpiryDateAsc(tenantId, productId, pageable);
        } else {
            page = batchRepo.findByTenantIdOrderByExpiryDateAsc(tenantId, pageable);
        }

        List<ProductBatch> content = page.getContent();

        // Status & expiry horizon filtering
        if ("ACTIVE".equalsIgnoreCase(filter)) {
            content = content.stream().filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus()) && b.getQuantity() > 0).collect(Collectors.toList());
        } else if ("DEPLETED".equalsIgnoreCase(filter)) {
            content = content.stream().filter(b -> "DEPLETED".equalsIgnoreCase(b.getStatus()) || b.getQuantity() == 0).collect(Collectors.toList());
        } else if ("EXPIRED".equalsIgnoreCase(filter)) {
            content = content.stream().filter(b -> b.isExpired() || "EXPIRED".equalsIgnoreCase(b.getStatus())).collect(Collectors.toList());
        } else if ("EXPIRING_30".equalsIgnoreCase(filter)) {
            content = content.stream().filter(b -> b.getQuantity() > 0 && !b.isExpired() && b.getDaysUntilExpiry() <= 30).collect(Collectors.toList());
        } else if ("EXPIRING_60".equalsIgnoreCase(filter)) {
            content = content.stream().filter(b -> b.getQuantity() > 0 && !b.isExpired() && b.getDaysUntilExpiry() <= 60).collect(Collectors.toList());
        } else if ("EXPIRING_90".equalsIgnoreCase(filter)) {
            content = content.stream().filter(b -> b.getQuantity() > 0 && !b.isExpired() && b.getDaysUntilExpiry() <= 90).collect(Collectors.toList());
        }

        // Search query filtering
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase();
            content = content.stream().filter(b -> b.getBatchNumber() != null && b.getBatchNumber().toLowerCase().contains(q)).collect(Collectors.toList());
        }

        // Batch fetch products to avoid N+1
        List<Long> productIds = content.stream().map(ProductBatch::getProductId).distinct().collect(Collectors.toList());
        Map<Long, Product> productMap = productIds.isEmpty() ? Map.of() :
                productRepo.findAllById(productIds).stream()
                        .collect(Collectors.toMap(Product::getId, p -> p, (p1, p2) -> p1));

        List<ProductBatchResponse> responses = content.stream()
                .map(b -> toResponse(b, productMap.get(b.getProductId())))
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public BatchSummaryResponse getSummary(Long tenantId) {
        LocalDate now = LocalDate.now();
        long expired = batchRepo.countExpired(tenantId);
        long in30 = batchRepo.countExpiringSoon(tenantId, now.plusDays(30));
        long in60 = batchRepo.countExpiringSoon(tenantId, now.plusDays(60));
        long in90 = batchRepo.countExpiringSoon(tenantId, now.plusDays(90));
        long active = batchRepo.countActive(tenantId);

        // Calculate approximate stock valuation for batches
        List<ProductBatch> allActive = batchRepo.findExpiringBatches(tenantId, now.plusYears(10));
        BigDecimal totalValuation = BigDecimal.ZERO;
        for (ProductBatch b : allActive) {
            if (b.getQuantity() > 0 && b.getPurchasePrice() != null) {
                totalValuation = totalValuation.add(b.getPurchasePrice().multiply(BigDecimal.valueOf(b.getQuantity())));
            }
        }

        return BatchSummaryResponse.builder()
                .totalActiveBatches(active)
                .expiredBatches(expired)
                .expiringIn30Days(in30)
                .expiringIn60Days(in60)
                .expiringIn90Days(in90)
                .totalBatchStockValue(totalValuation)
                .build();
    }

    /**
     * Get available batches for FEFO auto-allocation (sorted by expiryDate ASC).
     */
    @Transactional(readOnly = true)
    public List<ProductBatchResponse> getFefoBatches(Long tenantId, Long productId) {
        Product product = productRepo.findByIdAndTenantId(productId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        List<ProductBatch> batches = batchRepo
                .findByTenantIdAndProductIdAndQuantityGreaterThanAndStatusOrderByExpiryDateAsc(tenantId, productId, 0, "ACTIVE");

        return batches.stream()
                .map(b -> toResponse(b, product))
                .collect(Collectors.toList());
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public ProductBatchResponse create(Long tenantId, ProductBatchRequest req) {
        Product product = productRepo.findByIdAndTenantId(req.getProductId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + req.getProductId()));

        batchRepo.findByTenantIdAndProductIdAndBatchNumber(tenantId, product.getId(), req.getBatchNumber().trim())
                .ifPresent(existing -> {
                    throw new BusinessException("Batch '" + req.getBatchNumber() + "' already exists for product '" + product.getName() + "'");
                });

        ProductBatch batch = ProductBatch.builder()
                .tenantId(tenantId)
                .productId(product.getId())
                .batchNumber(req.getBatchNumber().trim().toUpperCase())
                .mfgDate(req.getMfgDate())
                .expiryDate(req.getExpiryDate())
                .initialQuantity(req.getInitialQuantity())
                .quantity(req.getInitialQuantity())
                .purchasePrice(req.getPurchasePrice())
                .sellingPrice(req.getSellingPrice() != null ? req.getSellingPrice() : product.getPrice())
                .status(req.getExpiryDate().isBefore(LocalDate.now()) ? "EXPIRED" : "ACTIVE")
                .notes(req.getNotes())
                .build();

        batch = batchRepo.save(batch);

        // Update product batch tracking flag and replenish total product stock
        product.setHasBatchTracking(true);
        product.setStockQuantity(product.getStockQuantity() + req.getInitialQuantity());
        productRepo.save(product);

        audit.log("BATCH", batch.getId(), "CREATE",
                "Created batch " + batch.getBatchNumber() + " with " + req.getInitialQuantity() + " units for " + product.getName());

        return toResponse(batch, product);
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public ProductBatchResponse adjust(Long tenantId, Long batchId, BatchAdjustmentRequest req) {
        ProductBatch batch = batchRepo.findByIdAndTenantId(batchId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        Product product = productRepo.findByIdAndTenantId(batch.getProductId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + batch.getProductId()));

        int oldQty = batch.getQuantity();
        int newQty = Math.max(0, req.getNewQuantity());
        int delta = newQty - oldQty;

        batch.setQuantity(newQty);
        if (newQty == 0) {
            batch.setStatus("DEPLETED");
        } else if ("EXPIRED".equalsIgnoreCase(req.getReason()) || batch.isExpired()) {
            batch.setStatus("EXPIRED");
        } else {
            batch.setStatus("ACTIVE");
        }

        if (req.getNotes() != null && !req.getNotes().isBlank()) {
            batch.setNotes(req.getNotes());
        }

        batchRepo.save(batch);

        // Adjust total product stock accordingly
        int updatedProductStock = Math.max(0, product.getStockQuantity() + delta);
        product.setStockQuantity(updatedProductStock);
        productRepo.save(product);

        audit.log("BATCH", batch.getId(), "ADJUST",
                "Adjusted batch " + batch.getBatchNumber() + " from " + oldQty + " to " + newQty + ". Reason: " + req.getReason());

        return toResponse(batch, product);
    }

    private ProductBatchResponse toResponse(ProductBatch b, Product p) {
        return ProductBatchResponse.builder()
                .id(b.getId())
                .tenantId(b.getTenantId())
                .productId(b.getProductId())
                .productName(p != null ? p.getName() : "Unknown")
                .productSku(p != null ? p.getSku() : "")
                .batchNumber(b.getBatchNumber())
                .mfgDate(b.getMfgDate())
                .expiryDate(b.getExpiryDate())
                .initialQuantity(b.getInitialQuantity())
                .quantity(b.getQuantity())
                .purchasePrice(b.getPurchasePrice())
                .sellingPrice(b.getSellingPrice())
                .status(b.getStatus())
                .notes(b.getNotes())
                .daysUntilExpiry(b.getDaysUntilExpiry())
                .isExpired(b.isExpired())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}
