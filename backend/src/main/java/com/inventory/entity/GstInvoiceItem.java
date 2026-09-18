package com.inventory.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="gst_invoice_items") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstInvoiceItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id",nullable=false) private GstInvoice invoice;
    @Column(name="sale_item_id") private Long saleItemId;
    @Column(name="hsn_sac_code",length=20) private String hsnSacCode;
    @Column(name="product_name",nullable=false) private String productName;
    @Column(length=20) private String uom = "PCS";
    @Column(nullable=false,precision=12,scale=3) private BigDecimal quantity;
    @Column(name="unit_price",nullable=false,precision=14,scale=2) private BigDecimal unitPrice;
    @Column(name="discount_amount",precision=14,scale=2) private BigDecimal discountAmount = BigDecimal.ZERO;
    @Column(name="taxable_value",nullable=false,precision=14,scale=2) private BigDecimal taxableValue;
    @Column(name="cgst_rate",precision=5,scale=2)   private BigDecimal cgstRate   = BigDecimal.ZERO;
    @Column(name="cgst_amount",precision=14,scale=2) private BigDecimal cgstAmount = BigDecimal.ZERO;
    @Column(name="sgst_rate",precision=5,scale=2)   private BigDecimal sgstRate   = BigDecimal.ZERO;
    @Column(name="sgst_amount",precision=14,scale=2) private BigDecimal sgstAmount = BigDecimal.ZERO;
    @Column(name="igst_rate",precision=5,scale=2)   private BigDecimal igstRate   = BigDecimal.ZERO;
    @Column(name="igst_amount",precision=14,scale=2) private BigDecimal igstAmount = BigDecimal.ZERO;
    @Column(name="cess_rate",precision=5,scale=2)   private BigDecimal cessRate   = BigDecimal.ZERO;
    @Column(name="cess_amount",precision=14,scale=2) private BigDecimal cessAmount = BigDecimal.ZERO;
    @Column(name="total_amount",nullable=false,precision=14,scale=2) private BigDecimal totalAmount;
    @Column(name="created_at") private LocalDateTime createdAt;
}
