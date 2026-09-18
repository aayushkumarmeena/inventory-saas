package com.inventory.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequest {

    @NotBlank
    private String sku;

    @NotBlank
    private String name;

    private String description;

    private String category;

    private String imageUrl;

    private String barcode;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal price;

    private Integer stockQuantity;

    private Integer reorderLevel;

    private String hsnSacCode;

    private String hsnSacType;

    private BigDecimal cgstRate;

    private BigDecimal sgstRate;

    private BigDecimal igstRate;

    private BigDecimal cessRate;

    private Boolean taxInclusive;
}
