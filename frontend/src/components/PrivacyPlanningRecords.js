import React, { useCallback, useEffect, useRef, useState } from 'react';
import RecordDialog from './RecordDialog';

const basisOptions = ['consent','contract','legal_obligation','vital_interests','public_task','legitimate_interests'];
const catalogs = {
  rules: {
    title: 'Processing Rules', path: '/custom-views/processing-rules', listKey: 'rules', required: 'purpose',
    note: 'Saved purpose and retention proposals. A draft lawful basis or retention period is not an approved policy, statutory deadline or evidence of consent.',
    fields: [
      {key:'purpose',label:'Processing purpose',type:'textarea'},
      {key:'lawful_basis',label:'Proposed lawful basis',type:'select',options:basisOptions},
      {key:'retention_period_days',label:'Proposed retention (days)',type:'number',min:1,max:1000000},
      {key:'retention_label',label:'Retention review notes',type:'textarea'},
    ],
  },
  decisions: {
    title: 'Privacy Rights Decision Center', path: '/privacy-decision-drafts', listKey: 'items', required: 'task',
    note: 'Saved planning drafts only. Planning status does not approve a rights request, verify evidence, execute erasure or create an audit receipt. Native legal review and execution gates remain separate.',
    fields: [
      {key:'task',label:'Planning task',type:'textarea'},
      {key:'owner',label:'Proposed owner or role',type:'text'},
      {key:'priority',label:'Planning priority',type:'select',options:['Critical','High','Medium','Low']},
      {key:'status',label:'Planning status',type:'select',options:['Queued','In progress','Review','Done']},
      {key:'due',label:'Proposed planning date',type:'date'},
      {key:'source',label:'Unverified source or research notes',type:'textarea'},
      {key:'impact',label:'Estimated workload (optional)',type:'number',min:0,max:100000},
      {key:'notes',label:'Review notes',type:'textarea'},
    ],
  },
};
const legacyKey = 'AIGDPRDataMappingPrivacyManager-decision-center';
function readLegacy() {
  try {
    const value = JSON.parse(localStorage.getItem(legacyKey) || 'null');
    return value && Array.isArray(value.items) ? value : null;
  } catch { return null; }
}
function display(value) { return value === null || value === undefined || value === '' ? 'Unverified / not supplied' : String(value); }

