package com.inventory.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class StockTransferRequest {
    @NotNull(message = "Source warehouse is required")
    private Long fromWarehouseId;

    @NotNull(message = "Destination warehouse is required")
    private Long toWarehouseId;

    private String notes;
    private LocalDate transferDate;

    @NotEmpty(message = "At least one item must be transferred")
    private List<TransferItemRequest> items;

    @Data
    public static class TransferItemRequest {
        @NotNull(message = "Product ID is required")
        private Long productId;

        @NotNull(message = "Quantity is required")
        private Integer quantity;
    }
}
