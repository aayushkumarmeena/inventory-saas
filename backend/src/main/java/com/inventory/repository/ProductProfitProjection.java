package com.inventory.repository;

import java.math.BigDecimal;

public interface ProductProfitProjection {
    Long getProductId();
    String getProductName();
    BigDecimal getTotalQuantity();
    BigDecimal getTotalRevenue();
    BigDecimal getAvgCost();
    BigDecimal getGrossProfit();
    BigDecimal getMarginPct();
}
