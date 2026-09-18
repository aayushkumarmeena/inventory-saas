-- Audit trail: who created each sale/purchase/stock adjustment. Name is
-- snapshotted at creation time (same pattern as product_name on line
-- items) so history reads correctly even if the user is later deactivated
-- or renamed.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);

ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);

ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS cancelled_by_user_id BIGINT;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS cancelled_by_name VARCHAR(200);

-- Customers / suppliers as real entities. Sales/purchases keep their free
-- text name column as a fallback/snapshot for walk-in customers who were
-- never saved as a record, and gain an optional FK to a real one.
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    address VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    address VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);

-- Payments: sales can now be paid in installments. payment_status gains a
-- PARTIAL state, recalculated whenever a payment is recorded.
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check
    CHECK (payment_status IN ('PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'CANCELLED'));

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(30) NOT NULL DEFAULT 'CASH' CHECK (method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER')),
    notes VARCHAR(255),
    created_by_user_id BIGINT,
    created_by_name VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- Default existing sales to PENDING-derived status is unnecessary — existing
-- rows keep whatever status they already had (PAID by default from the
-- earlier module), which remains valid under the new check constraint.
