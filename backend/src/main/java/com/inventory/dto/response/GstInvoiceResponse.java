package com.inventory.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstInvoiceResponse {
    private Long id,saleId;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private String invoiceType,supplyType,buyerName,buyerGstin,buyerAddress,buyerState,buyerStateCode,placeOfSupply;
    private Boolean reverseCharge;
    private BigDecimal taxableValue,cgstAmount,sgstAmount,igstAmount,cessAmount,totalTax,totalAmount,roundOff;
    private String irn;
    private Boolean isCancelled;
    private String cancelReason;
    private List<GstInvoiceItemResponse> items;
    private LocalDateTime createdAt;
    private String sellerGstin,sellerLegalName,sellerAddress,sellerState,sellerStateCode;
}
