import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { customService } from '../services/api';

/*
 * CustomFeatures — UI for the 5 new custom non-CRUD endpoints added per audit:
 *   1. Cookie Scanner          (POST /cookie-scanner/scan, GET /cookie-scanner/history)
 *   2. DSR Fulfillment Pipeline (POST /dsr-fulfillment/generate, GET /dsr-fulfillment/dossiers)
 *   3. Breach 72h Countdown    (POST /breach-countdown/register, GET /breach-countdown)
 *   4. Vendor Renewal Calendar (POST /vendor-calendar/sync|recommend, GET /vendor-calendar)
 *   5. Policy Corpus RAG       (POST /policy-corpus, GET /policy-corpus, POST /policy-corpus/query)
 */
export default function CustomFeatures({ initialTab, onBack }) {
  const [tab, setTab] = useState(initialTab || 'cookie-scanner');

  return (
    <div className="custom-features">
      <div className="page-header">
        <button className="btn btn-outline btn-sm" onClick={onBack}>← Dashboard</button>
        <h1>Advanced Privacy Features</h1>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {[
          ['cookie-scanner', '🔎 Cookie Scanner'],
          ['dsr-fulfillment', '📦 DSR Fulfillment'],
          ['breach-countdown', '⏱️ Breach 72h Countdown'],
          ['vendor-calendar', '📅 Vendor Calendar'],
          ['policy-rag', '📚 Policy Corpus RAG'],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`btn ${tab === k ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'cookie-scanner' && <CookieScanner />}
      {tab === 'dsr-fulfillment' && <DsrFulfillment />}
      {tab === 'breach-countdown' && <BreachCountdown />}
      {tab === 'vendor-calendar' && <VendorCalendar />}
      {tab === 'policy-rag' && <PolicyRag />}
    </div>
  );
}

// 1. Cookie Scanner ----------------------------------------------------------
function CookieScanner() {
  const [domain, setDomain] = useState('');
  const [complianceId, setComplianceId] = useState('');
  const [headers, setHeaders] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const r = await customService.cookieScannerHistory();
      setHistory(r.data.data || []);
    } catch (e) { toast.error('Failed to load history'); }
  };
  useEffect(() => { refresh(); }, []);

  const scan = async () => {
    setLoading(true);
    try {
      const payload = {};
      if (complianceId) payload.compliance_id = parseInt(complianceId);
      if (domain) payload.domain = domain;
      if (headers.trim()) payload.simulated_response_headers = headers.split('\n').map(s => s.trim()).filter(Boolean);
      const r = await customService.cookieScannerScan(payload);
      toast.success(`Scan complete — score ${r.data.scan.score}`);
      await refresh();
    } catch (e) { toast.error(e.response?.data?.error || 'Scan failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3>🔎 Cookie Scanner — Discovery + AI Classification</h3>
      <p className="text-muted">Heuristically discovers cookies on a domain (or accepts simulated Set-Cookie headers), diffs against declared cookies in the cookie_compliance table, and lets the AI classify undeclared cookies.</p>
      <div className="form-group">
        <label>Compliance Record ID (optional)</label>
        <input value={complianceId} onChange={e => setComplianceId(e.target.value)} placeholder="e.g. 7" />
      </div>
      <div className="form-group">
        <label>Domain</label>
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" />
      </div>
      <div className="form-group">
        <label>Simulated response headers (optional, one per line)</label>
        <textarea rows={4} value={headers} onChange={e => setHeaders(e.target.value)} placeholder="Set-Cookie: _ga=..." />
      </div>
      <button className="btn btn-primary" onClick={scan} disabled={loading}>{loading ? 'Scanning...' : 'Run Scan'}</button>

      <h4 style={{ marginTop: 24 }}>Recent Scans</h4>
      <table className="data-table">
        <thead><tr><th>Domain</th><th>Score</th><th>Scanned</th><th>Diff</th></tr></thead>
        <tbody>
          {history.map(s => (
            <tr key={s.id}>
              <td>{s.domain}</td>
              <td><strong>{s.score}</strong></td>
              <td>{new Date(s.scanned_at).toLocaleString()}</td>
              <td><pre style={{ maxHeight: 100, overflow: 'auto', fontSize: 11 }}>{JSON.stringify(s.diff)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 2. DSR Fulfillment ---------------------------------------------------------
function DsrFulfillment() {
  const [requestId, setRequestId] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try { const r = await customService.dsrFulfillmentList(); setList(r.data.data || []); } catch (_) {}
  };
  useEffect(() => { refresh(); }, []);

  const generate = async () => {
    setLoading(true);
    try {
      await customService.dsrFulfillmentGenerate({ request_id: parseInt(requestId) });
      toast.success('Dossier generated');
      await refresh();
    } catch (e) { toast.error(e.response?.data?.error || 'Generation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3>📦 DSR Fulfillment Pipeline</h3>
      <p className="text-muted">Walks the processing-activities catalog + vendor sub-processors and assembles a GDPR Article 15 "right of access" dossier for the given DSR.</p>
      <div className="form-group">
        <label>Data Subject Request ID</label>
        <input value={requestId} onChange={e => setRequestId(e.target.value)} placeholder="e.g. 3" />
      </div>
      <button className="btn btn-primary" onClick={generate} disabled={loading || !requestId}>{loading ? 'Generating...' : 'Generate Dossier'}</button>

      <h4 style={{ marginTop: 24 }}>Generated Dossiers</h4>
      <table className="data-table">
        <thead><tr><th>Request</th><th>Type</th><th>Requester</th><th>Generated</th><th>Status</th></tr></thead>
        <tbody>
          {list.map(d => (
            <tr key={d.id}>
              <td>{d.request_id}</td>
              <td>{d.request_type}</td>
              <td>{d.requester_name}</td>
              <td>{new Date(d.generated_at).toLocaleString()}</td>
              <td>{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 3. Breach Countdown --------------------------------------------------------
function BreachCountdown() {
  const [breachId, setBreachId] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const refresh = async () => { try { const r = await customService.breachCountdownList(); setList(r.data.data || []); } catch (_) {} };
  useEffect(() => { refresh(); const t = setInterval(refresh, 30_000); return () => clearInterval(t); }, []);

  const register = async () => {
    setLoading(true);
    try {
      await customService.breachCountdownRegister({ breach_id: parseInt(breachId) });
      toast.success('Countdown registered with AI-drafted notification');
      await refresh();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3>⏱️ Breach 72h Countdown Agent</h3>
      <p className="text-muted">Registers a 72-hour supervisory-authority deadline for a breach record, AI drafts the notification, and a background worker re-evaluates every 60s, marking notified once &lt; 12h remain.</p>
      <div className="form-group">
        <label>Breach ID</label>
        <input value={breachId} onChange={e => setBreachId(e.target.value)} placeholder="e.g. 4" />
      </div>
      <button className="btn btn-primary" onClick={register} disabled={loading || !breachId}>{loading ? 'Registering...' : 'Register Countdown'}</button>

      <h4 style={{ marginTop: 24 }}>Active Countdowns</h4>
      <table className="data-table">
        <thead><tr><th>Breach</th><th>Title</th><th>Severity</th><th>Hours Remaining</th><th>Notified</th></tr></thead>
        <tbody>
          {list.map(c => {
            const hours = parseFloat(c.hours_remaining || 0).toFixed(1);
            const tone = hours < 12 ? '#d63031' : hours < 24 ? '#fdcb6e' : '#00b894';
            return (
              <tr key={c.id}>
                <td>{c.breach_id}</td>
                <td>{c.incident_title}</td>
                <td>{c.severity}</td>
                <td><strong style={{ color: tone }}>{hours}h</strong></td>
                <td>{c.notified ? '✅' : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 4. Vendor Calendar ---------------------------------------------------------
function VendorCalendar() {
  const [list, setList] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = async () => { try { const r = await customService.vendorCalendarList(); setList(r.data.data || []); } catch (_) {} };
  useEffect(() => { refresh(); }, []);

  const sync = async () => {
    setLoading(true);
    try { const r = await customService.vendorCalendarSync(); toast.success(`Synced — ${r.data.inserted} new deadlines`); await refresh(); }
    catch (e) { toast.error(e.response?.data?.error || 'Sync failed'); }
    finally { setLoading(false); }
  };
  const recommend = async () => {
    setLoading(true);
    try { await customService.vendorCalendarRecommend({ vendor_id: parseInt(vendorId) }); toast.success('AI recommendations added'); await refresh(); }
    catch (e) { toast.error(e.response?.data?.error || 'Recommend failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3>📅 Vendor Renewal & Audit Calendar</h3>
      <p className="text-muted">Auto-creates compliance_deadlines from vendor.contract_end_date and missing DPAs. AI can recommend further questionnaire updates per vendor.</p>
      <button className="btn btn-primary" onClick={sync} disabled={loading}>Sync from Vendors</button>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <input value={vendorId} onChange={e => setVendorId(e.target.value)} placeholder="Vendor ID for AI recommend" />
        <button className="btn btn-outline" onClick={recommend} disabled={!vendorId || loading}>AI Recommend</button>
      </div>

      <h4 style={{ marginTop: 24 }}>Upcoming Deadlines</h4>
      <table className="data-table">
        <thead><tr><th>Vendor</th><th>Type</th><th>Title</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>
          {list.map(d => (
            <tr key={d.id}>
              <td>{d.vendor_name}</td>
              <td>{d.deadline_type}</td>
              <td>{d.title}</td>
              <td>{d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}</td>
              <td>{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 5. Policy Corpus RAG -------------------------------------------------------
function PolicyRag() {
  const [list, setList] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => { try { const r = await customService.policyCorpusList({ limit: 50 }); setList(r.data.data || []); } catch (_) {} };
  useEffect(() => { refresh(); }, []);

  const upload = async () => {
    if (!title || !content) return toast.warn('Title and content required');
    setLoading(true);
    try { await customService.policyCorpusUpload({ title, content, category }); toast.success('Policy added to corpus'); setTitle(''); setContent(''); setCategory(''); await refresh(); }
    catch (e) { toast.error(e.response?.data?.error || 'Upload failed'); }
    finally { setLoading(false); }
  };
  const ask = async () => {
    if (!question) return;
    setLoading(true); setAnswer(null);
    try { const r = await customService.policyCorpusQuery({ question, top_k: 3 }); setAnswer(r.data); }
    catch (e) { toast.error(e.response?.data?.error || 'Query failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3>📚 Policy Corpus RAG</h3>
      <p className="text-muted">Upload your organization's policies; the AI grounds answers in the corpus instead of generic GDPR text. Keyword retrieval (no pgvector required).</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h4>Upload Policy</h4>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Policy title" />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (optional)" style={{ marginTop: 8 }} />
          <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder="Full policy text..." style={{ marginTop: 8 }} />
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={upload} disabled={loading}>Add to Corpus</button>
        </div>
        <div>
          <h4>Ask the Corpus</h4>
          <textarea rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. What is our retention period for HR data?" />
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={ask} disabled={loading || !question}>Ask</button>
          {answer && (
            <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <strong>Answer:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(answer, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      <h4 style={{ marginTop: 24 }}>Indexed Policies ({list.length})</h4>
      <ul>
        {list.map(p => <li key={p.id}><strong>{p.title}</strong> {p.category && <em>({p.category})</em>}</li>)}
      </ul>
    </div>
  );
}
