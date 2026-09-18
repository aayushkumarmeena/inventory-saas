# InventoryPro SaaS (GST-Ready)

Enterprise multi-tenant inventory management and GST-compliant invoicing system with modern glassmorphism design. Built with Spring Boot 3.2 (Java 21), React 18, Vite, PostgreSQL, and Redis.

## Key Features

- 🏢 **Multi-Tenant Architecture**: Complete tenant isolation with JWT authentication and role-based access control (Admin, Manager, Cashier, Auditor).
- 📊 **Executive Dashboard**: Live 7-day revenue trend sparkline, top-selling products rank, low stock alert banners, and instant quick actions.
- 📦 **Products Catalog**: Dual Table and Card Grid views, search debouncing, category filtering, multi-criteria sorting, stock progress bars with reorder thresholds, and printable QR code labels.
- 💳 **Sales & Billing**: Record sales, POS billing, split payments (Cash, Card, UPI, Bank Transfer), printable thermal-style receipts, returns processing, and CSV export.
- 🚚 **Purchases & Procurement**: Create purchase orders with suppliers, track incoming shipments, and replenish stock on receipt.
- 📈 **Stock & Adjustments**: Manual stock adjustments (in/out), live QR barcode scanner support, and complete movement audit history.
- 👥 **Customer & Supplier Relations**: Dedicated client and vendor directories with slide-over detail drawers, lifetime spend tracking, and purchase order histories.
- 🏛️ **GST & Tax Compliance**: Full Indian GST module with HSN/SAC code catalog, CGST/SGST/IGST calculation, B2B/B2C tax invoices, and GSTR-1 export.
- ⚙️ **Workspace Settings**: Tabbed layout for account profile, visual light/dark aurora themes, and one-click data backups (CSV).
- 🔍 **Command Palette**: Universal keyboard shortcut (⌘K / Ctrl+K) for instant global search and navigation.

## Quick Start (Docker)

```bash
docker compose down -v
docker compose up --build
```

- **Frontend App**: http://localhost:3000
- **Backend REST API**: http://localhost:8080/api/v1
- **Health Check**: http://localhost:8080/actuator/health

### Demo Credentials

Seeded automatically by Flyway database migrations:
- **Email**: `admin@demo.com`
- **Password**: `Admin@123`

*(You can also register a new tenant workspace directly from the Register page).*

## Architecture

```
┌─────────────────────────────────┐
│       Frontend (Vite / React)   │
│       :3000                     │
└────────────────┬────────────────┘
                 │ REST / JWT
┌────────────────▼────────────────┐
│   Backend (Spring Boot 3.2)     │
│   :8080                         │
└───┬─────────────────────────┬───┘
    │                         │
┌───▼───────────┐         ┌───▼───────────┐
│  PostgreSQL   │         │     Redis     │
│  :5432        │         │     :6379     │
└───────────────┘         └───────────────┘
```

## Local Development (Without Docker)

### Backend (Java 21 + Maven):
```bash
cd backend
mvn spring-boot:run
```

### Frontend (Node.js):
```bash
cd frontend
npm install
npm run dev
```

## Rebuilding Services

```bash
docker compose up --build backend   # Backend only
docker compose up --build frontend  # Frontend only
```