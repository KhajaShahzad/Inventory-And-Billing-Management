import { useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';
import { SocketContext } from '../context/SocketContextValue';
import api from '../services/api';
import { getOfflineBills, clearOfflineBills } from '../services/offlineSync';

const NAV_ITEMS = [
  {
    name: 'Overview',
    path: '/',
    roles: ['admin'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    name: 'Inventory',
    path: '/inventory',
    roles: ['admin'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    name: 'Billing',
    path: '/billing',
    roles: ['admin', 'staff'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z" />
        <path d="M8 9h8M8 13h4" />
      </svg>
    ),
  },
  {
    name: 'Expenses',
    path: '/expenses',
    roles: ['admin'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: 'Insights',
    path: '/optimization',
    roles: ['admin'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 19h16" />
        <path d="M7 15V9" />
        <path d="M12 15V5" />
        <path d="M17 15v-3" />
      </svg>
    ),
  },
  {
    name: 'Reports',
    path: '/reports',
    roles: ['admin'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
  },
  {
    name: 'Team Access',
    path: '/team-access',
    roles: ['admin'],
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const SidebarLogo = () => (
  <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="16" fill="url(#sidebarLogoGrad)" />
    <rect x="12" y="28" width="40" height="24" rx="3" fill="white" fillOpacity="0.15" />
    <rect x="14" y="30" width="36" height="20" rx="2" fill="white" fillOpacity="0.1" />
    <rect x="26" y="38" width="12" height="12" rx="2" fill="white" fillOpacity="0.4" />
    <rect x="15" y="33" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
    <rect x="41" y="33" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
    <path d="M9 28 L32 14 L55 28 Z" fill="white" fillOpacity="0.22" />
    <rect x="18" y="24" width="28" height="6" rx="1.5" fill="white" fillOpacity="0.35" />
    <defs>
      <linearGradient id="sidebarLogoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
  </svg>
);

const PAGE_META = {
  '/': {
    title: 'Operational Overview',
    subtitle: 'Track revenue, pressure points, stock health, and billing activity from a single control surface.',
  },
  '/inventory': {
    title: 'Inventory Control',
    subtitle: 'Manage product records, pricing, and stock thresholds with cleaner operational visibility.',
  },
  '/billing': {
    title: 'Billing Console',
    subtitle: 'Run checkout faster with live phone scanning, manual entry, and a clearer payment workflow.',
  },
  '/staff-billing': {
    title: 'Billing Console',
    subtitle: 'Scan products, build bills, and complete checkout quickly from the counter.',
  },
  '/expenses': {
    title: 'Expense Ledger',
    subtitle: 'Capture costs, watch category mix, and keep margin leakage visible before it compounds.',
  },
  '/optimization': {
    title: 'Profit Insights',
    subtitle: 'See what drives contribution, what stalls, and where your next stock decisions should go.',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'Review date-filtered sales and expense activity, then export clean admin-ready report files.',
  },
  '/team-access': {
    title: 'Team Access',
    subtitle: 'Promote staff members, keep admin access controlled, and make roles explicit for the whole workspace.',
  },
};

const formatToday = () => new Date().toLocaleDateString('en-IN', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleLowStock = (data) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          msg: `${data.product.name} is now at ${data.product.quantity} unit(s). Replenishment is recommended.`,
        },
        ...prev,
      ]);
    };

    socket.on('low_stock_alert', handleLowStock);
    return () => socket.off('low_stock_alert', handleLowStock);
  }, [socket]);

  useEffect(() => {
    if (user?.role === 'staff' && location.pathname === '/') {
      navigate('/billing', { replace: true });
    }
  }, [location.pathname, navigate, user?.role]);

  useEffect(() => {
    const handleOnline = async () => {
      const bills = await getOfflineBills();
      if (!bills.length) {
        return;
      }

      let synced = 0;
      for (const bill of bills) {
        try {
          const { id, timestamp, ...payload } = bill;
          void id;
          void timestamp;
          await api.post('/bills', payload);
          synced += 1;
        } catch (err) {
          console.error('Failed to sync offline bill:', err);
        }
      }

      await clearOfflineBills();
      setNotifications((prev) => [
        {
          id: Date.now(),
          msg: `${synced} offline bill${synced === 1 ? '' : 's'} synced successfully once connection returned.`,
        },
        ...prev,
      ]);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const pageMeta = useMemo(() => {
    if (user?.role === 'staff') {
      return PAGE_META['/staff-billing'];
    }
    if (location.pathname.startsWith('/inventory')) return PAGE_META['/inventory'];
    if (location.pathname.startsWith('/billing')) return PAGE_META['/billing'];
    if (location.pathname.startsWith('/expenses')) return PAGE_META['/expenses'];
    if (location.pathname.startsWith('/optimization')) return PAGE_META['/optimization'];
    if (location.pathname.startsWith('/reports')) return PAGE_META['/reports'];
    if (location.pathname.startsWith('/team-access')) return PAGE_META['/team-access'];
    return PAGE_META['/'];
  }, [location.pathname, user?.role]);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(user?.role || 'staff')),
    [user?.role],
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <SidebarLogo />
          <div className="brand-copy">
            <div className="brand-title">StockBill IMS</div>
            <div className="brand-subtitle">Inventory &amp; Billing</div>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink key={item.path} to={item.path} className="nav-link">
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="user-card">
          <div className="user-meta">
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div>
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-role">{user?.role || 'staff'}</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{pageMeta.title}</div>
            <div className="topbar-meta">{pageMeta.subtitle}</div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-meta">{formatToday()}</div>
            <button className="btn-icon" onClick={() => setShowNotif((prev) => !prev)} title="Notifications">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <div className="user-avatar" style={{ width: 38, height: 38 }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>

            {showNotif && (
              <div className="notification-pop fade-in">
                <div className="panel-title" style={{ marginBottom: 12 }}>Notifications</div>
                {notifications.length === 0 ? (
                  <div className="notification-item">No new alerts right now.</div>
                ) : (
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <div key={item.id} className="notification-item">{item.msg}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="main-scroll">
          <div className="page-stack fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
