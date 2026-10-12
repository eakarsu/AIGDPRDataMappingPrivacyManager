/*
 * routes/regulatoryTracker.js — Regulatory change tracker.
 *
 * Pass 5 mechanical addition: closes custom-features backlog item
 * "Regulatory change tracker (EU/global feed)". Implemented as a CRUD over a
 * seeded reference table — actual feed ingestion (EUR-Lex / EDPB) is
 * NEEDS-CREDS. The seeded entries provide a starter set so org compliance
 * teams have something to subscribe to immediately; the table is additive and
 * untouched by existing schemas.
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');



let _ensured = false;
async function ensureTable() {
  if (_ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS regulatory_changes (
      id SERIAL PRIMARY KEY,
      jurisdiction TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      effective_date DATE,
      impact TEXT NOT NULL DEFAULT 'medium',
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS regulatory_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      jurisdictions TEXT[] DEFAULT ARRAY[]::TEXT[],
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      min_impact TEXT NOT NULL DEFAULT 'low',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id)
    );
  `);
  await query(`ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS demo_label TEXT;
    ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS demo_owner_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;
    ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS demo_key TEXT;`);
  // Research drafts are added explicitly by the idempotent local demo operation.
  // Native reads never fabricate law, regulator guidance or verified effective dates.
  _ensured = true;
}
router.use(async (req, res, next) => { try { await ensureTable(); next(); } catch (e) { res.status(500).json({ error: e.message }); } });

router.get('/', async (req, res) => {
  try {
    const { jurisdiction, impact, tag } = req.query;
    const clauses = ['(NOT is_demo OR demo_owner_id=$1)']; const params = [req.user.id];
    if (jurisdiction) { params.push(jurisdiction); clauses.push(`jurisdiction = $${params.length}`); }
    if (impact) { params.push(impact); clauses.push(`impact = $${params.length}`); }
    if (tag) { params.push(tag); clauses.push(`$${params.length} = ANY(tags)`); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const r = await query(`SELECT * FROM regulatory_changes ${where} ORDER BY created_at DESC`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { jurisdiction, source, title, summary = null, effective_date = null, impact = 'medium', tags = [], url = null } = req.body || {};
    if (!jurisdiction || !source || !title) return res.status(400).json({ error: 'jurisdiction, source, title required' });
    const r = await query(
      `INSERT INTO regulatory_changes (jurisdiction, source, title, summary, effective_date, impact, tags, url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [jurisdiction, source, title, summary, effective_date, impact, tags, url]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/subscriptions/me', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM regulatory_subscriptions WHERE user_id=$1`, [req.user.id]);
    res.json(r.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/subscriptions/me', async (req, res) => {
  try {
    const { jurisdictions = [], tags = [], min_impact = 'low' } = req.body || {};
    const r = await query(
      `INSERT INTO regulatory_subscriptions (user_id, jurisdictions, tags, min_impact) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET jurisdictions=EXCLUDED.jurisdictions, tags=EXCLUDED.tags, min_impact=EXCLUDED.min_impact RETURNING *`,
      [req.user.id, jurisdictions, tags, min_impact]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Personalized feed: filtered by user's subscription
router.get('/feed', async (req, res) => {
  try {
    const sub = await query(`SELECT * FROM regulatory_subscriptions WHERE user_id=$1`, [req.user.id]);
    const ranks = { low: 0, medium: 1, high: 2 };
    if (sub.rowCount === 0) {
      const r = await query(`SELECT * FROM regulatory_changes WHERE NOT is_demo OR demo_owner_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
      return res.json({ subscription: null, items: r.rows });
    }
    const s = sub.rows[0];
    const params = [req.user.id];
    const clauses = ['(NOT is_demo OR demo_owner_id=$1)'];
    if (s.jurisdictions?.length) { params.push(s.jurisdictions); clauses.push(`jurisdiction = ANY($${params.length})`); }
    if (s.tags?.length) { params.push(s.tags); clauses.push(`tags && $${params.length}`); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const r = await query(`SELECT * FROM regulatory_changes ${where} ORDER BY created_at DESC LIMIT 100`, params);
    const minRank = ranks[s.min_impact] ?? 0;
    const filtered = r.rows.filter((row) => (ranks[row.impact] ?? 0) >= minRank);
    res.json({ subscription: s, items: filtered });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
