package com.inventory.service;

import com.inventory.dto.request.ProductRequest;
import com.inventory.dto.response.ProductResponse;
import com.inventory.entity.Product;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository productRepo;

    @Transactional(readOnly = true)
    public Page<ProductResponse> list(Long tenantId, String q, Pageable pageable) {
        Page<Product> page = (q != null && !q.isBlank())
                ? productRepo.search(tenantId, q, pageable)
                : productRepo.findByTenantIdAndIsActive(tenantId, true, pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long tenantId, Long id) {
        return toResponse(find(tenantId, id));
    }

    @Transactional(readOnly = true)
    public ProductResponse getBySku(Long tenantId, String sku) {
        Product p = productRepo.findByTenantIdAndSkuAndIsActive(tenantId, sku, true)
                .orElseThrow(() -> new ResourceNotFoundException("No product found for SKU '" + sku + "'"));
        return toResponse(p);
    }

    @Transactional(readOnly = true)
    public ProductResponse getByBarcode(Long tenantId, String barcode) {
        Product p = productRepo.findByTenantIdAndBarcodeAndIsActive(tenantId, barcode, true)
                .orElseThrow(() -> new ResourceNotFoundException("No product found for barcode '" + barcode + "'"));
        return toResponse(p);
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public ProductResponse create(Long tenantId, ProductRequest req) {
        if (productRepo.existsByTenantIdAndSku(tenantId, req.getSku())) {
            throw new BusinessException("A product with SKU '" + req.getSku() + "' already exists");
        }
        Product p = Product.builder()
                .tenantId(tenantId)
                .sku(req.getSku())
                .name(req.getName())
                .description(req.getDescription())
                .category(req.getCategory())
                .imageUrl(req.getImageUrl())
                .barcode(req.getBarcode())
                .price(req.getPrice())
                .stockQuantity(req.getStockQuantity() != null ? req.getStockQuantity() : 0)
                .reorderLevel(req.getReorderLevel() != null ? req.getReorderLevel() : 10)
                .hsnSacCode(req.getHsnSacCode())
                .hsnSacType(req.getHsnSacType() != null ? req.getHsnSacType() : "HSN")
                .cgstRate(nz(req.getCgstRate()))
                .sgstRate(nz(req.getSgstRate()))
                .igstRate(nz(req.getIgstRate()))
                .cessRate(nz(req.getCessRate()))
                .taxInclusive(req.getTaxInclusive() != null ? req.getTaxInclusive() : false)
                .isActive(true)
                .build();
        return toResponse(productRepo.save(p));
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public ProductResponse update(Long tenantId, Long id, ProductRequest req) {
        Product p = find(tenantId, id);
        p.setName(req.getName());
        p.setDescription(req.getDescription());
        p.setCategory(req.getCategory());
        p.setImageUrl(req.getImageUrl());
        p.setBarcode(req.getBarcode());
        p.setPrice(req.getPrice());
        if (req.getStockQuantity() != null) p.setStockQuantity(req.getStockQuantity());
        if (req.getReorderLevel() != null) p.setReorderLevel(req.getReorderLevel());
        p.setHsnSacCode(req.getHsnSacCode());
        if (req.getHsnSacType() != null) p.setHsnSacType(req.getHsnSacType());
        if (req.getCgstRate() != null) p.setCgstRate(req.getCgstRate());
        if (req.getSgstRate() != null) p.setSgstRate(req.getSgstRate());
        if (req.getIgstRate() != null) p.setIgstRate(req.getIgstRate());
        if (req.getCessRate() != null) p.setCessRate(req.getCessRate());
        if (req.getTaxInclusive() != null) p.setTaxInclusive(req.getTaxInclusive());
        return toResponse(productRepo.save(p));
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public void delete(Long tenantId, Long id) {
        Product p = find(tenantId, id);
        p.setIsActive(false);
        productRepo.save(p);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> lowStock(Long tenantId) {
        return productRepo.findLowStock(tenantId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    private Product find(Long tenantId, Long id) {
        return productRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    private BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private ProductResponse toResponse(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .sku(p.getSku())
                .name(p.getName())
                .description(p.getDescription())
                .categoryName(p.getCategory())
                .imageUrl(p.getImageUrl())
                .barcode(p.getBarcode())
                .price(p.getPrice())
                .stockQuantity(p.getStockQuantity())
                .reorderPoint(p.getReorderLevel())
                .hsnSacCode(p.getHsnSacCode())
                .hsnSacType(p.getHsnSacType())
                .cgstRate(p.getCgstRate())
                .sgstRate(p.getSgstRate())
                .igstRate(p.getIgstRate())
                .cessRate(p.getCessRate())
                .taxInclusive(p.getTaxInclusive())
                .lowStock(p.getStockQuantity() != null && p.getReorderLevel() != null
                        && p.getStockQuantity() <= p.getReorderLevel())
                .build();
    }
}
