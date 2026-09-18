package com.inventory.controller;

import com.inventory.dto.request.ProductRequest;
import com.inventory.dto.response.ApiResponse;
import com.inventory.dto.response.ProductResponse;
import com.inventory.security.TenantContext;
import com.inventory.service.ProductService;
import com.inventory.util.CsvUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProductResponse>>> list(
            @RequestParam(required = false) String q, Pageable pageable) {
        return ok("Products", productService.list(tid(), q, pageable));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> lowStock() {
        return ok("Low stock products", productService.lowStock(tid()));
    }

    @GetMapping("/lookup/{sku}")
    public ResponseEntity<ApiResponse<ProductResponse>> lookupBySku(@PathVariable String sku) {
        return ok("Product", productService.getBySku(tid(), sku));
    }

    @GetMapping("/lookup-barcode/{barcode}")
    public ResponseEntity<ApiResponse<ProductResponse>> lookupByBarcode(@PathVariable String barcode) {
        return ok("Product", productService.getByBarcode(tid(), barcode));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> get(@PathVariable Long id) {
        return ok("Product", productService.get(tid(), id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(@Valid @RequestBody ProductRequest req) {
        return ok("Product created", productService.create(tid(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) {
        return ok("Product updated", productService.update(tid(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        productService.delete(tid(), id);
        return ok("Product deleted", null);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) String q) {
        List<ProductResponse> all = productService.list(tid(), q, PageRequest.of(0, 10_000)).getContent();
        List<String> header = List.of("SKU", "Name", "Category", "Price", "Stock", "Reorder Level", "HSN/SAC", "CGST%", "SGST%", "IGST%");
        List<Object[]> rows = new ArrayList<>();
        for (ProductResponse p : all) {
            rows.add(new Object[]{p.getSku(), p.getName(), p.getCategoryName(), p.getPrice(), p.getStockQuantity(),
                    p.getReorderPoint(), p.getHsnSacCode(), p.getCgstRate(), p.getSgstRate(), p.getIgstRate()});
        }
        return csvResponse(CsvUtil.build(header, rows), "products.csv");
    }

    private ResponseEntity<byte[]> csvResponse(String csv, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    private Long tid() {
        return TenantContext.getCurrentTenant();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String msg, T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(msg).data(data).build());
    }
}
