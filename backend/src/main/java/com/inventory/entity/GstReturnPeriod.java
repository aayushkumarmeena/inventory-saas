package com.inventory.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="gst_return_periods") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstReturnPeriod {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id",nullable=false) private Long tenantId;
    @Column(name="period_type",length=10,nullable=false) private String periodType;
    private Integer month, quarter, year;
    @Column(nullable=false,length=20) private String status = "DRAFT";
    @Column(name="total_outward_taxable",precision=16,scale=2) private BigDecimal totalOutwardTaxable = BigDecimal.ZERO;
    @Column(name="total_cgst",precision=16,scale=2) private BigDecimal totalCgst = BigDecimal.ZERO;
    @Column(name="total_sgst",precision=16,scale=2) private BigDecimal totalSgst = BigDecimal.ZERO;
    @Column(name="total_igst",precision=16,scale=2) private BigDecimal totalIgst = BigDecimal.ZERO;
    @Column(name="total_cess",precision=16,scale=2) private BigDecimal totalCess = BigDecimal.ZERO;
    @Column(name="filed_at") private LocalDateTime filedAt;
    @CreationTimestamp @Column(name="created_at",updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp  @Column(name="updated_at") private LocalDateTime updatedAt;
}
