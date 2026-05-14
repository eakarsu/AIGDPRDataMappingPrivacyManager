import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { aiService } from '../services/api';

/**
 * Frontend for the 2 new AI endpoints in backend/routes/ai.js:
 *   POST /api/ai/audit-third-party-code
 *   POST /api/ai/recommendation-engine-bias-check
 *
 * Mirrors AIInsights.js style — uses the same toast, sidebar/back pattern,
 * and `aiService` axios wrapper.
 */

const TABS = [
  { key: 'audit-third-party-code', label: 'Third-party Code Audit', icon: '🔌' },
  { key: 'recommendation-engine-bias-check', label: 'Recommender Bias Check', icon: '⚖️' },
  { key: 'dsr-fulfillment-plan', label: 'DSR Fulfillment Plan', icon: '📤' },
  { key: 'dpa-template-generate', label: 'DPA Template', icon: '📄' },
  { key: 'pii-rbac-recommend', label: 'PII RBAC Matrix', icon: '🔐' },
];

const INITIAL_FORMS = {
  'audit-third-party-code': {
    sdks: '',
    app_context: '',
    jurisdiction: 'EU/EEA',
  },
  'recommendation-engine-bias-check': {
    system_description: '',
    protected_attributes: '',
    sample_outcomes: '',
    deployment_context: '',
  },
  'dsr-fulfillment-plan': {
    request_type: 'access',
    data_subject_description: '',
    systems_in_scope: '',
    data_categories: '',
    jurisdiction: 'EU/EEA',
  },
  'dpa-template-generate': {
    controller_name: '',
    processor_name: '',
    processing_purpose: '',
    data_categories: '',
    data_subjects: '',
    sub_processors_allowed: false,
    transfer_outside_eea: false,
    jurisdiction: 'EU',
  },
  'pii-rbac-recommend': {
    organization_description: '',
    roles: '',
    datasets_with_pii: '',
    sensitivity_overview: '',
  },
};

