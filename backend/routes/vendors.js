const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM vendors';
    let params = [];
    if (search) {
      sql += ' WHERE vendor_name ILIKE $1 OR vendor_type ILIKE $1 OR country ILIKE $1';
      params = [`%${search}%`];
    }
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const countSql = 'SELECT COUNT(*) FROM vendors' + (search ? ' WHERE vendor_name ILIKE $1 OR vendor_type ILIKE $1' : '');
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
    const result = await query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { vendor_name, vendor_type, contact_name, contact_email, country, services_provided, data_categories_shared, legal_basis, dpa_signed, dpa_date, scc_in_place, risk_level, last_audit_date, next_audit_date, certifications, sub_processors, data_breach_notification_hours, contract_start_date, contract_end_date, status, notes } = req.body;
    const result = await query(
      `INSERT INTO vendors (vendor_name, vendor_type, contact_name, contact_email, country, services_provided, data_categories_shared, legal_basis, dpa_signed, dpa_date, scc_in_place, risk_level, last_audit_date, next_audit_date, certifications, sub_processors, data_breach_notification_hours, contract_start_date, contract_end_date, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [vendor_name, vendor_type, contact_name, contact_email, country, services_provided, data_categories_shared, legal_basis, dpa_signed || false, dpa_date, scc_in_place || false, risk_level || 'medium', last_audit_date, next_audit_date, certifications, sub_processors, data_breach_notification_hours || 72, contract_start_date, contract_end_date, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { vendor_name, vendor_type, contact_name, contact_email, country, services_provided, data_categories_shared, legal_basis, dpa_signed, dpa_date, scc_in_place, risk_level, last_audit_date, next_audit_date, certifications, sub_processors, data_breach_notification_hours, contract_start_date, contract_end_date, status, notes } = req.body;
    const result = await query(
      `UPDATE vendors SET vendor_name=$1, vendor_type=$2, contact_name=$3, contact_email=$4, country=$5, services_provided=$6, data_categories_shared=$7, legal_basis=$8, dpa_signed=$9, dpa_date=$10, scc_in_place=$11, risk_level=$12, last_audit_date=$13, next_audit_date=$14, certifications=$15, sub_processors=$16, data_breach_notification_hours=$17, contract_start_date=$18, contract_end_date=$19, status=$20, notes=$21, updated_at=NOW()
       WHERE id=$22 RETURNING *`,
      [vendor_name, vendor_type, contact_name, contact_email, country, services_provided, data_categories_shared, legal_basis, dpa_signed, dpa_date, scc_in_place, risk_level, last_audit_date, next_audit_date, certifications, sub_processors, data_breach_notification_hours, contract_start_date, contract_end_date, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM vendors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
