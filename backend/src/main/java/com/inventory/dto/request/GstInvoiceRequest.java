package com.inventory.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data public class GstInvoiceRequest {
    @NotNull private Long saleId;
    private String invoiceType,supplyType,buyerName;
    @Pattern(regexp="^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",message="Invalid GSTIN") private String buyerGstin;
    private String buyerAddress,buyerState,buyerStateCode;
    @NotBlank private String placeOfSupply;
    private Boolean reverseCharge;
    private LocalDate invoiceDate;
    private List<GstInvoiceItemRequest> items;
}
