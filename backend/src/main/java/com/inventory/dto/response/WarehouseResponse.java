package com.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WarehouseResponse {
    private Long id;
    private String name;
    private String code;
    private String type;
    private String address;
    private String city;
    private String phone;
    private Boolean isDefault;
    private Boolean isActive;
    private Integer totalSkus;
    private Integer totalQuantity;
    private LocalDateTime createdAt;
}
