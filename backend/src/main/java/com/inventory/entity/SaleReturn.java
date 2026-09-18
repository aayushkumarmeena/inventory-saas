package com.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sale_returns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "sale_id", nullable = false)
    private Long saleId;

    @Column(name = "total_refund", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalRefund;

    private String reason;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_by_name")
    private String createdByName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
