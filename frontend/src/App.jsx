import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import { ToastProvider } from './context/ToastContext';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'orders':
        return <Orders />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Immersive background decoration blur bubbles */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      
      {/* Floating navigation bar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Responsive content viewport */}
      <main className="main-content">
        {renderActiveTab()}
      </main>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
