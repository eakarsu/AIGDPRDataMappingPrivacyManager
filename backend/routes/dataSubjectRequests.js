const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM data_subject_requests';
    let params = [];
    if (search) {
      sql += ' WHERE requester_name ILIKE $1 OR requester_email ILIKE $1 OR request_type ILIKE $1';
      params = [`%${search}%`];
    }
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const countSql = 'SELECT COUNT(*) FROM data_subject_requests' + (search ? ' WHERE requester_name ILIKE $1 OR request_type ILIKE $1' : '');
    const countParams = search ? ['%' + search + '%'] : [];
    sql += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limitNum, (pageNum - 1) * limitNum);
    const [countResult, result] = await Promise.all([query(countSql, countParams), query(sql, params)]);
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM data_subject_requests WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { request_type, requester_name, requester_email, requester_id_verified, description, data_categories_affected, systems_affected, received_date, acknowledgement_date, due_date, completed_date, status, denial_reason, assigned_to, department, response_method, notes } = req.body;
    const result = await query(
      `INSERT INTO data_subject_requests (request_type, requester_name, requester_email, requester_id_verified, description, data_categories_affected, systems_affected, received_date, acknowledgement_date, due_date, completed_date, status, denial_reason, assigned_to, department, response_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [request_type, requester_name, requester_email, requester_id_verified || false, description, data_categories_affected, systems_affected, received_date, acknowledgement_date, due_date, completed_date, status || 'pending', denial_reason, assigned_to, department, response_method, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { request_type, requester_name, requester_email, requester_id_verified, description, data_categories_affected, systems_affected, received_date, acknowledgement_date, due_date, completed_date, status, denial_reason, assigned_to, department, response_method, notes } = req.body;
    const result = await query(
      `UPDATE data_subject_requests SET request_type=$1, requester_name=$2, requester_email=$3, requester_id_verified=$4, description=$5, data_categories_affected=$6, systems_affected=$7, received_date=$8, acknowledgement_date=$9, due_date=$10, completed_date=$11, status=$12, denial_reason=$13, assigned_to=$14, department=$15, response_method=$16, notes=$17, updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [request_type, requester_name, requester_email, requester_id_verified, description, data_categories_affected, systems_affected, received_date, acknowledgement_date, due_date, completed_date, status, denial_reason, assigned_to, department, response_method, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM data_subject_requests WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
