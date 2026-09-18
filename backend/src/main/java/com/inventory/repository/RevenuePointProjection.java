package com.inventory.repository;

import java.math.BigDecimal;
import java.sql.Date;

public interface RevenuePointProjection {
    Date getDay();
    BigDecimal getRevenue();
    Long getSalesCount();
}
