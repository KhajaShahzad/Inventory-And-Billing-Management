import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const toCsv = (rows) => rows
  .map((row) => row.map((value) => {
    const safeValue = String(value ?? '');
    if (safeValue.includes(',') || safeValue.includes('"') || safeValue.includes('\n')) {
      return `"${safeValue.replace(/"/g, '""')}"`;
    }
    return safeValue;
  }).join(','))
  .join('\n');

const downloadCsv = (filename, rows) => {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getTodayValue = () => new Date().toISOString().slice(0, 10);

const Reports = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(getTodayValue());
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runReportFetch = async (fromValue = fromDate, toValue = toDate) => {
    setLoading(true);
    try {
      const params = {};
      if (fromValue) params.from = fromValue;
      if (toValue) params.to = toValue;

      const [salesRes, expensesRes] = await Promise.all([
        api.get('/bills', { params }),
        api.get('/expenses', { params }),
      ]);

      setSales(salesRes.data.data || []);
      setExpenses(expensesRes.data.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch reports', err);
      setError(err.response?.data?.error || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReportFetch();
    // Initial load only. Later refreshes come from the explicit action button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSales = useMemo(
    () => sales.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0),
    [sales],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses],
  );

  const exportSales = () => {
    const rows = [
      ['Bill Date', 'Customer', 'Phone', 'Payment Method', 'Items', 'Total Amount'],
      ...sales.map((bill) => [
        new Date(bill.createdAt).toLocaleString('en-IN'),
        bill.customerName || 'Walk-in Customer',
        bill.customerPhone || 'Not provided',
        bill.paymentMethod,
        bill.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        Number(bill.totalAmount || 0).toFixed(2),
      ]),
      [],
      ['Summary', '', '', '', 'Bills', sales.length],
      ['Summary', '', '', '', 'Sales Total', Number(totalSales).toFixed(2)],
    ];

    downloadCsv('smartpos-sales-report.csv', rows);
  };

  const exportExpenses = () => {
    const rows = [
      ['Expense Date', 'Title', 'Category', 'Amount'],
      ...expenses.map((expense) => [
        new Date(expense.date).toLocaleDateString('en-IN'),
        expense.title,
        expense.category,
        Number(expense.amount || 0).toFixed(2),
      ]),
      [],
      ['Summary', '', 'Entries', expenses.length],
      ['Summary', '', 'Expense Total', Number(totalExpenses).toFixed(2)],
    ];

    downloadCsv('smartpos-expense-report.csv', rows);
  };

  return (
    <>
      <section className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Reports</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Export admin reports without extra clutter.</h1>
            <p className="page-subtitle">Choose a date range, review totals, and export sales or expense reports as clean CSV files for audits, faculty demos, or sharing.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Report window</div>
            <div className="panel-copy">Keep the export focused. Pull only the period you actually want to review.</div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => runReportFetch()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>

        {error ? <div className="error-banner" style={{ marginBottom: 18 }}>{error}</div> : null}

        <div className="report-filter-grid">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="report-from">From date</label>
            <input id="report-from" className="input-field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="report-to">To date</label>
            <input id="report-to" className="input-field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-label">Sales total</div>
          <div className="metric-value">{formatCurrency(totalSales)}</div>
          <div className="metric-footnote">{sales.length} bill{sales.length === 1 ? '' : 's'} in the selected period</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Expense total</div>
          <div className="metric-value">{formatCurrency(totalExpenses)}</div>
          <div className="metric-footnote">{expenses.length} expense entr{expenses.length === 1 ? 'y' : 'ies'} in the selected period</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Operating spread</div>
          <div className="metric-value">{formatCurrency(totalSales - totalExpenses)}</div>
          <div className="metric-footnote">Simple sales minus expenses view for a quick admin snapshot</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Sales export</div>
              <div className="panel-copy">Includes bill date, customer details, payment method, item count, and total amount.</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={exportSales} disabled={loading || sales.length === 0}>
              Download Sales CSV
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sales found for this range.</td>
                  </tr>
                ) : sales.slice(0, 6).map((bill) => (
                  <tr key={bill._id}>
                    <td>{new Date(bill.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>{bill.customerName || 'Walk-in Customer'}</td>
                    <td>{bill.paymentMethod}</td>
                    <td>{formatCurrency(bill.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Expense export</div>
              <div className="panel-copy">Includes expense date, title, category, and amount for accounting or review.</div>
            </div>
            <button type="button" className="btn btn-accent" onClick={exportExpenses} disabled={loading || expenses.length === 0}>
              Download Expense CSV
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses found for this range.</td>
                  </tr>
                ) : expenses.slice(0, 6).map((expense) => (
                  <tr key={expense._id}>
                    <td>{new Date(expense.date).toLocaleDateString('en-IN')}</td>
                    <td>{expense.title}</td>
                    <td>{expense.category}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

export default Reports;
