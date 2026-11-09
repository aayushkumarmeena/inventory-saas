package com.inventory.service;

import com.inventory.dto.request.ExpenseRequest;
import com.inventory.dto.response.ExpenseResponse;
import com.inventory.entity.Expense;
import com.inventory.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExpenseService {
    private final ExpenseRepository repo;
    private final AuditService audit;

    public Page<ExpenseResponse> list(Long tenantId, Pageable pageable) {
        return repo.findByTenantIdOrderByExpenseDateDesc(tenantId, pageable).map(this::toDto);
    }

    public List<ExpenseResponse> listByRange(Long tenantId, LocalDate from, LocalDate to) {
        return repo.findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDesc(tenantId, from, to)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public ExpenseResponse create(Long tenantId, ExpenseRequest req) {
        Expense e = Expense.builder()
                .tenantId(tenantId).amount(req.getAmount()).category(req.getCategory())
                .description(req.getDescription()).expenseDate(req.getExpenseDate())
                .paymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CASH")
                .vendor(req.getVendor()).referenceNumber(req.getReferenceNumber())
                .notes(req.getNotes()).createdByUserId(audit.userId()).createdByName(audit.userName())
                .build();
        return toDto(repo.save(e));
    }

    @Transactional
    public ExpenseResponse update(Long tenantId, Long id, ExpenseRequest req) {
        Expense e = repo.findById(id).filter(x -> x.getTenantId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        e.setAmount(req.getAmount()); e.setCategory(req.getCategory());
        e.setDescription(req.getDescription()); e.setExpenseDate(req.getExpenseDate());
        e.setVendor(req.getVendor()); e.setReferenceNumber(req.getReferenceNumber());
        e.setNotes(req.getNotes());
        if (req.getPaymentMethod() != null) e.setPaymentMethod(req.getPaymentMethod());
        return toDto(repo.save(e));
    }

    @Transactional
    public void delete(Long tenantId, Long id) {
        Expense e = repo.findById(id).filter(x -> x.getTenantId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        repo.delete(e);
    }

    public Map<String, Object> summary(Long tenantId, LocalDate from, LocalDate to) {
        BigDecimal total = repo.sumByTenantAndDateRange(tenantId, from, to);
        List<Object[]> byCat = repo.sumByCategory(tenantId, from, to);
        Map<String, BigDecimal> catMap = new LinkedHashMap<>();
        byCat.forEach(r -> catMap.put((String) r[0], (BigDecimal) r[1]));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", total != null ? total : BigDecimal.ZERO);
        out.put("byCategory", catMap);
        return out;
    }

    private ExpenseResponse toDto(Expense e) {
        ExpenseResponse r = new ExpenseResponse();
        r.setId(e.getId()); r.setAmount(e.getAmount()); r.setCategory(e.getCategory());
        r.setDescription(e.getDescription()); r.setExpenseDate(e.getExpenseDate());
        r.setPaymentMethod(e.getPaymentMethod()); r.setVendor(e.getVendor());
        r.setReferenceNumber(e.getReferenceNumber()); r.setNotes(e.getNotes());
        r.setCreatedByName(e.getCreatedByName()); r.setCreatedAt(e.getCreatedAt());
        return r;
    }
}
