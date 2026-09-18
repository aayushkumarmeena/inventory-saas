package com.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private String name;

    private String description;

    private String category;

    @Column(name = "image_url")
    private String imageUrl;

    private String barcode;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal price;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "reorder_level")
    @Builder.Default
    private Integer reorderLevel = 10;

    @Column(name = "hsn_sac_code")
    private String hsnSacCode;

    @Column(name = "hsn_sac_type")
    @Builder.Default
    private String hsnSacType = "HSN";

    @Column(name = "cgst_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal cgstRate = BigDecimal.ZERO;

    @Column(name = "sgst_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal sgstRate = BigDecimal.ZERO;

    @Column(name = "igst_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal igstRate = BigDecimal.ZERO;

    @Column(name = "cess_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal cessRate = BigDecimal.ZERO;

    @Column(name = "tax_inclusive")
    @Builder.Default
    private Boolean taxInclusive = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
