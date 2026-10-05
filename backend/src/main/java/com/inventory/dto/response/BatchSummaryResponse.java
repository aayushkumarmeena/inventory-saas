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
public class BatchSummaryResponse {
    private long totalActiveBatches;
    private long expiredBatches;
    private long expiringIn30Days;
    private long expiringIn60Days;
    private long expiringIn90Days;
    private BigDecimal totalBatchStockValue;
}
