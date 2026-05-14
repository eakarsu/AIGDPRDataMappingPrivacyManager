const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { query } = require('./db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// AI rate limiter — 20/hr per user (sibling-project pattern)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req, res) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req, res)),
  message: { error: 'AI rate limit exceeded. Max 20 requests/hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.set('aiLimiter', aiLimiter);

// Initialize extra tables
async function initExtraTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        changes JSONB,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_analysis_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        tool_name TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        input_snapshot JSONB,
        result JSONB,
        model TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cookie_scans (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL,
        scanned_at TIMESTAMP DEFAULT NOW(),
        discovered_cookies JSONB,
        declared_cookies JSONB,
        diff JSONB,
        ai_classification JSONB,
        score INTEGER,
        user_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS dsr_dossiers (
        id SERIAL PRIMARY KEY,
        request_id INTEGER,
        requester_name TEXT,
        request_type TEXT,
        dossier JSONB,
        status TEXT DEFAULT 'draft',
        generated_at TIMESTAMP DEFAULT NOW(),
        user_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS breach_countdowns (
        id SERIAL PRIMARY KEY,
        breach_id INTEGER,
        deadline TIMESTAMP NOT NULL,
        last_alert_at TIMESTAMP,
        last_alert_hours_remaining INTEGER,
        ai_draft_notification JSONB,
        notified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS compliance_deadlines (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER,
        deadline_type TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date DATE NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        ai_recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS policy_corpus (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT[],
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('GDPR extra tables initialized');
  } catch (err) {
    console.error('GDPR table init error (non-fatal):', err.message);
  }
}
initExtraTables();

// Audit logging middleware for mutating operations
app.use('/api', (req, res, next) => {
  res.on('finish', async () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400 && req.user) {
      try {
        const parts = req.path.split('/').filter(Boolean);
        const entityType = parts[0] || null;
        const entityId = parts[1] ? parseInt(parts[1]) : null;
        await query(
          'INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
          [req.user.id, req.user.email, req.method, entityType, entityId, req.ip]
        );
      } catch (_) { /* non-fatal */ }
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Compliance health score endpoint
app.get('/api/compliance-health', authMiddleware, async (req, res) => {
  try {
    const [activities, breaches, vendors, trainings, dsrs] = await Promise.all([
      query("SELECT AVG(CASE risk_level WHEN 'low' THEN 90 WHEN 'medium' THEN 65 WHEN 'high' THEN 35 WHEN 'critical' THEN 10 ELSE 50 END) as score FROM processing_activities WHERE status = 'active'"),
      query("SELECT COUNT(*) as open FROM data_breaches WHERE status NOT IN ('resolved','closed')"),
      query("SELECT AVG(CASE risk_level WHEN 'low' THEN 90 WHEN 'medium' THEN 65 WHEN 'high' THEN 35 ELSE 50 END) as score FROM vendors"),
      query("SELECT AVG(CASE WHEN certified = true THEN 90 ELSE 30 END) as score FROM training_records WHERE expiry_date > NOW() OR expiry_date IS NULL"),
      query("SELECT COUNT(*) as overdue FROM data_subject_requests WHERE status NOT IN ('completed','rejected') AND deadline < NOW()"),
    ]);
    const activityScore = parseFloat(activities.rows[0]?.score) || 70;
    const vendorScore = parseFloat(vendors.rows[0]?.score) || 70;
    const trainingScore = parseFloat(trainings.rows[0]?.score) || 70;
    const openBreaches = parseInt(breaches.rows[0]?.open) || 0;
    const overduedsrs = parseInt(dsrs.rows[0]?.overdue) || 0;
    const breachPenalty = Math.min(openBreaches * 10, 30);
    const dsrPenalty = Math.min(overduedsrs * 5, 20);
    const healthScore = Math.max(0, Math.round((activityScore * 0.35 + vendorScore * 0.25 + trainingScore * 0.25) - breachPenalty - dsrPenalty));
    res.json({
      health_score: healthScore,
      grade: healthScore >= 80 ? 'A' : healthScore >= 65 ? 'B' : healthScore >= 50 ? 'C' : 'D',
      components: {
        processing_activities_score: Math.round(activityScore),
        vendor_risk_score: Math.round(vendorScore),
        training_compliance_score: Math.round(trainingScore),
        open_breaches: openBreaches,
        overdue_dsrs: overduedsrs,
      },
      alerts: [
        ...(openBreaches > 0 ? [`${openBreaches} unresolved data breach(es) — immediate attention required`] : []),
        ...(overduedsrs > 0 ? [`${overduedsrs} overdue data subject request(s)`] : []),
        ...(healthScore < 50 ? ['Overall compliance health is critical — remediation plan needed'] : []),
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI analysis history endpoint
app.get('/api/ai-history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      query('SELECT * FROM ai_analysis_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [req.user.id, limit, offset]),
      query('SELECT COUNT(*) FROM ai_analysis_results WHERE user_id = $1', [req.user.id]),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DSR deadline dashboard
app.get('/api/dsr-deadlines', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT *,
        EXTRACT(EPOCH FROM (deadline - NOW())) / 86400 as days_remaining,
        CASE WHEN deadline < NOW() THEN 'overdue'
             WHEN deadline < NOW() + INTERVAL '7 days' THEN 'urgent'
             WHEN deadline < NOW() + INTERVAL '30 days' THEN 'upcoming'
             ELSE 'on_track' END as urgency
      FROM data_subject_requests
      WHERE status NOT IN ('completed','rejected')
      ORDER BY deadline ASC
    `);
    res.json({
      requests: result.rows,
      summary: {
        overdue: result.rows.filter(r => r.urgency === 'overdue').length,
        urgent: result.rows.filter(r => r.urgency === 'urgent').length,
        upcoming: result.rows.filter(r => r.urgency === 'upcoming').length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit log endpoint
app.get('/api/audit-log', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      query('SELECT COUNT(*) FROM audit_log'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// NEW custom non-CRUD features (5) per audit recommendations
// ===========================================================================

// Helper: shared OpenRouter call (lightweight, used by new feature endpoints)
const fetchFn = require('node-fetch');
// === Batch 04 Gaps & Frontend Mounts ===
const route_gap_no_third_party_code_sdk_audit = require('./routes/gap-no-third-party-code-sdk-audit');
const route_gap_no_recommendation_engine_bias_check = require('./routes/gap-no-recommendation-engine-bias-check');
const route_gap_no_automated_dpa_contract_template_gener = require('./routes/gap-no-automated-dpa-contract-template-gener');
const route_gap_no_automated_dsr_fulfillment_data_export = require('./routes/gap-no-automated-dsr-fulfillment-data-export');
const route_gap_no_real_time_data_flow_monitoring = require('./routes/gap-no-real-time-data-flow-monitoring');
const route_gap_limited_webhook_surface_no_webhook_keywo = require('./routes/gap-limited-webhook-surface-no-webhook-keywo');
const route_gap_no_public_facing_privacy_portal_for = require('./routes/gap-no-public-facing-privacy-portal-for');
const NEW_FEATURE_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
async function callOpenRouterSimple(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const response = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'GDPR Privacy Manager',
    },
    body: JSON.stringify({
      model: NEW_FEATURE_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.5,
      max_tokens: 3000,
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.choices[0].message.content;
}
function parseJsonStrict(text) {
  if (typeof text !== 'string') return text;
  try { return JSON.parse(text); } catch (_) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (_) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  return { raw_response: text };
}

// 1. Cookie Scanner — heuristic (no Puppeteer dependency); diffs declared vs heuristically discovered cookies and asks AI to classify.
app.post('/api/cookie-scanner/scan', authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { compliance_id, domain, simulated_response_headers } = req.body || {};
    if (!compliance_id && !domain) return res.status(400).json({ error: 'compliance_id or domain required' });

    // Pull declared cookies from cookie_compliance for this domain/id
    let declared = [];
    let domainName = domain;
    if (compliance_id) {
      const r = await query('SELECT * FROM cookie_compliance WHERE id = $1', [compliance_id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Compliance record not found' });
      domainName = r.rows[0].domain;
      declared = [r.rows[0]];
    }
    // Also fetch all declared cookies for this domain
    if (domainName) {
      const rd = await query('SELECT cookie_name, category, provider, duration FROM cookie_compliance WHERE domain = $1', [domainName]);
      declared = rd.rows;
    }

    // Heuristic discovery: parse simulated Set-Cookie headers if supplied; else synthesize a typical set.
    let discovered = [];
    if (Array.isArray(simulated_response_headers)) {
      discovered = simulated_response_headers
        .filter((h) => /set-cookie/i.test(h))
        .map((h) => {
          const cookieStr = h.replace(/^set-cookie\s*:\s*/i, '');
          const name = cookieStr.split('=')[0].trim();
          return { cookie_name: name, raw: cookieStr };
        });
    } else {
      // Default heuristic discovery list — common third-party trackers a real scanner would find.
      discovered = [
        { cookie_name: '_ga', provider: 'Google Analytics' },
        { cookie_name: '_gid', provider: 'Google Analytics' },
        { cookie_name: '_fbp', provider: 'Meta Pixel' },
        { cookie_name: 'session', provider: 'first-party' },
      ];
    }

    const declaredNames = new Set(declared.map((d) => (d.cookie_name || '').toLowerCase()));
    const discoveredNames = discovered.map((d) => d.cookie_name);
    const undeclared = discovered.filter((d) => !declaredNames.has(d.cookie_name.toLowerCase()));
    const stale = declared.filter((d) => !discoveredNames.includes(d.cookie_name));

    const systemPrompt = `You are an ePrivacy/GDPR cookie compliance auditor. Given undeclared discovered cookies, classify each by category (strictly_necessary|performance|functional|targeting), risk (low|medium|high) and consent_required (true|false). Return STRICT JSON: {"classifications": [{"cookie_name": "", "category": "", "risk": "", "consent_required": true|false, "rationale": ""}], "compliance_score": 0-100, "summary": ""}`;
    const userPrompt = `Domain: ${domainName}\n\nUndeclared discovered cookies:\n${JSON.stringify(undeclared, null, 2)}\n\nDeclared cookies removed (stale):\n${JSON.stringify(stale, null, 2)}\n\nReturn JSON only.`;
    const raw = await callOpenRouterSimple(systemPrompt, userPrompt);
    const parsed = parseJsonStrict(raw);

    const score = Number.isInteger(parsed.compliance_score) ? parsed.compliance_score : Math.max(0, 100 - undeclared.length * 15 - stale.length * 5);
    const diff = { undeclared, stale };
    const insertResult = await query(
      'INSERT INTO cookie_scans (domain, discovered_cookies, declared_cookies, diff, ai_classification, score, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [domainName, JSON.stringify(discovered), JSON.stringify(declared), JSON.stringify(diff), JSON.stringify(parsed), score, req.user.id]
    );
    res.json({ success: true, scan: insertResult.rows[0] });
  } catch (err) {
    console.error('cookie-scanner error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/cookie-scanner/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      query('SELECT * FROM cookie_scans ORDER BY scanned_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      query('SELECT COUNT(*) FROM cookie_scans'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. DSR Fulfillment Pipeline — given DSR id, walks processing_activities, assembles a "right of access" dossier.
app.post('/api/dsr-fulfillment/generate', authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { request_id } = req.body || {};
    if (!request_id) return res.status(400).json({ error: 'request_id is required' });
    const dsrR = await query('SELECT * FROM data_subject_requests WHERE id = $1', [request_id]);
    if (dsrR.rows.length === 0) return res.status(404).json({ error: 'DSR not found' });
    const dsr = dsrR.rows[0];

    // Walk processing_activities catalog and collect those whose data_subjects might match.
    const paR = await query('SELECT id, activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, retention_period FROM processing_activities WHERE status = $1 LIMIT 50', ['active']);
    const vendorR = await query('SELECT id, vendor_name, data_categories_shared, country FROM vendors WHERE status IN ($1,$2) LIMIT 50', ['active', 'under_review']);

    const systemPrompt = `You assemble GDPR Article 15 "right of access" dossiers. Return STRICT JSON: {"dossier": {"requester": "", "request_type": "", "summary": "", "data_categories_held": ["..."], "processing_activities": [{"activity_name": "", "purpose": "", "legal_basis": "", "retention": ""}], "recipients_and_third_parties": ["..."], "international_transfers": ["..."], "retention_overview": "", "rights_explained": ["right_to_rectification", "right_to_erasure", "right_to_restriction", "right_to_portability", "right_to_object", "right_to_complain"], "next_steps_for_requester": ["..."]}, "completeness_score": 0-100}`;
    const userPrompt = `DSR record:\n${JSON.stringify(dsr, null, 2)}\n\nProcessing activities catalog:\n${JSON.stringify(paR.rows, null, 2)}\n\nVendor sub-processors:\n${JSON.stringify(vendorR.rows, null, 2)}\n\nReturn JSON only.`;
    const raw = await callOpenRouterSimple(systemPrompt, userPrompt);
    const parsed = parseJsonStrict(raw);

    const insert = await query(
      'INSERT INTO dsr_dossiers (request_id, requester_name, request_type, dossier, status, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [request_id, dsr.requester_name, dsr.request_type, JSON.stringify(parsed), 'draft', req.user.id]
    );
    res.json({ success: true, dossier: insert.rows[0] });
  } catch (err) {
    console.error('dsr-fulfillment error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/dsr-fulfillment/dossiers', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      query('SELECT * FROM dsr_dossiers ORDER BY generated_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      query('SELECT COUNT(*) FROM dsr_dossiers'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Breach 72h Countdown Agent — endpoint to register and query countdowns; background worker re-evaluates.
app.post('/api/breach-countdown/register', authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { breach_id } = req.body || {};
    if (!breach_id) return res.status(400).json({ error: 'breach_id is required' });
    const br = await query('SELECT * FROM data_breaches WHERE id = $1', [breach_id]);
    if (br.rows.length === 0) return res.status(404).json({ error: 'Breach not found' });
    const breach = br.rows[0];
    const discoveryDate = breach.discovery_date ? new Date(breach.discovery_date) : new Date();
    const deadline = new Date(discoveryDate.getTime() + 72 * 3600 * 1000);

    const systemPrompt = `You draft GDPR Article 33 supervisory authority breach notifications. Return STRICT JSON: {"subject": "", "body": "", "key_facts": ["..."], "uncertainties": ["..."]}`;
    const userPrompt = `Breach record:\n${JSON.stringify(breach, null, 2)}\n\nReturn JSON only.`;
    const raw = await callOpenRouterSimple(systemPrompt, userPrompt);
    const draft = parseJsonStrict(raw);

    const insert = await query(
      'INSERT INTO breach_countdowns (breach_id, deadline, ai_draft_notification) VALUES ($1,$2,$3) RETURNING *',
      [breach_id, deadline, JSON.stringify(draft)]
    );
    res.json({ success: true, countdown: insert.rows[0] });
  } catch (err) {
    console.error('breach-countdown register error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/breach-countdown', authMiddleware, async (req, res) => {
  try {
    const r = await query(`
      SELECT bc.*,
        EXTRACT(EPOCH FROM (bc.deadline - NOW())) / 3600 AS hours_remaining,
        b.incident_title, b.severity, b.status AS breach_status
      FROM breach_countdowns bc
      LEFT JOIN data_breaches b ON b.id = bc.breach_id
      ORDER BY bc.deadline ASC
    `);
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Background worker — every 60s, scan countdowns; mark notified when <12h remain.
async function breachCountdownWorker() {
  try {
    const r = await query("SELECT * FROM breach_countdowns WHERE notified = false AND deadline > NOW()");
    for (const row of r.rows) {
      const hoursRemaining = (new Date(row.deadline) - new Date()) / 3600000;
      if (hoursRemaining <= 12 && (row.last_alert_hours_remaining == null || row.last_alert_hours_remaining > 12)) {
        await query(
          'UPDATE breach_countdowns SET last_alert_at = NOW(), last_alert_hours_remaining = $1, notified = true WHERE id = $2',
          [Math.floor(hoursRemaining), row.id]
        );
        console.log(`[breach-countdown] ALERT — breach ${row.breach_id} has ${Math.floor(hoursRemaining)}h until 72h SLA`);
      }
    }
  } catch (err) {
    console.error('breachCountdownWorker error:', err.message);
  }
}
setInterval(breachCountdownWorker, 60_000);

// 4. Vendor Renewal/Audit Calendar — auto-creates compliance_deadlines from vendor contract expiry + DPA.
app.post('/api/vendor-calendar/sync', authMiddleware, async (req, res) => {
  try {
    const v = await query("SELECT id, vendor_name, contract_end_date, dpa_signed FROM vendors WHERE status IN ('active','under_review')");
    let inserted = 0;
    for (const vendor of v.rows) {
      if (vendor.contract_end_date) {
        const exists = await query(
          "SELECT 1 FROM compliance_deadlines WHERE vendor_id = $1 AND deadline_type = 'contract_renewal' AND due_date = $2",
          [vendor.id, vendor.contract_end_date]
        );
        if (exists.rows.length === 0) {
          await query(
            "INSERT INTO compliance_deadlines (vendor_id, deadline_type, title, due_date, status, notes) VALUES ($1,'contract_renewal',$2,$3,'pending',$4)",
            [vendor.id, `Renew vendor contract: ${vendor.vendor_name}`, vendor.contract_end_date, 'Auto-generated from vendor.contract_end_date']
          );
          inserted++;
        }
      }
      if (!vendor.dpa_signed) {
        const exists = await query(
          "SELECT 1 FROM compliance_deadlines WHERE vendor_id = $1 AND deadline_type = 'dpa_review' AND status = 'pending'",
          [vendor.id]
        );
        if (exists.rows.length === 0) {
          const due = new Date(); due.setDate(due.getDate() + 30);
          await query(
            "INSERT INTO compliance_deadlines (vendor_id, deadline_type, title, due_date, status, notes) VALUES ($1,'dpa_review',$2,$3,'pending',$4)",
            [vendor.id, `Sign DPA with vendor: ${vendor.vendor_name}`, due.toISOString().slice(0,10), 'No DPA on file — escalate']
          );
          inserted++;
        }
      }
    }
    res.json({ success: true, inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/vendor-calendar/recommend', authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { vendor_id } = req.body || {};
    if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
    const v = await query('SELECT * FROM vendors WHERE id = $1', [vendor_id]);
    if (v.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    const systemPrompt = 'You are a vendor risk auditor. Recommend updates to the vendor due-diligence questionnaire and renewal checklist. Return STRICT JSON: {"questionnaire_updates": ["..."], "renewal_checklist": ["..."], "recommended_due_dates": [{"task": "", "due_in_days": 0}]}';
    const userPrompt = `Vendor:\n${JSON.stringify(v.rows[0], null, 2)}\n\nReturn JSON only.`;
    const raw = await callOpenRouterSimple(systemPrompt, userPrompt);
    const parsed = parseJsonStrict(raw);
    // Optionally upsert recommended due-date rows
    const tasks = (parsed && Array.isArray(parsed.recommended_due_dates)) ? parsed.recommended_due_dates : [];
    let inserted = 0;
    for (const t of tasks) {
      try {
        const due = new Date(); due.setDate(due.getDate() + (parseInt(t.due_in_days) || 30));
        await query(
          "INSERT INTO compliance_deadlines (vendor_id, deadline_type, title, due_date, status, ai_recommendation) VALUES ($1,'ai_recommendation',$2,$3,'pending',$4)",
          [vendor_id, t.task || 'Vendor task', due.toISOString().slice(0,10), JSON.stringify(parsed)]
        );
        inserted++;
      } catch (_) {}
    }
    res.json({ success: true, recommendations: parsed, deadlines_inserted: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/vendor-calendar', authMiddleware, async (req, res) => {
  try {
    const r = await query(`SELECT cd.*, v.vendor_name FROM compliance_deadlines cd LEFT JOIN vendors v ON v.id = cd.vendor_id ORDER BY cd.due_date ASC LIMIT 200`);
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Policy Corpus RAG — keyword retrieval from policy_corpus, then AI grounds DPIA/policy responses to it.
app.post('/api/policy-corpus', authMiddleware, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });
    const r = await query(
      'INSERT INTO policy_corpus (title, content, category, tags, uploaded_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, content, category || null, tags || null, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/policy-corpus', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      query('SELECT id, title, category, tags, created_at FROM policy_corpus ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      query('SELECT COUNT(*) FROM policy_corpus'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/policy-corpus/query', authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { question, top_k } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });
    const k = Math.min(10, Math.max(1, parseInt(top_k) || 3));
    // Naive keyword retrieval
    const tokens = (question.toLowerCase().match(/[a-z0-9]{4,}/g) || []).slice(0, 8);
    let candidates = { rows: [] };
    if (tokens.length > 0) {
      const ilikes = tokens.map((_, i) => `(LOWER(content) LIKE $${i + 1} OR LOWER(title) LIKE $${i + 1})`).join(' OR ');
      const params = tokens.map((t) => `%${t}%`);
      candidates = await query(`SELECT id, title, category, content FROM policy_corpus WHERE ${ilikes} LIMIT 20`, params);
    }
    // Score by token-hit count
    const scored = candidates.rows.map((row) => {
      const c = (row.content || '').toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (c.includes(t) ? 1 : 0), 0);
      return { ...row, _score: score };
    }).sort((a, b) => b._score - a._score).slice(0, k);

    const contextSnippets = scored.map((r) => `# ${r.title}\n${(r.content || '').slice(0, 1500)}`).join('\n\n---\n\n');
    const systemPrompt = `You are a privacy expert. Answer the user's question grounded ONLY in the provided organizational policy corpus. If the corpus does not address it, say so explicitly. Return STRICT JSON: {"answer": "", "citations": [{"policy_title": "", "snippet": ""}], "confidence": "low|medium|high"}`;
    const userPrompt = `Organization policy corpus:\n${contextSnippets || '(empty)'}\n\nQuestion: ${question}\n\nReturn JSON only.`;
    const raw = await callOpenRouterSimple(systemPrompt, userPrompt);
    const parsed = parseJsonStrict(raw);
    res.json({ success: true, retrieved: scored.map(({ _score, content, ...rest }) => ({ ...rest, score: _score })), answer: parsed });
  } catch (err) {
    console.error('policy-corpus query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
// Secure processing activities GET (was unauthenticated)
app.use('/api/processing-activities', authMiddleware, require('./routes/processingActivities'));
app.use('/api/data-subject-requests', authMiddleware, require('./routes/dataSubjectRequests'));
app.use('/api/privacy-impact-assessments', authMiddleware, require('./routes/privacyImpactAssessments'));
app.use('/api/consent-records', authMiddleware, require('./routes/consentRecords'));
app.use('/api/data-breaches', authMiddleware, require('./routes/dataBreaches'));
app.use('/api/vendors', authMiddleware, require('./routes/vendors'));
app.use('/api/retention-policies', authMiddleware, require('./routes/retentionPolicies'));
app.use('/api/cookie-compliance', authMiddleware, require('./routes/cookieCompliance'));
app.use('/api/cross-border-transfers', authMiddleware, require('./routes/crossBorderTransfers'));
app.use('/api/training-records', authMiddleware, require('./routes/trainingRecords'));
// Apply pass 5 — additive mechanical routes
app.use('/api/regulatory-tracker', authMiddleware, require('./routes/regulatoryTracker'));
app.use('/api/llm-usage-registry', authMiddleware, require('./routes/llmUsageRegistry'));
app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/agentic-compliance-auditor', require('./routes/agenticComplianceAuditor'));
app.use('/api/vendor-supply-chain', require('./routes/vendorSupplyChainVisibility'));


app.use('/api/gap-no-third-party-code-sdk-audit', route_gap_no_third_party_code_sdk_audit);
app.use('/api/gap-no-recommendation-engine-bias-check', route_gap_no_recommendation_engine_bias_check);
app.use('/api/gap-no-automated-dpa-contract-template-gener', route_gap_no_automated_dpa_contract_template_gener);
app.use('/api/gap-no-automated-dsr-fulfillment-data-export', route_gap_no_automated_dsr_fulfillment_data_export);
app.use('/api/gap-no-real-time-data-flow-monitoring', route_gap_no_real_time_data_flow_monitoring);
app.use('/api/gap-limited-webhook-surface-no-webhook-keywo', route_gap_limited_webhook_surface_no_webhook_keywo);
app.use('/api/gap-no-public-facing-privacy-portal-for', route_gap_no_public_facing_privacy_portal_for);

app.listen(PORT, () => {
  console.log(`GDPR Privacy Manager Backend running on port ${PORT}`);
});
