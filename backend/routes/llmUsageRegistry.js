/*
 * routes/llmUsageRegistry.js — Registry for org's own LLM / foundation-model usage.
 *
 * Pass 5 mechanical addition: closes custom-features backlog item
 * "LLM/foundation-model usage auditor". Records each LLM tool the org uses
 * (ChatGPT, Claude, Gemini, internal Llama, etc.) with data residency, vendor
 * tier (consumer vs enterprise), DPA status, and personal-data flag. Pure
 * additive CRUD over a new table; no integration with vendor APIs (NEEDS-CREDS).
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');

const TIERS = ['consumer', 'team', 'enterprise', 'self-hosted'];
const DPA_STATUSES = ['none', 'requested', 'signed', 'not_applicable'];

let _ensured = false;
async function ensureTable() {
  if (_ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS llm_usage_registry (
      id SERIAL PRIMARY KEY,
      vendor TEXT NOT NULL,
      product TEXT NOT NULL,
      business_owner TEXT,
      tier TEXT NOT NULL DEFAULT 'consumer',
      data_residency TEXT,
      processes_personal_data BOOLEAN DEFAULT FALSE,
      processes_special_categories BOOLEAN DEFAULT FALSE,
      dpa_status TEXT NOT NULL DEFAULT 'none',
      training_opt_out BOOLEAN DEFAULT FALSE,
      retention_days INTEGER,
      use_case TEXT,
      risk_score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _ensured = true;
}
router.use(async (req, res, next) => { try { await ensureTable(); next(); } catch (e) { res.status(500).json({ error: e.message }); } });

// Heuristic risk score (0-100), deterministic
function scoreRow(row) {
  let s = 0;
  if (row.processes_personal_data) s += 30;
  if (row.processes_special_categories) s += 30;
  if (row.tier === 'consumer') s += 20;
  else if (row.tier === 'team') s += 10;
  if (row.dpa_status === 'none') s += 15;
  else if (row.dpa_status === 'requested') s += 8;
  if (!row.training_opt_out) s += 10;
  if (!row.data_residency || row.data_residency === 'unknown') s += 5;
  return Math.min(100, s);
}

router.get('/', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM llm_usage_registry ORDER BY risk_score DESC NULLS LAST, created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.vendor || !b.product) return res.status(400).json({ error: 'vendor and product required' });
    if (b.tier && !TIERS.includes(b.tier)) return res.status(400).json({ error: `tier must be one of ${TIERS.join(', ')}` });
    if (b.dpa_status && !DPA_STATUSES.includes(b.dpa_status)) return res.status(400).json({ error: `dpa_status must be one of ${DPA_STATUSES.join(', ')}` });
    const row = {
      tier: b.tier || 'consumer',
      processes_personal_data: !!b.processes_personal_data,
      processes_special_categories: !!b.processes_special_categories,
      dpa_status: b.dpa_status || 'none',
      training_opt_out: !!b.training_opt_out,
      data_residency: b.data_residency || null,
    };
    const score = scoreRow(row);
    const r = await query(
      `INSERT INTO llm_usage_registry (vendor, product, business_owner, tier, data_residency, processes_personal_data, processes_special_categories, dpa_status, training_opt_out, retention_days, use_case, risk_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [b.vendor, b.product, b.business_owner || null, row.tier, row.data_residency,
        row.processes_personal_data, row.processes_special_categories, row.dpa_status,
        row.training_opt_out, b.retention_days || null, b.use_case || null, score]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const fields = ['vendor','product','business_owner','tier','data_residency','processes_personal_data','processes_special_categories','dpa_status','training_opt_out','retention_days','use_case'];
    const sets = []; const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { params.push(req.body[f]); sets.push(`${f} = $${params.length}`); } });
    if (sets.length === 0) return res.status(400).json({ error: 'no fields' });
    // Recompute score from merged record after update
    params.push(req.params.id);
    const upd = await query(`UPDATE llm_usage_registry SET ${sets.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${params.length} RETURNING *`, params);
    if (upd.rowCount === 0) return res.status(404).json({ error: 'not found' });
    const score = scoreRow(upd.rows[0]);
    const r2 = await query(`UPDATE llm_usage_registry SET risk_score=$1 WHERE id=$2 RETURNING *`, [score, req.params.id]);
    res.json(r2.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await query(`DELETE FROM llm_usage_registry WHERE id=$1`, [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const r = await query(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE processes_personal_data)::int AS pii_handlers,
        COUNT(*) FILTER (WHERE dpa_status='none')::int AS no_dpa,
        COUNT(*) FILTER (WHERE tier='consumer')::int AS consumer_tier,
        AVG(risk_score)::int AS avg_risk_score
      FROM llm_usage_registry`);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
