import { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContextValue';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div style={{
      background: 'rgba(13, 17, 23, 0.96)',
      border: '1px solid rgba(176, 191, 209, 0.12)',
      borderRadius: 16,
      padding: '12px 14px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.28)',
    }}>
      <div style={{ color: 'var(--text-faint)', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, fontWeight: 700, fontSize: '0.88rem', marginTop: 4 }}>
          {entry.name}: Rs {Number(entry.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

const MetricCard = ({ label, value, note, tone, icon, chip }) => (
  <div className="metric-card">
    <div className="metric-top">
      <div className="metric-icon">{icon}</div>
      <div className={`metric-chip ${tone}`}>{chip}</div>
    </div>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
    <div className="metric-footnote">{note}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useContext(SocketContext);

  const fetchData = async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/chart'),
      ]);
      setStats(statsRes.data.data);
      setChartData(chartRes.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleInventoryUpdate = () => fetchData();
    socket.on('inventory_updated', handleInventoryUpdate);
    return () => socket.off('inventory_updated', handleInventoryUpdate);
  }, [socket]);

  if (loading) {
    return <div className="loading-screen" style={{ minHeight: '55vh' }}>Loading operational snapshot...</div>;
  }

  return (
    <>
      <section className="hero-card">
        <div className="eyebrow">Daily pulse</div>
        <div className="page-header" style={{ marginTop: 10 }}>
          <div>
            <h1 className="page-title">A clearer operating picture for the day ahead.</h1>
            <p className="page-subtitle">
              Revenue, margin, cash pressure, and replenishment risk are surfaced here first so the team knows what needs attention without hunting through screens.
            </p>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <MetricCard
          label="Revenue"
          value={`Rs ${stats?.totalRevenue?.toLocaleString() ?? 0}`}
          note="Gross billing collected this month."
          tone="positive"
          chip="On track"
          icon="Rs"
        />
        <MetricCard
          label="Net profit"
          value={`Rs ${stats?.profit?.toLocaleString() ?? 0}`}
          note="Margin remaining after recorded expense load."
          tone={stats?.profit >= 0 ? 'positive' : 'negative'}
          chip={stats?.profit >= 0 ? 'Healthy' : 'Watch'}
          icon="Pi"
        />
        <MetricCard
          label="Expense load"
          value={`Rs ${stats?.totalExpenses?.toLocaleString() ?? 0}`}
          note="Tracked operating spend this month."
          tone="negative"
          chip="Costs"
          icon="Ex"
        />
        <MetricCard
          label="Low stock items"
          value={`${stats?.lowStockItems ?? 0}`}
          note="Products already at or under their threshold."
          tone={stats?.lowStockItems ? 'neutral' : 'positive'}
          chip={stats?.lowStockItems ? 'Action needed' : 'Stable'}
          icon="St"
        />
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Revenue versus cost</div>
              <div className="panel-copy">Month-by-month trend so you can see where margin is being created and where it is being eroded.</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#cf8b2d" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#cf8b2d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashboardExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20b29a" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#20b29a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(176, 191, 209, 0.08)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8ea0b7', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8ea0b7', fontSize: 11 }} tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#cf8b2d" strokeWidth={2.5} fill="url(#dashboardRevenue)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#20b29a" strokeWidth={2.5} fill="url(#dashboardExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Stock pressure</div>
              <div className="panel-copy">The products most likely to interrupt billing if they are not restocked soon.</div>
            </div>
            <span className="badge badge-warning">{stats?.lowStockItems || 0} flagged</span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {!stats?.lowStockProducts?.length ? (
              <div className="empty-state" style={{ minHeight: 260 }}>
                <div className="empty-state-icon">OK</div>
                <div>Inventory is currently sitting above threshold across the board.</div>
              </div>
            ) : (
              stats.lowStockProducts.slice(0, 5).map((item) => (
                <div key={item._id} className="list-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-faint)' }}>{item.barcode}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ffd08f' }}>{item.quantity}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>units left</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Monthly profit line</div>
            <div className="panel-copy">A tighter view of contribution trend, useful for quickly spotting weak months and seasonal dips.</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="rgba(176, 191, 209, 0.08)" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8ea0b7', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8ea0b7', fontSize: 11 }} tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="profit" name="Profit" fill="#cf8b2d" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  );
};

export default Dashboard;
