import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prevToasts) => [...prevToasts, { id, type, title, message }]);
    
    // Auto remove after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((title, message) => addToast('success', title, message), [addToast]);
  const error = useCallback((title, message) => addToast('error', title, message), [addToast]);
  const info = useCallback((title, message) => addToast('info', title, message), [addToast]);
  const warning = useCallback((title, message) => addToast('warning', title, message), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      {/* Dynamic Toast Renderer Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-content">
              <div className="toast-title">
                {toast.type === 'success' && '🟢 '}
                {toast.type === 'error' && '🔴 '}
                {toast.type === 'info' && '🔵 '}
                {toast.type === 'warning' && '🟡 '}
                {toast.title}
              </div>
              {toast.message && <div className="toast-msg">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
