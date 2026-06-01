import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null); // Null for create, Product object for edit
  
  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [currency, setCurrency] = useState('USD');
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productAPI.getAll();
      setProducts(data);
    } catch (err) {
      toast.error('Sync Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setPrice(0.0);
    setQuantity(0);
    setCurrency('USD');
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setPrice(product.price);
    setQuantity(product.quantity_in_stock);
    setCurrency(product.currency || 'USD');
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return;

    // Front-end validations
    if (!name.trim()) return toast.error('Validation Error', 'Product Name cannot be empty.');
    if (!sku.trim()) return toast.error('Validation Error', 'Product SKU cannot be empty.');
    if (price < 0) return toast.error('Validation Error', 'Price cannot be negative.');
    if (quantity < 0) return toast.error('Validation Error', 'Quantity cannot be negative.');

    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      price: parseFloat(price),
      quantity_in_stock: parseInt(quantity, 10),
      currency: currency.trim().toUpperCase(),
    };

    try {
      setSubmitting(true);
      if (editingProduct) {
        // Handle Update
        await productAPI.update(editingProduct.id, payload);
        toast.success('Product Updated', `Successfully updated product: ${payload.name}`);
      } else {
        // Handle Create
        await productAPI.create(payload);
        toast.success('Product Created', `Successfully registered product: ${payload.name}`);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error('Save Failure', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id, name) => {
    setProductToDelete({ id, name });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || submitting) return;
    try {
      setSubmitting(true);
      await productAPI.delete(productToDelete.id);
      toast.success('Product Deleted', `Removed "${productToDelete.name}" from stock records.`);
      setIsConfirmOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error('Deletion Failure', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Stock Inventory</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Add, update, and manage product listings and SKUs.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>➕ Add New Product</button>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔍</span>
          <input
            type="text"
            className="input-field"
            placeholder="Search items by product name or unique SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-primary)' }}>
            Syncing Product Warehouse...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No products found matching filters.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Code</th>
                  <th>Unit Price</th>
                  <th>Inventory Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td><code style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{p.sku}</code></td>
                    <td>{formatCurrency(p.price, p.currency)}</td>
                    <td style={{ fontWeight: 600 }}>{p.quantity_in_stock}</td>
                    <td>
                      {p.quantity_in_stock === 0 ? (
                        <span className="badge badge-low-stock">Out of Stock</span>
                      ) : p.quantity_in_stock < 10 ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">Available</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => openEditModal(p)}>
                          ✏️ Edit
                        </button>
                        <button className="btn-danger" onClick={() => handleDeleteClick(p.id, p.name)} disabled={submitting}>
                          🗑️ Delete
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

      {/* CRUD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? '✏️ Edit Product Details' : '📦 Register New Product'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mechanical Keyboard G90"
              required
            />
          </div>

          <div className="form-group">
            <label>SKU / Barcode Code (Must be Unique)</label>
            <input
              type="text"
              className="input-field"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. KB-MECH-G90"
              required
              disabled={!!editingProduct} // SKU shouldn't be easily modified in enterprise logic
            />
          </div>

          <div className="form-group">
            <label>Unit Price</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="input-field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
                style={{ width: '110px', margin: 0 }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
              <input
                type="number"
                step="0.01"
                className="input-field"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                required
                style={{ flexGrow: 1, margin: 0 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Quantity in Stock</label>
            <input
              type="number"
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (editingProduct ? 'Saving Changes...' : 'Registering...') : (editingProduct ? 'Save Changes' : 'Register Product')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Non-blocking custom modal for deleting product to prevent INP warning */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="⚠️ Confirm Product Deletion"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Are you absolutely sure you want to permanently delete product <strong>"{productToDelete?.name}"</strong>?
            <br />
            <strong style={{ color: 'var(--color-danger)' }}>
              WARNING: This action is irreversible. All warehouse records for this product will be permanently removed.
            </strong>
          </p>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsConfirmOpen(false)} disabled={submitting}>
              No, Keep Product
            </button>
            <button 
              type="button" 
              className="btn-danger" 
              onClick={handleConfirmDelete} 
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Yes, Delete Product'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
