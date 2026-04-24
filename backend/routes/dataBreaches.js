const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM data_breaches';
    let params = [];
    if (search) {
      sql += ' WHERE incident_title ILIKE $1 OR breach_type ILIKE $1 OR department ILIKE $1';
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
    const result = await query('SELECT * FROM data_breaches WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { incident_title, description, breach_type, severity, discovery_date, occurrence_date, containment_date, notification_date, data_categories_affected, number_of_records, number_of_individuals, systems_affected, root_cause, containment_actions, remediation_actions, supervisory_authority_notified, data_subjects_notified, notification_required, risk_to_individuals, reported_by, assigned_to, department, status, lessons_learned } = req.body;
    const result = await query(
      `INSERT INTO data_breaches (incident_title, description, breach_type, severity, discovery_date, occurrence_date, containment_date, notification_date, data_categories_affected, number_of_records, number_of_individuals, systems_affected, root_cause, containment_actions, remediation_actions, supervisory_authority_notified, data_subjects_notified, notification_required, risk_to_individuals, reported_by, assigned_to, department, status, lessons_learned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
      [incident_title, description, breach_type, severity, discovery_date, occurrence_date, containment_date, notification_date, data_categories_affected, number_of_records, number_of_individuals, systems_affected, root_cause, containment_actions, remediation_actions, supervisory_authority_notified || false, data_subjects_notified || false, notification_required !== false, risk_to_individuals, reported_by, assigned_to, department, status || 'investigating', lessons_learned]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { incident_title, description, breach_type, severity, discovery_date, occurrence_date, containment_date, notification_date, data_categories_affected, number_of_records, number_of_individuals, systems_affected, root_cause, containment_actions, remediation_actions, supervisory_authority_notified, data_subjects_notified, notification_required, risk_to_individuals, reported_by, assigned_to, department, status, lessons_learned } = req.body;
    const result = await query(
      `UPDATE data_breaches SET incident_title=$1, description=$2, breach_type=$3, severity=$4, discovery_date=$5, occurrence_date=$6, containment_date=$7, notification_date=$8, data_categories_affected=$9, number_of_records=$10, number_of_individuals=$11, systems_affected=$12, root_cause=$13, containment_actions=$14, remediation_actions=$15, supervisory_authority_notified=$16, data_subjects_notified=$17, notification_required=$18, risk_to_individuals=$19, reported_by=$20, assigned_to=$21, department=$22, status=$23, lessons_learned=$24, updated_at=NOW()
       WHERE id=$25 RETURNING *`,
      [incident_title, description, breach_type, severity, discovery_date, occurrence_date, containment_date, notification_date, data_categories_affected, number_of_records, number_of_individuals, systems_affected, root_cause, containment_actions, remediation_actions, supervisory_authority_notified, data_subjects_notified, notification_required, risk_to_individuals, reported_by, assigned_to, department, status, lessons_learned, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM data_breaches WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
