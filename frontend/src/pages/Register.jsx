import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const passwordState = useMemo(() => {
    if (!password) {
      return { label: 'Set a secure password', tone: 'neutral', strength: 0 };
    }

    if (password.length < 6) {
      return { label: 'Password is too short', tone: 'negative', strength: 1 };
    }

    if (password.length < 9) {
      return { label: 'Password strength is fair', tone: 'neutral', strength: 2 };
    }

    if (password.length < 12) {
      return { label: 'Password strength is good', tone: 'positive', strength: 3 };
    }

    return { label: 'Password strength is strong', tone: 'positive', strength: 4 };
  }, [password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <div className="brand-block" style={{ padding: 0 }}>
          <div className="brand-mark">S</div>
          <div className="brand-copy">
            <div className="brand-title">SmartPOS</div>
            <div className="brand-subtitle">Retail operations system</div>
          </div>
        </div>

        <div className="auth-copy">
          <div className="eyebrow">Set the tone early</div>
          <h1>Start with a cleaner retail workspace from day one.</h1>
          <p>
            Create your team account and walk into a calmer control center for product intake,
            billing, scanner sessions, expense tracking, and restock awareness.
          </p>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="metric-card">
            <div className="metric-top">
              <div className="metric-icon">QR</div>
              <div className="metric-chip positive">Live</div>
            </div>
            <div className="metric-label">Phone scanner</div>
            <div className="metric-value">Real-time</div>
            <div className="metric-footnote">Phone scans join the active billing session and appear on desktop quickly.</div>
          </div>
          <div className="metric-card">
            <div className="metric-top">
              <div className="metric-icon">IN</div>
              <div className="metric-chip neutral">Control</div>
            </div>
            <div className="metric-label">Inventory clarity</div>
            <div className="metric-value">Better</div>
            <div className="metric-footnote">Product, stock, and low-quantity visibility sit in one consistent workspace.</div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card fade-up" style={{ width: 'min(100%, 460px)' }}>
          <div className="eyebrow">Create workspace</div>
          <h2>Open your account</h2>
          <p>Set up your manager profile and jump directly into the operational dashboard.</p>

          {error ? <div className="error-banner">{error}</div> : null}

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                className="input-field"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Khaja Manager"
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className="input-field"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="manager@yourstore.com"
              />
            </div>

            <div className="field-grid">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  className="input-field"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="register-confirm">Confirm password</label>
                <input
                  id="register-confirm"
                  className="input-field"
                  type="password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <div className={`badge ${passwordState.tone === 'positive' ? 'badge-success' : passwordState.tone === 'negative' ? 'badge-danger' : 'badge-warning'}`} style={{ width: 'fit-content' }}>
              {passwordState.label}
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create SmartPOS account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;
