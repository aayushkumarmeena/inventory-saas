package com.inventory.repository;

import com.inventory.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    Page<Expense> findByTenantIdOrderByExpenseDateDesc(Long tenantId, Pageable pageable);
    List<Expense> findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDesc(Long tenantId, LocalDate from, LocalDate to);

    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.tenantId = :tid AND e.expenseDate BETWEEN :from AND :to")
    BigDecimal sumByTenantAndDateRange(@Param("tid") Long tenantId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT e.category, SUM(e.amount) FROM Expense e WHERE e.tenantId = :tid AND e.expenseDate BETWEEN :from AND :to GROUP BY e.category ORDER BY SUM(e.amount) DESC")
    List<Object[]> sumByCategory(@Param("tid") Long tenantId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
