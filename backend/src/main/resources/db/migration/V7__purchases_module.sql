-- Purchases module: mirrors sales but for incoming stock. Creating a
-- purchase immediately increases product stock; cancelling reverses it.

CREATE TABLE purchases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_number VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(255),
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, purchase_number)
);

CREATE TABLE purchase_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(14,2) NOT NULL,
    line_total DECIMAL(14,2) NOT NULL
);

CREATE INDEX idx_purchases_tenant ON purchases(tenant_id);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
