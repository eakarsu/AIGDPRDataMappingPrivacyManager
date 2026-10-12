const { pool } = require('./db');

const LAWFUL_BASES = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'];
const collections = {
  processingRules: {
    table: 'privacy_processing_rules', listKey: 'rules', required: 'purpose',
    fields: ['purpose', 'lawful_basis', 'retention_period_days', 'retention_label'],
  },
  decisions: {
    table: 'privacy_decision_drafts', listKey: 'items', required: 'task',
    fields: ['task', 'owner', 'priority', 'status', 'due', 'source', 'impact', 'notes'],
  },
};
const capabilities = { canCreate: true, canEdit: true, canDelete: true, draftOnly: true, canApprove: false, canExecute: false };
function invalid(message, status = 400) { const error = new Error(message); error.status = status; return error; }
function valuesFor(config, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Draft fields are required.');
  if (Object.keys(input).some(key => !config.fields.includes(key))) throw invalid('Only the displayed planning fields can be saved; approvals and evidence are separate native actions.');
  const values = {};
  for (const key of config.fields) {
    const raw = input[key];
    if (key === 'retention_period_days' || key === 'impact') {
      if (raw === '' || raw === null || raw === undefined) { values[key] = null; continue; }
      if (!['number', 'string'].includes(typeof raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < (key === 'impact' ? 0 : 1) || Number(raw) > (key === 'impact' ? 100000 : 1000000)) throw invalid('Enter a valid whole number or leave the optional value unverified.');
      values[key] = Number(raw); continue;
    }
    if (raw !== null && raw !== undefined && typeof raw !== 'string') throw invalid('Planning text fields must contain text.');
    const text = String(raw ?? '').trim();
    if (text.length > 20000) throw invalid('Each planning field must be at most 20,000 characters.');
    values[key] = text || null;
  }
  if (!values[config.required]) throw invalid(`${config.required === 'purpose' ? 'Purpose' : 'Task'} is required.`);
  if (values.lawful_basis && !LAWFUL_BASES.includes(values.lawful_basis)) throw invalid('Select a displayed proposed lawful basis or leave it unverified.');
  if (config.table === 'privacy_decision_drafts') {
    values.priority ??= 'Medium'; values.status ??= 'Queued';
    if (!['Critical','High','Medium','Low'].includes(values.priority) || !['Queued','In progress','Review','Done'].includes(values.status)) throw invalid('Select a displayed planning priority and status.');
    if (values.due) {
      const parsed = new Date(values.due+'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.due) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== values.due) throw invalid('Enter a valid planning date.');
    }
  }
  return values;
}
function rowView(row) { return { ...row, capabilities, review_status: 'Unreviewed planning draft' }; }
function handlersFor(name, database = pool) {
  const config = collections[name]; if (!config) throw new Error('Unknown native planning collection');
  const columns = '*, '+(name === 'decisions' ? 'due::text AS due, ' : '')+'xmin::text AS record_version';
  async function actorExists(client, actor, lock = false) {
    if (!Number.isSafeInteger(Number(actor)) || Number(actor) <= 0) throw invalid('Sign in again to access planning drafts.', 401);
    const actorRow = await client.query('SELECT id FROM users WHERE id=$1'+(lock ? ' FOR KEY SHARE' : ''), [actor]);
    if (!actorRow.rowCount) throw invalid('Sign in again to access planning drafts.', 401);
  }
  async function listRows(client, actor) {
    const result = await client.query(`SELECT ${columns} FROM ${config.table} WHERE user_id=$1 ORDER BY id DESC`, [actor]);
    return result.rows.map(rowView);
  }
  function envelope(rows) { return { ok: true, [config.listKey]: rows, count: rows.length, capabilities, ...(name === 'processingRules' ? { lawful_bases: LAWFUL_BASES } : {}) }; }
  const list = async (req, res) => {
    try { await actorExists(database, req.user?.id); res.json(envelope(await listRows(database, req.user.id))); }
    catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Saved planning records could not load. Retry shortly.' }); }
  };
  const mutate = async (req, res) => {
    let client; let begun = false; let disconnected = req.aborted || res.destroyed;
    const cancel = () => { if (!res.writableEnded) disconnected = true; };
    req.once('aborted', cancel); res.once('close', cancel);
    try {
      const body = req.body || {}, op = body.op || (req.method === 'DELETE' ? 'delete' : req.params.id ? 'update' : 'create');
      if (!['create','update','delete'].includes(op)) throw invalid('Saved records are preserved. Reset is unavailable; cancel the form to discard unsaved changes.');
      const source = body.rule || body.values || body;
      const id = req.params.id || source.id;
      const recordVersion = body.recordVersion;
      const values = { ...source }; delete values.id; delete values.op; delete values.recordVersion;
      if (op !== 'create' && (!/^\d+$/.test(String(id)) || !/^[0-9]+$/.test(String(recordVersion)))) throw invalid('Open the current saved record before editing or deleting.');
      const fields = op === 'delete' ? null : valuesFor(config, values);
      client = await database.connect(); await client.query('BEGIN'); begun = true;
      await actorExists(client, req.user?.id, true);
      if (op !== 'create') {
        const current = await client.query(`SELECT xmin::text AS record_version FROM ${config.table} WHERE id=$1 AND user_id=$2 FOR UPDATE`, [id, req.user.id]);
        if (!current.rowCount) throw invalid('Owned planning record not found.', 404);
        if (current.rows[0].record_version !== recordVersion) throw invalid('This record changed. Reload its latest version before saving.', 409);
      }
      let result;
      if (op === 'delete') result = await client.query(`DELETE FROM ${config.table} WHERE id=$1 AND user_id=$2 RETURNING *`, [id, req.user.id]);
      else if (op === 'create') result = await client.query(`INSERT INTO ${config.table} (user_id,${config.fields.join(',')}) VALUES($1,${config.fields.map((_,i)=>'$'+(i+2)).join(',')}) RETURNING ${columns}`, [req.user.id, ...config.fields.map(key => fields[key])]);
      else result = await client.query(`UPDATE ${config.table} SET ${config.fields.map((key,i)=>key+'=$'+(i+1)).join(',')},updated_at=NOW() WHERE id=$${config.fields.length+1} AND user_id=$${config.fields.length+2} RETURNING ${columns}`, [...config.fields.map(key=>fields[key]),id,req.user.id]);
      const rows = await listRows(client, req.user.id);
      if (disconnected || req.aborted || res.destroyed) throw invalid('Cancelled draft operation.', 499);
      await client.query('COMMIT'); begun = false;
      if (!disconnected) res.status(op === 'create' ? 201 : 200).json({ ...envelope(rows), op, ...(op === 'delete' ? {deleted: true} : {item: rowView(result.rows[0]), ...(name === 'processingRules' ? {rule: rowView(result.rows[0])} : {})}) });
    } catch (error) {
      if (begun) await client.query('ROLLBACK').catch(() => {});
      if (!disconnected && !res.headersSent) res.status(error.status || 500).json({ error: error.status ? error.message : 'The planning draft could not be saved. Your changes remain unsaved.' });
    } finally { req.removeListener('aborted', cancel); res.removeListener('close', cancel); client?.release(); }
  };
  return { list, mutate };
}
module.exports = { handlersFor, valuesFor, collections, LAWFUL_BASES };
