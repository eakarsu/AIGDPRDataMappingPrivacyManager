import React, { useState, useEffect } from 'react';
import { createCrudService } from '../services/api';

const AI_GENERAL = [
  { key: 'ai-risk-assessment', title: 'AI Risk Assessment', desc: 'Analyze processing activities for privacy risks using AI', icon: '⚠️', color: '#e17055' },
  { key: 'ai-dpia-generator', title: 'AI DPIA Generator', desc: 'Auto-generate Data Protection Impact Assessments', icon: '📝', color: '#6c5ce7' },
  { key: 'ai-compliance-gap', title: 'AI Compliance Gap', desc: 'Identify GDPR compliance gaps in your practices', icon: '🔎', color: '#0984e3' },
  { key: 'ai-data-classification', title: 'AI Data Classification', desc: 'Classify data sensitivity and PII categories', icon: '🏷️', color: '#00b894' },
  { key: 'ai-breach-response', title: 'AI Breach Response', desc: 'Generate comprehensive breach response plans', icon: '🚑', color: '#d63031' },
  { key: 'ai-policy-generator', title: 'AI Policy Generator', desc: 'Generate GDPR-compliant privacy policies', icon: '📜', color: '#fdcb6e' },
];

const AI_FEATURE_SPECIFIC = [
  { key: 'ai-activity-analyzer', title: 'AI Activity Analyzer', desc: 'Analyze ROPA entries for compliance and completeness', icon: '📋', color: '#6c5ce7' },
  { key: 'ai-dsr-drafter', title: 'AI DSR Response Drafter', desc: 'Draft professional responses to data subject requests', icon: '👤', color: '#00b894' },
  { key: 'ai-dpia-advisor', title: 'AI DPIA Advisor', desc: 'Review existing DPIAs and suggest improvements', icon: '🔍', color: '#e17055' },
  { key: 'ai-consent-optimizer', title: 'AI Consent Optimizer', desc: 'Optimize consent text and ensure GDPR validity', icon: '✅', color: '#0984e3' },
  { key: 'ai-breach-analyzer', title: 'AI Breach Analyzer', desc: 'Deep analysis of breach incidents with root cause', icon: '🚨', color: '#d63031' },
  { key: 'ai-vendor-assessor', title: 'AI Vendor Risk Assessor', desc: 'Assess third-party vendor privacy and security risks', icon: '🏢', color: '#fdcb6e' },
  { key: 'ai-retention-advisor', title: 'AI Retention Advisor', desc: 'Get AI advice on optimal data retention periods', icon: '📅', color: '#00cec9' },
  { key: 'ai-cookie-auditor', title: 'AI Cookie Auditor', desc: 'Audit cookie compliance against ePrivacy & GDPR', icon: '🍪', color: '#e84393' },
  { key: 'ai-transfer-evaluator', title: 'AI Transfer Evaluator', desc: 'Evaluate cross-border transfer risks and Schrems II', icon: '🌍', color: '#74b9ff' },
  { key: 'ai-training-recommender', title: 'AI Training Recommender', desc: 'Get personalized privacy training recommendations', icon: '🎓', color: '#55efc4' },
];

function Dashboard({ features, onNavigate }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const loadCounts = async () => {
      const results = {};
      const entries = Object.entries(features);
      const promises = entries.map(async ([key, feat]) => {
        try {
          const res = await createCrudService(feat.endpoint).getAll();
          results[key] = res.data.length;
        } catch {
          results[key] = 0;
        }
      });
      await Promise.allSettled(promises);
      setCounts(results);
    };
    loadCounts();
  }, [features]);

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
  const breachCount = counts['data-breaches'] || 0;
  const pendingDSRs = counts['data-subject-requests'] || 0;
  const vendorCount = counts['vendors'] || 0;

  return (
    <div>
      <div className="dashboard-header">
        <h1>Privacy Dashboard</h1>
        <p>AI-powered GDPR compliance management overview</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#6c5ce7' }}>{totalRecords}</div>
          <div className="stat-card-label">Total Records Managed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#d63031' }}>{breachCount}</div>
          <div className="stat-card-label">Breach Incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#0984e3' }}>{pendingDSRs}</div>
          <div className="stat-card-label">Data Subject Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: '#00b894' }}>{vendorCount}</div>
          <div className="stat-card-label">Third-Party Vendors</div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Data Management</h2>
      <div className="dashboard-grid">
        {Object.entries(features).map(([key, feat]) => (
          <div key={key} className="feature-card" onClick={() => onNavigate(key)}>
            <div className="feature-card-icon" style={{ background: `${feat.color}20`, color: feat.color }}>
              {feat.icon}
            </div>
            <h3>{feat.title}</h3>
            <p>Manage and track {feat.title.toLowerCase()} records</p>
            <div className="feature-card-count" style={{ background: `${feat.color}15`, color: feat.color }}>
              {counts[key] !== undefined ? `${counts[key]} records` : 'Loading...'}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '32px 0 16px' }}>General AI Tools</h2>
      <div className="dashboard-grid">
        {AI_GENERAL.map((feat) => (
          <div key={feat.key} className="feature-card ai-card" onClick={() => onNavigate(feat.key)}>
            <div className="feature-card-icon" style={{ background: `${feat.color}20`, color: feat.color }}>
              {feat.icon}
            </div>
            <h3>{feat.title}</h3>
            <p>{feat.desc}</p>
            <div className="feature-card-count" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
              AI Powered
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '32px 0 16px' }}>Feature-Specific AI Tools</h2>
      <div className="dashboard-grid">
        {AI_FEATURE_SPECIFIC.map((feat) => (
          <div key={feat.key} className="feature-card ai-card" onClick={() => onNavigate(feat.key)}>
            <div className="feature-card-icon" style={{ background: `${feat.color}20`, color: feat.color }}>
              {feat.icon}
            </div>
            <h3>{feat.title}</h3>
            <p>{feat.desc}</p>
            <div className="feature-card-count" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
              AI Powered
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
