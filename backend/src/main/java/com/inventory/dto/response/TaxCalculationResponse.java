package com.inventory.dto.response;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TaxCalculationResponse {
    private BigDecimal originalAmount,taxableValue;
    private BigDecimal cgstRate,cgstAmount,sgstRate,sgstAmount,igstRate,igstAmount,cessRate,cessAmount;
    private BigDecimal totalTax,totalAmount;
    private boolean taxInclusive;
    private String supplyType;
}
