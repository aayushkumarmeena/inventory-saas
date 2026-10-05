package com.inventory.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ProductBatchRequest {

    @NotNull
    private Long productId;

    @NotBlank
    private String batchNumber;

    private LocalDate mfgDate;

    @NotNull
    private LocalDate expiryDate;

    @NotNull
    @Min(1)
    private Integer initialQuantity;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal purchasePrice;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal sellingPrice;

    private String notes;
}
