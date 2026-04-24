import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

function formatValue(val) {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return String(val);
}

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getBadgeClass(value) {
  if (!value) return '';
  const v = String(value).toLowerCase().replace(/\s/g, '_');
  return `badge badge-${v}`;
}

const BADGE_FIELDS = ['status', 'risk_level', 'severity', 'outcome', 'assessment_type', 'breach_type', 'request_type', 'vendor_type', 'category'];

function CrudPage({ feature, fieldConfig, service, onBack }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [showConfirm, setShowConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const res = await service.getAll(search);
      setItems(res.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [service, search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const timer = setTimeout(() => { loadItems(); }, 300);
    return () => clearTimeout(timer);
  }, [search, loadItems]);

  const openNew = () => {
    setEditItem(null);
    const initial = {};
    fieldConfig.formFields.forEach(f => {
      if (f.type === 'checkbox') initial[f.name] = false;
      else initial[f.name] = '';
    });
    setFormData(initial);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const data = {};
    fieldConfig.formFields.forEach(f => {
      let val = item[f.name];
      if (f.type === 'date' && val) val = val.split('T')[0];
      if (f.type === 'datetime-local' && val) val = val.slice(0, 16);
      if (f.type === 'checkbox') val = !!val;
      data[f.name] = val ?? '';
    });
    setFormData(data);
    setShowForm(true);
    setSelectedItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await service.update(editItem.id, formData);
        toast.success('Updated successfully');
      } else {
        await service.create(formData);
        toast.success('Created successfully');
      }
      setShowForm(false);
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await service.delete(id);
      toast.success('Deleted successfully');
      setShowConfirm(null);
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const { tableColumns, formFields } = fieldConfig;

  return (
    <div>
      <button className="btn-back" onClick={onBack}>← Back to Dashboard</button>

      <div className="page-header">
        <h1>{feature.icon} {feature.title}</h1>
        <div className="page-header-actions">
          <input
            className="search-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-success" onClick={openNew}>+ Add New</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /> Loading...</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {tableColumns.map(col => (
                  <th key={col}>{formatLabel(col)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={tableColumns.length} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No records found</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)}>
                    {tableColumns.map(col => (
                      <td key={col}>
                        {BADGE_FIELDS.includes(col) && item[col] ? (
                          <span className={getBadgeClass(item[col])}>{formatValue(item[col])}</span>
                        ) : (
                          <span>{formatValue(item[col])}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{feature.icon} Record Details</h2>
            <div className="detail-grid">
              {Object.entries(selectedItem).filter(([k]) => k !== 'id' && k !== 'created_at' && k !== 'updated_at').map(([key, val]) => (
                <div key={key} className={`detail-item ${(typeof val === 'string' && val?.length > 80) ? 'full-width' : ''}`}>
                  <label>{formatLabel(key)}</label>
                  {BADGE_FIELDS.includes(key) && val ? (
                    <span className={getBadgeClass(val)}>{formatValue(val)}</span>
                  ) : (
                    <p>{formatValue(val)}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => openEdit(selectedItem)}>Edit</button>
              <button className="btn btn-danger" onClick={() => setShowConfirm(selectedItem.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editItem ? 'Edit Record' : 'Add New Record'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                {formFields.map(field => (
                  <div key={field.name} className="form-group" style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                    <label>{field.label}{field.required && ' *'}</label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        required={field.required}
                      >
                        <option value="">Select...</option>
                        {field.options.map(o => (
                          <option key={o} value={o}>{formatLabel(o)}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        required={field.required}
                        rows={3}
                      />
                    ) : field.type === 'checkbox' ? (
                      <div className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={!!formData[field.name]}
                          onChange={e => setFormData({...formData, [field.name]: e.target.checked})}
                        />
                        <span>{field.label}</span>
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="confirm-dialog">
              <h2>Confirm Delete</h2>
              <p>Are you sure you want to delete this record? This action cannot be undone.</p>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(showConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrudPage;
