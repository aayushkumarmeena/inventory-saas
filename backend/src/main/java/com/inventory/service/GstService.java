package com.inventory.service;

import com.inventory.dto.request.*;
import com.inventory.dto.response.*;
import com.inventory.entity.*;
import com.inventory.exception.*;
import com.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional
public class GstService {

    private final GstConfigRepository      gstConfigRepo;
    private final GstInvoiceRepository     invoiceRepo;
    private final GstReturnPeriodRepository returnRepo;
    private final HsnSacCodeRepository     hsnRepo;
    private final AuditService             audit;

    @Cacheable(value="gst-config",key="#tenantId")
    @Transactional(readOnly=true)
    public GstConfigResponse getConfig(Long tenantId) {
        return mapConfig(gstConfigRepo.findByTenantId(tenantId)
                .orElseThrow(()->new ResourceNotFoundException("GST configuration not set up")));
    }

    @CacheEvict(value="gst-config",key="#tenantId")
    public GstConfigResponse saveConfig(Long tenantId, GstConfigRequest r) {
        GstConfig c = gstConfigRepo.findByTenantId(tenantId).orElse(GstConfig.builder().tenantId(tenantId).build());
        c.setGstin(r.getGstin().toUpperCase()); c.setLegalName(r.getLegalName()); c.setTradeName(r.getTradeName());
        c.setAddressLine1(r.getAddressLine1()); c.setAddressLine2(r.getAddressLine2()); c.setCity(r.getCity());
        c.setState(r.getState()); c.setStateCode(r.getStateCode()); c.setPincode(r.getPincode());
        c.setEmail(r.getEmail()); c.setPhone(r.getPhone());
        if(r.getPan()!=null) c.setPan(r.getPan().toUpperCase());
        if(r.getIsComposition()!=null) c.setIsComposition(r.getIsComposition());
        if(r.getFilingFrequency()!=null) c.setFilingFrequency(r.getFilingFrequency());
        return mapConfig(gstConfigRepo.save(c));
    }

    @Transactional(readOnly=true)
    public Page<HsnSacCode> listHsnSac(Long tenantId, String q, Pageable p) {
        return q!=null&&!q.isBlank() ? hsnRepo.search(tenantId,q,p) : hsnRepo.findByTenantIdAndIsActive(tenantId,true,p);
    }

    public HsnSacCode createHsnSac(Long tenantId, HsnSacRequest r) {
        if(hsnRepo.existsByTenantIdAndCode(tenantId,r.getCode())) throw new BusinessException("HSN/SAC already exists: "+r.getCode());
        return hsnRepo.save(HsnSacCode.builder().tenantId(tenantId).code(r.getCode()).type(r.getType())
                .description(r.getDescription()).cgstRate(r.getCgstRate()).sgstRate(r.getSgstRate())
                .igstRate(r.getIgstRate()).cessRate(r.getCessRate()!=null?r.getCessRate():BigDecimal.ZERO).isActive(true).build());
    }

    public HsnSacCode updateHsnSac(Long tenantId, Long id, HsnSacRequest r) {
        HsnSacCode h = hsnRepo.findByIdAndTenantId(id,tenantId).orElseThrow(()->new ResourceNotFoundException("HSN/SAC not found"));
        h.setDescription(r.getDescription()); h.setCgstRate(r.getCgstRate()); h.setSgstRate(r.getSgstRate()); h.setIgstRate(r.getIgstRate());
        if(r.getCessRate()!=null) h.setCessRate(r.getCessRate());
        return hsnRepo.save(h);
    }

    public void deleteHsnSac(Long tenantId, Long id) {
        HsnSacCode h = hsnRepo.findByIdAndTenantId(id,tenantId).orElseThrow(()->new ResourceNotFoundException("HSN/SAC not found"));
        h.setIsActive(false); hsnRepo.save(h);
    }

    public List<HsnSacCode> getAllHsnSacList(Long tenantId) { return hsnRepo.findByTenantIdAndIsActive(tenantId,true); }

