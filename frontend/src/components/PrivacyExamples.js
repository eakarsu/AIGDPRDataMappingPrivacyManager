import React, { useEffect, useState } from 'react';
import { createCrudService } from '../services/api';

export const COOKIE_EXAMPLES = [
  { label: 'Storefront cookies', domain: 'shop.example.com', headers: 'Set-Cookie: session=fictional-demo; HttpOnly; Secure; SameSite=Lax\nSet-Cookie: _ga=fictional-demo; Secure; SameSite=Lax' },
  { label: 'Support portal cookies', domain: 'support.example.com', headers: 'Set-Cookie: support_session=fictional-demo; HttpOnly; Secure; SameSite=Strict\nSet-Cookie: preferences=fictional-demo; Secure; SameSite=Lax' },
  { label: 'Analytics cookies', domain: 'analytics.example.com', headers: 'Set-Cookie: analytics_session=fictional-demo; Secure; SameSite=Lax\nSet-Cookie: experiment_group=fictional-demo; Secure; SameSite=Lax' },
];
export const POLICY_EXAMPLES = [
  { label: 'Retention review', title: 'Fictional retention policy draft', category: 'Demo · Retention', content: 'Fictional training draft only. Define a purpose-based retention schedule, identify the responsible owner and request verification of statutory and contractual requirements before approving any period. No approved retention period is supplied.', question: 'What retention requirements are documented in the saved policies, and which periods still require verification?', topK: 3 },
  { label: 'Access request review', title: 'Fictional access-request policy draft', category: 'Demo · Data subject rights', content: 'Fictional training draft only. Verify the requester through the approved identity process, locate their actual owned records, and require privacy review before producing or releasing an access package. This draft grants no access or approval.', question: 'Which saved policies describe identity verification and review before fulfilling an access request?', topK: 5 },
  { label: 'Vendor review', title: 'Fictional vendor policy draft', category: 'Demo · Vendor review', content: 'Fictional training draft only. Inventory proposed processing purposes and data categories, request actual DPA and transfer evidence, and require authorized review before onboarding a vendor. No DPA signature or transfer authorization is asserted.', question: 'What vendor review and transfer evidence do the actual saved policies require, and what is missing?', topK: 8 },
];
export function PrivacyExamples({ label = 'Complete native AI examples', examples, disabled, onFill, hint }) {
  const [notice, setNotice] = useState('');
  return <section aria-label={label} style={{ padding: 14, margin: '12px 0 16px', border: '1px solid #a5b4fc', borderRadius: 10, background: '#f5f7ff' }}>
    <strong>Demo AI · Fill all fields</strong>
    <p style={{ margin: '6px 0 10px', fontSize: 13 }}>{hint || 'Fills the complete draft form, including optional inputs. Generate is a separate action; no request or saved record is created.'}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{examples.map((example, index) => <button key={example.label} type="button" className="btn btn-sm" disabled={disabled} onClick={() => { onFill(example, index); setNotice(`Example ${index + 1} filled. Review the illustrative inputs, then explicitly generate.`); }}>{example.label}</button>)}</div>
    {notice && <p role="status" style={{ marginBottom: 0, fontSize: 13 }}>{notice}</p>}
  </section>;
}
export function useSavedChoices(endpoint) {
  const [rows, setRows] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    createCrudService(endpoint).getAll().then(response => {
      const records = Array.isArray(response.data) ? response.data : response.data?.data;
      if (!Array.isArray(records)) throw new Error('The source API did not return a record list.');
      if (active) setRows(records);
    }).catch(cause => { if (active) setError(cause.response?.data?.error || cause.message || 'Saved sources are unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, revision]);
  return { rows, error, loading, retry: () => setRevision(previous => previous + 1) };
}
export function SavedSourcePicker({ sources, value, onChange, label, labelField, optional = false }) {
  return <div className="form-group"><label>{label}{optional ? ' (optional)' : ''}</label>
    {sources.error && <p role="alert">Saved sources could not load: {sources.error} <button type="button" className="btn btn-sm" onClick={sources.retry}>Retry sources</button></p>}
    <select aria-label={label} value={value} disabled={sources.loading || Boolean(sources.error)} onChange={event => onChange(event.target.value)}>
      <option value="">{sources.loading ? 'Loading saved records…' : optional ? 'Use a fictional unlinked example' : 'Select an actual saved source'}</option>
      {sources.rows.map(row => <option key={row.id} value={String(row.id)}>{row[labelField] || `Saved record ${row.id}`}{row.is_demo === true || row.demo_label ? ' · Labeled demo' : ''}</option>)}
    </select>
    {!sources.loading && !sources.error && !sources.rows.length && <p role="status">No saved source is available. Add a legitimate draft record through its native table before generating.</p>}
  </div>;
}
export function NativeSourceExamples({ sources, value, onChange, disabled, sourceName }) {
  const current = sources.rows.find(row => String(row.id) === String(value));
  const demos = sources.rows.filter(row => row.is_demo === true || /synthetic|fictional|demo|training/i.test(row.demo_label || row.requester_name || row.incident_title || row.vendor_name || ''));
  const candidates = demos.length ? demos : sources.rows;
  const unavailable = !current && !candidates.length;
  return <PrivacyExamples
    label={`Complete ${sourceName} examples`}
    examples={[{ label: 'Saved source · Quick review' }, { label: 'Saved source · Planning review' }, { label: 'Saved source · Detailed review' }]}
    disabled={disabled || sources.loading || Boolean(sources.error) || unavailable}
    hint={`This native request contains only an existing saved ${sourceName} reference. A selected source is preserved. From blank, each example selects an authentic available record${demos.length ? ' that is explicitly labeled for demo/training use' : ''}; real IDs, evidence and approvals are never invented. ${unavailable ? `No saved ${sourceName} is available.` : ''}`}
    onFill={(_, index) => onChange(String((current || candidates[index % candidates.length]).id))}
  />;
}