function ResultBlock({ data, error }) {
  if (error) {
    return (
      <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }
  if (!data) return null;
  return (
    <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <h4 style={{ marginTop: 0 }}>AI Result</h4>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#1e293b' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AIAdvancedTools({ onBack, initialTab = 'audit-third-party-code' }) {
  const [tab, setTab] = useState(
    TABS.find((t) => t.key === initialTab) ? initialTab : 'audit-third-party-code'
  );
  const [forms, setForms] = useState({ ...INITIAL_FORMS });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  const setField = (k, v) => {
    setForms((prev) => ({
      ...prev,
      [tab]: { ...(prev[tab] || {}), [k]: v },
    }));
  };

  const submit = async () => {
    setLoading(true);
    setErrors((prev) => ({ ...prev, [tab]: null }));
    setResults((prev) => ({ ...prev, [tab]: null }));
    try {
      const formValues = forms[tab] || {};
      let payload;
      let res;
      const splitList = (v) => (v ? v.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean) : []);
      if (tab === 'audit-third-party-code') {
        payload = {
          sdks: splitList(formValues.sdks),
          app_context: formValues.app_context,
          jurisdiction: formValues.jurisdiction,
        };
        res = await aiService.auditThirdPartyCode(payload);
      } else if (tab === 'recommendation-engine-bias-check') {
        payload = {
          system_description: formValues.system_description,
          protected_attributes: splitList(formValues.protected_attributes),
          sample_outcomes: formValues.sample_outcomes,
          deployment_context: formValues.deployment_context,
        };
        res = await aiService.checkRecommendationBias(payload);
      } else if (tab === 'dsr-fulfillment-plan') {
        payload = {
          request_type: formValues.request_type,
          data_subject_description: formValues.data_subject_description,
          systems_in_scope: splitList(formValues.systems_in_scope),
          data_categories: splitList(formValues.data_categories),
          jurisdiction: formValues.jurisdiction,
        };
        res = await aiService.dsrFulfillmentPlan(payload);
      } else if (tab === 'dpa-template-generate') {
        payload = {
          controller_name: formValues.controller_name,
          processor_name: formValues.processor_name,
          processing_purpose: formValues.processing_purpose,
          data_categories: splitList(formValues.data_categories),
          data_subjects: splitList(formValues.data_subjects),
          sub_processors_allowed: !!formValues.sub_processors_allowed,
          transfer_outside_eea: !!formValues.transfer_outside_eea,
          jurisdiction: formValues.jurisdiction,
        };
        res = await aiService.dpaTemplateGenerate(payload);
      } else if (tab === 'pii-rbac-recommend') {
        payload = {
          organization_description: formValues.organization_description,
          roles: splitList(formValues.roles),
          datasets_with_pii: splitList(formValues.datasets_with_pii),
          sensitivity_overview: formValues.sensitivity_overview,
        };
        res = await aiService.piiRbacRecommend(payload);
      }
      setResults((prev) => ({ ...prev, [tab]: res.data }));
      toast.success('AI result generated');
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Request failed';
      setErrors((prev) => ({ ...prev, [tab]: msg }));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const v = forms[tab] || {};

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer' }}>← Back</button>
        <h1 style={{ margin: 0 }}>🛡️ AI Advanced Tools</h1>
      </div>

      <p style={{ color: '#64748b', marginBottom: 20 }}>
        Two newer AI endpoints: third-party SDK audit and recommendation engine bias check (GDPR Art. 22 / EU AI Act).
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              border: tab === t.key ? '1px solid #6366f1' : '1px solid #e2e8f0',
              background: tab === t.key ? '#eef2ff' : 'white',
              color: tab === t.key ? '#4f46e5' : '#374151',
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
        {tab === 'audit-third-party-code' && (
          <>
            <h2 style={{ marginTop: 0 }}>Third-party Code / SDK Audit</h2>
            <p style={{ color: '#64748b' }}>
              Provide your list of third-party SDKs/libraries; AI flags surveillance SDKs, undisclosed transfers,
              severity per item, and configure/remove/replace/DPA recommendations.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>SDKs / libraries (one per line or comma-separated)</label>
              <textarea
                rows={5}
                value={v.sdks || ''}
                placeholder="Google Analytics 4, Facebook SDK, Stripe.js, Hotjar, Sentry, Intercom..."
                onChange={(e) => setField('sdks', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>App context</label>
                <textarea
                  rows={3}
                  value={v.app_context || ''}
                  placeholder="Mobile + web SaaS, B2B, EU-only customers..."
                  onChange={(e) => setField('app_context', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Jurisdiction</label>
                <select
                  value={v.jurisdiction || 'EU/EEA'}
                  onChange={(e) => setField('jurisdiction', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="EU/EEA">EU / EEA</option>
                  <option value="UK">UK</option>
                  <option value="US (CCPA)">US (CCPA)</option>
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>
          </>
        )}

        {tab === 'recommendation-engine-bias-check' && (
          <>
            <h2 style={{ marginTop: 0 }}>Recommendation Engine Bias Check</h2>
            <p style={{ color: '#64748b' }}>
              Provide a system description, protected attributes, and sample outcomes; AI returns bias findings
              with fairness metrics (demographic parity / equal opportunity / disparate impact) and regulatory
              alignment notes (GDPR Art. 22, EU AI Act).
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>System description</label>
              <textarea
                rows={4}
                value={v.system_description || ''}
                placeholder="Recommendation system that ranks job postings for a job-board front page..."
                onChange={(e) => setField('system_description', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Protected attributes (comma-separated)</label>
              <input
                value={v.protected_attributes || ''}
                placeholder="age, gender, race, disability, postal_code"
                onChange={(e) => setField('protected_attributes', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Sample outcomes</label>
              <textarea
                rows={5}
                value={v.sample_outcomes || ''}
                placeholder="Aggregate stats / CSV-like rows describing recommendation outcomes per group..."
                onChange={(e) => setField('sample_outcomes', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Deployment context</label>
              <textarea
                rows={2}
                value={v.deployment_context || ''}
                placeholder="EU consumer-facing, regulated under EU AI Act high-risk category..."
                onChange={(e) => setField('deployment_context', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </>
        )}

        {tab === 'dsr-fulfillment-plan' && (
          <>
            <h2 style={{ marginTop: 0 }}>Automated DSR Fulfillment Plan</h2>
            <p style={{ color: '#64748b' }}>
              Produces a step-by-step plan to fulfill a Data Subject Right (export, anonymization, redaction).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Request type</label>
                <select
                  value={v.request_type || 'access'}
                  onChange={(e) => setField('request_type', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="access">Access</option>
                  <option value="erasure">Erasure</option>
                  <option value="rectification">Rectification</option>
                  <option value="portability">Portability</option>
                  <option value="restrict">Restrict</option>
                  <option value="object">Object</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Jurisdiction</label>
                <select
                  value={v.jurisdiction || 'EU/EEA'}
                  onChange={(e) => setField('jurisdiction', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="EU/EEA">EU / EEA</option>
                  <option value="UK">UK</option>
                  <option value="US (CCPA)">US (CCPA)</option>
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data subject description</label>
              <textarea
                rows={3}
                value={v.data_subject_description || ''}
                placeholder="Customer requesting access; identified by email + last order ID..."
                onChange={(e) => setField('data_subject_description', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Systems in scope (comma-separated)</label>
              <input
                value={v.systems_in_scope || ''}
                placeholder="postgres-prod, salesforce, intercom, s3-archive"
                onChange={(e) => setField('systems_in_scope', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data categories (comma-separated)</label>
              <input
                value={v.data_categories || ''}
                placeholder="contact, billing, support_messages, behavioural"
                onChange={(e) => setField('data_categories', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </>
        )}

        {tab === 'dpa-template-generate' && (
          <>
            <h2 style={{ marginTop: 0 }}>DPA / Processor Contract Template</h2>
            <p style={{ color: '#64748b' }}>
              Generates a Data Processing Agreement template aligned with GDPR Art. 28 (and SCCs if transfer outside EEA).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Controller name</label>
                <input
                  value={v.controller_name || ''}
                  onChange={(e) => setField('controller_name', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Processor name</label>
                <input
                  value={v.processor_name || ''}
                  onChange={(e) => setField('processor_name', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Processing purpose</label>
              <textarea
                rows={3}
                value={v.processing_purpose || ''}
                placeholder="Hosting CRM data, sending transactional emails on behalf of controller..."
                onChange={(e) => setField('processing_purpose', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data categories (comma-separated)</label>
                <input
                  value={v.data_categories || ''}
                  placeholder="contact, billing"
                  onChange={(e) => setField('data_categories', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data subjects (comma-separated)</label>
                <input
                  value={v.data_subjects || ''}
                  placeholder="customers, employees"
                  onChange={(e) => setField('data_subjects', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!v.sub_processors_allowed}
                  onChange={(e) => setField('sub_processors_allowed', e.target.checked)}
                />
                Sub-processors allowed
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!v.transfer_outside_eea}
                  onChange={(e) => setField('transfer_outside_eea', e.target.checked)}
                />
                Transfer outside EEA
              </label>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Jurisdiction</label>
                <select
                  value={v.jurisdiction || 'EU'}
                  onChange={(e) => setField('jurisdiction', e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="EU">EU</option>
                  <option value="UK">UK</option>
                  <option value="US">US</option>
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>
          </>
        )}

        {tab === 'pii-rbac-recommend' && (
          <>
            <h2 style={{ marginTop: 0 }}>Role-Based PII Access Control Matrix</h2>
            <p style={{ color: '#64748b' }}>
              Generates a least-privilege RBAC matrix (per GDPR Art. 5(1)(f) / Art. 32) for the listed roles and datasets.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Organization description</label>
              <textarea
                rows={3}
                value={v.organization_description || ''}
                placeholder="EU SaaS company, ~200 staff, support + sales + engineering teams..."
                onChange={(e) => setField('organization_description', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Roles (comma-separated)</label>
              <input
                value={v.roles || ''}
                placeholder="support_agent, sales_rep, engineer, dpo, hr_admin"
                onChange={(e) => setField('roles', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Datasets with PII (comma-separated)</label>
              <input
                value={v.datasets_with_pii || ''}
                placeholder="customer_pii, support_tickets, hr_records, payment_logs"
                onChange={(e) => setField('datasets_with_pii', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Sensitivity overview</label>
              <textarea
                rows={3}
                value={v.sensitivity_overview || ''}
                placeholder="customer_pii contains email + DOB + IBAN; hr_records contains health data..."
                onChange={(e) => setField('sensitivity_overview', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>
          </>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 6,
            background: '#6366f1',
            color: 'white',
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Running...' : 'Run AI'}
        </button>

        <ResultBlock data={results[tab]} error={errors[tab]} />
      </div>
    </div>
  );
}
