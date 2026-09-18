package com.inventory.dto.request;
import lombok.Data;
import java.math.BigDecimal;

@Data public class GstInvoiceItemRequest {
    private Long saleItemId;
    private String hsnSacCode,productName,uom;
    private BigDecimal quantity,unitPrice,discountAmount;
    private Boolean taxInclusive;
    private BigDecimal cgstRate,sgstRate,igstRate,cessRate;
}
