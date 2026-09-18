-- Sales module: a sale is a simple point-of-sale transaction with line items
-- that decrement product stock. GST invoices (V3) reference sale_id loosely
-- (no FK) and can now point at real sales created here.

CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    sale_date DATE NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID','PENDING','OVERDUE')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, sale_number)
);

CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(14,2) NOT NULL,
    line_total DECIMAL(14,2) NOT NULL
);

CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
