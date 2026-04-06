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
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    name: 'Billing',
    path: '/billing',
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
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 19h16" />
        <path d="M7 15V9" />
        <path d="M12 15V5" />
        <path d="M17 15v-3" />
      </svg>
    ),
  },
];

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
  '/expenses': {
    title: 'Expense Ledger',
    subtitle: 'Capture costs, watch category mix, and keep margin leakage visible before it compounds.',
  },
  '/optimization': {
    title: 'Profit Insights',
    subtitle: 'See what drives contribution, what stalls, and where your next stock decisions should go.',
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
    if (location.pathname.startsWith('/inventory')) return PAGE_META['/inventory'];
    if (location.pathname.startsWith('/billing')) return PAGE_META['/billing'];
    if (location.pathname.startsWith('/expenses')) return PAGE_META['/expenses'];
    if (location.pathname.startsWith('/optimization')) return PAGE_META['/optimization'];
    return PAGE_META['/'];
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div className="brand-copy">
            <div className="brand-title">SmartPOS</div>
            <div className="brand-subtitle">Retail operations platform</div>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
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
              <div className="user-role">{user?.role || 'manager'}</div>
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
