import { useState, useEffect } from 'react';
import api from '../services/api';

const Optimization = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOptimizationData = async () => {
      try {
        const res = await api.get('/analytics/optimization');
        setData(res.data.data);
      } catch (err) {
        console.error('Error fetching optimization data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOptimizationData();
  }, []);

  const winners = data.filter((product) => product.category === 'Winner');
  const underperformers = data.filter((product) => product.category === 'Underperformer');

  return (
    <>
      <section className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Decision support</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Profit guidance that feels operational, not academic.</h1>
            <p className="page-subtitle">This view ranks inventory by contribution quality so you can expand what is working and reduce capital locked in weak movers.</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '50vh' }}>Analyzing inventory economics...</div>
      ) : data.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '50vh' }}>
          <div className="empty-state-icon">AI</div>
          <div>Add products and generate a few bills first. Insights will appear once the system has behavior to compare.</div>
        </div>
      ) : (
        <>
          <section className="content-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">High-priority winners</div>
                  <div className="panel-copy">Products with healthier margin and selling rhythm that deserve more visibility and inventory confidence.</div>
                </div>
                <span className="badge badge-success">{winners.length} product{winners.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {winners.length > 0 ? winners.map((item) => (
                  <div key={item._id} className="list-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-faint)' }}>{item.salesFrequency} sold recently</div>
                    </div>
                    <span className="badge badge-success">{item.profitMargin.toFixed(0)}% margin</span>
                  </div>
                )) : (
                  <div className="empty-state" style={{ minHeight: 220 }}>
                    <div className="empty-state-icon">Up</div>
                    <div>No clear winners identified yet.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Underperformers</div>
                  <div className="panel-copy">Products consuming shelf space or cash without strong enough return.</div>
                </div>
                <span className="badge badge-warning">{underperformers.length} review</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {underperformers.length > 0 ? underperformers.map((item) => (
                  <div key={item._id} className="list-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-faint)' }}>{item.salesFrequency} sold recently</div>
                    </div>
                    <span className="badge badge-danger">{item.profitMargin.toFixed(0)}% margin</span>
                  </div>
                )) : (
                  <div className="empty-state" style={{ minHeight: 220 }}>
                    <div className="empty-state-icon">OK</div>
                    <div>No underperformers detected right now.</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel data-card">
            <div className="panel-header">
              <div>
                <div className="panel-title">Priority ranking</div>
                <div className="panel-copy">A detailed view of score, margin, sales frequency, and suggested action.</div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product</th>
                    <th>Profit margin</th>
                    <th>Sales frequency</th>
                    <th>Greedy score</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>#{index + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td style={{ color: '#f5d6a4' }}>{item.profitMargin.toFixed(1)}%</td>
                      <td>{item.salesFrequency} sold</td>
                      <td>
                        <div style={{ width: '100%', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(item.greedyScore * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #cf8b2d, #20b29a)' }} />
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          item.category === 'Winner'
                            ? 'badge-success'
                            : item.category === 'Underperformer'
                              ? 'badge-danger'
                              : 'badge-warning'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default Optimization;
