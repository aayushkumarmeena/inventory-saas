package com.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {
    private Long id;
    private String name;
    private String phone;
    private String email;
    private String address;
    private Long totalOrders;
    private BigDecimal totalSpent;
    private BigDecimal outstandingBalance;
}
