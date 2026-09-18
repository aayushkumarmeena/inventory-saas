package com.inventory.service;

import com.inventory.dto.request.CustomerRequest;
import com.inventory.dto.response.CustomerResponse;
import com.inventory.entity.Customer;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.repository.CustomerRepository;
import com.inventory.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerService {

    private final CustomerRepository customerRepo;
    private final SaleRepository saleRepo;

    @Transactional(readOnly = true)
    public Page<CustomerResponse> list(Long tenantId, String q, Pageable pageable) {
        return customerRepo.search(tenantId, q, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(Long tenantId, Long id) {
        return toResponse(find(tenantId, id));
    }

    public CustomerResponse create(Long tenantId, CustomerRequest req) {
        Customer c = Customer.builder()
                .tenantId(tenantId)
                .name(req.getName())
                .phone(req.getPhone())
                .email(req.getEmail())
                .address(req.getAddress())
                .build();
        return toResponse(customerRepo.save(c));
    }

    public CustomerResponse update(Long tenantId, Long id, CustomerRequest req) {
        Customer c = find(tenantId, id);
        c.setName(req.getName());
        c.setPhone(req.getPhone());
        c.setEmail(req.getEmail());
        c.setAddress(req.getAddress());
        return toResponse(customerRepo.save(c));
    }

    /** Finds an existing customer by exact name (case-insensitive) or creates one. Used when a
     * sale is recorded with a typed customer name rather than a picked existing customer. */
    public Customer findOrCreateByName(Long tenantId, String name) {
        return customerRepo.findByTenantIdAndNameIgnoreCase(tenantId, name)
                .orElseGet(() -> customerRepo.save(Customer.builder().tenantId(tenantId).name(name).build()));
    }

    private Customer find(Long tenantId, Long id) {
        return customerRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    private CustomerResponse toResponse(Customer c) {
        long orders = saleRepo.countByCustomerId(c.getId());
        BigDecimal spent = saleRepo.sumPaidByCustomerId(c.getId());
        BigDecimal outstanding = saleRepo.sumOutstandingByCustomerId(c.getId());
        return CustomerResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .phone(c.getPhone())
                .email(c.getEmail())
                .address(c.getAddress())
                .totalOrders(orders)
                .totalSpent(spent)
                .outstandingBalance(outstanding)
                .build();
    }
}
