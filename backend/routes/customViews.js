// GDPR Custom Views: 2 VIZ + 2 NON-VIZ
//   VIZ 1: /data-flow-sankey         — source -> processor -> destination
//   VIZ 2: /consent-heatmap          — data category x lawful basis
//   NON-VIZ 1: /dpia-ropa-pdf        — DPIA/ROPA report (PDF binary, text fallback)
//   NON-VIZ 2: /processing-rules     — CRUD purposes + retention periods
// Mounted at /api/custom-views BEFORE the implicit 404.

const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch (_) { PDFDocument = null; }

// ---------------------------------------------------------------------------
// In-memory processing rules store (purposes + retention periods).
// Seeded from common GDPR purpose categories so the editor renders something
// useful even on first load.
// ---------------------------------------------------------------------------
const LAWFUL_BASES = [
  'consent', 'contract', 'legal_obligation',
  'vital_interests', 'public_task', 'legitimate_interests',
];
let _ruleId = 1;
const seedRules = () => ([
  { id: _ruleId++, purpose: 'Customer onboarding & KYC', lawful_basis: 'contract',             retention_period_days: 2555, retention_label: '7 years (statutory)' },
  { id: _ruleId++, purpose: 'Marketing communications',  lawful_basis: 'consent',              retention_period_days: 730,  retention_label: '2 years or until withdrawal' },
  { id: _ruleId++, purpose: 'Payroll & tax records',     lawful_basis: 'legal_obligation',     retention_period_days: 2555, retention_label: '7 years' },
  { id: _ruleId++, purpose: 'Site analytics',            lawful_basis: 'legitimate_interests', retention_period_days: 395,  retention_label: '13 months' },
  { id: _ruleId++, purpose: 'Health & safety records',   lawful_basis: 'vital_interests',      retention_period_days: 1825, retention_label: '5 years' },
]);
let processingRules = seedRules();

