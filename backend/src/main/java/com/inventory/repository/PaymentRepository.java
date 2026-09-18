package com.inventory.repository;

import com.inventory.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findBySaleIdOrderByPaymentDateDesc(Long saleId);

    // Batch fetch for list endpoints — avoids one query per row (N+1).
    List<Payment> findBySaleIdIn(java.util.Collection<Long> saleIds);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.saleId = :saleId")
    BigDecimal sumBySaleId(@Param("saleId") Long saleId);
}
