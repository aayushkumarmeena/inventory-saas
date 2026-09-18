package com.inventory.service;

import com.inventory.dto.request.StockAdjustmentRequest;
import com.inventory.dto.response.StockAdjustmentResponse;
import com.inventory.entity.Product;
import com.inventory.entity.StockAdjustment;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.StockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class StockService {

    private final StockAdjustmentRepository adjustmentRepo;
    private final ProductRepository productRepo;
    private final AuditService audit;

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public StockAdjustmentResponse adjust(Long tenantId, StockAdjustmentRequest req) {
        Product product = productRepo.findByIdAndTenantId(req.getProductId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        int delta = "OUT".equals(req.getDirection()) ? -req.getQuantity() : req.getQuantity();
        int newStock = product.getStockQuantity() + delta;
        if (newStock < 0) {
            throw new BusinessException("Cannot remove " + req.getQuantity() + " units — only " + product.getStockQuantity() + " in stock");
        }

        product.setStockQuantity(newStock);
        productRepo.save(product);

        StockAdjustment adj = adjustmentRepo.save(StockAdjustment.builder()
                .tenantId(tenantId)
                .productId(product.getId())
                .direction(req.getDirection())
                .quantity(req.getQuantity())
                .reason(req.getReason())
                .resultingStock(newStock)
                .createdByUserId(audit.userId())
                .createdByName(audit.userName())
                .build());

        audit.log("STOCK", product.getId(), req.getDirection(),
                (("IN".equals(req.getDirection())) ? "Added " : "Removed ") + req.getQuantity() + " of " + product.getName());

        return toResponse(adj, product.getName(), product.getSku());
    }

    @Transactional(readOnly = true)
    public Page<StockAdjustmentResponse> list(Long tenantId, Long productId, Pageable pageable) {
        Page<StockAdjustment> page = productId != null
                ? adjustmentRepo.findByTenantIdAndProductIdOrderByCreatedAtDesc(tenantId, productId, pageable)
                : adjustmentRepo.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);

        // Batch-fetch the referenced products for the whole page instead of one
        // findById() per row (N+1) — was as many extra queries as the page size.
        List<Long> productIds = page.getContent().stream()
                .map(StockAdjustment::getProductId).distinct().collect(Collectors.toList());
        Map<Long, Product> productsById = productRepo.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        return page.map(adj -> {
            Product p = productsById.get(adj.getProductId());
            return toResponse(adj, p != null ? p.getName() : "(deleted product)", p != null ? p.getSku() : "");
        });
    }

    private StockAdjustmentResponse toResponse(StockAdjustment adj, String productName, String sku) {
        return StockAdjustmentResponse.builder()
                .id(adj.getId())
                .productId(adj.getProductId())
                .productName(productName)
                .productSku(sku)
                .direction(adj.getDirection())
                .quantity(adj.getQuantity())
                .reason(adj.getReason())
                .resultingStock(adj.getResultingStock())
                .createdByName(adj.getCreatedByName())
                .createdAt(adj.getCreatedAt())
                .build();
    }
}
