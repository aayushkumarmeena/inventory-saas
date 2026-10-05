package com.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BatchAdjustmentRequest {

    @NotNull
    private Integer newQuantity; // The corrected quantity, or amount to adjust

    @NotBlank
    private String reason; // "EXPIRED", "DAMAGED", "AUDIT_CORRECTION", "WRITE_OFF"

    private String notes;
}
