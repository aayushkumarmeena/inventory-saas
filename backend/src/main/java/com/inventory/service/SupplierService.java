package com.inventory.service;

import com.inventory.dto.request.SupplierRequest;
import com.inventory.dto.response.SupplierResponse;
import com.inventory.entity.Supplier;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.PurchaseRepository;
import com.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepo;
    private final PurchaseRepository purchaseRepo;

    @Transactional(readOnly = true)
    public Page<SupplierResponse> list(Long tenantId, String q, Pageable pageable) {
        return supplierRepo.search(tenantId, q, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public SupplierResponse get(Long tenantId, Long id) {
        return toResponse(find(tenantId, id));
    }

    public SupplierResponse create(Long tenantId, SupplierRequest req) {
        Supplier s = Supplier.builder()
                .tenantId(tenantId)
                .name(req.getName())
                .phone(req.getPhone())
                .email(req.getEmail())
                .address(req.getAddress())
                .build();
        return toResponse(supplierRepo.save(s));
    }

    public SupplierResponse update(Long tenantId, Long id, SupplierRequest req) {
        Supplier s = find(tenantId, id);
        s.setName(req.getName());
        s.setPhone(req.getPhone());
        s.setEmail(req.getEmail());
        s.setAddress(req.getAddress());
        return toResponse(supplierRepo.save(s));
    }

    public Supplier findOrCreateByName(Long tenantId, String name) {
        return supplierRepo.findByTenantIdAndNameIgnoreCase(tenantId, name)
                .orElseGet(() -> supplierRepo.save(Supplier.builder().tenantId(tenantId).name(name).build()));
    }

    private Supplier find(Long tenantId, Long id) {
        return supplierRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
    }

    private SupplierResponse toResponse(Supplier s) {
        return SupplierResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .phone(s.getPhone())
                .email(s.getEmail())
                .address(s.getAddress())
                .totalOrders(purchaseRepo.countBySupplierId(s.getId()))
                .totalSpent(purchaseRepo.sumBySupplierId(s.getId()))
                .build();
    }
}