export default function PrivacyPlanningRecords({ collection }) {
  const config = catalogs[collection];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('view');
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [capabilities, setCapabilities] = useState({});
  const [legacy] = useState(() => collection === 'decisions' ? readLegacy() : null);
  const loadController = useRef(null), saveController = useRef(null), version = useRef(0);
  const base = process.env.REACT_APP_API_URL || '/api';
  const request = useCallback(async (options = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(base + config.path, { ...options, headers: { Accept: 'application/json', 'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {}) } });
    if (response.status === 401) throw new Error('Your session expired. Sign in again to load saved drafts.');
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('The records API did not return JSON. Check the API connection and sign-in state.');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Saved planning records are unavailable.');
    if (!Array.isArray(result[config.listKey])) throw new Error('The native API did not return a saved planning record list.');
    return result;
  }, [base, config]);
  const load = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController(); loadController.current = controller;
    const current = ++version.current; setLoading(true); setLoadError('');
    try {
      const result = await request({signal:controller.signal});
      if (!controller.signal.aborted && current === version.current) { setItems(result[config.listKey]); setCapabilities(result.capabilities || {}); }
    } catch (error) { if (!controller.signal.aborted && current === version.current) setLoadError(error.message); }
    finally { if (!controller.signal.aborted && current === version.current) setLoading(false); }
  }, [request, config]);
  useEffect(() => { load(); return () => { version.current++; loadController.current?.abort(); saveController.current?.abort(); }; }, [load]);
  function close() { saveController.current?.abort(); saveController.current = null; setBusy(false); setSelected(null); setMode('view'); setSaveError(''); }
  function open(item, nextMode = 'view') {
    setSelected(item); setMode(nextMode); setSaveError('');
    setDraft(Object.fromEntries(config.fields.map(field => [field.key, field.type === 'date' && item[field.key] ? item[field.key].slice(0,10) : item[field.key] ?? ''])));
  }
  async function mutate(event, op) {
    event?.preventDefault(); if (busy || !selected) return;
    if (op !== 'delete' && !String(draft[config.required] || '').trim()) { setSaveError('Enter the '+(collection === 'rules' ? 'processing purpose.' : 'planning task.')); return; }
    const controller = new AbortController(); saveController.current = controller; setBusy(true); setSaveError('');
    const values = Object.fromEntries(config.fields.map(field => [field.key, field.type === 'number' && draft[field.key] !== '' ? Number(draft[field.key]) : draft[field.key] ?? '']));
    const body = collection === 'rules' ? {op,rule:op === 'delete' ? {id:selected.id} : {...values,...(selected.id ? {id:selected.id} : {})},recordVersion:selected.record_version} : {op,values:op === 'delete' ? {id:selected.id} : {...values,...(selected.id ? {id:selected.id} : {})},recordVersion:selected.record_version};
    try {
      const result = await request({method:'POST',signal:controller.signal,body:JSON.stringify(body)});
      if (!controller.signal.aborted && saveController.current === controller) { version.current++; loadController.current?.abort(); setItems(result[config.listKey]); setCapabilities(result.capabilities || {}); setLoading(false); setLoadError(''); close(); }
    } catch (error) { if (!controller.signal.aborted && saveController.current === controller) setSaveError(error.message); }
    finally { if (saveController.current === controller) { saveController.current = null; setBusy(false); } }
  }
  const filtered = items.filter(item => config.fields.some(field => String(item[field.key] ?? '').toLowerCase().includes(search.toLowerCase())));
  return <section className="page-container" data-testid={collection+'-planning-records'}>
    <div className="page-header"><div><h1>{config.title}</h1><p>{config.note}</p></div><div className="page-header-actions"><button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>Refresh records</button><button type="button" className="btn btn-success" disabled={!capabilities.canCreate || loading || Boolean(loadError)} onClick={()=>open({},'create')}>Add planning draft</button></div></div>
    <p role="status">{loading ? 'Loading saved drafts…' : loadError ? 'The latest load failed.' : items.length+' saved drafts'}</p>
    {loadError && <div role="alert" className="error-msg">{loadError} {items.length > 0 && 'The rows below are from the previous successful load.'} <button type="button" className="btn btn-secondary" onClick={load}>Retry records</button></div>}
    <label style={{display:'block',marginBottom:12}}>Search saved drafts <input className="search-input" value={search} onChange={event=>setSearch(event.target.value)} /></label>
    {!loading && <div className="data-table-wrapper"><table className="data-table"><thead><tr>{config.fields.map(field=><th key={field.key}>{field.label}</th>)}<th>Review state</th></tr></thead><tbody>
      {filtered.map(item=><tr key={item.id} tabIndex={0} onClick={()=>open(item)} onKeyDown={event=>{if(event.target===event.currentTarget && ['Enter',' '].includes(event.key)){event.preventDefault();open(item);}}}>{config.fields.map(field=><td key={field.key}>{display(item[field.key])}</td>)}<td>{item.is_demo ? item.demo_label || 'Fictional demo · Unreviewed draft' : item.review_status || 'Unreviewed planning draft'}</td></tr>)}
      {!filtered.length && <tr><td colSpan={config.fields.length+1}>{loadError ? 'Saved drafts are unavailable.' : 'No saved drafts match this search.'}</td></tr>}
    </tbody></table></div>}
    {legacy && <details style={{marginTop:20}}><summary>Preserved legacy browser workspace · Read-only, unverified ({legacy.items.length} items)</summary><p>The earlier local workspace remains in this browser without alteration. Its claimed approvals, evidence and local audit messages have not been imported as native records or accepted as verified decisions.</p><ul>{legacy.items.map((item,index)=><li key={index}><strong>{String(item.task || 'Legacy item')}</strong> · {String(item.owner || 'Unassigned')} · Local status: {String(item.status || 'Unknown')}; claimed approval: {String(item.approval || 'Unknown')} (unverified)</li>)}</ul><p>{Array.isArray(legacy.audit) ? legacy.audit.length : 0} historical local messages remain preserved in browser storage; they are not native audit receipts.</p></details>}
    {selected && <RecordDialog title={(mode==='create'?'Add':mode==='edit'?'Edit':mode==='delete'?'Delete':'View')+' '+(collection==='rules'?'processing draft':'planning draft')} onClose={close}>
      {selected.is_demo && <p className="badge">{selected.demo_label || 'Fictional demo · Unreviewed draft'}</p>}<p>Unreviewed planning data. Native approvals, evidence and execution are separate.</p>
      {saveError && <div role="alert" className="error-msg">{saveError}</div>}
      {mode==='view' ? <><dl className="detail-grid">{config.fields.map(field=><div key={field.key}><dt>{field.label}</dt><dd>{display(selected[field.key])}</dd></div>)}</dl><div className="modal-actions"><button type="button" className="btn btn-primary" disabled={!selected.capabilities?.canEdit} onClick={()=>setMode('edit')}>Edit</button><button type="button" className="btn btn-danger" disabled={!selected.capabilities?.canDelete} onClick={()=>setMode('delete')}>Delete</button></div></> : mode==='delete' ? <><p>Delete this owned planning draft? Retained evidence and governed cases are not affected.</p><button type="button" className="btn btn-danger" disabled={busy} onClick={event=>mutate(event,'delete')}>{busy?'Deleting…':'Delete draft'}</button></> : <form onSubmit={event=>mutate(event,mode==='create'?'create':'update')}><div className="form-row">{config.fields.map(field=><label className="form-group" key={field.key}>{field.label}{field.key===config.required?' *':''}
        {field.type==='select'?<select value={draft[field.key] ?? ''} disabled={busy} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}><option value="">Unverified / not supplied</option>{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select>:field.type==='textarea'?<textarea maxLength={20000} rows={3} value={draft[field.key] ?? ''} required={field.key===config.required} disabled={busy} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>:<input type={field.type} min={field.min} max={field.max} step={field.type==='number'?1:undefined} maxLength={20000} value={draft[field.key] ?? ''} disabled={busy} onChange={event=>setDraft({...draft,[field.key]:event.target.value})}/>}
      </label>)}</div><button type="submit" className="btn btn-success" disabled={busy}>{busy?'Saving…':'Save draft'}</button></form>}
    </RecordDialog>}
  </section>;
}
