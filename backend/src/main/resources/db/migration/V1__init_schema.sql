-- Base multi-tenant schema: tenants, users, products.
-- The GST module (V3/V4) is built on top of the tenants and products tables
-- created here, so this must run before them.

CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN','MANAGER','STAFF')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(14,2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_active ON products(tenant_id, is_active);

-- Seed a demo tenant + admin user so the app is usable immediately after
-- `docker compose up --build` without a manual registration step.
-- Login: admin@demo.com / Admin@123
INSERT INTO tenants (id, name) VALUES (1, 'Demo Company');
SELECT setval('tenants_id_seq', 1, true);

INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
VALUES (1, 'admin@demo.com', '$2b$10$gbjLwTIgB6Cjs6Ac3OJIA.pgh8hS3Wl3Ynij2OjuG1Ljz1qCVT.G2', 'Demo', 'Admin', 'ADMIN');

INSERT INTO products (tenant_id, sku, name, description, category, price, stock_quantity, reorder_level) VALUES
(1, 'SKU-1001', 'Wireless Mouse', 'Ergonomic wireless mouse', 'Electronics', 799.00, 50, 10),
(1, 'SKU-1002', 'Mechanical Keyboard', 'RGB mechanical keyboard', 'Electronics', 3499.00, 8, 10),
(1, 'SKU-1003', 'USB-C Cable 1m', 'Fast-charging USB-C cable', 'Accessories', 249.00, 200, 25);
