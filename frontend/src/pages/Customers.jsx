import React, { useState, useEffect } from 'react';
import { customerAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const toast = useToast();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.getAll();
      setCustomers(data);
    } catch (err) {
      toast.error('Sync Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCreateModal = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!fullName.trim()) return toast.error('Validation Error', 'Full Name is required.');
    if (!email.trim()) return toast.error('Validation Error', 'Email Address is required.');
    
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return toast.error('Validation Error', 'Please enter a valid email format.');
    }

    const payload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
    };

    try {
      setSubmitting(true);
      await customerAPI.create(payload);
      toast.success('Customer Registered', `Successfully added customer: ${payload.full_name}`);
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error('Registration Failure', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete customer "${name}"?\nWARNING: This will cancel/delete any active orders associated with this customer.`)) return;
    
    try {
      await customerAPI.delete(id);
      toast.success('Customer Removed', `Permanently deleted customer: ${name}`);
      fetchCustomers();
    } catch (err) {
      toast.error('Removal Failure', err.message);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customer Pipeline</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Monitor customer details, email channels, and contact information.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>👥 Add New Customer</button>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔍</span>
          <input
            type="text"
            className="input-field"
            placeholder="Search customers by full name, phone number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-primary)' }}>
            Syncing Customer Database...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No registered customers found.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.full_name}</strong></td>
                    <td><a href={`mailto:${c.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{c.email}</a></td>
                    <td>{c.phone ? c.phone : <em style={{ color: 'var(--text-muted)' }}>Not Provided</em>}</td>
                    <td>{new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-danger" onClick={() => handleDelete(c.id, c.full_name)}>
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="👥 Register New Customer"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer Full Name</label>
            <input
              type="text"
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address (Must be Unique)</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john.doe@nexus.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number (Optional)</label>
            <input
              type="tel"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
