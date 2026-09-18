package com.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "sale_number", nullable = false)
    private String saleNumber;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "payment_status", nullable = false)
    @Builder.Default
    private String paymentStatus = "PENDING";

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_by_name")
    private String createdByName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
