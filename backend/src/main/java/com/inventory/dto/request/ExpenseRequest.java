package com.inventory.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ExpenseRequest {
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    @NotBlank private String category;
    private String description;
    @NotNull private LocalDate expenseDate;
    private String paymentMethod;
    private String vendor;
    private String referenceNumber;
    private String notes;
}
