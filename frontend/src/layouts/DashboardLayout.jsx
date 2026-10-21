import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { productApi } from '../api/productApi';
import CommandPalette from '../components/CommandPalette';
import NotificationPopover from '../components/NotificationPopover';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import AIAssistantDrawer from '../components/AIAssistantDrawer';

const NAV = [
  { path: '/', label: 'Dashboard', icon: 'ti-layout-dashboard', exact: true },
  { path: '/ai-insights', label: 'AI Intelligence', icon: 'ti-sparkles', badgeText: 'AI' },
  { path: '/products', label: 'Products', icon: 'ti-package' },
  { path: '/sales', label: 'Sales', icon: 'ti-receipt' },
  { path: '/purchases', label: 'Purchases', icon: 'ti-truck-delivery' },
  { path: '/inventory', label: 'Stock', icon: 'ti-arrows-exchange', badgeKey: 'lowStock' },
  { path: '/customers', label: 'Customers', icon: 'ti-users' },
  { path: '/suppliers', label: 'Suppliers', icon: 'ti-building-warehouse' },
  { path: '/analytics', label: 'Analytics', icon: 'ti-chart-bar' },
  { path: '/labels', label: 'Print Labels', icon: 'ti-qrcode' },
  { path: '/team', label: 'Team', icon: 'ti-users-group' },
  { path: '/activity', label: 'Activity', icon: 'ti-history' },
];

const GST = [
  { path: '/gst', label: 'GST Overview', icon: 'ti-layout-dashboard', exact: true },
  { path: '/gst/invoices', label: 'Invoices', icon: 'ti-file-invoice' },
  { path: '/gst/gstr1', label: 'GSTR-1', icon: 'ti-report' },
  { path: '/gst/reports', label: 'Reports', icon: 'ti-chart-area' },
  { path: '/gst/returns', label: 'Return Periods', icon: 'ti-calendar' },
  { path: '/gst/hsn-sac', label: 'HSN / SAC', icon: 'ti-list' },
  { path: '/gst/calculator', label: 'Tax Calc', icon: 'ti-calculator' },
  { path: '/gst/config', label: 'GST Setup', icon: 'ti-settings-2' },
];

