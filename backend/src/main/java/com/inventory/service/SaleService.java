package com.inventory.service;

import com.inventory.dto.request.PaymentRequest;
import com.inventory.dto.request.SaleItemRequest;
import com.inventory.dto.request.SaleRequest;
import com.inventory.dto.request.SaleReturnItemRequest;
import com.inventory.dto.request.SaleReturnRequest;
import com.inventory.dto.response.PaymentResponse;
import com.inventory.dto.response.SaleItemResponse;
import com.inventory.dto.response.SaleResponse;
import com.inventory.dto.response.SaleReturnResponse;
import com.inventory.entity.*;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SaleService {

    private final SaleRepository saleRepo;
    private final SaleItemRepository saleItemRepo;
    private final ProductRepository productRepo;
    private final PaymentRepository paymentRepo;
    private final SaleReturnRepository returnRepo;
    private final SaleReturnItemRepository returnItemRepo;
    private final CustomerService customerService;
    private final AuditService audit;

    @CacheEvict(value = "dashboard", allEntries = true)
    public SaleResponse create(Long tenantId, SaleRequest req) {
        BigDecimal total = BigDecimal.ZERO;
        List<SaleItem> lineItems = new ArrayList<>();

        for (SaleItemRequest itemReq : req.getItems()) {
            Product product = productRepo.findByIdAndTenantId(itemReq.getProductId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + itemReq.getProductId()));

            if (product.getStockQuantity() < itemReq.getQuantity().intValue()) {
                throw new BusinessException("Not enough stock for '" + product.getName() + "' (available: " + product.getStockQuantity() + ")");
            }

            BigDecimal lineTotal = product.getPrice().multiply(itemReq.getQuantity());
            total = total.add(lineTotal);

            lineItems.add(SaleItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .lineTotal(lineTotal)
                    .build());

            product.setStockQuantity(product.getStockQuantity() - itemReq.getQuantity().intValue());
            productRepo.save(product);
        }

        Long customerId = req.getCustomerId();
        String customerName = req.getCustomerName();
        if (customerId == null && customerName != null && !customerName.isBlank()) {
            customerId = customerService.findOrCreateByName(tenantId, customerName.trim()).getId();
        }

        Sale sale = saleRepo.save(Sale.builder()
                .tenantId(tenantId)
                .saleNumber(generateSaleNumber(tenantId))
                .customerName(customerName)
                .customerId(customerId)
                .saleDate(LocalDate.now())
                .totalAmount(total)
                .paymentStatus("PENDING")
                .createdByUserId(audit.userId())
                .createdByName(audit.userName())
                .build());

        for (SaleItem item : lineItems) {
            item.setSaleId(sale.getId());
        }
        saleItemRepo.saveAll(lineItems);

        audit.log("SALE", sale.getId(), "CREATE", "Recorded sale " + sale.getSaleNumber() + " for " + total);

        return toResponse(sale, lineItems);
    }

    @Transactional(readOnly = true)
    public Page<SaleResponse> list(Long tenantId, LocalDate from, LocalDate to, String status, String customer, Pageable pageable) {
        Page<Sale> page = saleRepo.search(tenantId, from, to, status, customer, pageable);
        List<Sale> sales = page.getContent();
        if (sales.isEmpty()) {
            return page.map(sale -> toResponse(sale, List.of()));
        }

        // Batch-fetch everything toResponse() needs for the whole page instead of
        // 5+ queries per row (items, payment sum+list, return sum+list, return items).
        // For a 20-row page that was 100+ queries; this is a fixed handful.
        List<Long> saleIds = sales.stream().map(Sale::getId).collect(Collectors.toList());

        Map<Long, List<SaleItem>> itemsBySale = saleItemRepo.findBySaleIdIn(saleIds).stream()
                .collect(Collectors.groupingBy(SaleItem::getSaleId));
        Map<Long, List<Payment>> paymentsBySale = paymentRepo.findBySaleIdIn(saleIds).stream()
                .collect(Collectors.groupingBy(Payment::getSaleId));
        Map<Long, List<SaleReturn>> returnsBySale = returnRepo.findBySaleIdIn(saleIds).stream()
                .collect(Collectors.groupingBy(SaleReturn::getSaleId));

        List<Long> returnIds = returnsBySale.values().stream()
                .flatMap(List::stream).map(SaleReturn::getId).collect(Collectors.toList());
        Map<Long, List<SaleReturnItem>> itemsByReturn = returnIds.isEmpty()
                ? Map.of()
                : returnItemRepo.findBySaleReturnIdIn(returnIds).stream()
                        .collect(Collectors.groupingBy(SaleReturnItem::getSaleReturnId));

        return page.map(sale -> toResponse(
                sale,
                itemsBySale.getOrDefault(sale.getId(), List.of()),
                paymentsBySale.getOrDefault(sale.getId(), List.of()),
                returnsBySale.getOrDefault(sale.getId(), List.of()),
                itemsByReturn));
    }

    @Transactional(readOnly = true)
    public SaleResponse get(Long tenantId, Long id) {
        Sale sale = find(tenantId, id);
        return toResponse(sale, saleItemRepo.findBySaleId(sale.getId()));
    }

    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public SaleResponse cancel(Long tenantId, Long id) {
        Sale sale = find(tenantId, id);

        if ("CANCELLED".equals(sale.getPaymentStatus())) {
            throw new BusinessException("This sale is already cancelled");
        }

        List<SaleItem> items = saleItemRepo.findBySaleId(sale.getId());
        for (SaleItem item : items) {
            if (item.getProductId() == null) continue;
            productRepo.findByIdAndTenantId(item.getProductId(), tenantId).ifPresent(p -> {
                p.setStockQuantity(p.getStockQuantity() + item.getQuantity().intValue());
                productRepo.save(p);
            });
        }

        sale.setPaymentStatus("CANCELLED");
        saleRepo.save(sale);
        audit.log("SALE", sale.getId(), "CANCEL", "Cancelled sale " + sale.getSaleNumber() + ", stock restored");
        return toResponse(sale, items);
    }

    @CacheEvict(value = "dashboard", allEntries = true)
    public SaleResponse recordPayment(Long tenantId, Long saleId, PaymentRequest req) {
        Sale sale = find(tenantId, saleId);

        if ("CANCELLED".equals(sale.getPaymentStatus())) {
            throw new BusinessException("Cannot record a payment against a cancelled sale");
        }

        BigDecimal alreadyPaid = paymentRepo.sumBySaleId(sale.getId());
        BigDecimal balance = sale.getTotalAmount().subtract(alreadyPaid);
        if (req.getAmount().compareTo(balance) > 0) {
            throw new BusinessException("Payment of " + req.getAmount() + " exceeds the remaining balance of " + balance);
        }

        paymentRepo.save(Payment.builder()
                .tenantId(tenantId)
                .saleId(sale.getId())
                .amount(req.getAmount())
                .paymentDate(LocalDate.now())
                .method(req.getMethod() != null ? req.getMethod() : "CASH")
                .notes(req.getNotes())
                .createdByUserId(audit.userId())
                .createdByName(audit.userName())
                .build());

        BigDecimal totalPaid = paymentRepo.sumBySaleId(sale.getId());
        sale.setPaymentStatus(totalPaid.compareTo(sale.getTotalAmount()) >= 0 ? "PAID"
                : totalPaid.compareTo(BigDecimal.ZERO) > 0 ? "PARTIAL" : "PENDING");
        saleRepo.save(sale);
        audit.log("SALE", sale.getId(), "PAYMENT", "Recorded payment of " + req.getAmount() + " on " + sale.getSaleNumber());

        return toResponse(sale, saleItemRepo.findBySaleId(sale.getId()));
    }

    /**
     * Returns some quantity of one or more line items on a sale. Restores
     * stock for the returned quantity and tracks the refund value
     * separately from the sale's original total (which is left untouched)
     * so balance-due math stays correct even after payments were made.
     */
    @CacheEvict(value = {"products", "dashboard"}, allEntries = true)
    public SaleResponse createReturn(Long tenantId, Long saleId, SaleReturnRequest req) {
        Sale sale = find(tenantId, saleId);
        if ("CANCELLED".equals(sale.getPaymentStatus())) {
            throw new BusinessException("Cannot return items from a cancelled sale");
        }

        List<SaleItem> saleItems = saleItemRepo.findBySaleId(sale.getId());
        Map<Long, SaleItem> byId = saleItems.stream().collect(Collectors.toMap(SaleItem::getId, i -> i));

        BigDecimal totalRefund = BigDecimal.ZERO;
        List<SaleReturnItem> returnItems = new ArrayList<>();

        for (SaleReturnItemRequest itemReq : req.getItems()) {
            SaleItem original = byId.get(itemReq.getSaleItemId());
            if (original == null) {
                throw new BusinessException("Line item " + itemReq.getSaleItemId() + " does not belong to this sale");
            }

            BigDecimal alreadyReturned = returnItemRepo.sumReturnedQuantityBySaleItemId(original.getId());
            BigDecimal returnable = original.getQuantity().subtract(alreadyReturned);
            if (itemReq.getQuantity().compareTo(returnable) > 0) {
                throw new BusinessException("Only " + returnable + " of '" + original.getProductName() + "' can still be returned");
            }

            BigDecimal lineTotal = original.getUnitPrice().multiply(itemReq.getQuantity());
            totalRefund = totalRefund.add(lineTotal);

            returnItems.add(SaleReturnItem.builder()
                    .saleItemId(original.getId())
                    .productId(original.getProductId())
                    .productName(original.getProductName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(original.getUnitPrice())
                    .lineTotal(lineTotal)
                    .build());

            if (original.getProductId() != null) {
                productRepo.findByIdAndTenantId(original.getProductId(), tenantId).ifPresent(p -> {
                    p.setStockQuantity(p.getStockQuantity() + itemReq.getQuantity().intValue());
                    productRepo.save(p);
                });
            }
        }

        SaleReturn saleReturn = returnRepo.save(SaleReturn.builder()
                .tenantId(tenantId)
                .saleId(sale.getId())
                .totalRefund(totalRefund)
                .reason(req.getReason())
                .createdByUserId(audit.userId())
                .createdByName(audit.userName())
                .build());

        for (SaleReturnItem item : returnItems) {
            item.setSaleReturnId(saleReturn.getId());
        }
        returnItemRepo.saveAll(returnItems);

        audit.log("SALE", sale.getId(), "RETURN", "Returned items worth " + totalRefund + " from " + sale.getSaleNumber());

        return toResponse(sale, saleItems);
    }

    private Sale find(Long tenantId, Long id) {
        return saleRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
    }

    private String generateSaleNumber(Long tenantId) {
        long count = saleRepo.countByTenantId(tenantId) + 1;
        return "INV-" + LocalDate.now().getYear() + "-" + String.format("%05d", count);
    }

    private SaleResponse toResponse(Sale sale, List<SaleItem> items) {
        List<Payment> payments = paymentRepo.findBySaleIdOrderByPaymentDateDesc(sale.getId());
        List<SaleReturn> returns = returnRepo.findBySaleIdOrderByCreatedAtDesc(sale.getId());
        // paid/refunded are summed from these same lists below, so the old separate
        // sumBySaleId() queries are redundant here and have been dropped.
        return buildResponse(sale, items, payments, returns,
                r -> returnItemRepo.findBySaleReturnId(r.getId()));
    }

    /** Used by list(), where items/payments/returns/return-items are already batch-fetched for the whole page. */
    private SaleResponse toResponse(Sale sale, List<SaleItem> items, List<Payment> payments,
                                     List<SaleReturn> returns, Map<Long, List<SaleReturnItem>> itemsByReturn) {
        return buildResponse(sale, items, payments, returns,
                r -> itemsByReturn.getOrDefault(r.getId(), List.of()));
    }

    private SaleResponse buildResponse(Sale sale, List<SaleItem> items, List<Payment> payments,
                                        List<SaleReturn> returns,
                                        java.util.function.Function<SaleReturn, List<SaleReturnItem>> returnItemsLookup) {
        BigDecimal paid = payments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refunded = returns.stream().map(SaleReturn::getTotalRefund).reduce(BigDecimal.ZERO, BigDecimal::add);

        return SaleResponse.builder()
                .id(sale.getId())
                .saleNumber(sale.getSaleNumber())
                .customerName(sale.getCustomerName())
                .customerId(sale.getCustomerId())
                .saleDate(sale.getSaleDate())
                .totalAmount(sale.getTotalAmount())
                .amountPaid(paid)
                .balanceDue(sale.getTotalAmount().subtract(paid).subtract(refunded))
                .totalRefunded(refunded)
                .paymentStatus(sale.getPaymentStatus())
                .createdByName(sale.getCreatedByName())
                .items(items.stream().map(i -> SaleItemResponse.builder()
                        .id(i.getId())
                        .productId(i.getProductId())
                        .productName(i.getProductName())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .lineTotal(i.getLineTotal())
                        .build()).collect(Collectors.toList()))
                .payments(payments.stream().map(p -> PaymentResponse.builder()
                        .id(p.getId())
                        .amount(p.getAmount())
                        .paymentDate(p.getPaymentDate())
                        .method(p.getMethod())
                        .notes(p.getNotes())
                        .createdByName(p.getCreatedByName())
                        .build()).collect(Collectors.toList()))
                .returns(returns.stream().map(r -> SaleReturnResponse.builder()
                        .id(r.getId())
                        .totalRefund(r.getTotalRefund())
                        .reason(r.getReason())
                        .createdByName(r.getCreatedByName())
                        .createdAt(r.getCreatedAt())
                        .items(returnItemsLookup.apply(r).stream().map(i -> SaleReturnResponse.Item.builder()
                                .productId(i.getProductId())
                                .productName(i.getProductName())
                                .quantity(i.getQuantity())
                                .unitPrice(i.getUnitPrice())
                                .lineTotal(i.getLineTotal())
                                .build()).collect(Collectors.toList()))
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
