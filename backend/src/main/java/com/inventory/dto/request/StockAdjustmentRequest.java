package com.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class StockAdjustmentRequest {

    @NotNull
    private Long productId;

    @Pattern(regexp = "IN|OUT", message = "direction must be IN or OUT")
    private String direction;

    @NotNull
    @Min(1)
    private Integer quantity;

    private String reason;
}
