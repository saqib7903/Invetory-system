import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, theme, toggleTheme }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'orders', label: 'Orders', icon: '🛒' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="nav-icon">📦</span>
        <span>NEXUS STOCK</span>
      </div>
      <ul className="nav-menu">
        {menuItems.map((item) => (
          <li
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      
      {/* Dynamic Day / Night Theme Switcher */}
      <div className="theme-toggle-container">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          <span>{theme === 'dark' ? '☀️ Day Mode' : '🌙 Night Mode'}</span>
        </button>
      </div>
      
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <p>Nexus Stock v1.0.0</p>
        <p style={{ color: 'var(--color-primary)', marginTop: '0.25rem' }}>● Connected</p>
      </div>
    </div>
  );
};

export default Sidebar;
