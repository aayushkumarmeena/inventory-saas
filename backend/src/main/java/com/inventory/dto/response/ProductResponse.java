package com.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String sku;
    private String name;
    private String description;
    private String categoryName;
    private String imageUrl;
    private String barcode;
    private BigDecimal price;
    private Integer stockQuantity;
    private Integer reorderPoint;
    private String hsnSacCode;
    private String hsnSacType;
    private BigDecimal cgstRate;
    private BigDecimal sgstRate;
    private BigDecimal igstRate;
    private BigDecimal cessRate;
    private Boolean taxInclusive;
    private Boolean lowStock;
}
