import React, { useEffect, useState } from 'react';

/**
 * Apply pass 5 frontend: Regulatory Change Tracker + LLM Usage Registry.
 * Uses fetch directly (similar style to CrudPage / AIAdvancedTools elsewhere).
 * JWT bearer comes from localStorage `token`.
 */

const API = '/api';
function getHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function http(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export default function RegulatoryAndLLM() {
  const [tab, setTab] = useState('regulatory');
  return (
    <div>
      <h2>Regulatory Tracker & LLM Usage Registry</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn" onClick={() => setTab('regulatory')}>Regulatory Changes</button>
        <button className="btn" onClick={() => setTab('llm')}>LLM Usage Registry</button>
      </div>
      {tab === 'regulatory' ? <Reg /> : <LLM />}
    </div>
  );
}

function Reg() {
  const [items, setItems] = useState([]);
  const [sub, setSub] = useState({ jurisdictions: '', tags: '', min_impact: 'low' });
  const [error, setError] = useState(null);
  const refresh = async () => {
    try {
      const f = await http('GET', '/regulatory-tracker/feed');
      setItems(f.items || []);
      if (f.subscription) setSub({ jurisdictions: (f.subscription.jurisdictions || []).join(','), tags: (f.subscription.tags || []).join(','), min_impact: f.subscription.min_impact });
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { refresh(); }, []);
  const saveSub = async (e) => {
    e.preventDefault();
    try {
      await http('PUT', '/regulatory-tracker/subscriptions/me', {
        jurisdictions: sub.jurisdictions.split(',').map(s => s.trim()).filter(Boolean),
        tags: sub.tags.split(',').map(s => s.trim()).filter(Boolean),
        min_impact: sub.min_impact,
      });
      refresh();
    } catch (err) { setError(err.message); }
  };
  return (
    <div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={saveSub} style={{ marginBottom: 16 }}>
        <input placeholder="jurisdictions (CSV: EU,UK,US-CA)" value={sub.jurisdictions} onChange={(e) => setSub({ ...sub, jurisdictions: e.target.value })} style={{ width: 300, marginRight: 8 }} />
        <input placeholder="tags (CSV)" value={sub.tags} onChange={(e) => setSub({ ...sub, tags: e.target.value })} style={{ width: 200, marginRight: 8 }} />
        <select value={sub.min_impact} onChange={(e) => setSub({ ...sub, min_impact: e.target.value })} style={{ marginRight: 8 }}>
          <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
        </select>
        <button type="submit" className="btn-primary">Save subscription</button>
      </form>
      <table>
        <thead><tr><th>Jurisdiction</th><th>Source</th><th>Title</th><th>Impact</th><th>Effective</th></tr></thead>
        <tbody>{items.map((i) => (
          <tr key={i.id}><td>{i.jurisdiction}</td><td>{i.source}</td><td>{i.title}</td><td>{i.impact}</td><td>{i.effective_date || '—'}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function LLM() {
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ vendor: '', product: '', tier: 'consumer', dpa_status: 'none', processes_personal_data: false, training_opt_out: false });
  const [error, setError] = useState(null);
  const refresh = async () => {
    try { setList(await http('GET', '/llm-usage-registry')); setSummary(await http('GET', '/llm-usage-registry/summary')); } catch (err) { setError(err.message); }
  };
  useEffect(() => { refresh(); }, []);
  const create = async (e) => {
    e.preventDefault();
    try { await http('POST', '/llm-usage-registry', form); setForm({ vendor: '', product: '', tier: 'consumer', dpa_status: 'none', processes_personal_data: false, training_opt_out: false }); refresh(); } catch (err) { setError(err.message); }
  };
  return (
    <div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {summary && <p>Total: {summary.total} · PII handlers: {summary.pii_handlers} · No DPA: {summary.no_dpa} · Avg risk: {summary.avg_risk_score ?? '—'}</p>}
      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <input placeholder="vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} required />
        <input placeholder="product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required />
        <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
          <option>consumer</option><option>team</option><option>enterprise</option><option>self-hosted</option>
        </select>
        <select value={form.dpa_status} onChange={(e) => setForm({ ...form, dpa_status: e.target.value })}>
          <option>none</option><option>requested</option><option>signed</option><option>not_applicable</option>
        </select>
        <label><input type="checkbox" checked={form.processes_personal_data} onChange={(e) => setForm({ ...form, processes_personal_data: e.target.checked })} /> Processes PII</label>
        <label><input type="checkbox" checked={form.training_opt_out} onChange={(e) => setForm({ ...form, training_opt_out: e.target.checked })} /> Training opt-out</label>
        <button type="submit" className="btn-primary" style={{ gridColumn: '1 / -1' }}>Add</button>
      </form>
      <table>
        <thead><tr><th>Vendor</th><th>Product</th><th>Tier</th><th>DPA</th><th>PII?</th><th>Risk</th></tr></thead>
        <tbody>{list.map((r) => (
          <tr key={r.id}><td>{r.vendor}</td><td>{r.product}</td><td>{r.tier}</td><td>{r.dpa_status}</td><td>{r.processes_personal_data ? 'yes' : 'no'}</td><td>{r.risk_score}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
