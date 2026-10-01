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

    public Map<String, Object> getProfitSummary(Long tenantId, int days) {
        LocalDate since = LocalDate.now().minusDays(days);
        List<ProductProfitProjection> products = saleItemRepo.profitByProduct(tenantId, since, 20);
        List<ProfitTrendProjection> trend = saleItemRepo.profitTrend(tenantId, since);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal totalGrossProfit = BigDecimal.ZERO;

        for (ProfitTrendProjection p : trend) {
            if (p.getRevenue() != null) totalRevenue = totalRevenue.add(p.getRevenue());
            if (p.getCost() != null) totalCost = totalCost.add(p.getCost());
            if (p.getProfit() != null) totalGrossProfit = totalGrossProfit.add(p.getProfit());
        }

        BigDecimal netMarginPct = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalGrossProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long healthyCount = 0;
        long moderateCount = 0;
        long lowMarginCount = 0;
        for (ProductProfitProjection prod : products) {
            double m = prod.getMarginPct() != null ? prod.getMarginPct().doubleValue() : 0.0;
            if (m >= 30.0) healthyCount++;
            else if (m >= 10.0) moderateCount++;
            else lowMarginCount++;
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("periodDays", days);
        result.put("totalRevenue", totalRevenue);
        result.put("totalCost", totalCost);
        result.put("totalGrossProfit", totalGrossProfit);
        result.put("netMarginPct", netMarginPct);
        result.put("healthyMarginCount", healthyCount);
        result.put("moderateMarginCount", moderateCount);
        result.put("lowMarginCount", lowMarginCount);
        result.put("trend", trend.stream().map(t -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("date", t.getDay().toString());
            m.put("revenue", t.getRevenue());
            m.put("cost", t.getCost());
            m.put("profit", t.getProfit());
            return m;
        }).collect(Collectors.toList()));
        result.put("products", products.stream().map(p -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("productId", p.getProductId());
            m.put("productName", p.getProductName());
            m.put("quantity", p.getTotalQuantity());
            m.put("revenue", p.getTotalRevenue());
            m.put("avgCost", p.getAvgCost());
            m.put("grossProfit", p.getGrossProfit());
            m.put("marginPct", p.getMarginPct());
            return m;
        }).collect(Collectors.toList()));

        return result;
    }

    public Map<String, Object> getInventoryIntel(Long tenantId) {
        LocalDate since30 = LocalDate.now().minusDays(30);
        List<ProductIntelProjection> products = productRepo.inventoryIntel(tenantId, since30);

        BigDecimal totalStockValuation = BigDecimal.ZERO;
        BigDecimal totalCostValuation = BigDecimal.ZERO;
        BigDecimal deadStockValuation = BigDecimal.ZERO;
        long totalUnits = 0;
        long criticalReorderCount = 0;
        long outOfStockCount = 0;
        long deadStockCount = 0;
        long overstockCount = 0;
        long fastMoverCount = 0;
        long slowMoverCount = 0;
        long healthyCount = 0;

        List<Map<String, Object>> processedProducts = new java.util.ArrayList<>();

        for (ProductIntelProjection p : products) {
            int qty = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            int reorder = p.getReorderLevel() != null ? p.getReorderLevel() : 10;
            BigDecimal price = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
            BigDecimal cost = p.getUnitCost() != null ? p.getUnitCost() : BigDecimal.ZERO;
            BigDecimal sold30 = p.getUnitsSold30d() != null ? p.getUnitsSold30d() : BigDecimal.ZERO;
            BigDecimal rev30 = p.getRevenue30d() != null ? p.getRevenue30d() : BigDecimal.ZERO;

            BigDecimal stockVal = price.multiply(BigDecimal.valueOf(qty));
            BigDecimal costVal = (cost.compareTo(BigDecimal.ZERO) > 0 ? cost : price).multiply(BigDecimal.valueOf(qty));

            totalStockValuation = totalStockValuation.add(stockVal);
            totalCostValuation = totalCostValuation.add(costVal);
            totalUnits += qty;

            double dailyVelocity = sold30.doubleValue() / 30.0;
            int runwayDays = dailyVelocity > 0 ? (int) Math.round(qty / dailyVelocity) : (qty > 0 ? 999 : 0);

            String status;
            String badge;
            if (qty <= 0) {
                status = "OUT_OF_STOCK";
                badge = "Out of Stock";
                outOfStockCount++;
            } else if (qty <= reorder || (dailyVelocity > 0 && runwayDays <= 7)) {
                status = "CRITICAL_REORDER";
                badge = "Low Stock";
                criticalReorderCount++;
            } else if (sold30.doubleValue() == 0 && qty > 0) {
                status = "DEAD_STOCK";
                badge = "Dead Stock";
                deadStockCount++;
                deadStockValuation = deadStockValuation.add(costVal);
            } else if (qty >= reorder * 3 && (runwayDays > 90 || dailyVelocity < 0.1) && qty >= 10) {
                status = "OVERSTOCK";
                badge = "Overstocked";
                overstockCount++;
            } else if (sold30.doubleValue() >= 10 || dailyVelocity >= 0.5) {
                status = "FAST_MOVER";
                badge = "Fast Mover";
                fastMoverCount++;
            } else if (sold30.doubleValue() > 0 && sold30.doubleValue() < 5) {
                status = "SLOW_MOVER";
                badge = "Slow Mover";
                slowMoverCount++;
            } else {
                status = "HEALTHY";
                badge = "Healthy";
                healthyCount++;
            }

            int suggestedReorder = Math.max(0, (reorder * 2) - qty);

            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", p.getId());
            map.put("name", p.getName());
            map.put("sku", p.getSku());
            map.put("category", p.getCategory());
            map.put("price", price);
            map.put("unitCost", cost);
            map.put("stockQuantity", qty);
            map.put("reorderLevel", reorder);
            map.put("unitsSold30d", sold30);
            map.put("revenue30d", rev30);
            map.put("dailyVelocity", Math.round(dailyVelocity * 100.0) / 100.0);
            map.put("runwayDays", runwayDays);
            map.put("status", status);
            map.put("badge", badge);
            map.put("suggestedReorder", suggestedReorder);
            map.put("stockValuation", stockVal);
            map.put("lastSoldDate", p.getLastSoldDate() != null ? p.getLastSoldDate().toString() : null);

            processedProducts.add(map);
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("totalProducts", products.size());
        result.put("totalUnits", totalUnits);
        result.put("totalStockValuation", totalStockValuation);
        result.put("totalCostValuation", totalCostValuation);
        result.put("deadStockValuation", deadStockValuation);
        result.put("criticalReorderCount", criticalReorderCount);
        result.put("outOfStockCount", outOfStockCount);
        result.put("deadStockCount", deadStockCount);
        result.put("overstockCount", overstockCount);
        result.put("fastMoverCount", fastMoverCount);
        result.put("slowMoverCount", slowMoverCount);
        result.put("healthyCount", healthyCount);
        result.put("items", processedProducts);

        return result;
    }
}
