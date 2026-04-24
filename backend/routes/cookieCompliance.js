const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM cookie_compliance';
    let params = [];
    if (search) {
      sql += ' WHERE cookie_name ILIKE $1 OR domain ILIKE $1 OR category ILIKE $1 OR provider ILIKE $1';
      params = [`%${search}%`];
    }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM cookie_compliance WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { cookie_name, domain, category, purpose, provider, duration, type, data_collected, consent_required, consent_mechanism, opt_out_available, privacy_policy_link, country_scope, legal_basis, last_scan_date, compliant, status, notes } = req.body;
    const result = await query(
      `INSERT INTO cookie_compliance (cookie_name, domain, category, purpose, provider, duration, type, data_collected, consent_required, consent_mechanism, opt_out_available, privacy_policy_link, country_scope, legal_basis, last_scan_date, compliant, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [cookie_name, domain, category, purpose, provider, duration, type, data_collected, consent_required !== false, consent_mechanism, opt_out_available !== false, privacy_policy_link, country_scope, legal_basis, last_scan_date, compliant !== false, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { cookie_name, domain, category, purpose, provider, duration, type, data_collected, consent_required, consent_mechanism, opt_out_available, privacy_policy_link, country_scope, legal_basis, last_scan_date, compliant, status, notes } = req.body;
    const result = await query(
      `UPDATE cookie_compliance SET cookie_name=$1, domain=$2, category=$3, purpose=$4, provider=$5, duration=$6, type=$7, data_collected=$8, consent_required=$9, consent_mechanism=$10, opt_out_available=$11, privacy_policy_link=$12, country_scope=$13, legal_basis=$14, last_scan_date=$15, compliant=$16, status=$17, notes=$18, updated_at=NOW()
       WHERE id=$19 RETURNING *`,
      [cookie_name, domain, category, purpose, provider, duration, type, data_collected, consent_required, consent_mechanism, opt_out_available, privacy_policy_link, country_scope, legal_basis, last_scan_date, compliant, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM cookie_compliance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
