import React, { useEffect, useState, useCallback } from 'react';

/**
 * NON-VIZ 2: Processing Rules Editor (CRUD purposes + retention periods).
 *   GET  /api/custom-views/processing-rules
 *   POST /api/custom-views/processing-rules  { op, rule }
 */
const DEFAULT_DRAFT = { purpose: '', lawful_basis: 'consent', retention_period_days: 365, retention_label: '12 months' };

export default function ProcessingRulesEditor() {
  const [state, setState] = useState({ rules: [], lawful_bases: [] });
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const headers = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`${base}/custom-views/processing-rules`, { headers: headers() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setState({ rules: j.rules || [], lawful_bases: j.lawful_bases || [] });
    } catch (e) {
      setError(e.message);
    }
  }, [headers, base]);

  useEffect(() => { load(); }, [load]);

  const submit = async (op, rule) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${base}/custom-views/processing-rules`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ op, rule }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setState({ rules: j.rules || state.rules, lawful_bases: state.lawful_bases });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!draft.purpose.trim()) {
      setError('purpose is required');
      return;
    }
    if (editId) {
      await submit('update', { ...draft, id: editId });
    } else {
      await submit('create', draft);
    }
    setDraft(DEFAULT_DRAFT);
    setEditId(null);
  };

  const handleEdit = (rule) => {
    setEditId(rule.id);
    setDraft({
      purpose: rule.purpose,
      lawful_basis: rule.lawful_basis,
      retention_period_days: rule.retention_period_days,
      retention_label: rule.retention_label,
    });
  };

  const handleDelete = async (id) => {
    await submit('delete', { id });
    if (editId === id) {
      setEditId(null);
      setDraft(DEFAULT_DRAFT);
    }
  };

  const handleReset = async () => {
    await submit('reset', null);
    setEditId(null);
    setDraft(DEFAULT_DRAFT);
  };

  return (
    <div
      data-testid="processing-rules-editor"
      style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, color: '#111827' }}>Processing Rules</h3>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            CRUD purposes + retention periods (in-memory store, seeded with common GDPR purposes).
          </div>
        </div>
        <button
          onClick={handleReset}
          disabled={busy}
          style={{ padding: '6px 12px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          Reset to defaults
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 10, padding: 8, background: '#fef2f2', color: '#dc2626', borderRadius: 4, fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto', gap: 8, marginBottom: 16 }}>
        <input
          data-testid="rule-purpose"
          placeholder="Processing purpose (e.g. payroll & tax records)"
          value={draft.purpose}
          onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
          style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
        />
        <select
          value={draft.lawful_basis}
          onChange={(e) => setDraft({ ...draft, lawful_basis: e.target.value })}
          style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
        >
          {state.lawful_bases.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          type="number"
          min={1}
          value={draft.retention_period_days}
          onChange={(e) => setDraft({ ...draft, retention_period_days: parseInt(e.target.value, 10) || 0 })}
          placeholder="days"
          style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
        />
        <input
          placeholder="Retention label (e.g. 7 years)"
          value={draft.retention_label}
          onChange={(e) => setDraft({ ...draft, retention_label: e.target.value })}
          style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
        />
        <button
          data-testid="rule-save"
          onClick={handleSave}
          disabled={busy}
          style={{ padding: '8px 14px', background: editId ? '#f59e0b' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          {editId ? 'Update' : 'Add'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px' }}>Purpose</th>
              <th style={{ padding: '8px 10px' }}>Lawful Basis</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Retention (days)</th>
              <th style={{ padding: '8px 10px' }}>Retention Label</th>
              <th style={{ padding: '8px 10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(state.rules || []).map((rule) => (
              <tr key={rule.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 10px', color: '#111827' }}>{rule.purpose}</td>
                <td style={{ padding: '8px 10px', color: '#374151' }}>
                  <span style={{ padding: '2px 8px', background: '#eef2ff', color: '#4338ca', borderRadius: 12, fontSize: 11 }}>
                    {rule.lawful_basis}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{rule.retention_period_days}</td>
                <td style={{ padding: '8px 10px', color: '#6b7280' }}>{rule.retention_label}</td>
                <td style={{ padding: '8px 10px' }}>
                  <button
                    onClick={() => handleEdit(rule)}
                    disabled={busy}
                    style={{ marginRight: 6, padding: '4px 8px', background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={busy}
                    style={{ padding: '4px 8px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {(!state.rules || !state.rules.length) && (
              <tr><td colSpan={5} style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>No rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
