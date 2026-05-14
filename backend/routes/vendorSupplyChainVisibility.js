// Vendor supply-chain visibility mapping 2nd/3rd parties and identifying
// weak links via security SLA scoring.
// Audit: batch_04.md / AIGDPRDataMappingPrivacyManager / Custom Feature Suggestions #3
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
      'X-Title': 'GDPR - Vendor Supply-Chain Visibility'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3000
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

// POST /api/vendor-supply-chain/map { focus_vendor_id? }
router.post('/map', async (req, res) => {
  try {
    const { focus_vendor_id } = req.body || {};

    let vendors = { rows: [] };
    let breaches = { rows: [] };
    try {
      vendors = await query(`SELECT id, name, data_processed, security_posture FROM vendors LIMIT 100`);
    } catch (_) {}
    try {
      breaches = await query(`SELECT vendor_id, severity, description, occurred_at FROM data_breaches WHERE vendor_id IS NOT NULL LIMIT 50`);
    } catch (_) {}

    const systemPrompt = `You are a privacy supply-chain mapping analyst. Given primary vendors (data processors),
infer plausible 2nd/3rd-party sub-processors and score each link by security SLA risk. Highlight weakest links
and provide remediation. Return STRICT JSON only.`;

    const userPrompt = `Focus vendor: ${focus_vendor_id || 'all'}
Vendors: ${JSON.stringify(vendors.rows.slice(0, 30))}
Known breach history: ${JSON.stringify(breaches.rows.slice(0, 20))}

Return JSON:
{
  "summary": "...",
  "supply_chain_graph": [
    {
      "vendor_id": 0,
      "vendor_name": "string",
      "tier": 1,
      "sub_processors": [
        { "name": "string", "tier": 2, "data_processed": "string", "country": "string", "risk_score_0_100": 0 }
      ],
      "overall_risk_score_0_100": 0,
      "weakest_link": "string"
    }
  ],
  "weak_links": [{ "vendor_chain": "string", "weak_node": "string", "issue": "string", "remediation": "string" }],
  "renegotiation_priorities": [{ "vendor_id": 0, "rationale": "string", "leverage_points": ["..."] }],
  "disclaimer": "Sub-processor inference is heuristic; verify with vendor DPA disclosures."
}`;

    const raw = await callAI(systemPrompt, userPrompt);
    const parsed = parseJSON(raw);
    res.json({ focus_vendor_id: focus_vendor_id || null, map: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-supply-chain/vendors
router.get('/vendors', async (_req, res) => {
  try {
    const r = await query(`SELECT id, name FROM vendors ORDER BY name ASC LIMIT 100`)
      .catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
