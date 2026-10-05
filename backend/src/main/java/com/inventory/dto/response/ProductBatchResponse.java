package com.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductBatchResponse {
    private Long id;
    private Long tenantId;
    private Long productId;
    private String productName;
    private String productSku;
    private String batchNumber;
    private LocalDate mfgDate;
    private LocalDate expiryDate;
    private Integer initialQuantity;
    private Integer quantity;
    private BigDecimal purchasePrice;
    private BigDecimal sellingPrice;
    private String status; // ACTIVE, EXPIRED, DEPLETED
    private String notes;
    private Long daysUntilExpiry;
    private Boolean isExpired;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