    @Transactional(readOnly=true)
    public Page<GstInvoiceResponse> listInvoices(Long tenantId, Pageable p) {
        GstConfig cfg = gstConfigRepo.findByTenantId(tenantId).orElse(null);
        return invoiceRepo.findByTenantId(tenantId,p).map(i->mapInvoice(i,cfg));
    }

    @Transactional(readOnly=true)
    public GstInvoiceResponse getInvoice(Long tenantId, Long id) {
        return mapInvoice(invoiceRepo.findByIdAndTenantId(id,tenantId).orElseThrow(()->new ResourceNotFoundException("Invoice not found")),
                gstConfigRepo.findByTenantId(tenantId).orElse(null));
    }

    @Transactional(readOnly=true)
    public GstInvoiceResponse getInvoiceBySaleId(Long tenantId, Long saleId) {
        return mapInvoice(invoiceRepo.findBySaleIdAndTenantId(saleId,tenantId).orElseThrow(()->new ResourceNotFoundException("No GST invoice for sale")),
                gstConfigRepo.findByTenantId(tenantId).orElse(null));
    }

    public GstInvoiceResponse generateInvoice(Long tenantId, GstInvoiceRequest req) {
        if (invoiceRepo.findBySaleIdAndTenantId(req.getSaleId(), tenantId).isPresent())
            throw new BusinessException("GST invoice already exists for this sale");

        GstConfig cfg = gstConfigRepo.findByTenantId(tenantId)
                .orElseThrow(() -> new BusinessException("GST configuration not found. Set it up first."));

        String buyerStateCode = sanitizeStateCode(req.getBuyerStateCode(), req.getBuyerGstin());
        String placeOfSupply = sanitizeStateCode(req.getPlaceOfSupply(), req.getBuyerGstin());
        if (placeOfSupply == null && buyerStateCode != null) {
            placeOfSupply = buyerStateCode;
        } else if (buyerStateCode == null && placeOfSupply != null) {
            buyerStateCode = placeOfSupply;
        }
        if (placeOfSupply == null) {
            placeOfSupply = cfg.getStateCode() != null ? cfg.getStateCode() : "00";
        }
        if (buyerStateCode == null) {
            buyerStateCode = placeOfSupply;
        }

        String supplyType = resolveSupplyType(cfg.getStateCode(), buyerStateCode, req.getSupplyType());
        String invType = req.getInvoiceType() != null ? req.getInvoiceType()
                : (req.getBuyerGstin() != null && !req.getBuyerGstin().isBlank() ? "B2B" : "B2C");

        GstInvoice inv = GstInvoice.builder()
                .tenantId(tenantId).saleId(req.getSaleId())
                .invoiceNumber(buildInvoiceNumber(tenantId, cfg.getGstin()))
                .invoiceDate(req.getInvoiceDate() != null ? req.getInvoiceDate() : LocalDate.now())
                .invoiceType(invType).supplyType(supplyType)
                .buyerName(req.getBuyerName())
                .buyerGstin(req.getBuyerGstin() != null ? req.getBuyerGstin().toUpperCase() : null)
                .buyerAddress(req.getBuyerAddress()).buyerState(req.getBuyerState())
                .buyerStateCode(buyerStateCode).placeOfSupply(placeOfSupply)
                .reverseCharge(Boolean.TRUE.equals(req.getReverseCharge()))
                .isCancelled(false).build();

        List<GstInvoiceItem> items = buildItems(inv, req.getItems(), supplyType);

        BigDecimal taxable = BigDecimal.ZERO, cgst = BigDecimal.ZERO, sgst = BigDecimal.ZERO, igst = BigDecimal.ZERO, cess = BigDecimal.ZERO;
        for (GstInvoiceItem it : items) {
            taxable = taxable.add(it.getTaxableValue());
            cgst = cgst.add(it.getCgstAmount());
            sgst = sgst.add(it.getSgstAmount());
            igst = igst.add(it.getIgstAmount());
            cess = cess.add(it.getCessAmount());
        }
        BigDecimal totalTax = cgst.add(sgst).add(igst).add(cess);
        BigDecimal raw = taxable.add(totalTax);
        BigDecimal rounded = raw.setScale(0, RoundingMode.HALF_UP);

        inv.setTaxableValue(taxable.setScale(2,RoundingMode.HALF_UP));
        inv.setCgstAmount(cgst.setScale(2,RoundingMode.HALF_UP));
        inv.setSgstAmount(sgst.setScale(2,RoundingMode.HALF_UP));
        inv.setIgstAmount(igst.setScale(2,RoundingMode.HALF_UP));
        inv.setCessAmount(cess.setScale(2,RoundingMode.HALF_UP));
        inv.setTotalTax(totalTax.setScale(2,RoundingMode.HALF_UP));
        inv.setTotalAmount(rounded);
        inv.setRoundOff(rounded.subtract(raw).setScale(2,RoundingMode.HALF_UP));
        inv.setItems(items);

        GstInvoice saved = invoiceRepo.save(inv);
        audit.log("GST_INVOICE", saved.getId(), "CREATE", "Generated GST invoice " + saved.getInvoiceNumber());
        return mapInvoice(saved, cfg);
    }

