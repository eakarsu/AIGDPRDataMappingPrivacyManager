import React, { useCallback, useEffect, useRef, useState } from 'react';
import RecordDialog from '../components/RecordDialog';

export default function TransferImpactAssessmentQueue() {
  const [data,setData] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState(''), [selected,setSelected] = useState(null);
  const request = useRef(null);
  const base = process.env.REACT_APP_API_URL || '/api';
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(base+'/transfer-impact-assessment-queue',{signal:controller.signal,headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})}});
      if(response.status===401)throw new Error('Your session expired. Sign in again to load saved transfers.');
      if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('The transfer API did not return JSON. Check the API connection.');
      const result = await response.json();
      if(!response.ok)throw new Error(result.error || 'Saved transfer records are unavailable.');
      if(!Array.isArray(result.queue) || result.queue.some(item=>!item.id))throw new Error('The API did not return saved transfer records.');
      if(!controller.signal.aborted && request.current===controller)setData(result);
    } catch(failure) { if(!controller.signal.aborted && request.current===controller)setError(failure.message); }
    finally { if(!controller.signal.aborted && request.current===controller)setLoading(false); }
  },[base]);
  useEffect(()=>{load();return()=>request.current?.abort();},[load]);
  return <section className="page-container" data-testid="native-tia-queue">
    <div className="page-header"><div><h1>Transfer Impact Assessment Queue</h1><p>Planning priorities calculated from saved cross-border transfer records. The score is a deterministic review aid; it does not verify a transfer, complete a TIA or authorize any legal action.</p></div><button type="button" className="btn btn-secondary" disabled={loading} onClick={load}>Refresh transfers</button></div>
    <p role="status">{loading?'Loading saved transfers…':error?'The latest load failed.':(data?.summary.total ?? 0)+' saved cross-border transfer records'}</p>
    {error && <div role="alert" className="error-msg">{error} {data && 'The displayed rows are from the previous successful load.'} <button type="button" className="btn btn-secondary" onClick={load}>Retry transfers</button></div>}
    {!loading && data && <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Saved transfer</th><th>Destination</th><th>Recorded mechanism</th><th>Recorded TIA status</th><th>Planning priority</th><th>Heuristic score</th></tr></thead><tbody>{data.queue.map(item=><tr key={item.id} tabIndex={0} onClick={()=>setSelected(item)} onKeyDown={event=>{if(event.target===event.currentTarget && ['Enter',' '].includes(event.key)){event.preventDefault();setSelected(item);}}}><td>{item.name}{item.is_demo && <small>{item.demo_label || 'Fictional demo · Unreviewed'}</small>}</td><td>{item.destination_country || 'Not supplied'}</td><td>{item.mechanism || 'Unverified'}</td><td>{item.tia_completed===true?'Marked completed in source · Verify documentation':'Review required / unverified'}</td><td>{item.priority.replaceAll('_',' ')}</td><td>{item.risk_score} / 100</td></tr>)}{!data.queue.length && <tr><td colSpan={6}>No saved transfers are available.</td></tr>}</tbody></table></div>}
    {selected && <RecordDialog title="Saved transfer · Planning review" onClose={()=>setSelected(null)}><h3>{selected.name}</h3><p>Saved source ID: {selected.id}. This view keeps recorded evidence and TIA completion status unchanged. Edit the source in Cross-Border Transfers using its native permissions.</p><dl className="detail-grid"><div><dt>Destination</dt><dd>{selected.destination_country || 'Unverified'}</dd></div><div><dt>Recorded mechanism</dt><dd>{selected.mechanism || 'Unverified'}</dd></div><div><dt>Planning priority</dt><dd>{selected.priority.replaceAll('_',' ')}</dd></div><div><dt>Heuristic review score</dt><dd>{selected.risk_score} / 100</dd></div></dl><h4>Suggested review checks</h4><ul>{selected.required_artifacts.map(check=><li key={check}>{check}</li>)}</ul><p>Checks are recommendations to review actual documents, not assertions that those documents exist or are approved.</p></RecordDialog>}
  </section>;
}
