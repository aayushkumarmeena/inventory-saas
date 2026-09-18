package com.inventory.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaleItemRequest {

    @NotNull
    private Long productId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal quantity;
}
