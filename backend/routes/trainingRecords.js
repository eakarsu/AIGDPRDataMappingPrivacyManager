const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM training_records';
    let params = [];
    if (search) {
      sql += ' WHERE training_name ILIKE $1 OR employee_name ILIKE $1 OR training_type ILIKE $1';
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
    const result = await query('SELECT * FROM training_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { training_name, training_type, description, provider, delivery_method, duration_hours, employee_name, employee_email, employee_department, employee_role, assigned_date, completion_date, expiry_date, score, passing_score, passed, certificate_issued, topics_covered, status, notes } = req.body;
    const result = await query(
      `INSERT INTO training_records (training_name, training_type, description, provider, delivery_method, duration_hours, employee_name, employee_email, employee_department, employee_role, assigned_date, completion_date, expiry_date, score, passing_score, passed, certificate_issued, topics_covered, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [training_name, training_type, description, provider, delivery_method, duration_hours, employee_name, employee_email, employee_department, employee_role, assigned_date, completion_date, expiry_date, score, passing_score || 80, passed || false, certificate_issued || false, topics_covered, status || 'assigned', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { training_name, training_type, description, provider, delivery_method, duration_hours, employee_name, employee_email, employee_department, employee_role, assigned_date, completion_date, expiry_date, score, passing_score, passed, certificate_issued, topics_covered, status, notes } = req.body;
    const result = await query(
      `UPDATE training_records SET training_name=$1, training_type=$2, description=$3, provider=$4, delivery_method=$5, duration_hours=$6, employee_name=$7, employee_email=$8, employee_department=$9, employee_role=$10, assigned_date=$11, completion_date=$12, expiry_date=$13, score=$14, passing_score=$15, passed=$16, certificate_issued=$17, topics_covered=$18, status=$19, notes=$20, updated_at=NOW()
       WHERE id=$21 RETURNING *`,
      [training_name, training_type, description, provider, delivery_method, duration_hours, employee_name, employee_email, employee_department, employee_role, assigned_date, completion_date, expiry_date, score, passing_score, passed, certificate_issued, topics_covered, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM training_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
