package com.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseResponse {
    private Long id;
    private String purchaseNumber;
    private String supplierName;
    private Long supplierId;
    private LocalDate purchaseDate;
    private BigDecimal totalAmount;
    private String status;
    private String createdByName;
    private List<PurchaseItemResponse> items;
}
