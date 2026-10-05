-- V11: Batch & Expiry Date Tracking (FEFO / FIFO)

-- 1. Product Batches Table
CREATE TABLE IF NOT EXISTS product_batches (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    mfg_date DATE,
    expiry_date DATE NOT NULL,
    initial_quantity INT NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 0,
    purchase_price NUMERIC(14,2),
    selling_price NUMERIC(14,2),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'DEPLETED'
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_batch UNIQUE (tenant_id, product_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_batches_tenant ON product_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON product_batches(tenant_id, status);

-- 2. Add batch tracking toggle to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_batch_tracking BOOLEAN NOT NULL DEFAULT false;

-- 3. Add batch tracking references to sale_items
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_id BIGINT REFERENCES product_batches(id) ON DELETE SET NULL;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 4. Add batch tracking details to purchase_items
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS mfg_date DATE;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
