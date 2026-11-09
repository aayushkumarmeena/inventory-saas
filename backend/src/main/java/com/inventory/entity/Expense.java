package com.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Expense {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name="tenant_id", nullable=false) private Long tenantId;
    @Column(nullable=false, precision=14, scale=2) private BigDecimal amount;
    @Column(nullable=false) @Builder.Default private String category = "OTHER";
    private String description;
    @Column(name="expense_date", nullable=false) private LocalDate expenseDate;
    @Column(name="payment_method") @Builder.Default private String paymentMethod = "CASH";
    private String vendor;
    @Column(name="reference_number") private String referenceNumber;
    private String notes;
    @Column(name="created_by_user_id") private Long createdByUserId;
    @Column(name="created_by_name") private String createdByName;
    @CreationTimestamp @Column(name="created_at", updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name="updated_at") private LocalDateTime updatedAt;
}
