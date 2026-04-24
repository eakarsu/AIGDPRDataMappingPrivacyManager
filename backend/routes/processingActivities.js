const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM processing_activities';
    let params = [];
    if (search) {
      sql += ' WHERE activity_name ILIKE $1 OR purpose ILIKE $1 OR department ILIKE $1';
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
    const result = await query('SELECT * FROM processing_activities WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, third_country_transfers, transfer_safeguards, retention_period, technical_measures, organizational_measures, data_source, automated_decision_making, dpo_review_date, department, controller_name, processor_name, status, risk_level } = req.body;
    const result = await query(
      `INSERT INTO processing_activities (activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, third_country_transfers, transfer_safeguards, retention_period, technical_measures, organizational_measures, data_source, automated_decision_making, dpo_review_date, department, controller_name, processor_name, status, risk_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, third_country_transfers || false, transfer_safeguards, retention_period, technical_measures, organizational_measures, data_source, automated_decision_making || false, dpo_review_date, department, controller_name, processor_name, status || 'active', risk_level || 'medium']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, third_country_transfers, transfer_safeguards, retention_period, technical_measures, organizational_measures, data_source, automated_decision_making, dpo_review_date, department, controller_name, processor_name, status, risk_level } = req.body;
    const result = await query(
      `UPDATE processing_activities SET activity_name=$1, purpose=$2, legal_basis=$3, data_categories=$4, data_subjects=$5, recipients=$6, third_country_transfers=$7, transfer_safeguards=$8, retention_period=$9, technical_measures=$10, organizational_measures=$11, data_source=$12, automated_decision_making=$13, dpo_review_date=$14, department=$15, controller_name=$16, processor_name=$17, status=$18, risk_level=$19, updated_at=NOW()
       WHERE id=$20 RETURNING *`,
      [activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, third_country_transfers, transfer_safeguards, retention_period, technical_measures, organizational_measures, data_source, automated_decision_making, dpo_review_date, department, controller_name, processor_name, status, risk_level, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM processing_activities WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
