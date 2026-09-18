package com.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class PurchaseRequest {

    private String supplierName;

    private Long supplierId;

    @NotEmpty(message = "Add at least one item")
    @Valid
    private List<PurchaseItemRequest> items;
}
