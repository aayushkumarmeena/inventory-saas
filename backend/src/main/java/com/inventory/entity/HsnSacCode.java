package com.inventory.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="hsn_sac_codes") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HsnSacCode {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id",nullable=false) private Long tenantId;
    @Column(nullable=false,length=20) private String code;
    @Column(nullable=false,length=3)  private String type;
    @Column(nullable=false,columnDefinition="TEXT") private String description;
    @Column(name="cgst_rate",precision=5,scale=2) private BigDecimal cgstRate = BigDecimal.ZERO;
    @Column(name="sgst_rate",precision=5,scale=2) private BigDecimal sgstRate = BigDecimal.ZERO;
    @Column(name="igst_rate",precision=5,scale=2) private BigDecimal igstRate = BigDecimal.ZERO;
    @Column(name="cess_rate",precision=5,scale=2) private BigDecimal cessRate = BigDecimal.ZERO;
    @Column(name="is_active") private Boolean isActive = true;
    @CreationTimestamp @Column(name="created_at",updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp  @Column(name="updated_at") private LocalDateTime updatedAt;
}
