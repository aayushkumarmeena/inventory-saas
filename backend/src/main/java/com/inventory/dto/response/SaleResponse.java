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
public class SaleResponse {
    private Long id;
    private String saleNumber;
    private String customerName;
    private Long customerId;
    private LocalDate saleDate;
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private BigDecimal balanceDue;
    private BigDecimal totalRefunded;
    private String paymentStatus;
    private String createdByName;
    private List<SaleItemResponse> items;
    private List<PaymentResponse> payments;
    private List<SaleReturnResponse> returns;
}
