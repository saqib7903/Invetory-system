import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const formatCurrency = (price, currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      INR: '₹',
      GBP: '£',
      JPY: '¥',
      AUD: 'A$',
      CAD: 'C$'
    };
    const symbol = symbols[currency?.toUpperCase()] || currency || '$';
    if (symbol.length > 2) {
      return `${price.toFixed(2)} ${symbol}`;
    }
    return `${symbol}${price.toFixed(2)}`;
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      toast.error('Dashboard Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--color-primary)', fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
          Syncing Metrics...
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h3>Failed to load warehouse data</h3>
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overview of live warehouse, pipelines, and orders.</p>
        </div>
        <button className="btn-primary" onClick={fetchStats}>🔄 Refresh Metrics</button>
      </div>

      {/* Grid of Key Stats */}
      <div className="grid-stats">
        <div className="glass-card stat-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Total Products</h3>
            <p className="text-neon-cyan">{stats.total_products}</p>
          </div>
          <div className="stat-icon-wrapper icon-cyan">📦</div>
        </div>

        <div className="glass-card stat-card" onClick={() => onNavigate('customers')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Total Customers</h3>
            <p className="text-neon-purple">{stats.total_customers}</p>
          </div>
          <div className="stat-icon-wrapper icon-purple">👥</div>
        </div>

        <div className="glass-card stat-card" onClick={() => onNavigate('orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Total Orders</h3>
            <p style={{ color: 'var(--color-success)' }}>{stats.total_orders}</p>
          </div>
          <div className="stat-icon-wrapper icon-green">🛒</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-info">
            <h3>Low Stock Alert</h3>
            <p style={{ color: stats.low_stock_products.length > 0 ? 'var(--color-error)' : 'var(--text-muted)' }}>
              {stats.low_stock_products.length}
            </p>
          </div>
          <div className="stat-icon-wrapper icon-amber">⚠️</div>
        </div>
      </div>

      {/* Low Stock Panel */}
      <div className="grid-content">
        <div className="col-full glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="text-neon-cyan">⚠️ Critical Stock Replenishment Warnings</h2>
            <span className="badge badge-low-stock">Inventory Alert Threshold &lt; 10 Units</span>
          </div>

          {stats.low_stock_products.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
              🎉 Excellent! All products are well-stocked and above replenishment limits.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU/Code</th>
                    <th>Price</th>
                    <th>Quantity in Stock</th>
                    <th>Replenishment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.low_stock_products.map((product) => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong></td>
                      <td><code style={{ color: '#c084fc' }}>{product.sku}</code></td>
                      <td>{formatCurrency(product.price, product.currency)}</td>
                      <td style={{ color: 'var(--color-error)', fontWeight: 600 }}>{product.quantity_in_stock}</td>
                      <td>
                        <span className="badge badge-low-stock">
                          {product.quantity_in_stock === 0 ? '🚫 Out of Stock' : '⚠️ Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
