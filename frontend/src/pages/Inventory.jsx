import { useState, useEffect } from 'react';
import api from '../services/api';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ _id: '', name: '', barcode: '', price: '', costPrice: '', quantity: '', minStockThreshold: 10 });

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openModal = (product = null) => {
    setEditMode(Boolean(product));
    setFormData(product || { _id: '', name: '', barcode: '', price: '', costPrice: '', quantity: '', minStockThreshold: 10 });
    setShowModal(true);
  };

  const generateBarcode = () => {
    const nextBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setFormData((prev) => ({ ...prev, barcode: nextBarcode }));
  };

  const buildProductPayload = () => ({
    name: formData.name.trim(),
    barcode: formData.barcode.trim(),
    price: Number(formData.price),
    costPrice: formData.costPrice === '' ? 0 : Number(formData.costPrice),
    quantity: Number(formData.quantity),
    minStockThreshold: formData.minStockThreshold === '' ? 0 : Number(formData.minStockThreshold),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = buildProductPayload();
      if (editMode) {
        await api.put(`/products/${formData._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting product');
    }
  };

  const filteredProducts = products.filter((product) => (
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  ));

  const inStock = products.filter((product) => product.quantity > product.minStockThreshold).length;
  const lowStock = products.filter((product) => product.quantity <= product.minStockThreshold).length;

  return (
    <>
      <section className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Stock discipline</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Inventory that reads clearly at a glance.</h1>
            <p className="page-subtitle">Pricing, stock pressure, and product maintenance live in one calmer operational table so the team can act without visual noise.</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            Add product
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="metric-card">
          <div className="metric-label">Tracked products</div>
          <div className="metric-value">{products.length}</div>
          <div className="metric-footnote">Total live items in the catalog.</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Healthy stock</div>
          <div className="metric-value">{inStock}</div>
          <div className="metric-footnote">Items currently above their reorder threshold.</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Low stock</div>
          <div className="metric-value">{lowStock}</div>
          <div className="metric-footnote">Products needing replenishment attention.</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Catalog readiness</div>
          <div className="metric-value">{products.length ? `${Math.round((inStock / products.length) * 100)}%` : '0%'}</div>
          <div className="metric-footnote">Share of items currently in a healthy band.</div>
        </div>
      </section>

      <section className="panel data-card">
        <div className="toolbar" style={{ marginBottom: 18 }}>
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="search-input"
              placeholder="Search by product name or barcode"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="badge badge-success">{inStock} stable</span>
            <span className="badge badge-warning">{lowStock} under threshold</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 18px' }}>
                    <div className="empty-state" style={{ minHeight: 0 }}>
                      <div className="empty-state-icon">Bx</div>
                      <div>No products matched that search.</div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</div>
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                      Cost Rs {Number(product.costPrice || 0).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <code style={{ color: 'var(--text-secondary)' }}>{product.barcode}</code>
                  </td>
                  <td style={{ color: '#f7d3a2', fontWeight: 700 }}>Rs {Number(product.price).toFixed(2)}</td>
                  <td>
                    <div style={{ fontWeight: 800, color: product.quantity <= product.minStockThreshold ? '#ffb7b7' : 'var(--text-primary)' }}>{product.quantity}</div>
                    <div style={{ marginTop: 4, fontSize: '0.76rem', color: 'var(--text-faint)' }}>threshold {product.minStockThreshold}</div>
                  </td>
                  <td>
                    {product.quantity <= product.minStockThreshold ? (
                      <span className="badge badge-warning">Reorder</span>
                    ) : (
                      <span className="badge badge-success">Healthy</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button className="btn-icon" title="Edit product" onClick={() => openModal(product)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn-icon danger" title="Delete product" onClick={() => handleDelete(product._id)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="panel-header" style={{ marginBottom: 22 }}>
              <div>
                <div className="panel-title">{editMode ? 'Update product' : 'Create product'}</div>
                <div className="panel-copy">{editMode ? 'Adjust pricing or stock details without leaving the table.' : 'Add a clean catalog entry with barcode, pricing, and threshold data.'}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Product name</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Cold brew bottle 250ml"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Barcode</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="12-digit code"
                    value={formData.barcode}
                    onChange={(event) => setFormData({ ...formData, barcode: event.target.value })}
                  />
                  <button type="button" className="btn btn-ghost" onClick={generateBarcode}>Generate</button>
                </div>
              </div>

              <div className="field-grid">
                <div className="input-group">
                  <label className="input-label">Cost price</label>
                  <input type="number" className="input-field" min="0" step="0.01" value={formData.costPrice} onChange={(event) => setFormData({ ...formData, costPrice: event.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Selling price</label>
                  <input type="number" className="input-field" required min="0" step="0.01" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} />
                </div>
              </div>

              <div className="field-grid">
                <div className="input-group">
                  <label className="input-label">Quantity</label>
                  <input type="number" className="input-field" required min="0" value={formData.quantity} onChange={(event) => setFormData({ ...formData, quantity: event.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Low stock threshold</label>
                  <input type="number" className="input-field" min="0" value={formData.minStockThreshold} onChange={(event) => setFormData({ ...formData, minStockThreshold: event.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Save changes' : 'Add product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Inventory;
