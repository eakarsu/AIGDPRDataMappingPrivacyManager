const express = require('express');
const { query } = require('../db');
const router = express.Router();

// Deterministic planning priority over saved native transfer facts. This does
// not verify a transfer, complete a TIA, approve a mechanism or call a provider.
function buildQueue(transfers) {
  return transfers.map(t => {
    const name = t.transfer_name ?? t.name;
    const mechanism = t.transfer_mechanism ?? t.mechanism;
    const encryption = 'encryption_in_transit' in t ? t.encryption_in_transit === true && t.encryption_at_rest === true : t.encryption === true;
    const recordedRisk = t.risk_level ?? t.vendor_risk;
    const score = (t.tia_completed === true ? 0 : 35) + (encryption ? 0 : 25) + (recordedRisk === 'high' || recordedRisk === 'critical' ? 25 : recordedRisk === 'medium' ? 12 : 4) + (String(mechanism || '').toLowerCase() === 'adequacy' ? -10 : 8);
    const required_artifacts = [];
    if (t.tia_completed !== true) required_artifacts.push('Review the actual TIA documentation');
    if (!encryption) required_artifacts.push('Verify the recorded supplementary safeguards');
    if (String(mechanism || '').toLowerCase().includes('scc')) required_artifacts.push('Review the actual SCC attachment');
    if (!mechanism) required_artifacts.push('Verify the actual transfer mechanism');
    if (['high','critical'].includes(recordedRisk)) required_artifacts.push('Request authorized legal review');
    return { ...t, name, mechanism, risk_score: Math.max(0,Math.min(100,score)), priority:score >= 60 ? 'legal_review' : score >= 35 ? 'privacy_ops_review' : 'monitor', required_artifacts, heuristic:true };
  }).sort((a,b)=>b.risk_score-a.risk_score || Number(a.id || 0)-Number(b.id || 0));
}
function result(transfers, source) {
  const queue = buildQueue(transfers);
  return {queue,source,heuristic:true,summary:{total:queue.length,legal_review:queue.filter(item=>item.priority==='legal_review').length}};
}
router.get('/', async (req,res) => {
  try {
    const actor = await query('SELECT id FROM users WHERE id=$1',[req.user.id]);
    if (!actor.rowCount) return res.status(401).json({error:'Sign in again to load saved transfers.'});
    const transfers = await query('SELECT * FROM cross_border_transfers ORDER BY id');
    res.json(result(transfers.rows,'PostgreSQL · Saved native cross-border transfers'));
  } catch (_) { res.status(500).json({error:'Saved transfer records could not load. Retry shortly.'}); }
});
router.post('/prioritize', (req,res) => {
  const transfers = req.body?.transfers;
  if (!Array.isArray(transfers) || transfers.length > 1000 || transfers.some(item=>!item || typeof item!=='object' || Array.isArray(item))) return res.status(400).json({error:'Provide the actual transfer list to prioritize; no example records are substituted.'});
  res.json(result(transfers,'Supplied planning input · Not saved or verified'));
});
module.exports = router;
