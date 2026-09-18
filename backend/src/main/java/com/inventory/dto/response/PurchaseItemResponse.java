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
public class PurchaseItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal quantity;
    private BigDecimal unitCost;
    private BigDecimal lineTotal;
}
