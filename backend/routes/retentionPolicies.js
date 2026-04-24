const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM retention_policies';
    let params = [];
    if (search) {
      sql += ' WHERE policy_name ILIKE $1 OR data_category ILIKE $1 OR department ILIKE $1';
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
    const result = await query('SELECT * FROM retention_policies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { policy_name, data_category, description, retention_period, retention_period_days, legal_basis, regulatory_requirement, disposal_method, department, applies_to_systems, review_frequency, last_review_date, next_review_date, data_owner, exceptions, automated_enforcement, status } = req.body;
    const result = await query(
      `INSERT INTO retention_policies (policy_name, data_category, description, retention_period, retention_period_days, legal_basis, regulatory_requirement, disposal_method, department, applies_to_systems, review_frequency, last_review_date, next_review_date, data_owner, exceptions, automated_enforcement, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [policy_name, data_category, description, retention_period, retention_period_days, legal_basis, regulatory_requirement, disposal_method, department, applies_to_systems, review_frequency, last_review_date, next_review_date, data_owner, exceptions, automated_enforcement || false, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { policy_name, data_category, description, retention_period, retention_period_days, legal_basis, regulatory_requirement, disposal_method, department, applies_to_systems, review_frequency, last_review_date, next_review_date, data_owner, exceptions, automated_enforcement, status } = req.body;
    const result = await query(
      `UPDATE retention_policies SET policy_name=$1, data_category=$2, description=$3, retention_period=$4, retention_period_days=$5, legal_basis=$6, regulatory_requirement=$7, disposal_method=$8, department=$9, applies_to_systems=$10, review_frequency=$11, last_review_date=$12, next_review_date=$13, data_owner=$14, exceptions=$15, automated_enforcement=$16, status=$17, updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [policy_name, data_category, description, retention_period, retention_period_days, legal_basis, regulatory_requirement, disposal_method, department, applies_to_systems, review_frequency, last_review_date, next_review_date, data_owner, exceptions, automated_enforcement, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM retention_policies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
