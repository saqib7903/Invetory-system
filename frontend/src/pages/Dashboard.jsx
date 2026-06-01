import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchStats = async (isManual = false) => {
    try {
      if (isManual && stats) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      toast.error('Dashboard Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(false);
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
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>System Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overview of live warehouse, pipelines, and orders.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          style={{ gap: '0.75rem' }}
        >
          <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`} style={{ fontSize: '1.15rem' }}>🔄</span>
          {refreshing ? 'Syncing...' : 'Refresh Metrics'}
        </button>
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

      {/* Replenishment & Visual Telemetry Panel */}
      <div className="grid-content">
        {/* Critical Warnings on Left (col-8) */}
        <div className="col-8 glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="text-neon-cyan">⚠️ Replenishment Warnings</h2>
            <span className="badge badge-low-stock">Inventory Alert &lt; 10 Units</span>
          </div>

          {stats.low_stock_products.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</p>
              <p style={{ fontWeight: 600, color: 'var(--color-success)' }}>All systems optimal!</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>No products require critical replenishment at this time.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ flexGrow: 1 }}>
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU/Code</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Replenish</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.low_stock_products.slice(0, 5).map((product) => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong></td>
                      <td><code style={{ color: '#c084fc' }}>{product.sku}</code></td>
                      <td>{formatCurrency(product.price, product.currency)}</td>
                      <td style={{ color: 'var(--color-error)', fontWeight: 600 }}>{product.quantity_in_stock}</td>
                      <td>
                        <span className="badge badge-low-stock">
                          {product.quantity_in_stock === 0 ? '🚫 Out' : '⚠️ Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Visual Glowing Chart on Right (col-4) */}
        <div className="col-4 glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-neon-purple" style={{ marginBottom: '0.25rem' }}>📊 Stock Telemetry</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '1.5rem' }}>Real-time warehouse safety levels.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, minHeight: '190px', padding: '1rem 0' }}>
            {stats.low_stock_products.length === 0 ? (
              /* Beautiful Circular Progress Gauge representing 100% health */
              <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="75" cy="75" r="60" fill="none" stroke="var(--border-color)" strokeWidth="10" />
                  <circle cx="75" cy="75" r="60" fill="none" stroke="var(--color-success)" strokeWidth="10" 
                    strokeDasharray="377" strokeDashoffset="0"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))', transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>100%</p>
                  <p style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Optimal</p>
                </div>
              </div>
            ) : (
              /* Glowing Horizontal Bar Chart detailing critical restock levels */
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {stats.low_stock_products.slice(0, 4).map((product) => {
                  const percent = Math.min(100, Math.max(6, (product.quantity_in_stock / 10) * 100));
                  const isZero = product.quantity_in_stock === 0;
                  return (
                    <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
                        <span style={{ color: isZero ? 'var(--color-error)' : 'var(--color-warning)', fontWeight: 700 }}>
                          {product.quantity_in_stock} / 10
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div 
                          style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: isZero ? 'var(--color-error)' : 'var(--color-warning)', 
                            borderRadius: '999px',
                            boxShadow: isZero ? '0 0 8px rgba(239, 68, 68, 0.4)' : '0 0 8px rgba(245, 158, 11, 0.4)',
                            transition: 'width 0.5s ease-out'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', width: '100%' }}>
            Telemetry linked dynamically to Postgres DB
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
