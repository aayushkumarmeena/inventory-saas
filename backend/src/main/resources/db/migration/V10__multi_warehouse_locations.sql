-- Multi-Warehouse & Multi-Branch Stock Tracking
CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'WAREHOUSE',
    address VARCHAR(255),
    city VARCHAR(100),
    phone VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_tenant_code ON warehouses(tenant_id, code);

CREATE TABLE IF NOT EXISTS warehouse_stock (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    bin_location VARCHAR(50),
    reorder_level INT DEFAULT 10,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_product UNIQUE (warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_tenant ON warehouse_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_wh ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_prod ON warehouse_stock(product_id);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transfer_number VARCHAR(50) NOT NULL,
    from_warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    to_warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    notes VARCHAR(255),
    created_by_user_id BIGINT,
    created_by_name VARCHAR(100),
    transfer_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON stock_transfers(tenant_id);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_trf ON stock_transfer_items(transfer_id);

-- Seed default Main Warehouse for all existing tenants if not already present
INSERT INTO warehouses (tenant_id, name, code, type, is_default, is_active)
SELECT t.id, 'Main Warehouse', 'WH-MAIN', 'WAREHOUSE', true, true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM warehouses w WHERE w.tenant_id = t.id AND w.is_default = true
);

-- Seed warehouse_stock for all products in their tenant's default warehouse
INSERT INTO warehouse_stock (tenant_id, warehouse_id, product_id, quantity, reorder_level)
SELECT p.tenant_id, w.id, p.id, p.stock_quantity, p.reorder_level
FROM products p
JOIN warehouses w ON p.tenant_id = w.tenant_id AND w.is_default = true
WHERE NOT EXISTS (
    SELECT 1 FROM warehouse_stock ws WHERE ws.warehouse_id = w.id AND ws.product_id = p.id
);