    public GstInvoiceResponse cancelInvoice(Long tenantId, Long id, String reason) {
        GstInvoice inv = invoiceRepo.findByIdAndTenantId(id,tenantId).orElseThrow(()->new ResourceNotFoundException("Invoice not found"));
        if(Boolean.TRUE.equals(inv.getIsCancelled())) throw new BusinessException("Invoice already cancelled");
        inv.setIsCancelled(true); inv.setCancelReason(reason); inv.setCancelledAt(LocalDateTime.now());
        inv.setCancelledByUserId(audit.userId()); inv.setCancelledByName(audit.userName());
        GstInvoice saved = invoiceRepo.save(inv);
        audit.log("GST_INVOICE", saved.getId(), "CANCEL", "Cancelled GST invoice " + saved.getInvoiceNumber());
        return mapInvoice(saved, gstConfigRepo.findByTenantId(tenantId).orElse(null));
    }

    @Transactional(readOnly=true)
    public GstSummaryResponse getSummary(Long tenantId, LocalDate from, LocalDate to) {
        BigDecimal taxable=invoiceRepo.sumTaxable(tenantId,from,to), cgst=invoiceRepo.sumCgst(tenantId,from,to),
                   sgst=invoiceRepo.sumSgst(tenantId,from,to), igst=invoiceRepo.sumIgst(tenantId,from,to),
                   cess=invoiceRepo.sumCess(tenantId,from,to), total=invoiceRepo.sumTotal(tenantId,from,to);
        return GstSummaryResponse.builder().totalTaxableValue(taxable).totalCgst(cgst).totalSgst(sgst)
                .totalIgst(igst).totalCess(cess).totalTax(cgst.add(sgst).add(igst).add(cess)).totalInvoiceValue(total)
                .b2bCount(invoiceRepo.countByType(tenantId,"B2B",from,to)).b2cCount(invoiceRepo.countByType(tenantId,"B2C",from,to))
                .exportCount(invoiceRepo.countByType(tenantId,"EXPORT",from,to)).cancelledCount(invoiceRepo.countCancelled(tenantId,from,to))
                .taxSlabBreakdown(invoiceRepo.taxSlabBreakdown(tenantId,from,to)).monthlyTrend(invoiceRepo.monthlyTrend(tenantId,from,to)).build();
    }

