package com.inventory.dto.response;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ExpenseResponse {
    private Long id;
    private BigDecimal amount;
    private String category;
    private String description;
    private LocalDate expenseDate;
    private String paymentMethod;
    private String vendor;
    private String referenceNumber;
    private String notes;
    private String createdByName;
    private LocalDateTime createdAt;
}
