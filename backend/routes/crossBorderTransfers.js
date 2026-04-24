const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM cross_border_transfers';
    let params = [];
    if (search) {
      sql += ' WHERE transfer_name ILIKE $1 OR source_country ILIKE $1 OR destination_country ILIKE $1';
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
    const result = await query('SELECT * FROM cross_border_transfers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { transfer_name, source_country, destination_country, data_categories, data_subjects, transfer_mechanism, legal_basis, recipient_name, recipient_type, adequacy_decision, safeguards_description, tia_completed, tia_date, supplementary_measures, volume_estimate, frequency, encryption_in_transit, encryption_at_rest, department, risk_level, status, review_date } = req.body;
    const result = await query(
      `INSERT INTO cross_border_transfers (transfer_name, source_country, destination_country, data_categories, data_subjects, transfer_mechanism, legal_basis, recipient_name, recipient_type, adequacy_decision, safeguards_description, tia_completed, tia_date, supplementary_measures, volume_estimate, frequency, encryption_in_transit, encryption_at_rest, department, risk_level, status, review_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
      [transfer_name, source_country, destination_country, data_categories, data_subjects, transfer_mechanism, legal_basis, recipient_name, recipient_type, adequacy_decision || false, safeguards_description, tia_completed || false, tia_date, supplementary_measures, volume_estimate, frequency, encryption_in_transit !== false, encryption_at_rest !== false, department, risk_level || 'medium', status || 'active', review_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { transfer_name, source_country, destination_country, data_categories, data_subjects, transfer_mechanism, legal_basis, recipient_name, recipient_type, adequacy_decision, safeguards_description, tia_completed, tia_date, supplementary_measures, volume_estimate, frequency, encryption_in_transit, encryption_at_rest, department, risk_level, status, review_date } = req.body;
    const result = await query(
      `UPDATE cross_border_transfers SET transfer_name=$1, source_country=$2, destination_country=$3, data_categories=$4, data_subjects=$5, transfer_mechanism=$6, legal_basis=$7, recipient_name=$8, recipient_type=$9, adequacy_decision=$10, safeguards_description=$11, tia_completed=$12, tia_date=$13, supplementary_measures=$14, volume_estimate=$15, frequency=$16, encryption_in_transit=$17, encryption_at_rest=$18, department=$19, risk_level=$20, status=$21, review_date=$22, updated_at=NOW()
       WHERE id=$23 RETURNING *`,
      [transfer_name, source_country, destination_country, data_categories, data_subjects, transfer_mechanism, legal_basis, recipient_name, recipient_type, adequacy_decision, safeguards_description, tia_completed, tia_date, supplementary_measures, volume_estimate, frequency, encryption_in_transit, encryption_at_rest, department, risk_level, status, review_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM cross_border_transfers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
