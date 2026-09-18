package com.inventory.service;

import com.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    private final SaleRepository saleRepo;
    private final SaleItemRepository saleItemRepo;
    private final ProductRepository productRepo;
    private final PurchaseRepository purchaseRepo;

    public Map<String, Object> getOverview(Long tenantId, int days) {
        LocalDate since = LocalDate.now().minusDays(days);

        List<RevenuePointProjection> trend = saleRepo.revenueTrend(tenantId, since);
        List<TopProductProjection> topProducts = saleItemRepo.topProducts(tenantId, since, 8);
        List<CategoryBreakdownProjection> categories = productRepo.categoryBreakdown(tenantId);

        BigDecimal periodRevenue = trend.stream()
                .map(RevenuePointProjection::getRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long periodSalesCount = trend.stream().mapToLong(RevenuePointProjection::getSalesCount).sum();
        long periodPurchaseCount = purchaseRepo.countByTenantId(tenantId);

        BigDecimal avgOrderValue = periodSalesCount > 0
                ? periodRevenue.divide(BigDecimal.valueOf(periodSalesCount), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return Map.of(
                "periodDays", days,
                "periodRevenue", periodRevenue,
                "periodSalesCount", periodSalesCount,
                "avgOrderValue", avgOrderValue,
                "totalPurchases", periodPurchaseCount,
                "revenueTrend", trend.stream().map(t -> Map.of(
                        "date", t.getDay().toString(),
                        "revenue", t.getRevenue(),
                        "count", t.getSalesCount()
                )).collect(Collectors.toList()),
                "topProducts", topProducts.stream().map(p -> Map.of(
                        "productId", p.getProductId(),
                        "productName", p.getProductName(),
                        "quantity", p.getTotalQuantity(),
                        "revenue", p.getTotalRevenue()
                )).collect(Collectors.toList()),
                "categoryBreakdown", categories.stream().map(c -> Map.of(
                        "category", c.getCategory(),
                        "productCount", c.getProductCount(),
                        "stockValue", c.getStockValue()
                )).collect(Collectors.toList())
        );
    }
}
