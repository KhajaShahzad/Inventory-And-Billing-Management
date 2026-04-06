import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';

const featurePoints = [
  'Live stock visibility across billing, inventory, and spending.',
  'Phone-based scanner sessions that feed the desktop bill in real time.',
  'Cleaner operational reporting for margin, replenishment, and cost control.',
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
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
          <div className="eyebrow">Operations made calm</div>
          <h1>Run the counter, stockroom, and daily numbers from one place.</h1>
          <p>
            SmartPOS is designed for serious retail teams that want a modern billing flow,
            cleaner stock control, and a dashboard that helps them act quickly.
          </p>
        </div>

        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="panel-header">
            <div>
              <div className="panel-title">Why teams switch</div>
              <div className="panel-copy">The product now feels tighter, faster, and more dependable across desktop and phone.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {featurePoints.map((point) => (
              <div key={point} className="list-card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="metric-icon" style={{ width: 36, height: 36, borderRadius: 12, fontSize: '0.82rem' }}>OK</div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{point}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card fade-up">
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in</h2>
          <p>Access billing, inventory, expenses, and the live scanner workflow from your workspace.</p>

          {error ? <div className="error-banner">{error}</div> : null}

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input-field"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@smartpos.com"
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="input-field"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to SmartPOS'}
            </button>
          </form>

          <div className="auth-footer">
            Need an account? <Link to="/register">Create one</Link>
          </div>

          <div className="panel" style={{ marginTop: 22, padding: 18 }}>
            <div className="panel-title" style={{ fontSize: '0.92rem' }}>Demo access</div>
            <div className="panel-copy" style={{ marginTop: 8 }}>
              Use <code>admin@smartpos.com</code> with <code>password123</code> to explore the dashboard.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
