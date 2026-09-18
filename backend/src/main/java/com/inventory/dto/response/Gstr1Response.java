package com.inventory.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Gstr1Response {
    private int month,year;
    private String gstin,legalName;
    private List<B2bEntry> b2b;
    private List<B2cEntry> b2c;
    private BigDecimal totalTaxableValue,totalCgst,totalSgst,totalIgst;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class B2bEntry { private String buyerGstin,buyerName,invoiceNumber,invoiceDate,placeOfSupply; private BigDecimal invoiceValue,taxableValue,cgstAmount,sgstAmount,igstAmount; }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class B2cEntry { private String invoiceNumber,invoiceDate,placeOfSupply; private BigDecimal invoiceValue,taxableValue,cgstAmount,sgstAmount,igstAmount; }
}
