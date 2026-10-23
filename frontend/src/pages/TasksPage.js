import React, { useEffect, useState } from 'react';
// Feature-pack: authenticated tasks, search/filter, CSV/JSON export, domain AI with deterministic fallback.
export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [title, setTitle] = useState('');
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token') || '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const load = async () => {
    try {
      const qs = new URLSearchParams(); if (search) qs.set('search', search); if (status) qs.set('status', status);
      const r = await fetch(`/api/tasks?${qs}`, { headers }); const d = await r.json();
      setTasks(Array.isArray(d.data) ? d.data : []); setError(r.ok ? '' : (d.error || 'Failed to load'));
    } catch (e) { setError(String(e.message || e)); }
  };
  useEffect(() => { load(); }, []);
  const create = async () => { const r = await fetch('/api/tasks', { method: 'POST', headers, body: JSON.stringify({ title }) }); if (r.ok) { setTitle(''); load(); } };
  const markDone = async (t) => { await fetch(`/api/tasks/${t.id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'done' }) }); load(); };
  const runAi = async (mode) => { const r = await fetch(`/api/tasks/ai/${mode}`, { method: 'POST', headers }); setInsights(await r.json()); };
  const fmt = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (<main>
    <section aria-label="Tasks"><h1>Privacy Tasks</h1>
      <label>Search <input aria-label="Search tasks" value={search} onChange={e=>setSearch(e.target.value)} /></label>
      <label>Status <select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option><option>todo</option><option>in_progress</option><option>blocked</option><option>done</option></select></label>
      <button onClick={load}>Apply search/filter</button>
      <a href="/api/tasks/export?format=csv">Export CSV</a>{' '}<a href="/api/tasks/export?format=json">Export JSON</a>
    </section>
    <section aria-label="Create task"><h2>Create task</h2><label>Title <input aria-label="Task title" value={title} onChange={e=>setTitle(e.target.value)} /></label><button onClick={create}>Create</button></section>
    <section aria-label="Task list"><h2>Task list</h2>{error ? <p>{error}</p> : null}
      {tasks.length === 0 ? <p>No tasks (0)</p> : tasks.map(t=>(<article key={String(t.id)}><h3>{fmt(t.title)}</h3><dl><dt>Status</dt><dd>{fmt(t.status)}</dd><dt>Priority</dt><dd>{fmt(t.priority)}</dd><dt>Description</dt><dd>{fmt(t.description)}</dd><dt>Record ref</dt><dd>{fmt(t.record_ref)}</dd></dl><button onClick={()=>markDone(t)}>Mark done (update)</button></article>))}
    </section>
    <section aria-label="AI insights"><h2>AI insights</h2><p>Label: aiGenerated is shown explicitly, including false</p>
      <button onClick={()=>runAi("prioritize")}>AI prioritize</button>
      <button onClick={()=>runAi("summary")}>AI summary</button>
      <button onClick={()=>runAi("risk-overview")}>AI risk-overview</button>
      {insights ? (<div><dl><dt>aiGenerated</dt><dd>{fmt(insights.aiGenerated)}</dd><dt>Fallback</dt><dd>{fmt(insights.fallback)}</dd><dt>Label</dt><dd>{fmt(insights.label)}</dd><dt>Summary</dt><dd>{fmt(insights.summary)}</dd><dt>Completion rate</dt><dd>{fmt(insights.completionRate)}</dd></dl>
      <h3>Labelled sections</h3>{Array.isArray(insights.sections) ? insights.sections.map((s,i)=>(<div key={i}><span>{fmt(s.label)}: </span><span>{fmt(s.value)}</span></div>)) : <p>No sections</p>}</div>) : <p>No insights yet</p>}
    </section>
  </main>);
}
