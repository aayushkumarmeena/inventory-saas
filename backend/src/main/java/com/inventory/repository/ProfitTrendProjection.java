package com.inventory.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface ProfitTrendProjection {
    LocalDate getDay();
    BigDecimal getRevenue();
    BigDecimal getCost();
    BigDecimal getProfit();
}
