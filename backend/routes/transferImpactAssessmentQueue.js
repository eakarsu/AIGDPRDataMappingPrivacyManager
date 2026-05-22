const express = require('express');

const router = express.Router();

function buildQueue(input = {}) {
  const transfers = input.transfers || [
    { name: 'EU analytics export', destination_country: 'United States', mechanism: 'SCC', tia_completed: false, encryption: true, vendor_risk: 'medium' },
    { name: 'Support ticket replication', destination_country: 'India', mechanism: 'SCC', tia_completed: true, encryption: true, vendor_risk: 'low' },
    { name: 'HR processor backup', destination_country: 'Singapore', mechanism: 'adequacy', tia_completed: false, encryption: false, vendor_risk: 'high' },
  ];
  const queue = transfers.map((t) => {
    const score = (t.tia_completed ? 0 : 35) + (t.encryption ? 0 : 25) + (t.vendor_risk === 'high' ? 25 : t.vendor_risk === 'medium' ? 12 : 4) + (t.mechanism === 'adequacy' ? -10 : 8);
    return {
      ...t,
      risk_score: Math.max(0, Math.min(100, score)),
      priority: score >= 60 ? 'legal_review' : score >= 35 ? 'privacy_ops_review' : 'monitor',
      required_artifacts: ['TIA questionnaire', 'SCC attachment', 'supplementary safeguards memo'].filter((_, i) => score > i * 20),
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
  return { queue, summary: { total: queue.length, legal_review: queue.filter((q) => q.priority === 'legal_review').length } };
}

router.get('/', (req, res) => res.json(buildQueue()));
router.post('/prioritize', (req, res) => res.json(buildQueue(req.body || {})));

module.exports = router;
