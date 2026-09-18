package com.inventory.controller;
import com.inventory.dto.request.*;
import com.inventory.dto.response.*;
import com.inventory.entity.*;
import com.inventory.security.TenantContext;
import com.inventory.service.GstService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/api/v1/gst") @RequiredArgsConstructor
public class GstController {
    private final GstService gst;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.inventory.service.GstInvoicePdfService pdfService;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<GstConfigResponse>> getConfig() { return ok("GST config",gst.getConfig(tid())); }

    @PutMapping("/config") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GstConfigResponse>> saveConfig(@Valid @RequestBody GstConfigRequest r) { return ok("Saved",gst.saveConfig(tid(),r)); }

    @GetMapping("/hsn-sac")
    public ResponseEntity<ApiResponse<Page<HsnSacCode>>> listHsn(@RequestParam(required=false) String q, Pageable p) { return ok("HSN/SAC",gst.listHsnSac(tid(),q,p)); }

    @GetMapping("/hsn-sac/all")
    public ResponseEntity<ApiResponse<List<HsnSacCode>>> allHsn() { return ok("All HSN/SAC",gst.getAllHsnSacList(tid())); }

    @PostMapping("/hsn-sac") @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<HsnSacCode>> createHsn(@Valid @RequestBody HsnSacRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<HsnSacCode>builder().success(true).message("Created").data(gst.createHsnSac(tid(),r)).build());
    }

    @PutMapping("/hsn-sac/{id}") @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<HsnSacCode>> updateHsn(@PathVariable Long id,@Valid @RequestBody HsnSacRequest r) { return ok("Updated",gst.updateHsnSac(tid(),id,r)); }

    @DeleteMapping("/hsn-sac/{id}") @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteHsn(@PathVariable Long id) { gst.deleteHsnSac(tid(),id); return ok("Deleted",null); }

    @GetMapping("/invoices")
    public ResponseEntity<ApiResponse<Page<GstInvoiceResponse>>> listInvoices(Pageable p) { return ok("Invoices",gst.listInvoices(tid(),p)); }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<ApiResponse<GstInvoiceResponse>> getInvoice(@PathVariable Long id) { return ok("Invoice",gst.getInvoice(tid(),id)); }

    @GetMapping("/invoices/{id}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable Long id) {
        GstInvoiceResponse inv = gst.getInvoice(tid(), id);
        try {
            byte[] pdf = pdfService.render(inv);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + inv.getInvoiceNumber() + ".pdf\"")
                    .body(pdf);
        } catch (java.io.IOException e) {
            throw new com.inventory.exception.BusinessException("Could not generate invoice PDF");
        }
    }

    @GetMapping("/invoices/by-sale/{saleId}")
    public ResponseEntity<ApiResponse<GstInvoiceResponse>> getBySale(@PathVariable Long saleId) { return ok("Invoice",gst.getInvoiceBySaleId(tid(),saleId)); }

    @PostMapping("/invoices") @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<GstInvoiceResponse>> generate(@Valid @RequestBody GstInvoiceRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<GstInvoiceResponse>builder().success(true).message("GST invoice generated").data(gst.generateInvoice(tid(),r)).build());
    }

    @PostMapping("/invoices/{id}/cancel") @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<GstInvoiceResponse>> cancel(@PathVariable Long id,@RequestParam String reason) { return ok("Cancelled",gst.cancelInvoice(tid(),id,reason)); }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<GstSummaryResponse>> summary(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to) { return ok("Summary",gst.getSummary(tid(),from,to)); }

    @GetMapping("/returns/gstr1")
    public ResponseEntity<ApiResponse<Gstr1Response>> gstr1(@RequestParam int month,@RequestParam int year) { return ok("GSTR-1",gst.getGstr1Data(tid(),month,year)); }

    @GetMapping("/returns/periods")
    public ResponseEntity<ApiResponse<List<GstReturnPeriod>>> listPeriods() { return ok("Periods",gst.listReturnPeriods(tid())); }

    @PostMapping("/returns/periods") @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<GstReturnPeriod>> upsertPeriod(@RequestParam String type,@RequestParam int month,@RequestParam int year) { return ok("Period",gst.upsertReturnPeriod(tid(),type,month,year)); }

    @PostMapping("/returns/periods/{id}/file") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GstReturnPeriod>> markFiled(@PathVariable Long id) { return ok("Filed",gst.markFiled(tid(),id)); }

    @GetMapping("/calculate-tax")
    public ResponseEntity<ApiResponse<TaxCalculationResponse>> calcTax(@RequestParam BigDecimal amount,@RequestParam BigDecimal rate,@RequestParam(defaultValue="false") boolean taxInclusive,@RequestParam(defaultValue="INTRA") String supplyType) {
        return ok("Calculated",gst.calculateTax(amount,rate,taxInclusive,supplyType));
    }

    @GetMapping("/reports/gstr1/export")
    public ResponseEntity<byte[]> exportGstr1(@RequestParam int month,@RequestParam int year) {
        return downloadJson(gst.getGstr1Data(tid(),month,year), "gstr1_"+month+"_"+year+".json");
    }

    @GetMapping("/reports/gstr3b/export")
    public ResponseEntity<byte[]> exportGstr3b(@RequestParam int month,@RequestParam int year) {
        Gstr1Response data = gst.getGstr1Data(tid(),month,year);
        var summary = java.util.Map.of(
                "month", month, "year", year, "gstin", data.getGstin(), "legalName", data.getLegalName(),
                "totalTaxableValue", data.getTotalTaxableValue(), "totalCgst", data.getTotalCgst(),
                "totalSgst", data.getTotalSgst(), "totalIgst", data.getTotalIgst(),
                "invoiceCount", data.getB2b().size() + data.getB2c().size()
        );
        return downloadJson(summary, "gstr3b_"+month+"_"+year+".json");
    }

    private ResponseEntity<byte[]> downloadJson(Object payload, String filename) {
        try {
            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(payload);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(json);
        } catch (Exception e) {
            throw new com.inventory.exception.BusinessException("Could not generate export file");
        }
    }

    private Long tid(){return TenantContext.getCurrentTenant();}
    private <T> ResponseEntity<ApiResponse<T>> ok(String msg,T data){return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());}
}
