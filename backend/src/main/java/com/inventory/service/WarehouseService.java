package com.inventory.service;

import com.inventory.dto.request.StockTransferRequest;
import com.inventory.dto.request.WarehouseRequest;
import com.inventory.dto.response.StockTransferResponse;
import com.inventory.dto.response.WarehouseResponse;
import com.inventory.entity.*;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WarehouseService {

    private final WarehouseRepository warehouseRepo;
    private final WarehouseStockRepository stockRepo;
    private final StockTransferRepository transferRepo;
    private final StockTransferItemRepository transferItemRepo;
    private final ProductRepository productRepo;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public List<WarehouseResponse> listWarehouses(Long tenantId) {
        List<Warehouse> list = warehouseRepo.findByTenantIdAndIsActiveOrderByIdAsc(tenantId, true);
        return list.stream().map(w -> {
            List<WarehouseStock> stocks = stockRepo.findByTenantIdAndWarehouseId(tenantId, w.getId());
            int totalSkus = stocks.size();
            int totalQty = stocks.stream().mapToInt(WarehouseStock::getQuantity).sum();
            return WarehouseResponse.builder()
                    .id(w.getId())
                    .name(w.getName())
                    .code(w.getCode())
                    .type(w.getType())
                    .address(w.getAddress())
                    .city(w.getCity())
                    .phone(w.getPhone())
                    .isDefault(w.getIsDefault())
                    .isActive(w.getIsActive())
                    .totalSkus(totalSkus)
                    .totalQuantity(totalQty)
                    .createdAt(w.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    public WarehouseResponse createWarehouse(Long tenantId, WarehouseRequest req) {
        if (warehouseRepo.existsByTenantIdAndCode(tenantId, req.getCode().trim().toUpperCase())) {
            throw new BusinessException("A warehouse with code " + req.getCode() + " already exists");
        }

        boolean isDef = Boolean.TRUE.equals(req.getIsDefault());
        if (isDef) {
            warehouseRepo.findByTenantIdAndIsDefaultTrue(tenantId).ifPresent(prev -> {
                prev.setIsDefault(false);
                warehouseRepo.save(prev);
            });
        }

        Warehouse w = warehouseRepo.save(Warehouse.builder()
                .tenantId(tenantId)
                .name(req.getName().trim())
                .code(req.getCode().trim().toUpperCase())
                .type(req.getType() != null ? req.getType().trim().toUpperCase() : "WAREHOUSE")
                .address(req.getAddress())
                .city(req.getCity())
                .phone(req.getPhone())
                .isDefault(isDef)
                .isActive(true)
                .build());

        audit.log("WAREHOUSE", w.getId(), "CREATE", "Created warehouse " + w.getName() + " (" + w.getCode() + ")");

        return WarehouseResponse.builder()
                .id(w.getId())
                .name(w.getName())
                .code(w.getCode())
                .type(w.getType())
                .address(w.getAddress())
                .city(w.getCity())
                .phone(w.getPhone())
                .isDefault(w.getIsDefault())
                .isActive(w.getIsActive())
                .totalSkus(0)
                .totalQuantity(0)
                .createdAt(w.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWarehouseStock(Long tenantId, Long warehouseId) {
        Warehouse w = warehouseRepo.findByIdAndTenantId(warehouseId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found"));

        List<WarehouseStock> stocks = stockRepo.findByTenantIdAndWarehouseId(tenantId, warehouseId);
        List<Long> productIds = stocks.stream().map(WarehouseStock::getProductId).collect(Collectors.toList());
        Map<Long, Product> productMap = productRepo.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        return stocks.stream().map(s -> {
            Product p = productMap.get(s.getProductId());
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId());
            map.put("warehouseId", warehouseId);
            map.put("warehouseName", w.getName());
            map.put("productId", s.getProductId());
            map.put("productName", p != null ? p.getName() : "Unknown");
            map.put("sku", p != null ? p.getSku() : "");
            map.put("price", p != null ? p.getPrice() : 0);
            map.put("quantity", s.getQuantity());
            map.put("reorderLevel", s.getReorderLevel());
            map.put("binLocation", s.getBinLocation());
            return map;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<StockTransferResponse> listTransfers(Long tenantId, Pageable pageable) {
        Page<StockTransfer> page = transferRepo.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);

        Set<Long> whIds = new HashSet<>();
        page.getContent().forEach(t -> {
            whIds.add(t.getFromWarehouseId());
            whIds.add(t.getToWarehouseId());
        });
        Map<Long, String> whNames = warehouseRepo.findAllById(whIds).stream()
                .collect(Collectors.toMap(Warehouse::getId, Warehouse::getName));

        return page.map(t -> {
            List<StockTransferItem> items = transferItemRepo.findByTransferId(t.getId());
            List<StockTransferResponse.TransferItemResponse> itemResponses = items.stream().map(i ->
                    StockTransferResponse.TransferItemResponse.builder()
                            .id(i.getId())
                            .productId(i.getProductId())
                            .productName(i.getProductName())
                            .quantity(i.getQuantity())
                            .build()
            ).collect(Collectors.toList());

            return StockTransferResponse.builder()
                    .id(t.getId())
                    .transferNumber(t.getTransferNumber())
                    .fromWarehouseId(t.getFromWarehouseId())
                    .fromWarehouseName(whNames.getOrDefault(t.getFromWarehouseId(), "Source"))
                    .toWarehouseId(t.getToWarehouseId())
                    .toWarehouseName(whNames.getOrDefault(t.getToWarehouseId(), "Destination"))
                    .status(t.getStatus())
                    .notes(t.getNotes())
                    .createdByName(t.getCreatedByName())
                    .transferDate(t.getTransferDate())
                    .createdAt(t.getCreatedAt())
                    .items(itemResponses)
                    .build();
        });
    }

    public StockTransferResponse transferStock(Long tenantId, StockTransferRequest req) {
        if (req.getFromWarehouseId().equals(req.getToWarehouseId())) {
            throw new BusinessException("Source and destination warehouses cannot be the same");
        }

        Warehouse fromWh = warehouseRepo.findByIdAndTenantId(req.getFromWarehouseId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Source warehouse not found"));
        Warehouse toWh = warehouseRepo.findByIdAndTenantId(req.getToWarehouseId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Destination warehouse not found"));

        // Validate stock availability
        List<StockTransferItem> itemsToSave = new ArrayList<>();
        for (StockTransferRequest.TransferItemRequest itm : req.getItems()) {
            if (itm.getQuantity() <= 0) {
                throw new BusinessException("Transfer quantity must be greater than 0");
            }

            WarehouseStock fromStock = stockRepo.findByWarehouseIdAndProductId(fromWh.getId(), itm.getProductId())
                    .orElseThrow(() -> new BusinessException("Product not found in source warehouse"));

            if (fromStock.getQuantity() < itm.getQuantity()) {
                Product p = productRepo.findById(itm.getProductId()).orElse(null);
                String pName = p != null ? p.getName() : "Item";
                throw new BusinessException("Insufficient stock in " + fromWh.getName() + " for " + pName +
                        " (Available: " + fromStock.getQuantity() + ", Requested: " + itm.getQuantity() + ")");
            }

            // Deduct from source
            fromStock.setQuantity(fromStock.getQuantity() - itm.getQuantity());
            stockRepo.save(fromStock);

            // Add to destination
            WarehouseStock toStock = stockRepo.findByWarehouseIdAndProductId(toWh.getId(), itm.getProductId())
                    .orElseGet(() -> WarehouseStock.builder()
                            .tenantId(tenantId)
                            .warehouseId(toWh.getId())
                            .productId(itm.getProductId())
                            .quantity(0)
                            .reorderLevel(10)
                            .build());

            toStock.setQuantity(toStock.getQuantity() + itm.getQuantity());
            stockRepo.save(toStock);

            Product prod = productRepo.findById(itm.getProductId()).orElse(null);
            itemsToSave.add(StockTransferItem.builder()
                    .productId(itm.getProductId())
                    .productName(prod != null ? prod.getName() : "Product")
                    .quantity(itm.getQuantity())
                    .build());
        }

        long count = transferRepo.countByTenantId(tenantId) + 1;
        String trfNumber = String.format("TRF-%d-%05d", LocalDate.now().getYear(), count);

        StockTransfer transfer = transferRepo.save(StockTransfer.builder()
                .tenantId(tenantId)
                .transferNumber(trfNumber)
                .fromWarehouseId(fromWh.getId())
                .toWarehouseId(toWh.getId())
                .status("COMPLETED")
                .notes(req.getNotes())
                .transferDate(req.getTransferDate() != null ? req.getTransferDate() : LocalDate.now())
                .createdByUserId(audit.userId())
                .createdByName(audit.userName())
                .build());

        for (StockTransferItem item : itemsToSave) {
            item.setTransferId(transfer.getId());
            transferItemRepo.save(item);
        }

        audit.log("STOCK_TRANSFER", transfer.getId(), "TRANSFER",
                "Transferred " + itemsToSave.size() + " items from " + fromWh.getName() + " to " + toWh.getName());

        return StockTransferResponse.builder()
                .id(transfer.getId())
                .transferNumber(transfer.getTransferNumber())
                .fromWarehouseId(fromWh.getId())
                .fromWarehouseName(fromWh.getName())
                .toWarehouseId(toWh.getId())
                .toWarehouseName(toWh.getName())
                .status(transfer.getStatus())
                .notes(transfer.getNotes())
                .createdByName(transfer.getCreatedByName())
                .transferDate(transfer.getTransferDate())
                .createdAt(transfer.getCreatedAt())
                .items(itemsToSave.stream().map(i ->
                        StockTransferResponse.TransferItemResponse.builder()
                                .id(i.getId())
                                .productId(i.getProductId())
                                .productName(i.getProductName())
                                .quantity(i.getQuantity())
                                .build()
                ).collect(Collectors.toList()))
                .build();
    }
}
