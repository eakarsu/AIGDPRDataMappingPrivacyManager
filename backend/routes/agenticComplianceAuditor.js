// Agentic compliance auditor continuously scanning cloud storage and repos
// for unencrypted/misclassified personal data with auto-remediation hints.
// Audit: batch_04.md / AIGDPRDataMappingPrivacyManager / Custom Feature Suggestions #1
// TODO: configure credentials AWS_ACCESS_KEY, GCP_SA_KEY, GITHUB_TOKEN
const express = require('express');
const fetch = require('node-fetch');
const { query } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'GDPR - Agentic Compliance Auditor'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3500
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'AI failed');
  return d.choices[0].message.content;
}

function parseJSON(t) {
  try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {}
  return { notes: t };
}

// POST /api/agentic-compliance-auditor/scan
// Body: { scope?: 'cloud_storage'|'repos'|'all', target_uris?: [..], data_categories?: [..] }
router.post('/scan', async (req, res) => {
  try {
    const { scope = 'all', target_uris = [], data_categories = [] } = req.body || {};

    const credsStatus = {
      aws: !!process.env.AWS_ACCESS_KEY,
      gcp: !!process.env.GCP_SA_KEY,
      azure: !!process.env.AZURE_TENANT_ID,
      github: !!process.env.GITHUB_TOKEN
    };

    let processingActivities = { rows: [] };
    try {
      processingActivities = await query(
        `SELECT id, name, data_categories, lawful_basis, retention_months FROM processing_activities LIMIT 30`
      );
    } catch (_) {}

    const systemPrompt = `You are an agentic GDPR/CCPA compliance auditor. Given cloud-storage and repo scan
intents, simulate findings for unencrypted PII, misclassified data, and over-retained records. Return STRICT
JSON only. Always include remediation playbooks per finding.`;

    const userPrompt = `Scope: ${scope}
Target URIs (sample): ${JSON.stringify(target_uris.slice(0, 10))}
Data categories of interest: ${JSON.stringify(data_categories)}
Credentials status: ${JSON.stringify(credsStatus)}
Org processing activities: ${JSON.stringify(processingActivities.rows)}

Return JSON:
{
  "summary": "...",
  "findings": [
    {
      "id": "string",
      "type": "unencrypted_pii|misclassified|excessive_retention|missing_lawful_basis|public_exposure",
      "location_hint": "string",
      "severity": "low|medium|high|critical",
      "data_categories": ["..."],
      "remediation_playbook": ["..."],
      "auto_remediation_available": true
    }
  ],
  "summary_metrics": { "critical_count": 0, "high_count": 0, "medium_count": 0, "low_count": 0 },
  "next_human_actions": ["..."],
  "credentials_status": ${JSON.stringify(credsStatus)},
  "disclaimer": "Findings simulated until live scan APIs are wired."
}`;

    const raw = await callAI(systemPrompt, userPrompt);
    const parsed = parseJSON(raw);

    try {
      await query(
        `CREATE TABLE IF NOT EXISTS agentic_compliance_scans (
          id SERIAL PRIMARY KEY, user_id INTEGER, scope TEXT,
          payload JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
        )`
      );
      await query(
        `INSERT INTO agentic_compliance_scans (user_id, scope, payload) VALUES ($1,$2,$3)`,
        [req.user?.id || null, scope, JSON.stringify(parsed)]
      );
    } catch (_) {}

    res.json({ scope, credentials: credsStatus, scan: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agentic-compliance-auditor/scans
router.get('/scans', async (_req, res) => {
  try {
    const r = await query(
      `SELECT id, scope, payload, created_at FROM agentic_compliance_scans ORDER BY created_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
