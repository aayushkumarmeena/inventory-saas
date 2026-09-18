-- Unified activity feed. Every mutating action (sale created, purchase
-- cancelled, stock adjusted, etc) writes one row here so there's a single
-- place to see "who did what" instead of piecing it together from each
-- module's own created_by columns.
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(40) NOT NULL,
    entity_id BIGINT,
    action VARCHAR(40) NOT NULL,
    description VARCHAR(500) NOT NULL,
    user_id BIGINT,
    user_name VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);

-- Real manufacturer barcodes (UPC/EAN), distinct from our own internal SKU.
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(tenant_id, barcode);

-- Partial returns: a sale can have zero or more returns, each covering
-- some quantity of one or more of its original line items. Stock is
-- restored for whatever's returned; the sale's own total_amount is left
-- untouched (it's the original invoiced amount) and refunded value is
-- tracked separately so balance-due math stays correct.
CREATE TABLE sale_returns (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    total_refund DECIMAL(14,2) NOT NULL,
    reason VARCHAR(255),
    created_by_user_id BIGINT,
    created_by_name VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sale_returns_sale ON sale_returns(sale_id);

CREATE TABLE sale_return_items (
    id BIGSERIAL PRIMARY KEY,
    sale_return_id BIGINT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
    product_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(14,2) NOT NULL,
    line_total DECIMAL(14,2) NOT NULL
);
CREATE INDEX idx_sale_return_items_return ON sale_return_items(sale_return_id);

-- Purchase order workflow: purchases used to add stock the instant they
-- were created. Now they start as ORDERED (no stock movement) and only
-- add stock once explicitly marked RECEIVED, matching how a real PO
-- process works (you order before the shipment actually arrives).
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_status_check;
ALTER TABLE purchases ADD CONSTRAINT purchases_status_check
    CHECK (status IN ('ORDERED', 'RECEIVED', 'CANCELLED'));
