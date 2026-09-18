package com.inventory.repository;

import java.math.BigDecimal;

public interface TopProductProjection {
    Long getProductId();
    String getProductName();
    BigDecimal getTotalQuantity();
    BigDecimal getTotalRevenue();
}
