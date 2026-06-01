import React, { useState, useEffect } from 'react';
import { orderAPI, customerAPI, productAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderRows, setOrderRows] = useState([{ product_id: '', quantity: 1, maxStock: 9999 }]);
  const [submitting, setSubmitting] = useState(false);

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

  const getCheckoutCurrency = () => {
    const firstRowWithProduct = orderRows.find(r => r.product_id);
    if (firstRowWithProduct) {
      const product = products.find(p => p.id === parseInt(firstRowWithProduct.product_id, 10));
      return product?.currency || 'USD';
    }
    return 'USD';
  };

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent || orders.length === 0) {
        setLoading(true);
      }
      const [ordersData, customersData, productsData] = await Promise.all([
        orderAPI.getAll(),
        customerAPI.getAll(),
        productAPI.getAll(),
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      toast.error('Sync Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const openCreateModal = () => {
    if (customers.length === 0) {
      return toast.warning('Checkout Blocked', 'Please register at least one customer first.');
    }
    if (products.length === 0) {
      return toast.warning('Checkout Blocked', 'Please add products to inventory first.');
    }
    setSelectedCustomerId('');
    setOrderRows([{ product_id: '', quantity: 1, maxStock: 9999 }]);
    setSubmitting(false);
    setIsCreateOpen(true);
  };

  const openDetailModal = async (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const addOrderRow = () => {
    setOrderRows([...orderRows, { product_id: '', quantity: 1, maxStock: 9999 }]);
  };

  const removeOrderRow = (index) => {
    if (orderRows.length === 1) return;
    setOrderRows(orderRows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...orderRows];
    
    if (field === 'product_id') {
      const selectedProd = products.find((p) => p.id === parseInt(value, 10));
      updatedRows[index].product_id = value;
      updatedRows[index].maxStock = selectedProd ? selectedProd.quantity_in_stock : 9999;
      // Clamp quantity to stock limit if existing quantity is higher
      if (selectedProd && updatedRows[index].quantity > selectedProd.quantity_in_stock) {
        updatedRows[index].quantity = selectedProd.quantity_in_stock;
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value, 10);
      updatedRows[index].quantity = isNaN(qty) ? 1 : qty;
    }
    
    setOrderRows(updatedRows);
  };

  // Dynamically calculate order total in real-time
  const calculateTotal = () => {
    return orderRows.reduce((sum, row) => {
      if (!row.product_id) return sum;
      const product = products.find((p) => p.id === parseInt(row.product_id, 10));
      return sum + (product ? product.price * row.quantity : 0);
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    if (submitting) return;

    if (!selectedCustomerId) {
      return toast.error('Validation Error', 'Please select a customer.');
    }

    // Validate rows
    const items = [];
    const seenProducts = new Set();

    for (let i = 0; i < orderRows.length; i++) {
      const row = orderRows[i];
      if (!row.product_id) {
        return toast.error('Validation Error', `Please select a product for Item Row #${i + 1}.`);
      }
      
      const pId = parseInt(row.product_id, 10);
      if (seenProducts.has(pId)) {
        return toast.error('Validation Error', 'Duplicate products found. Please consolidate quantities into a single row.');
      }
      seenProducts.add(pId);

      const product = products.find((p) => p.id === pId);
      if (row.quantity <= 0) {
        return toast.error('Validation Error', `Quantity for '${product.name}' must be greater than zero.`);
      }
      if (row.quantity > product.quantity_in_stock) {
        return toast.error('Stock Exhausted', `Only ${product.quantity_in_stock} units of '${product.name}' are available.`);
      }

      items.push({
        product_id: pId,
        quantity: row.quantity,
      });
    }

    const payload = {
      customer_id: parseInt(selectedCustomerId, 10),
      items,
    };

    try {
      setSubmitting(true);
      await orderAPI.create(payload);
      toast.success('Order Placed', 'Inventory decremented and invoice generated.');
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      toast.error('Transaction Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (id) => {
    if (submitting) return;
    if (!window.confirm('Are you sure you want to cancel and delete this order?\nNote: All stock quantities will automatically be returned to the warehouse inventory.')) return;
    
    try {
      setSubmitting(true);
      await orderAPI.delete(id);
      toast.success('Order Cancelled', 'Order deleted and stock levels restored successfully.');
      if (isDetailOpen) setIsDetailOpen(false);
      loadData(true);
    } catch (err) {
      toast.error('Cancellation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Order Invoices</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Track client orders, compute subtotals, and review inventory checkout transactions.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>🛒 Create Checkout Order</button>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-primary)' }}>
            Syncing System Invoices...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No orders have been placed yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Total Amount</th>
                  <th>Checkout Date</th>
                  <th>Items Purchased</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><strong style={{ color: 'var(--color-primary)' }}>#ORD-{o.id.toString().padStart(4, '0')}</strong></td>
                    <td>{o.customer?.full_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      {formatCurrency(o.total_amount, o.items?.[0]?.currency || 'USD')}
                    </td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-success">
                        {o.items?.length} {o.items?.length === 1 ? 'Product' : 'Products'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => openDetailModal(o)} disabled={submitting}>
                          👁️ Inspect Invoice
                        </button>
                        <button className="btn-danger" onClick={() => handleCancelOrder(o.id)} disabled={submitting}>
                          🗑️ Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`🧾 Invoice Detail #ORD-${selectedOrder?.id.toString().padStart(4, '0')}`}
      >
        {selectedOrder && (
          <div>
            <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#fff' }}>Customer Information</h4>
              <p><strong>Name:</strong> {selectedOrder.customer?.full_name}</p>
              <p><strong>Email:</strong> {selectedOrder.customer?.email}</p>
              <p><strong>Phone:</strong> {selectedOrder.customer?.phone || 'Not provided'}</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Ordered on:</strong> {new Date(selectedOrder.created_at).toLocaleString()}
              </p>
            </div>

            <h4 style={{ marginBottom: '0.75rem', color: '#fff' }}>Purchased Items</h4>
            <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
              <table className="nexus-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.product_name}</strong></td>
                      <td>{formatCurrency(item.unit_price, item.currency)}</td>
                      <td>{item.quantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(item.unit_price * item.quantity, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="order-total-banner">
              <span>Total Invoice Amount:</span>
              <span className="order-total-price">
                {formatCurrency(selectedOrder.total_amount, selectedOrder.items?.[0]?.currency || 'USD')}
              </span>
            </div>

            <div className="modal-actions">
              <button className="btn-danger" style={{ marginRight: 'auto' }} onClick={() => handleCancelOrder(selectedOrder.id)} disabled={submitting}>
                {submitting ? 'Voiding...' : '🚨 Void & Refund Order'}
              </button>
              <button className="btn-secondary" onClick={() => setIsDetailOpen(false)} disabled={submitting}>
                Close Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Checkout Order Builder Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="🛒 New Checkout Order"
      >
        <form onSubmit={handleCreateOrder}>
          <div className="form-group">
            <label>Select Customer Reference</label>
            <select
              className="input-field"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
              style={{ background: 'rgba(10, 10, 15, 0.8)', border: '1px solid var(--border-color)' }}
            >
              <option value="" disabled>-- Select a registered customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Items to Checkout</label>
            <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={addOrderRow}>
              ➕ Add Another Item
            </button>
          </div>

          <div className="order-builder-list">
            {orderRows.map((row, index) => (
              <div key={index} className="order-builder-row">
                <select
                  className="input-field"
                  value={row.product_id}
                  onChange={(e) => handleRowChange(index, 'product_id', e.target.value)}
                  required
                  style={{ flexGrow: 2, background: 'rgba(10, 10, 15, 0.8)' }}
                >
                  <option value="" disabled>-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantity_in_stock === 0}>
                      {p.name} - {formatCurrency(p.price, p.currency)} ({p.quantity_in_stock === 0 ? 'OUT OF STOCK' : `${p.quantity_in_stock} in stock`})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  className="input-field"
                  value={row.quantity}
                  onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                  placeholder="Qty"
                  min="1"
                  max={row.maxStock}
                  required
                  style={{ width: '80px', textAlign: 'center' }}
                />

                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => removeOrderRow(index)}
                  disabled={orderRows.length === 1}
                  style={{ padding: '0.75rem', fontSize: '1rem', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="order-total-banner" style={{ marginBottom: '1.5rem' }}>
            <span>Estimated Order Total:</span>
            <span className="order-total-price">{formatCurrency(calculateTotal(), getCheckoutCurrency())}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Committing...' : '🔒 Commit Checkout'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Orders;
