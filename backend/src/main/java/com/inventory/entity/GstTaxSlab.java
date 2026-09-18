package com.inventory.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="gst_tax_slabs") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstTaxSlab {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="slab_name",nullable=false,length=50) private String slabName;
    @Column(name="cgst_rate",precision=5,scale=2) private BigDecimal cgstRate;
    @Column(name="sgst_rate",precision=5,scale=2) private BigDecimal sgstRate;
    @Column(name="igst_rate",precision=5,scale=2) private BigDecimal igstRate;
    @Column(name="cess_rate",precision=5,scale=2) private BigDecimal cessRate = BigDecimal.ZERO;
    @Column(name="is_active") private Boolean isActive = true;
}
