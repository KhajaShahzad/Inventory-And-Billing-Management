import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';

const ShopLogo = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="18" fill="url(#logoGradReg)" />
    <rect x="12" y="28" width="40" height="24" rx="3" fill="white" fillOpacity="0.15" />
    <rect x="14" y="30" width="36" height="20" rx="2" fill="white" fillOpacity="0.1" />
    <rect x="26" y="38" width="12" height="12" rx="2" fill="white" fillOpacity="0.4" />
    <rect x="15" y="33" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
    <rect x="41" y="33" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
    <path d="M9 28 L32 14 L55 28 Z" fill="white" fillOpacity="0.22" />
    <rect x="18" y="24" width="28" height="6" rx="1.5" fill="white" fillOpacity="0.35" />
    <rect x="18" y="54" width="2" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="22" y="54" width="1" height="5" rx="0.5" fill="white" fillOpacity="0.6" />
    <rect x="25" y="54" width="3" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="30" y="54" width="1" height="5" rx="0.5" fill="white" fillOpacity="0.6" />
    <rect x="33" y="54" width="2" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="37" y="54" width="3" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <rect x="42" y="54" width="1" height="5" rx="0.5" fill="white" fillOpacity="0.6" />
    <rect x="45" y="54" width="2" height="5" rx="1" fill="white" fillOpacity="0.6" />
    <defs>
      <linearGradient id="logoGradReg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
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

const StrengthBar = ({ strength }) => (
  <div className="strength-track">
    {[1, 2, 3, 4].map((s) => (
      <div
        key={s}
        className={`strength-seg ${
          strength >= s
            ? s <= 1 ? 'seg-weak' : s <= 2 ? 'seg-fair' : 'seg-strong'
            : ''
        }`}
      />
    ))}
  </div>
);

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const passwordState = useMemo(() => {
    if (!password) return { label: '', strength: 0 };
    if (password.length < 6) return { label: 'Too short', strength: 1 };
    if (password.length < 9) return { label: 'Fair', strength: 2 };
    if (password.length < 12) return { label: 'Good', strength: 3 };
    return { label: 'Strong', strength: 4 };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.success) {
        navigate('/billing');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-root">
      <div className="portal-card portal-card--wide fade-up">

        {/* Logo + Brand */}
        <div className="portal-brand">
          <ShopLogo />
          <h1 className="portal-title">StockBill IMS</h1>
          <p className="portal-subtitle">Inventory &amp; Billing Management System</p>
        </div>

        {/* Staff badge */}
        <div className="portal-role-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Staff Account Registration
        </div>

        <div className="portal-hint" style={{ marginTop: 0 }}>
          New accounts are created as Staff. Admins can promote staff members from the Team Access panel.
        </div>

        {/* Error */}
        {error && <div className="error-banner" role="alert">{error}</div>}

        {/* Form */}
        <form className="portal-form" onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              className="input-field"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className="input-field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@yourstore.com"
            />
          </div>

          <div className="field-grid">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="reg-password">Password</label>
              <div className="password-wrap">
                <input
                  id="reg-password"
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="password-wrap">
                <input
                  id="reg-confirm"
                  className="input-field"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>
          </div>

          {password && (
            <div className="strength-row">
              <StrengthBar strength={passwordState.strength} />
              <span className={`strength-label strength-${passwordState.strength <= 1 ? 'weak' : passwordState.strength <= 2 ? 'fair' : 'strong'}`}>
                {passwordState.label}
              </span>
            </div>
          )}

          <button
            id="register-submit"
            className="btn-portal-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? <span className="btn-spinner" /> : null}
            {loading ? 'Creating account…' : 'Create Staff Account'}
          </button>
        </form>

        <div className="portal-footer">
          Already have an account?{' '}<Link to="/login">Sign in</Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
