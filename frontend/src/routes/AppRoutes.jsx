import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const Products = lazy(() => import('../pages/products/Products'));
const Sales = lazy(() => import('../pages/sales/Sales'));
const Purchases = lazy(() => import('../pages/purchases/Purchases'));
const Inventory = lazy(() => import('../pages/inventory/Inventory'));
const Analytics = lazy(() => import('../pages/analytics/Analytics'));
const Settings = lazy(() => import('../pages/settings/Settings'));
const Customers = lazy(() => import('../pages/customers/Customers'));
const Suppliers = lazy(() => import('../pages/suppliers/Suppliers'));
const Team = lazy(() => import('../pages/team/Team'));
const Activity = lazy(() => import('../pages/activity/Activity'));
const PrintLabels = lazy(() => import('../pages/labels/PrintLabels'));
const AiInsights = lazy(() => import('../pages/ai/AiInsights'));
const GstRoutes = lazy(() => import('./GstRoutes'));
const NotFound = lazy(() => import('../pages/notfound/NotFound'));

const Priv = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Render NotFound in place rather than redirecting away — the URL the
  // person tried to visit stays visible, and "may not have access" covers
  // both a real permissions gap and a stale/mistyped link without leaking
  // which one it is.
  if (roles && !roles.includes(user.role)) return <NotFound />;
  return children;
};

const Pub = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
};

function RouteFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3, borderTopColor: 'var(--brand)', borderColor: 'var(--border)' }} />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Pub><Login /></Pub>} />
          <Route path="/register" element={<Pub><Register /></Pub>} />
          <Route path="/" element={<Priv><DashboardLayout /></Priv>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="sales" element={<Sales />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="team" element={<Team />} />
            <Route path="activity" element={<Activity />} />
            <Route path="labels" element={<PrintLabels />} />
            <Route path="ai-insights" element={<AiInsights />} />
            <Route path="gst/*" element={<Priv roles={['ADMIN', 'MANAGER']}><GstRoutes /></Priv>} />
            {/* Unmatched path but logged in: show NotFound inside the dashboard
                chrome (sidebar/nav) rather than the bare top-level version below. */}
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Unmatched path and not logged in (or not yet authenticated-checked):
              bare NotFound, since there's no layout to render it inside. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
