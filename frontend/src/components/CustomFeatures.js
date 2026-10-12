import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { customService } from '../services/api';
import AIResultView, { AIResultValue } from './AIResultView';
import { COOKIE_EXAMPLES, POLICY_EXAMPLES, PrivacyExamples, NativeSourceExamples, SavedSourcePicker, useSavedChoices } from './PrivacyExamples';

function useCancelableAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  const run = async (operation) => {
    if (request.current) return undefined;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setNotice('');
    try {
      const value = await operation(controller.signal);
      return request.current === controller ? value : undefined;
    } catch (failure) {
      if (controller.signal.aborted) setNotice('OpenRouter request cancelled. Review the inputs or generate again.');
      else setError(failure.response?.data?.error || failure.message || 'OpenRouter request failed.');
      return undefined;
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  };
  const cancel = () => {
    if (!request.current) return;
    request.current.abort(); request.current = null; setLoading(false);
    setNotice('OpenRouter request cancelled. Review the inputs or generate again.');
  };
  return { loading, error, notice, run, cancel };
}

function AIControls({ action, onGenerate, disabled, generateLabel = 'Generate with OpenRouter' }) {
  return <>
    <div className="ai-actions">
      <button type="button" className="btn btn-secondary" onClick={action.cancel} disabled={!action.loading}>Cancel</button>
      <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={action.loading || disabled}>{action.loading ? 'Generating…' : generateLabel}</button>
    </div>
    {action.notice && <p role="status">{action.notice}</p>}
    {action.error && <div role="alert" className="error-msg">OpenRouter request failed: {action.error} <button type="button" className="btn btn-sm" onClick={onGenerate}>Retry generation</button></div>}
  </>;
}

