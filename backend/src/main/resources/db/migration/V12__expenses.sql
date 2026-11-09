CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    description VARCHAR(500),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'CASH',
    vendor VARCHAR(200),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by_user_id BIGINT,
    created_by_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
