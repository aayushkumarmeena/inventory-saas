package com.inventory.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity @Table(name="gst_invoices") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstInvoice {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id",nullable=false) private Long tenantId;
    @Column(name="sale_id",nullable=false) private Long saleId;
    @Column(name="invoice_number",nullable=false,length=50) private String invoiceNumber;
    @Column(name="invoice_date",nullable=false) private LocalDate invoiceDate;
    @Column(name="invoice_type",length=20) private String invoiceType = "B2B";
    @Column(name="supply_type",length=20)  private String supplyType  = "INTRA";
    @Column(name="buyer_name") private String buyerName;
    @Column(name="buyer_gstin",length=15) private String buyerGstin;
    @Column(name="buyer_address",columnDefinition="TEXT") private String buyerAddress;
    @Column(name="buyer_state") private String buyerState;
    @Column(name="buyer_state_code",length=3) private String buyerStateCode;
    @Column(name="place_of_supply",length=3) private String placeOfSupply;
    @Column(name="reverse_charge") private Boolean reverseCharge = false;
    @Column(name="taxable_value",precision=14,scale=2)  private BigDecimal taxableValue = BigDecimal.ZERO;
    @Column(name="cgst_amount",precision=14,scale=2)    private BigDecimal cgstAmount   = BigDecimal.ZERO;
    @Column(name="sgst_amount",precision=14,scale=2)    private BigDecimal sgstAmount   = BigDecimal.ZERO;
    @Column(name="igst_amount",precision=14,scale=2)    private BigDecimal igstAmount   = BigDecimal.ZERO;
    @Column(name="cess_amount",precision=14,scale=2)    private BigDecimal cessAmount   = BigDecimal.ZERO;
    @Column(name="total_tax",precision=14,scale=2)      private BigDecimal totalTax     = BigDecimal.ZERO;
    @Column(name="total_amount",precision=14,scale=2)   private BigDecimal totalAmount  = BigDecimal.ZERO;
    @Column(name="round_off",precision=6,scale=2)       private BigDecimal roundOff     = BigDecimal.ZERO;
    @Column(name="irn",length=64) private String irn;
    @Column(name="is_cancelled")  private Boolean isCancelled  = false;
    @Column(name="cancel_reason") private String cancelReason;
    @Column(name="cancelled_at")  private LocalDateTime cancelledAt;
    @Column(name="cancelled_by_user_id") private Long cancelledByUserId;
    @Column(name="cancelled_by_name") private String cancelledByName;
    @OneToMany(mappedBy="invoice",cascade=CascadeType.ALL,fetch=FetchType.LAZY)
    private List<GstInvoiceItem> items;
    @CreationTimestamp @Column(name="created_at",updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp  @Column(name="updated_at") private LocalDateTime updatedAt;
}
