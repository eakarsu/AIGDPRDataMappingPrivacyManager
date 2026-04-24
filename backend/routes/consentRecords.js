const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM consent_records';
    let params = [];
    if (search) {
      sql += ' WHERE data_subject_name ILIKE $1 OR data_subject_email ILIKE $1 OR consent_type ILIKE $1';
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
    const result = await query('SELECT * FROM consent_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { data_subject_name, data_subject_email, consent_type, purpose, legal_basis, consent_given, consent_date, withdrawal_date, expiry_date, collection_method, consent_text, version, ip_address, granularity, freely_given, specific, informed, unambiguous, status } = req.body;
    const result = await query(
      `INSERT INTO consent_records (data_subject_name, data_subject_email, consent_type, purpose, legal_basis, consent_given, consent_date, withdrawal_date, expiry_date, collection_method, consent_text, version, ip_address, granularity, freely_given, specific, informed, unambiguous, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [data_subject_name, data_subject_email, consent_type, purpose, legal_basis || 'consent', consent_given, consent_date, withdrawal_date, expiry_date, collection_method, consent_text, version, ip_address, granularity, freely_given !== false, specific !== false, informed !== false, unambiguous !== false, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { data_subject_name, data_subject_email, consent_type, purpose, legal_basis, consent_given, consent_date, withdrawal_date, expiry_date, collection_method, consent_text, version, ip_address, granularity, freely_given, specific, informed, unambiguous, status } = req.body;
    const result = await query(
      `UPDATE consent_records SET data_subject_name=$1, data_subject_email=$2, consent_type=$3, purpose=$4, legal_basis=$5, consent_given=$6, consent_date=$7, withdrawal_date=$8, expiry_date=$9, collection_method=$10, consent_text=$11, version=$12, ip_address=$13, granularity=$14, freely_given=$15, specific=$16, informed=$17, unambiguous=$18, status=$19, updated_at=NOW()
       WHERE id=$20 RETURNING *`,
      [data_subject_name, data_subject_email, consent_type, purpose, legal_basis, consent_given, consent_date, withdrawal_date, expiry_date, collection_method, consent_text, version, ip_address, granularity, freely_given, specific, informed, unambiguous, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM consent_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
