package com.inventory.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstSummaryResponse {
    private BigDecimal totalTaxableValue,totalCgst,totalSgst,totalIgst,totalCess,totalTax,totalInvoiceValue;
    private long b2bCount,b2cCount,exportCount,cancelledCount;
    private List<Map<String,Object>> taxSlabBreakdown,monthlyTrend;
}
