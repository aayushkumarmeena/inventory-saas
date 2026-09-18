package com.inventory.service;

import com.inventory.dto.response.DashboardSummaryResponse;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ProductRepository productRepo;
    private final SaleRepository saleRepo;

    @Cacheable(value = "dashboard", key = "#tenantId")
    public DashboardSummaryResponse getSummary(Long tenantId) {
        long totalProducts = productRepo.countByTenantIdAndIsActive(tenantId, true);
        long lowStock = productRepo.countLowStock(tenantId);
        long totalSales = saleRepo.countByTenantId(tenantId);

        return DashboardSummaryResponse.builder()
                .totalRevenue(saleRepo.sumRevenue(tenantId))
                .totalSales(totalSales)
                .totalProducts(totalProducts)
                .lowStockCount(lowStock)
                .build();
    }
}
