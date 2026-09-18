package com.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SaleRequest {

    private String customerName;

    private Long customerId;

    @NotEmpty(message = "Add at least one item")
    @Valid
    private List<SaleItemRequest> items;
}