    @Transactional(readOnly=true)
    public Gstr1Response getGstr1Data(Long tenantId, int month, int year) {
        GstConfig cfg = gstConfigRepo.findByTenantId(tenantId).orElseThrow(()->new BusinessException("GST config not found"));
        LocalDate from=LocalDate.of(year,month,1), to=from.withDayOfMonth(from.lengthOfMonth());
        return Gstr1Response.builder().month(month).year(year).gstin(cfg.getGstin()).legalName(cfg.getLegalName())
                .b2b(invoiceRepo.findByPeriodAndType(tenantId,from,to,"B2B").stream().map(i->Gstr1Response.B2bEntry.builder()
                        .buyerGstin(i.getBuyerGstin()).buyerName(i.getBuyerName()).invoiceNumber(i.getInvoiceNumber())
                        .invoiceDate(i.getInvoiceDate().toString()).invoiceValue(i.getTotalAmount()).placeOfSupply(i.getPlaceOfSupply())
                        .taxableValue(i.getTaxableValue()).cgstAmount(i.getCgstAmount()).sgstAmount(i.getSgstAmount()).igstAmount(i.getIgstAmount()).build())
                        .collect(Collectors.toList()))
                .b2c(invoiceRepo.findByPeriodAndType(tenantId,from,to,"B2C").stream().map(i->Gstr1Response.B2cEntry.builder()
                        .invoiceNumber(i.getInvoiceNumber()).invoiceDate(i.getInvoiceDate().toString()).invoiceValue(i.getTotalAmount())
                        .placeOfSupply(i.getPlaceOfSupply()).taxableValue(i.getTaxableValue()).cgstAmount(i.getCgstAmount())
                        .sgstAmount(i.getSgstAmount()).igstAmount(i.getIgstAmount()).build())
                        .collect(Collectors.toList()))
                .totalTaxableValue(invoiceRepo.sumTaxable(tenantId,from,to)).totalCgst(invoiceRepo.sumCgst(tenantId,from,to))
                .totalSgst(invoiceRepo.sumSgst(tenantId,from,to)).totalIgst(invoiceRepo.sumIgst(tenantId,from,to)).build();
    }

    public List<GstReturnPeriod> listReturnPeriods(Long tenantId) { return returnRepo.findByTenantIdOrderByYearDescMonthDesc(tenantId); }

    public GstReturnPeriod upsertReturnPeriod(Long tenantId, String type, int month, int year) {
        GstReturnPeriod p = returnRepo.findByTenantIdAndPeriodTypeAndMonthAndYear(tenantId,type,month,year)
                .orElse(GstReturnPeriod.builder().tenantId(tenantId).periodType(type).month(month).year(year).status("DRAFT").build());
        LocalDate from=LocalDate.of(year,month,1), to=from.withDayOfMonth(from.lengthOfMonth());
        p.setTotalOutwardTaxable(invoiceRepo.sumTaxable(tenantId,from,to)); p.setTotalCgst(invoiceRepo.sumCgst(tenantId,from,to));
        p.setTotalSgst(invoiceRepo.sumSgst(tenantId,from,to)); p.setTotalIgst(invoiceRepo.sumIgst(tenantId,from,to));
        p.setTotalCess(invoiceRepo.sumCess(tenantId,from,to));
        return returnRepo.save(p);
    }

    public GstReturnPeriod markFiled(Long tenantId, Long id) {
        GstReturnPeriod p = returnRepo.findByIdAndTenantId(id,tenantId).orElseThrow(()->new ResourceNotFoundException("Period not found"));
        p.setStatus("FILED"); p.setFiledAt(LocalDateTime.now()); return returnRepo.save(p);
    }

    public TaxCalculationResponse calculateTax(BigDecimal amount, BigDecimal rate, boolean taxInclusive, String supplyType) {
        boolean inter="INTER".equals(supplyType)||"EXPORT".equals(supplyType);
        BigDecimal rateD=rate.divide(BigDecimal.valueOf(100),8,RoundingMode.HALF_UP);
        BigDecimal taxable=taxInclusive?amount.divide(BigDecimal.ONE.add(rateD),2,RoundingMode.HALF_UP):amount.setScale(2,RoundingMode.HALF_UP);
        BigDecimal taxAmt=taxable.multiply(rateD).setScale(2,RoundingMode.HALF_UP);
        BigDecimal half=taxable.multiply(rate.divide(BigDecimal.valueOf(200),8,RoundingMode.HALF_UP)).setScale(2,RoundingMode.HALF_UP);
        BigDecimal halfRate=rate.divide(BigDecimal.TWO,2,RoundingMode.HALF_UP);
        return TaxCalculationResponse.builder().originalAmount(amount).taxableValue(taxable)
                .cgstRate(inter?BigDecimal.ZERO:halfRate).cgstAmount(inter?BigDecimal.ZERO:half)
                .sgstRate(inter?BigDecimal.ZERO:halfRate).sgstAmount(inter?BigDecimal.ZERO:half)
                .igstRate(inter?rate:BigDecimal.ZERO).igstAmount(inter?taxAmt:BigDecimal.ZERO)
                .cessRate(BigDecimal.ZERO).cessAmount(BigDecimal.ZERO)
                .totalTax(taxAmt).totalAmount(taxable.add(taxAmt)).taxInclusive(taxInclusive).supplyType(supplyType).build();
    }

