import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';

const ShopLogo = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="18" fill="url(#logoGrad)" />
    {/* Store front */}
    <rect x="12" y="28" width="40" height="24" rx="3" fill="white" fillOpacity="0.15" />
    <rect x="14" y="30" width="36" height="20" rx="2" fill="white" fillOpacity="0.1" />
    {/* Door */}
    <rect x="26" y="38" width="12" height="12" rx="2" fill="white" fillOpacity="0.4" />
    {/* Windows */}
    <rect x="15" y="33" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
    <rect x="41" y="33" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
    {/* Roof / Awning */}
    <path d="M9 28 L32 14 L55 28 Z" fill="white" fillOpacity="0.22" />
    {/* Sign bar */}
    <rect x="18" y="24" width="28" height="6" rx="1.5" fill="white" fillOpacity="0.35" />
    {/* Barcode lines at bottom */}
    <rect x="18" y="54" width="2" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="22" y="54" width="1" height="5" rx="0.5" fill="white" fillOpacity="0.6" />
    <rect x="25" y="54" width="3" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="30" y="54" width="1" height="5" rx="0.5" fill="white" fillOpacity="0.6" />
    <rect x="33" y="54" width="2" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="37" y="54" width="3" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="42" y="54" width="1" height="5" rx="0.5" fill="white" fillOpacity="0.6" />
    <rect x="45" y="54" width="2" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Login = () => {
  const [portal, setPortal] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handlePortalSwitch = (p) => {
    setPortal(p);
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, portal);
      if (result.success) {
        navigate(portal === 'admin' ? '/' : '/billing');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-root">
      <div className="portal-card fade-up">

        {/* Logo + Brand */}
        <div className="portal-brand">
          <ShopLogo />
          <h1 className="portal-title">StockBill IMS</h1>
          <p className="portal-subtitle">Inventory &amp; Billing Management System</p>
        </div>

        {/* Role Toggle */}
        <div className="portal-toggle" role="tablist">
          <button
            id="tab-admin"
            role="tab"
            aria-selected={portal === 'admin'}
            className={`portal-tab ${portal === 'admin' ? 'active' : ''}`}
            onClick={() => handlePortalSwitch('admin')}
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Admin Portal
          </button>
          <button
            id="tab-staff"
            role="tab"
            aria-selected={portal === 'staff'}
            className={`portal-tab ${portal === 'staff' ? 'active' : ''}`}
            onClick={() => handlePortalSwitch('staff')}
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Staff Portal
          </button>
        </div>

        {/* Context hint */}
        <div className="portal-hint">
          {portal === 'admin'
            ? 'Full access: dashboard, inventory, billing, expenses & reports.'
            : 'Billing counter access for checkout and scanning.'}
        </div>

        {/* Error */}
        {error && <div className="error-banner" role="alert">{error}</div>}

        {/* Form */}
        <form className="portal-form" onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input-field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={portal === 'admin' ? 'admin@yourstore.com' : 'staff@yourstore.com'}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label className="input-label" htmlFor="login-password">Password</label>
            <div className="password-wrap">
              <input
                id="login-password"
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ paddingRight: 46 }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            className="btn-portal-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner" />
            ) : null}
            {loading ? 'Signing in…' : `Sign in as ${portal === 'admin' ? 'Admin' : 'Staff'}`}
          </button>
        </form>

        {/* Footer */}
        <div className="portal-footer">
          {portal === 'staff' ? (
            <>Don't have an account?{' '}<Link to="/register">Sign up</Link></>
          ) : (
            <span style={{ color: 'var(--text-faint)', fontSize: '0.82rem' }}>
              Staff login?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, fontWeight: 700, fontSize: '0.82rem' }}
                onClick={() => handlePortalSwitch('staff')}
              >
                Switch to Staff Portal
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
