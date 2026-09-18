package com.inventory.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PurchaseItemRequest {

    @NotNull
    private Long productId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal quantity;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal unitCost;
}
