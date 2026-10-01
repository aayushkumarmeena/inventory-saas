package com.inventory.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface ProductIntelProjection {
    Long getId();
    String getName();
    String getSku();
    String getCategory();
    BigDecimal getPrice();
    Integer getStockQuantity();
    Integer getReorderLevel();
    BigDecimal getUnitCost();
    BigDecimal getUnitsSold30d();
    BigDecimal getRevenue30d();
    LocalDate getLastSoldDate();
}
