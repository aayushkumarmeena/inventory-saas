-- Stock adjustments: manual increases/decreases to a product's stock,
-- independent of sales (e.g. restocking, damage, correction).
CREATE TABLE stock_adjustments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    quantity INT NOT NULL CHECK (quantity > 0),
    reason VARCHAR(255),
    resulting_stock INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_adjustments_tenant ON stock_adjustments(tenant_id);
CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);

-- Product photo (external URL — no file upload infrastructure yet).
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Allow sales to be cancelled (stock is restored when this happens).
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check
    CHECK (payment_status IN ('PAID', 'PENDING', 'OVERDUE', 'CANCELLED'));
