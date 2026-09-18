package com.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SaleReturnRequest {

    private String reason;

    @NotEmpty(message = "Select at least one item to return")
    @Valid
    private List<SaleReturnItemRequest> items;
}