function ListStatus({ loading, error, retry, noun }) {
  if (loading) return <p role="status">Loading {noun}…</p>;
  if (error) return <div role="alert" className="error-msg">{noun} could not load: {error} <button type="button" className="btn btn-sm" onClick={retry}>Retry</button></div>;
  return null;
}

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
  useEffect(() => {
    if (['cookie-scanner', 'dsr-fulfillment', 'breach-countdown', 'vendor-calendar', 'policy-rag'].includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

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
  const complianceSources = useSavedChoices('cookie-compliance');
  const [scanResult, setScanResult] = useState(null);
  const [domain, setDomain] = useState('');
  const [complianceId, setComplianceId] = useState('');
  const [headers, setHeaders] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const action = useCancelableAction();

  const refresh = async () => {
    setHistoryLoading(true); setHistoryError('');
    try {
      const r = await customService.cookieScannerHistory();
      setHistory(r.data.data || []);
    } catch (e) { setHistoryError(e.response?.data?.error || e.message || 'Unknown source error'); }
    finally { setHistoryLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const scan = async () => {
    const payload = {};
    if (complianceId) payload.compliance_id = parseInt(complianceId);
    if (domain) payload.domain = domain;
    if (headers.trim()) payload.simulated_response_headers = headers.split('\n').map(s => s.trim()).filter(Boolean);
    const r = await action.run(signal => customService.cookieScannerScan(payload, { signal }));
    if (!r) return;
    setScanResult(r.data.scan.ai_classification || r.data.scan);
    toast.success(`Scan complete — score ${r.data.scan.score}`);
    await refresh();
  };

  return (
    <div className="card">
      <h3>🔎 Cookie Scanner — Discovery + AI Classification</h3>
      <p className="text-muted">Classifies supplied simulated Set-Cookie headers against the saved cookie declarations. This native workflow does not fetch or verify a live website.</p>
<PrivacyExamples examples={COOKIE_EXAMPLES} disabled={action.loading} hint="Fills the domain and every optional simulated header input. A selected actual compliance record is preserved. Headers are fictional examples, never evidence of a live website scan." onFill={example => { const selected = complianceSources.rows.find(row => String(row.id) === String(complianceId)); setDomain(selected?.domain || example.domain); setHeaders(example.headers); }} />
      <SavedSourcePicker sources={complianceSources} value={complianceId} onChange={setComplianceId} label="Saved compliance record" labelField="cookie_name" optional />
      <div className="form-group">
        <label>Domain</label>
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" />
      </div>
      <div className="form-group">
        <label>Simulated response headers (optional, one per line)</label>
        <textarea rows={4} value={headers} onChange={e => setHeaders(e.target.value)} placeholder="Set-Cookie: _ga=..." />
      </div>
      <AIControls action={action} onGenerate={scan} disabled={!domain && !complianceId} generateLabel="Generate cookie analysis with OpenRouter" />

      {scanResult && <AIResultView response={scanResult} title="Cookie classification report" />}
      <h4 style={{ marginTop: 24 }}>Recent Scans</h4>
      <ListStatus loading={historyLoading} error={historyError} retry={refresh} noun="Cookie scan history" />
      <table className="data-table">
        <thead><tr><th>Domain</th><th>Score</th><th>Scanned</th><th>Diff</th></tr></thead>
        <tbody>
          {history.map(s => (
            <tr key={s.id}>
              <td>{s.domain}</td>
              <td><strong>{s.score}</strong></td>
              <td>{new Date(s.scanned_at).toLocaleString()}</td>
              <td><AIResultValue value={s.diff} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 2. DSR Fulfillment ---------------------------------------------------------
function DsrFulfillment() {
  const requestSources = useSavedChoices('data-subject-requests');
  const [dossierResult, setDossierResult] = useState(null);
  const [requestId, setRequestId] = useState('');
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const action = useCancelableAction();

  const refresh = async () => {
    setListLoading(true); setListError('');
    try { const r = await customService.dsrFulfillmentList(); setList(r.data.data || []); }
    catch (e) { setListError(e.response?.data?.error || e.message || 'Unknown source error'); }
    finally { setListLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const generate = async () => {
    const response = await action.run(signal => customService.dsrFulfillmentGenerate({ request_id: parseInt(requestId) }, { signal }));
    if (!response) return;
    setDossierResult(response.data.dossier?.dossier || response.data.dossier);
    toast.success('Dossier generated');
    await refresh();
  };

  return (
    <div className="card">
      <h3>📦 DSR Fulfillment Pipeline</h3>
      <p className="text-muted">Walks the processing-activities catalog + vendor sub-processors and assembles a GDPR Article 15 "right of access" dossier for the given DSR.</p>
<NativeSourceExamples sources={requestSources} value={requestId} onChange={setRequestId} disabled={action.loading} sourceName="data subject request" />
      <SavedSourcePicker sources={requestSources} value={requestId} onChange={setRequestId} label="Data subject request" labelField="requester_name" />
      <AIControls action={action} onGenerate={generate} disabled={!requestId} generateLabel="Generate dossier with OpenRouter" />

      {dossierResult && <AIResultView response={dossierResult} title="DSR dossier draft" />}
      <h4 style={{ marginTop: 24 }}>Generated Dossiers</h4>
      <ListStatus loading={listLoading} error={listError} retry={refresh} noun="Dossier history" />
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
  const breachSources = useSavedChoices('data-breaches');
  const [notificationDraft, setNotificationDraft] = useState(null);
  const [breachId, setBreachId] = useState('');
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const action = useCancelableAction();
  const refresh = async () => {
    setListLoading(true); setListError('');
    try { const r = await customService.breachCountdownList(); setList(r.data.data || []); }
    catch (e) { setListError(e.response?.data?.error || e.message || 'Unknown source error'); }
    finally { setListLoading(false); }
  };
  useEffect(() => { refresh(); const t = setInterval(refresh, 30_000); return () => clearInterval(t); }, []);

  const register = async () => {
    const response = await action.run(signal => customService.breachCountdownRegister({ breach_id: parseInt(breachId) }, { signal }));
    if (!response) return;
    setNotificationDraft(response.data.countdown?.ai_draft_notification);
    toast.success('Countdown registered with AI-drafted notification');
    await refresh();
  };

  return (
    <div className="card">
      <h3>⏱️ Breach 72h Countdown Agent</h3>
      <p className="text-muted">Registers a 72-hour supervisory-authority deadline for a breach record, AI drafts the notification, and a background worker re-evaluates every 60s, marking notified once &lt; 12h remain.</p>
<NativeSourceExamples sources={breachSources} value={breachId} onChange={setBreachId} disabled={action.loading} sourceName="breach" />
      <SavedSourcePicker sources={breachSources} value={breachId} onChange={setBreachId} label="Saved breach" labelField="incident_title" />
      <AIControls action={action} onGenerate={register} disabled={!breachId} generateLabel="Generate notification and countdown with OpenRouter" />

      {notificationDraft && <AIResultView response={notificationDraft} title="Breach notification draft" />}
      <h4 style={{ marginTop: 24 }}>Active Countdowns</h4>
      <ListStatus loading={listLoading} error={listError} retry={refresh} noun="Countdown history" />
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
  const vendorSources = useSavedChoices('vendors');
  const [recommendations, setRecommendations] = useState(null);
  const [list, setList] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const action = useCancelableAction();
  const refresh = async () => {
    setListLoading(true); setListError('');
    try { const r = await customService.vendorCalendarList(); setList(r.data.data || []); }
    catch (e) { setListError(e.response?.data?.error || e.message || 'Unknown source error'); }
    finally { setListLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const sync = async () => {
    setSyncLoading(true);
    try { const r = await customService.vendorCalendarSync(); toast.success(`Synced — ${r.data.inserted} new deadlines`); await refresh(); }
    catch (e) { toast.error(e.response?.data?.error || 'Sync failed'); }
    finally { setSyncLoading(false); }
  };
  const recommend = async () => {
    const response = await action.run(signal => customService.vendorCalendarRecommend({ vendor_id: parseInt(vendorId) }, { signal }));
    if (!response) return;
    setRecommendations(response.data.recommendations); toast.success('AI recommendations added'); await refresh();
  };

  return (
    <div className="card">
      <h3>📅 Vendor Renewal & Audit Calendar</h3>
      <p className="text-muted">Auto-creates compliance_deadlines from vendor.contract_end_date and missing DPAs. AI can recommend further questionnaire updates per vendor.</p>
      <button className="btn btn-primary" onClick={sync} disabled={syncLoading || action.loading}>{syncLoading ? 'Syncing…' : 'Sync from Vendors'}</button>
      <NativeSourceExamples sources={vendorSources} value={vendorId} onChange={setVendorId} disabled={action.loading || syncLoading} sourceName="vendor" />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
<SavedSourcePicker sources={vendorSources} value={vendorId} onChange={setVendorId} label="Saved vendor" labelField="vendor_name" />
      </div>
      <AIControls action={action} onGenerate={recommend} disabled={!vendorId || syncLoading} generateLabel="Generate vendor recommendations with OpenRouter" />

      {recommendations && <AIResultView response={recommendations} title="Vendor review recommendations" />}
      <h4 style={{ marginTop: 24 }}>Upcoming Deadlines</h4>
      <ListStatus loading={listLoading} error={listError} retry={refresh} noun="Vendor deadlines" />
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
  const [topK, setTopK] = useState(3);
  const [answer, setAnswer] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const action = useCancelableAction();

  const refresh = async () => {
    setListLoading(true); setListError('');
    try { const r = await customService.policyCorpusList({ limit: 50 }); setList(r.data.data || []); }
    catch (e) { setListError(e.response?.data?.error || e.message || 'Unknown source error'); }
    finally { setListLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const upload = async () => {
    if (!title || !content) return toast.warn('Title and content required');
    setUploadLoading(true);
    try { await customService.policyCorpusUpload({ title, content, category }); toast.success('Policy added to corpus'); setTitle(''); setContent(''); setCategory(''); await refresh(); }
    catch (e) { toast.error(e.response?.data?.error || 'Upload failed'); }
    finally { setUploadLoading(false); }
  };
  const ask = async () => {
    if (!question) return;
    setAnswer(null);
    const r = await action.run(signal => customService.policyCorpusQuery({ question, top_k: Number(topK) }, { signal }));
    if (r) setAnswer(r.data);
  };

  return (
    <div className="card">
      <h3>📚 Policy Corpus RAG</h3>
      <p className="text-muted">Upload your organization's policies; the AI grounds answers in the corpus instead of generic GDPR text. Keyword retrieval (no pgvector required).</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
<h4>Add a Policy Draft</h4>
          <PrivacyExamples label="Complete policy draft examples" examples={POLICY_EXAMPLES} disabled={uploadLoading || action.loading} hint="Fills the title, complete policy draft and optional category. Text is fictional and unapproved; Add to Corpus remains a separate explicit save." onFill={example => { setTitle(example.title); setContent(example.content); setCategory(example.category); }} />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Policy title" />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (optional)" style={{ marginTop: 8 }} />
          <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder="Full policy text..." style={{ marginTop: 8 }} />
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={upload} disabled={uploadLoading || action.loading}>{uploadLoading ? 'Saving draft…' : 'Add to Corpus'}</button>
        </div>
        <div>
<h4>Ask the Corpus</h4>
          <PrivacyExamples label="Complete policy query examples" examples={POLICY_EXAMPLES} disabled={uploadLoading || action.loading} hint="Fills the question and optional retrieval limit. Uses only your actual saved corpus when you explicitly ask; no policy or answer is invented." onFill={example => { setQuestion(example.question); setTopK(example.topK); }} />
          <textarea rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. What is our retention period for HR data?" />
<label style={{ display: 'block', marginTop: 8 }}>Maximum policy sources (optional) <input aria-label="Maximum policy sources" type="number" min="1" max="10" step="1" value={topK} onChange={event => setTopK(event.target.value)} /></label>
          <AIControls action={action} onGenerate={ask} disabled={!question || uploadLoading} generateLabel="Generate grounded answer with OpenRouter" />
          {answer && (
            <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <strong>Answer:</strong>
<AIResultView response={answer.answer || answer} title="Policy corpus answer" />
            </div>
          )}
        </div>
      </div>

      <h4 style={{ marginTop: 24 }}>Indexed Policies ({list.length})</h4>
      <ListStatus loading={listLoading} error={listError} retry={refresh} noun="Policy corpus" />
      <ul>
        {list.map(p => <li key={p.id}><strong>{p.title}</strong> {p.category && <em>({p.category})</em>}</li>)}
      </ul>
    </div>
  );
}
