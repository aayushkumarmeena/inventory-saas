package com.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private String direction;
    private Integer quantity;
    private String reason;
    private Integer resultingStock;
    private String createdByName;
    private LocalDateTime createdAt;
}
