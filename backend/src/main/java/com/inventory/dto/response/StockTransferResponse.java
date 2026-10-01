package com.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class StockTransferResponse {
    private Long id;
    private String transferNumber;
    private Long fromWarehouseId;
    private String fromWarehouseName;
    private Long toWarehouseId;
    private String toWarehouseName;
    private String status;
    private String notes;
    private String createdByName;
    private LocalDate transferDate;
    private LocalDateTime createdAt;
    private List<TransferItemResponse> items;

    @Data
    @Builder
    public static class TransferItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private Integer quantity;
    }
}
