package com.inventory.repository;

import java.math.BigDecimal;

public interface CategoryBreakdownProjection {
    String getCategory();
    Long getProductCount();
    BigDecimal getStockValue();
}