function NavItem({ path, label, icon, exact, badgeCount, badgeText }) {
  return (
    <NavLink
      key={path}
      to={path}
      end={exact}
      className="nav-item"
      style={({ isActive }) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 9,
        padding: '9px 14px',
        margin: '0 8px',
        borderRadius: 9,
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        textDecoration: 'none',
        color: isActive ? '#fff' : '#94a3b8',
        background: isActive ? 'rgba(99,102,241,0.22)' : 'transparent',
        transition: 'background .15s, color .15s',
      })}
    >
      {({ isActive }) => (
        <>
          <span className="nav-item-active-bar" style={{ top: 6, bottom: 6, opacity: isActive ? 1 : 0 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <i className={`ti ${icon}`} style={{ fontSize: 15, flexShrink: 0 }} />
            {label}
          </span>
          {badgeText && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 100,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              }}
            >
              {badgeText}
            </span>
          )}
          {badgeCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 100,
                background: 'rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              {badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function Breadcrumbs() {
  const loc = useLocation();
  const pathnames = loc.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  const routeNames = {
    products: 'Products',
    sales: 'Sales',
    purchases: 'Purchases',
    inventory: 'Stock',
    customers: 'Customers',
    suppliers: 'Suppliers',
    analytics: 'Analytics',
    labels: 'Print Labels',
    team: 'Team',
    activity: 'Activity',
    'ai-insights': 'AI Intelligence',
    settings: 'Settings',
    gst: 'GST Module',
    invoices: 'Invoices',
    gstr1: 'GSTR-1',
    reports: 'Reports',
    returns: 'Return Periods',
    'hsn-sac': 'HSN / SAC',
    calculator: 'Tax Calculator',
    config: 'Setup',
    new: 'New',
  };

  return (
    <div className="breadcrumbs" style={{ padding: '16px 32px 0' }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="ti ti-home" style={{ fontSize: 13 }} />
        <span>Home</span>
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[value] || value;

        return (
          <React.Fragment key={to}>
            <i className="ti ti-chevron-right" style={{ fontSize: 10, opacity: 0.5 }} />
            {isLast ? (
              <span className="breadcrumbs-current">{displayName}</span>
            ) : (
              <Link to={to}>{displayName}</Link>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const nav = useNavigate();
  const [gstOpen, setGstOpen] = useState(loc.pathname.startsWith('/gst'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const { isOnline, pendingCount, isSyncing, lastSyncedAt, syncNow } = useOfflineStatus();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else {
      alert('To install InventoryPro: on Chrome/Edge click the Install icon in the address bar, or on Safari tap Share -> Add to Home Screen.');
    }
  };

  useEffect(() => {
    productApi
      .lowStock()
      .then((r) => setLowStockCount((r.data.data || []).length))
      .catch(() => {});
  }, [loc.pathname]);

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: 'var(--shell-bg)' }}>
      {/* Ambient background aura */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div
          className="ambient-blob"
          style={{ width: 460, height: 460, top: -140, left: -100, background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', animation: 'ambient-drift-1 26s ease-in-out infinite' }}
        />
        <div
          className="ambient-blob"
          style={{ width: 420, height: 420, bottom: -140, right: -100, background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)', animation: 'ambient-drift-2 30s ease-in-out infinite' }}
        />
        <div
          className="ambient-blob"
          style={{ width: 340, height: 340, top: '45%', left: '55%', background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', animation: 'ambient-drift-1 34s ease-in-out infinite' }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100%' }}>
        <div className={`app-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
        <aside
          className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: 228,
            background: 'var(--sidebar-glass)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid var(--sidebar-border)',
          }}
        >
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--sidebar-border)' }}>
            <div
              className="float-slow"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(140deg, #6366f1, #22d3ee)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              <i className="ti ti-building-store" style={{ color: '#fff', fontSize: 17 }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>InventoryPro</div>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>GST-Ready SaaS</div>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }} onClick={closeSidebar}>
            {NAV.map((n) => (
              <NavItem
                key={n.path}
                {...n}
                badgeCount={n.badgeKey === 'lowStock' ? lowStockCount : 0}
              />
            ))}

            <div style={{ margin: '14px 16px 6px', borderTop: '1px solid var(--sidebar-border)' }} />

            <button
              onClick={(e) => { e.stopPropagation(); setGstOpen((o) => !o); }}
              style={{
                width: 'calc(100% - 16px)',
                margin: '6px 8px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                borderRadius: 8,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="ti ti-receipt-tax" style={{ fontSize: 14, color: '#818cf8' }} />
                GST Invoicing
              </span>
              <i className={`ti ${gstOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />
            </button>
            {gstOpen && GST.map((n) => <NavItem key={n.path} {...n} />)}
          </nav>

          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--sidebar-border)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                marginBottom: 10,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onClick={() => { nav('/settings'); closeSidebar(); }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(140deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b' }}>{user?.role}</div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 12, color: '#64748b' }} />
            </div>
            <button onClick={logout} className="btn btn-sm" style={{ width: '100%', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', justifyContent: 'center' }}>
              <i className="ti ti-logout" style={{ fontSize: 13 }} />
              Log out
            </button>
          </div>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header
            style={{
              height: 56,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px 0 14px',
              borderBottom: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <button className="btn btn-ghost btn-icon app-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <i className="ti ti-menu-2" style={{ fontSize: 18 }} />
              </button>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {user?.tenantName && (
                  <span className="badge badge-neutral" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <i className="ti ti-building-store" style={{ marginRight: 5, color: 'var(--brand)' }} />
                    {user.tenantName}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleInstallApp}
                className="btn btn-secondary btn-sm"
                aria-label="Install App"
                style={{
                  gap: 6,
                  color: 'var(--brand)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.08)',
                }}
                title="Install InventoryPro as a standalone desktop or mobile application"
              >
                <i className="ti ti-device-mobile-down" style={{ fontSize: 14 }} />
                <span className="cmdk-label" style={{ fontWeight: 600 }}>Install App</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                className="btn btn-secondary btn-sm"
                aria-label="Search"
                style={{ gap: 8, color: 'var(--text-secondary)' }}
              >
                <i className="ti ti-search" style={{ fontSize: 14 }} />
                <span className="cmdk-label">Search</span>
                <kbd style={{ fontSize: 10, background: 'var(--glass-bg-strong)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--glass-border)' }}>⌘K</kbd>
              </button>

              {/* Wi-Fi / Online status chip */}
              <button
                className="btn btn-ghost btn-icon"
                title={isOnline ? (pendingCount > 0 ? `${pendingCount} sale(s) pending sync` : 'Online') : 'Offline — sales are being queued'}
                onClick={isOnline && pendingCount > 0 ? syncNow : undefined}
                style={{ position: 'relative', cursor: isOnline && pendingCount > 0 ? 'pointer' : 'default' }}
                aria-label="Network status"
              >
                <i
                  className={`ti ${!isOnline ? 'ti-wifi-off' : isSyncing ? 'ti-refresh' : 'ti-wifi'}`}
                  style={{
                    fontSize: 16,
                    color: !isOnline ? '#f59e0b' : isSyncing ? '#6366f1' : '#10b981',
                    animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                {pendingCount > 0 && (
                  <span className="notification-dot" style={{ background: '#f59e0b' }}>{pendingCount}</span>
                )}
              </button>

              {/* Notification bell & popover */}
              <div style={{ position: 'relative' }}>
                <button
                  data-notification-trigger="true"
                  className="btn btn-ghost btn-icon"
                  style={{
                    position: 'relative',
                    background: notifOpen ? 'var(--surface-3)' : undefined,
                    color: notifOpen ? 'var(--brand)' : undefined,
                  }}
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  title={lowStockCount > 0 ? `${lowStockCount} new alerts` : 'Notifications'}
                >
                  <i className={`ti ${notifOpen ? 'ti-bell-ringing' : 'ti-bell'}`} style={{ fontSize: 16 }} />
                  {lowStockCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        border: '2px solid var(--surface-1)',
                        lineHeight: 1,
                      }}
                    >
                      {lowStockCount}
                    </span>
                  )}
                </button>
                <NotificationPopover isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
              </div>

              <button
                onClick={toggle}
                className="btn btn-ghost btn-icon"
                aria-label="Toggle dark mode"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 16 }} />
              </button>

              <button onClick={() => nav('/settings')} className="btn btn-ghost btn-icon" aria-label="Settings" title="Settings">
                <i className="ti ti-settings" style={{ fontSize: 16 }} />
              </button>
            </div>
          </header>

          {/* Offline / Syncing Banner */}
          {(!isOnline || pendingCount > 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '7px 20px',
              background: !isOnline
                ? 'linear-gradient(90deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.08) 100%)'
                : 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.05) 100%)',
              borderBottom: `1px solid ${!isOnline ? 'rgba(234,179,8,0.3)' : 'rgba(99,102,241,0.2)'}`,
              fontSize: 12,
              flexWrap: 'wrap',
              zIndex: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i
                  className={`ti ${!isOnline ? 'ti-wifi-off' : isSyncing ? 'ti-refresh' : 'ti-cloud-upload'}`}
                  style={{
                    fontSize: 15,
                    color: !isOnline ? '#ca8a04' : '#6366f1',
                    animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                <span style={{ fontWeight: 600, color: !isOnline ? '#92400e' : '#4338ca' }}>
                  {!isOnline
                    ? '📴 You are offline — POS counter is running in offline mode'
                    : isSyncing
                    ? `⚡ Syncing ${pendingCount} queued sale${pendingCount > 1 ? 's' : ''} to server…`
                    : `☁️ ${pendingCount} sale${pendingCount > 1 ? 's' : ''} pending sync`}
                </span>
                {pendingCount > 0 && (
                  <span style={{
                    background: !isOnline ? '#fde68a' : 'rgba(99,102,241,0.15)',
                    color: !isOnline ? '#92400e' : '#4338ca',
                    borderRadius: 20,
                    padding: '1px 8px',
                    fontWeight: 700,
                    fontSize: 11,
                  }}>
                    {pendingCount} queued
                  </span>
                )}
              </div>
              {isOnline && pendingCount > 0 && !isSyncing && (
                <button
                  onClick={syncNow}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    color: '#4338ca',
                    border: '1px solid rgba(99,102,241,0.3)',
                    fontWeight: 600,
                    fontSize: 11,
                    padding: '3px 10px',
                  }}
                >
                  <i className="ti ti-refresh" style={{ fontSize: 12 }} /> Sync Now
                </button>
              )}
              {lastSyncedAt && pendingCount === 0 && isOnline && (
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          <main style={{ flex: 1, overflowY: 'auto', background: 'transparent', position: 'relative' }}>
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation dock for phones */}
      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
      >
        {[
          { path: '/', label: 'Home', icon: 'ti-layout-dashboard', exact: true },
          { path: '/products', label: 'Products', icon: 'ti-package' },
          { path: '/sales', label: 'Sales', icon: 'ti-receipt' },
          { path: '/inventory', label: 'Stock', icon: 'ti-arrows-exchange' },
          { path: '/settings', label: 'Settings', icon: 'ti-settings' },
        ].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className="mobile-bottom-nav-item"
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              flex: 1,
              padding: '8px 0 calc(8px + env(safe-area-inset-bottom, 0px))',
              textDecoration: 'none',
              color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: isActive ? 600 : 400,
              transition: 'color 0.15s ease',
              border: 'none',
              background: 'none',
            })}
            onClick={closeSidebar}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <CommandPalette />
      <AIAssistantDrawer isOpen={aiOpen} onClose={() => setAiOpen(false)} onOpen={() => setAiOpen(true)} />
    </div>
  );
}