// ===========================================================================
// VIZ 1: GET /api/custom-views/data-flow-sankey
// Sankey-style data flow: source (data_subjects) -> processor (activity)
//   -> destination (recipient / vendor).
// Returns nodes + links with cumulative weights.
// ===========================================================================
router.get('/data-flow-sankey', auth, async (req, res) => {
  try {
    const activitiesQ = await query(`
      SELECT id, activity_name, data_subjects, recipients, processor_name, data_categories, risk_level
        FROM processing_activities
       WHERE status = 'active'
       LIMIT 100
    `);
    const vendorsQ = await query(`
      SELECT vendor_name, data_categories_shared, country
        FROM vendors
       WHERE status IN ('active','under_review')
       LIMIT 100
    `);

    // Build a tripartite node set: sources | processors | destinations.
    const sources = new Map();      // name -> node
    const processors = new Map();
    const destinations = new Map();
    const links = [];

    const ensure = (map, name, kind) => {
      const key = String(name || '').trim() || 'Unspecified';
      if (!map.has(key)) map.set(key, { id: `${kind}:${key}`, name: key, kind, value: 0 });
      return map.get(key);
    };

    const splitList = (s) => String(s || '')
      .split(/[,;|]/).map(x => x.trim()).filter(Boolean);

    activitiesQ.rows.forEach((a) => {
      const subjList   = splitList(a.data_subjects);   if (!subjList.length) subjList.push('Customers');
      const recipList  = splitList(a.recipients);
      const procName   = (a.processor_name && a.processor_name.trim()) || a.activity_name || `Activity #${a.id}`;
      const weight     = 1 + (a.risk_level === 'high' || a.risk_level === 'critical' ? 2 : a.risk_level === 'medium' ? 1 : 0);

      const proc = ensure(processors, procName, 'processor');
      proc.value += weight;

      subjList.forEach((s) => {
        const src = ensure(sources, s, 'source');
        src.value += weight;
        links.push({ source: src.id, target: proc.id, value: weight });
      });

      if (recipList.length === 0) recipList.push('Internal storage');
      recipList.forEach((r) => {
        const dest = ensure(destinations, r, 'destination');
        dest.value += weight;
        links.push({ source: proc.id, target: dest.id, value: weight });
      });
    });

    // Augment destinations with vendors (declared sub-processors / third parties).
    vendorsQ.rows.forEach((v) => {
      const dest = ensure(destinations, `${v.vendor_name}${v.country ? ` (${v.country})` : ''}`, 'destination');
      const cats = splitList(v.data_categories_shared);
      dest.value += Math.max(1, cats.length);
    });

    const nodes = [
      ...Array.from(sources.values()),
      ...Array.from(processors.values()),
      ...Array.from(destinations.values()),
    ];

    // Collapse duplicate links (same source/target) by summing value.
    const linkKey = (l) => `${l.source}->${l.target}`;
    const linkMap = new Map();
    links.forEach((l) => {
      const k = linkKey(l);
      if (!linkMap.has(k)) linkMap.set(k, { ...l });
      else linkMap.get(k).value += l.value;
    });

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      nodes,
      links: Array.from(linkMap.values()),
      summary: {
        sources: sources.size,
        processors: processors.size,
        destinations: destinations.size,
        total_links: linkMap.size,
      },
    });
  } catch (err) {
    console.error('data-flow-sankey error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// VIZ 2: GET /api/custom-views/consent-heatmap
// Heatmap matrix: rows = data category (consent_type), cols = lawful basis.
// Cell value = count of consent records, plus consent-given percent.
// ===========================================================================
router.get('/consent-heatmap', auth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COALESCE(NULLIF(TRIM(consent_type), ''), 'unspecified') AS data_category,
        COALESCE(NULLIF(TRIM(legal_basis),  ''), 'consent')     AS lawful_basis,
        COUNT(*)                                                AS total,
        SUM(CASE WHEN consent_given = true THEN 1 ELSE 0 END)   AS granted,
        SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END)   AS withdrawn,
        SUM(CASE WHEN status = 'expired'   THEN 1 ELSE 0 END)   AS expired
      FROM consent_records
      GROUP BY data_category, lawful_basis
    `);

    const categorySet = new Set();
    const basisSet = new Set();
    rows.forEach((r) => {
      categorySet.add(r.data_category);
      basisSet.add(r.lawful_basis);
    });
    // Ensure canonical lawful bases always appear.
    LAWFUL_BASES.forEach((b) => basisSet.add(b));

    const categories = Array.from(categorySet).sort();
    const bases = Array.from(basisSet).sort();

    const cellMap = new Map(); // `${cat}::${basis}` -> stats
    rows.forEach((r) => {
      cellMap.set(`${r.data_category}::${r.lawful_basis}`, {
        total:     parseInt(r.total || 0, 10),
        granted:   parseInt(r.granted || 0, 10),
        withdrawn: parseInt(r.withdrawn || 0, 10),
        expired:   parseInt(r.expired || 0, 10),
      });
    });

    let maxCell = 0;
    const matrix = categories.map((cat) => {
      const cells = bases.map((b) => {
        const stat = cellMap.get(`${cat}::${b}`) || { total: 0, granted: 0, withdrawn: 0, expired: 0 };
        if (stat.total > maxCell) maxCell = stat.total;
        return {
          basis: b,
          ...stat,
          consent_rate: stat.total ? Math.round((stat.granted / stat.total) * 100) : 0,
        };
      });
      const rowTotal = cells.reduce((s, c) => s + c.total, 0);
      return { data_category: cat, total: rowTotal, cells };
    });

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      categories,
      lawful_bases: bases,
      matrix,
      max_cell: maxCell,
      grand_total: matrix.reduce((s, r) => s + r.total, 0),
    });
  } catch (err) {
    console.error('consent-heatmap error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// NON-VIZ 1: POST /api/custom-views/dpia-ropa-pdf
// Generates a combined DPIA / ROPA report. Returns a PDF when pdfkit is
// available, otherwise a text fallback (always returns 200 with a payload).
// Body: { format?: 'pdf' | 'text' | 'json', limit?: number }
// ===========================================================================
router.post('/dpia-ropa-pdf', auth, async (req, res) => {
  try {
    const { format = 'pdf', limit = 25 } = req.body || {};
    const cap = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [paQ, dpiaQ, breachQ] = await Promise.all([
      query(`SELECT activity_name, purpose, legal_basis, data_categories, data_subjects,
                     recipients, retention_period, risk_level, status
                FROM processing_activities ORDER BY id ASC LIMIT $1`, [cap]),
      query(`SELECT assessment_name, project_name, assessment_type, risk_level,
                     status, outcome, identified_risks, mitigation_measures
                FROM privacy_impact_assessments ORDER BY id ASC LIMIT $1`, [cap]),
      query(`SELECT COUNT(*) AS open
                FROM data_breaches WHERE status NOT IN ('resolved','closed')`),
    ]);

    const summary = {
      activities: paQ.rows.length,
      dpias: dpiaQ.rows.length,
      open_breaches: parseInt(breachQ.rows[0]?.open || 0, 10),
      generated_at: new Date().toISOString(),
    };

    if (format === 'json') {
      return res.json({ ok: true, summary, activities: paQ.rows, dpias: dpiaQ.rows });
    }

    const lines = [];
    lines.push('======================================================');
    lines.push('   GDPR DPIA / ROPA COMPLIANCE REPORT');
    lines.push('======================================================');
    lines.push(`Generated:           ${summary.generated_at}`);
    lines.push(`Processing rows:     ${summary.activities}`);
    lines.push(`DPIA rows:           ${summary.dpias}`);
    lines.push(`Open breaches:       ${summary.open_breaches}`);
    lines.push('');
    lines.push('-- Article 30 ROPA --');
    if (!paQ.rows.length) lines.push('  (no processing activities on file)');
    paQ.rows.forEach((a, i) => {
      lines.push(`  ${i + 1}. ${a.activity_name}  [${a.legal_basis} / ${a.risk_level || 'n/a'}]`);
      lines.push(`     Purpose:      ${a.purpose || '-'}`);
      lines.push(`     Categories:   ${a.data_categories || '-'}`);
      lines.push(`     Subjects:     ${a.data_subjects || '-'}`);
      lines.push(`     Recipients:   ${a.recipients || '-'}`);
      lines.push(`     Retention:    ${a.retention_period || '-'}`);
      lines.push('');
    });
    lines.push('-- Article 35 DPIA Register --');
    if (!dpiaQ.rows.length) lines.push('  (no DPIAs on file)');
    dpiaQ.rows.forEach((d, i) => {
      lines.push(`  ${i + 1}. ${d.assessment_name}  (${d.project_name})`);
      lines.push(`     Type / Risk:  ${d.assessment_type} / ${d.risk_level}`);
      lines.push(`     Status:       ${d.status}   Outcome: ${d.outcome || '-'}`);
      lines.push(`     Risks:        ${(d.identified_risks || '-').slice(0, 200)}`);
      lines.push(`     Mitigations:  ${(d.mitigation_measures || '-').slice(0, 200)}`);
      lines.push('');
    });
    lines.push('=========== END OF DPIA / ROPA REPORT ===========');
    const textBody = lines.join('\n');

    if (format === 'text' || !PDFDocument) {
      return res.json({
        ok: true,
        format: 'text',
        pdf_available: !!PDFDocument,
        filename: `dpia_ropa_report_${Date.now()}.txt`,
        summary,
        text: textBody,
      });
    }

    // Build PDF and return base64-encoded payload for easy frontend handling.
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });
    doc.fontSize(18).text('GDPR DPIA / ROPA Compliance Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${summary.generated_at}`);
    doc.text(`Activities: ${summary.activities}  |  DPIAs: ${summary.dpias}  |  Open breaches: ${summary.open_breaches}`);
    doc.moveDown(1);
    doc.fontSize(14).text('Article 30 — Records of Processing Activities', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9);
    paQ.rows.forEach((a, i) => {
      doc.font('Helvetica-Bold').text(`${i + 1}. ${a.activity_name}  [${a.legal_basis || '-'} / ${a.risk_level || 'n/a'}]`);
      doc.font('Helvetica').text(`Purpose:    ${a.purpose || '-'}`);
      doc.text(`Categories: ${a.data_categories || '-'}`);
      doc.text(`Subjects:   ${a.data_subjects || '-'}`);
      doc.text(`Recipients: ${a.recipients || '-'}`);
      doc.text(`Retention:  ${a.retention_period || '-'}`);
      doc.moveDown(0.4);
    });
    doc.addPage();
    doc.fontSize(14).text('Article 35 — DPIA Register', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9);
    dpiaQ.rows.forEach((d, i) => {
      doc.font('Helvetica-Bold').text(`${i + 1}. ${d.assessment_name}  (${d.project_name})`);
      doc.font('Helvetica').text(`Type/Risk: ${d.assessment_type} / ${d.risk_level}`);
      doc.text(`Status:    ${d.status}   Outcome: ${d.outcome || '-'}`);
      doc.text(`Risks:     ${(d.identified_risks || '-').slice(0, 400)}`);
      doc.text(`Mitig.:    ${(d.mitigation_measures || '-').slice(0, 400)}`);
      doc.moveDown(0.4);
    });
    doc.end();
    await done;
    const buf = Buffer.concat(chunks);

    res.json({
      ok: true,
      format: 'pdf',
      filename: `dpia_ropa_report_${Date.now()}.pdf`,
      mime_type: 'application/pdf',
      bytes: buf.length,
      summary,
      pdf_base64: buf.toString('base64'),
    });
  } catch (err) {
    console.error('dpia-ropa-pdf error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// NON-VIZ 2: Processing Rules Editor — CRUD for purposes/retention periods.
//   GET  /api/custom-views/processing-rules
//   POST /api/custom-views/processing-rules { op: create|update|delete|reset, rule }
// ===========================================================================
router.get('/processing-rules', auth, (req, res) => {
  res.json({
    ok: true,
    lawful_bases: LAWFUL_BASES,
    rules: processingRules,
    count: processingRules.length,
  });
});

router.post('/processing-rules', auth, (req, res) => {
  try {
    const { op = 'create', rule } = req.body || {};

    if (op === 'reset') {
      _ruleId = 1;
      processingRules = seedRules();
      return res.json({ ok: true, op, rules: processingRules });
    }
    if (op === 'delete') {
      if (!rule || !rule.id) return res.status(400).json({ error: 'rule.id required' });
      const before = processingRules.length;
      processingRules = processingRules.filter((r) => r.id !== rule.id);
      return res.json({ ok: true, op, removed: before - processingRules.length, rules: processingRules });
    }
    if (op === 'update') {
      if (!rule || !rule.id) return res.status(400).json({ error: 'rule.id required' });
      const idx = processingRules.findIndex((r) => r.id === rule.id);
      if (idx === -1) return res.status(404).json({ error: 'rule not found' });
      if (rule.lawful_basis && !LAWFUL_BASES.includes(rule.lawful_basis)) {
        return res.status(400).json({ error: `lawful_basis must be one of ${LAWFUL_BASES.join(', ')}` });
      }
      processingRules[idx] = { ...processingRules[idx], ...rule, id: processingRules[idx].id };
      return res.json({ ok: true, op, rule: processingRules[idx], rules: processingRules });
    }
    // default: create
    const purpose = (rule && rule.purpose) || 'New processing purpose';
    const basis = (rule && rule.lawful_basis) || 'consent';
    if (!LAWFUL_BASES.includes(basis)) {
      return res.status(400).json({ error: `lawful_basis must be one of ${LAWFUL_BASES.join(', ')}` });
    }
    const retDays = parseInt((rule && rule.retention_period_days) || 365, 10);
    const created = {
      id: _ruleId++,
      purpose,
      lawful_basis: basis,
      retention_period_days: retDays,
      retention_label: (rule && rule.retention_label) || `${Math.round(retDays / 30)} months`,
    };
    processingRules.push(created);
    res.json({ ok: true, op: 'create', rule: created, rules: processingRules });
  } catch (err) {
    console.error('processing-rules error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
