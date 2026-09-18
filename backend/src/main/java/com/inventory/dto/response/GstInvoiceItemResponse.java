package com.inventory.dto.response;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstInvoiceItemResponse {
    private Long id;
    private String hsnSacCode,productName,uom;
    private BigDecimal quantity,unitPrice,discountAmount,taxableValue;
    private BigDecimal cgstRate,cgstAmount,sgstRate,sgstAmount,igstRate,igstAmount,cessRate,cessAmount,totalAmount;
}
