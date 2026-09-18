package com.inventory.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name="gst_config") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstConfig {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id",nullable=false,unique=true) private Long tenantId;
    @Column(nullable=false,length=15) private String gstin;
    @Column(name="legal_name",nullable=false) private String legalName;
    @Column(name="trade_name") private String tradeName;
    @Column(name="address_line1") private String addressLine1;
    @Column(name="address_line2") private String addressLine2;
    private String city, state;
    @Column(name="state_code",length=3) private String stateCode;
    private String pincode, pan, email, phone;
    @Column(name="is_composition") private Boolean isComposition = false;
    @Column(name="filing_frequency",length=10) private String filingFrequency = "MONTHLY";
    @CreationTimestamp @Column(name="created_at",updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp  @Column(name="updated_at") private LocalDateTime updatedAt;
}
