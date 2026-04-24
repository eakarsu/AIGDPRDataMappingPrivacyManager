const express = require('express');
const router = express.Router();
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM privacy_impact_assessments';
    let params = [];
    if (search) {
      sql += ' WHERE assessment_name ILIKE $1 OR project_name ILIKE $1 OR department ILIKE $1';
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
    const result = await query('SELECT * FROM privacy_impact_assessments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { assessment_name, project_name, description, assessment_type, department, assessor, processing_description, necessity_justification, identified_risks, risk_level, mitigation_measures, residual_risk, dpo_opinion, dpo_consulted, supervisory_authority_consulted, start_date, completion_date, review_date, status, outcome } = req.body;
    const result = await query(
      `INSERT INTO privacy_impact_assessments (assessment_name, project_name, description, assessment_type, department, assessor, processing_description, necessity_justification, identified_risks, risk_level, mitigation_measures, residual_risk, dpo_opinion, dpo_consulted, supervisory_authority_consulted, start_date, completion_date, review_date, status, outcome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [assessment_name, project_name, description, assessment_type, department, assessor, processing_description, necessity_justification, identified_risks, risk_level || 'medium', mitigation_measures, residual_risk, dpo_opinion, dpo_consulted || false, supervisory_authority_consulted || false, start_date, completion_date, review_date, status || 'draft', outcome]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { assessment_name, project_name, description, assessment_type, department, assessor, processing_description, necessity_justification, identified_risks, risk_level, mitigation_measures, residual_risk, dpo_opinion, dpo_consulted, supervisory_authority_consulted, start_date, completion_date, review_date, status, outcome } = req.body;
    const result = await query(
      `UPDATE privacy_impact_assessments SET assessment_name=$1, project_name=$2, description=$3, assessment_type=$4, department=$5, assessor=$6, processing_description=$7, necessity_justification=$8, identified_risks=$9, risk_level=$10, mitigation_measures=$11, residual_risk=$12, dpo_opinion=$13, dpo_consulted=$14, supervisory_authority_consulted=$15, start_date=$16, completion_date=$17, review_date=$18, status=$19, outcome=$20, updated_at=NOW()
       WHERE id=$21 RETURNING *`,
      [assessment_name, project_name, description, assessment_type, department, assessor, processing_description, necessity_justification, identified_risks, risk_level, mitigation_measures, residual_risk, dpo_opinion, dpo_consulted, supervisory_authority_consulted, start_date, completion_date, review_date, status, outcome, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM privacy_impact_assessments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
