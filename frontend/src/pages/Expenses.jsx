import { useState, useEffect } from 'react';
import api from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORIES = ['Utilities', 'Salary', 'Restock', 'Marketing', 'Other'];
const COLORS = { Utilities: '#cf8b2d', Salary: '#20b29a', Restock: '#f5b74f', Marketing: '#e86b6b', Other: '#6e819a' };

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Other' });

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data.data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/expenses', formData);
      setShowModal(false);
      setFormData({ title: '', amount: '', category: 'Other' });
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) {
      return;
    }

    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting expense');
    }
  };

  const chartData = Object.entries(
    expenses.reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + item.amount }), {})
  ).map(([name, value]) => ({ name, value }));

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const largestCategory = chartData.length ? [...chartData].sort((a, b) => b.value - a.value)[0]?.name : 'None';

  return (
    <>
      <section className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Cost visibility</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Expenses that feel accounted for, not buried.</h1>
            <p className="page-subtitle">Keep category trends visible, record new spend quickly, and avoid margin leakage hiding behind a messy ledger.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Record expense</button>
        </div>
      </section>

      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-label">Total expenses</div>
          <div className="metric-value">Rs {totalExpenses.toLocaleString()}</div>
          <div className="metric-footnote">{expenses.length} entries recorded in the ledger.</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Largest category</div>
          <div className="metric-value">{largestCategory}</div>
          <div className="metric-footnote">Current biggest drain on operating margin.</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average entry</div>
          <div className="metric-value">Rs {expenses.length ? (totalExpenses / expenses.length).toFixed(0) : 0}</div>
          <div className="metric-footnote">Average recorded cost per expense entry.</div>
        </div>
      </section>

      <section className="expenses-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Expense mix</div>
              <div className="panel-copy">Category concentration gives you a fast read on what is driving cost pressure.</div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <div className="empty-state-icon">Ex</div>
              <div>No expenses logged yet.</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value">
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name] || '#6e819a'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(13, 17, 23, 0.96)',
                      border: '1px solid rgba(176, 191, 209, 0.12)',
                      borderRadius: '16px',
                      color: '#f3f6fa',
                    }}
                    formatter={(value) => [`Rs ${value.toLocaleString()}`, 'Amount']}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                {chartData.map((entry) => (
                  <div key={entry.name} className="list-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[entry.name] || '#6e819a' }} />
                      <span>{entry.name}</span>
                    </div>
                    <strong>Rs {entry.value.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="panel data-card">
          <div className="panel-header">
            <div>
              <div className="panel-title">Ledger entries</div>
              <div className="panel-copy">Every recorded expense stays visible and easy to audit.</div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '42px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading expense ledger...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '42px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>No expenses recorded yet.</td></tr>
                ) : expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{expense.title}</td>
                    <td><span className="badge" style={{ background: `${COLORS[expense.category] || '#6e819a'}20`, color: COLORS[expense.category] || '#6e819a', borderColor: `${COLORS[expense.category] || '#6e819a'}40` }}>{expense.category}</span></td>
                    <td>{new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 700, color: '#f8c6c6' }}>Rs {expense.amount.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon danger" onClick={() => handleDelete(expense._id)}>x</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="panel-header" style={{ marginBottom: 22 }}>
              <div>
                <div className="panel-title">Record expense</div>
                <div className="panel-copy">Capture the cost once, categorize it cleanly, and keep the margin picture honest.</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input type="text" className="input-field" required placeholder="e.g. Monthly internet bill" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} />
              </div>

              <div className="field-grid">
                <div className="input-group">
                  <label className="input-label">Amount</label>
                  <input type="number" className="input-field" required min="0" step="0.01" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="select-field" value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })}>
                    {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Expenses;