    private List<GstInvoiceItem> buildItems(GstInvoice inv, List<GstInvoiceItemRequest> reqs, String supplyType) {
        if (reqs == null || reqs.isEmpty()) return new ArrayList<>();
        boolean inter = "INTER".equals(supplyType) || "EXPORT".equals(supplyType);
        return reqs.stream().map(r -> {
            BigDecimal qty = r.getQuantity()!=null?r.getQuantity():BigDecimal.ONE;
            BigDecimal price = r.getUnitPrice()!=null?r.getUnitPrice():BigDecimal.ZERO;
            BigDecimal disc = safe(r.getDiscountAmount());
            BigDecimal gross = price.multiply(qty).subtract(disc);
            boolean taxInc = Boolean.TRUE.equals(r.getTaxInclusive());
            BigDecimal cr=safe(r.getCgstRate()), sr=safe(r.getSgstRate()), ir=safe(r.getIgstRate()), cesr=safe(r.getCessRate());
            BigDecimal effRate = inter ? ir : cr.add(sr);
            BigDecimal rateDec = effRate.divide(BigDecimal.valueOf(100),8,RoundingMode.HALF_UP);
            BigDecimal taxable = taxInc ? gross.divide(BigDecimal.ONE.add(rateDec),2,RoundingMode.HALF_UP) : gross.setScale(2,RoundingMode.HALF_UP);
            BigDecimal cgstAmt = inter?BigDecimal.ZERO:taxable.multiply(cr.divide(BigDecimal.valueOf(100),8,RoundingMode.HALF_UP)).setScale(2,RoundingMode.HALF_UP);
            BigDecimal sgstAmt = inter?BigDecimal.ZERO:taxable.multiply(sr.divide(BigDecimal.valueOf(100),8,RoundingMode.HALF_UP)).setScale(2,RoundingMode.HALF_UP);
            BigDecimal igstAmt = !inter?BigDecimal.ZERO:taxable.multiply(ir.divide(BigDecimal.valueOf(100),8,RoundingMode.HALF_UP)).setScale(2,RoundingMode.HALF_UP);
            BigDecimal cessAmt = taxable.multiply(cesr.divide(BigDecimal.valueOf(100),8,RoundingMode.HALF_UP)).setScale(2,RoundingMode.HALF_UP);
            return GstInvoiceItem.builder().invoice(inv).saleItemId(r.getSaleItemId()).hsnSacCode(r.getHsnSacCode())
                    .productName(r.getProductName()!=null?r.getProductName():"Item").uom(r.getUom()!=null?r.getUom():"PCS")
                    .quantity(qty).unitPrice(price).discountAmount(disc).taxableValue(taxable)
                    .cgstRate(cr).cgstAmount(cgstAmt).sgstRate(sr).sgstAmount(sgstAmt)
                    .igstRate(ir).igstAmount(igstAmt).cessRate(cesr).cessAmount(cessAmt)
                    .totalAmount(taxable.add(cgstAmt).add(sgstAmt).add(igstAmt).add(cessAmt))
                    .createdAt(LocalDateTime.now()).build();
        }).collect(Collectors.toList());
    }

    private String buildInvoiceNumber(Long tenantId, String gstin) {
        int yr = LocalDate.now().getYear()%100;
        long seq = invoiceRepo.findByTenantId(tenantId, PageRequest.of(0,1)).getTotalElements()+1;
        return gstin.substring(0,2)+"/"+yr+"-"+(yr+1)+"/"+String.format("%05d",seq);
    }

