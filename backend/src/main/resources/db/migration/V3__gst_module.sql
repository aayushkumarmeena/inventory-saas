CREATE TABLE gst_tax_slabs (
    id BIGSERIAL PRIMARY KEY, slab_name VARCHAR(50) NOT NULL,
    cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0, sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0, cess_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
INSERT INTO gst_tax_slabs (slab_name,cgst_rate,sgst_rate,igst_rate,cess_rate) VALUES
('GST 0%',0,0,0,0),('GST 5%',2.5,2.5,5,0),('GST 12%',6,6,12,0),
('GST 18%',9,9,18,0),('GST 28%',14,14,28,0),('GST 28%+Cess 12%',14,14,28,12);

CREATE TABLE gst_config (
    id BIGSERIAL PRIMARY KEY, tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    gstin VARCHAR(15) NOT NULL, legal_name VARCHAR(255) NOT NULL, trade_name VARCHAR(255),
    address_line1 VARCHAR(255), address_line2 VARCHAR(255), city VARCHAR(100), state VARCHAR(100),
    state_code VARCHAR(3), pincode VARCHAR(10), pan VARCHAR(10), email VARCHAR(255), phone VARCHAR(20),
    is_composition BOOLEAN DEFAULT false, filing_frequency VARCHAR(10) DEFAULT 'MONTHLY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hsn_sac_codes (
    id BIGSERIAL PRIMARY KEY, tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, type VARCHAR(3) NOT NULL CHECK (type IN ('HSN','SAC')),
    description TEXT NOT NULL, cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0, igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    cess_rate DECIMAL(5,2) NOT NULL DEFAULT 0, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, code)
);

CREATE TABLE gst_invoices (
    id BIGSERIAL PRIMARY KEY, tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id BIGINT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL, invoice_date DATE NOT NULL,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'B2B' CHECK (invoice_type IN ('B2B','B2C','EXPORT','CREDIT_NOTE','DEBIT_NOTE')),
    supply_type VARCHAR(20) NOT NULL DEFAULT 'INTRA' CHECK (supply_type IN ('INTRA','INTER','EXPORT')),
    buyer_name VARCHAR(255), buyer_gstin VARCHAR(15), buyer_address TEXT,
    buyer_state VARCHAR(100), buyer_state_code VARCHAR(3), place_of_supply VARCHAR(3),
    reverse_charge BOOLEAN DEFAULT false, taxable_value DECIMAL(14,2) NOT NULL DEFAULT 0,
    cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0, sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0, cess_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_tax DECIMAL(14,2) NOT NULL DEFAULT 0, total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    round_off DECIMAL(6,2) DEFAULT 0, irn VARCHAR(64),
    is_cancelled BOOLEAN DEFAULT false, cancel_reason VARCHAR(255), cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, invoice_number), UNIQUE(sale_id)
);

CREATE TABLE gst_invoice_items (
    id BIGSERIAL PRIMARY KEY, invoice_id BIGINT NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    sale_item_id BIGINT, hsn_sac_code VARCHAR(20),
    product_name VARCHAR(255) NOT NULL, uom VARCHAR(20) DEFAULT 'PCS',
    quantity DECIMAL(12,3) NOT NULL, unit_price DECIMAL(14,2) NOT NULL,
    discount_amount DECIMAL(14,2) DEFAULT 0, taxable_value DECIMAL(14,2) NOT NULL,
    cgst_rate DECIMAL(5,2) DEFAULT 0, cgst_amount DECIMAL(14,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0, sgst_amount DECIMAL(14,2) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0, igst_amount DECIMAL(14,2) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0, cess_amount DECIMAL(14,2) DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gst_return_periods (
    id BIGSERIAL PRIMARY KEY, tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('GSTR1','GSTR3B','GSTR9')),
    month INT CHECK (month BETWEEN 1 AND 12), quarter INT CHECK (quarter BETWEEN 1 AND 4),
    year INT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','FILED','AMENDED')),
    total_outward_taxable DECIMAL(16,2) DEFAULT 0, total_cgst DECIMAL(16,2) DEFAULT 0,
    total_sgst DECIMAL(16,2) DEFAULT 0, total_igst DECIMAL(16,2) DEFAULT 0, total_cess DECIMAL(16,2) DEFAULT 0,
    filed_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, period_type, month, year)
);

CREATE INDEX idx_gst_inv_tenant ON gst_invoices(tenant_id);
CREATE INDEX idx_gst_inv_date   ON gst_invoices(invoice_date);
CREATE INDEX idx_gst_items_inv  ON gst_invoice_items(invoice_id);
CREATE INDEX idx_hsn_tenant     ON hsn_sac_codes(tenant_id);
