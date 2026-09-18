package com.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_adjustments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    /** IN increases stock, OUT decreases it. */
    @Column(nullable = false)
    private String direction;

    @Column(nullable = false)
    private Integer quantity;

    private String reason;

    @Column(name = "resulting_stock", nullable = false)
    private Integer resultingStock;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_by_name")
    private String createdByName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