    private String sanitizeStateCode(String input, String gstin) {
        if (input != null && !input.isBlank()) {
            String trimmed = input.trim();
            if (trimmed.length() <= 3) return trimmed;
            if (Character.isDigit(trimmed.charAt(0))) {
                StringBuilder sb = new StringBuilder();
                for (char c : trimmed.toCharArray()) {
                    if (Character.isDigit(c) && sb.length() < 3) sb.append(c);
                    else break;
                }
                if (sb.length() > 0) return sb.toString();
            }
            return trimmed.substring(0, 3);
        }
        if (gstin != null && gstin.trim().length() >= 2 && Character.isDigit(gstin.trim().charAt(0))) {
            return gstin.trim().substring(0, 2);
        }
        return null;
    }

    private String resolveSupplyType(String sellerCode, String buyerCode, String explicit) {
        if(explicit!=null&&!explicit.isBlank()) return explicit;
        if(buyerCode==null||buyerCode.isBlank()) return "INTRA";
        return sellerCode!=null&&sellerCode.equalsIgnoreCase(buyerCode) ? "INTRA":"INTER";
    }

    private BigDecimal safe(BigDecimal v){return v!=null?v:BigDecimal.ZERO;}
    private String join(String a,String b){if(a==null)return b==null?"":b;return b==null?a:a+", "+b;}

    private GstConfigResponse mapConfig(GstConfig c) {
        return GstConfigResponse.builder().id(c.getId()).gstin(c.getGstin()).legalName(c.getLegalName()).tradeName(c.getTradeName())
                .addressLine1(c.getAddressLine1()).addressLine2(c.getAddressLine2()).city(c.getCity()).state(c.getState())
                .stateCode(c.getStateCode()).pincode(c.getPincode()).pan(c.getPan()).email(c.getEmail()).phone(c.getPhone())
                .isComposition(c.getIsComposition()).filingFrequency(c.getFilingFrequency()).updatedAt(c.getUpdatedAt()).build();
    }

    private GstInvoiceResponse mapInvoice(GstInvoice i, GstConfig cfg) {
        List<GstInvoiceItemResponse> items = i.getItems()==null?List.of():i.getItems().stream().map(it->GstInvoiceItemResponse.builder()
                .id(it.getId()).hsnSacCode(it.getHsnSacCode()).productName(it.getProductName()).uom(it.getUom())
                .quantity(it.getQuantity()).unitPrice(it.getUnitPrice()).discountAmount(it.getDiscountAmount()).taxableValue(it.getTaxableValue())
                .cgstRate(it.getCgstRate()).cgstAmount(it.getCgstAmount()).sgstRate(it.getSgstRate()).sgstAmount(it.getSgstAmount())
                .igstRate(it.getIgstRate()).igstAmount(it.getIgstAmount()).cessRate(it.getCessRate()).cessAmount(it.getCessAmount())
                .totalAmount(it.getTotalAmount()).build()).collect(Collectors.toList());
        var b=GstInvoiceResponse.builder().id(i.getId()).saleId(i.getSaleId())
                .invoiceNumber(i.getInvoiceNumber()).invoiceDate(i.getInvoiceDate()).invoiceType(i.getInvoiceType())
                .supplyType(i.getSupplyType()).buyerName(i.getBuyerName()).buyerGstin(i.getBuyerGstin())
                .buyerAddress(i.getBuyerAddress()).buyerState(i.getBuyerState()).buyerStateCode(i.getBuyerStateCode())
                .placeOfSupply(i.getPlaceOfSupply()).reverseCharge(i.getReverseCharge()).taxableValue(i.getTaxableValue())
                .cgstAmount(i.getCgstAmount()).sgstAmount(i.getSgstAmount()).igstAmount(i.getIgstAmount())
                .cessAmount(i.getCessAmount()).totalTax(i.getTotalTax()).totalAmount(i.getTotalAmount())
                .roundOff(i.getRoundOff()).irn(i.getIrn()).isCancelled(i.getIsCancelled()).cancelReason(i.getCancelReason())
                .items(items).createdAt(i.getCreatedAt());
        if(cfg!=null) b.sellerGstin(cfg.getGstin()).sellerLegalName(cfg.getLegalName())
                .sellerAddress(join(cfg.getAddressLine1(),cfg.getAddressLine2())).sellerState(cfg.getState()).sellerStateCode(cfg.getStateCode());
        return b.build();
    }
}
