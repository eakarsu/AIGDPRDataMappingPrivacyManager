
import FullAIExamples, { useFullAIExamples } from "./FullAIExamples.jsx";
import FullFieldPresets from './FullFieldPresets';
import React, { useState, useEffect, useRef } from 'react';
import AIResultView from './AIResultView';
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

const ADVANCED_SAMPLES = {
  'audit-third-party-code': [
    { label: 'Storefront SDK review', values: { sdks: 'Google Analytics 4\nStripe.js\nSentry', app_context: 'https://shop.example.com — fictional EU storefront review', jurisdiction: 'EU/EEA' } },
    { label: 'Support portal SDK review', values: { sdks: 'Intercom\nCloudflare Web Analytics\nDatadog RUM', app_context: 'https://support.example.com — fictional support portal review', jurisdiction: 'UK' } },
    { label: 'Global SaaS SDK review', values: { sdks: 'Segment\nMixpanel\nLaunchDarkly', app_context: 'https://app.example.com — fictional global SaaS review', jurisdiction: 'Global' } },
  ],
  'recommendation-engine-bias-check': [
    { label: 'Job ranking review', values: { system_description: 'Fictional job-posting ranker evaluated before deployment.', protected_attributes: 'age, gender, disability', sample_outcomes: 'Group A: 62 of 100 shown\nGroup B: 41 of 100 shown', deployment_context: 'EU employment recommendations; review-only evidence sample.' } },
    { label: 'Product ranking review', values: { system_description: 'Fictional product recommendation system using browsing categories.', protected_attributes: 'age, region, inferred income', sample_outcomes: 'Segment 1: 70% premium products\nSegment 2: 25% premium products', deployment_context: 'EU consumer storefront; aggregate illustrative outcomes only.' } },
    { label: 'Content feed review', values: { system_description: 'Fictional content-feed ranker assessed for disparate exposure.', protected_attributes: 'language, age, disability', sample_outcomes: 'Language A median exposure: 18\nLanguage B median exposure: 9', deployment_context: 'Global consumer app; no individual-level personal data supplied.' } },
  ],
  'dsr-fulfillment-plan': [
    { label: 'Access plan', values: { request_type: 'access', data_subject_description: 'Fictional verified-customer scenario; identity verification remains required.', systems_in_scope: 'customer database, support portal, billing archive', data_categories: 'contact data, orders, support messages', jurisdiction: 'EU/EEA' } },
    { label: 'Erasure plan', values: { request_type: 'erasure', data_subject_description: 'Fictional former-customer scenario; retention exceptions require legal review.', systems_in_scope: 'CRM, marketing platform, analytics warehouse', data_categories: 'profile, preferences, event history', jurisdiction: 'UK' } },
    { label: 'Portability plan', values: { request_type: 'portability', data_subject_description: 'Fictional portability scenario; do not release before identity and scope review.', systems_in_scope: 'account service, order service, export archive', data_categories: 'account, purchases, user-created content', jurisdiction: 'Global' } },
  ],
  'dpa-template-generate': [
    { label: 'Hosting DPA draft', values: { controller_name: 'Example Controller GmbH', processor_name: 'Example Hosting Ltd', processing_purpose: 'Fictional hosting and support scope for counsel review.', data_categories: 'contact data, account metadata', data_subjects: 'customers, authorized users', sub_processors_allowed: true, transfer_outside_eea: false, jurisdiction: 'EU' } },
    { label: 'Support DPA draft', values: { controller_name: 'Example Retail plc', processor_name: 'Example Support Services Ltd', processing_purpose: 'Fictional customer-support processing scope for counsel review.', data_categories: 'contact data, support messages', data_subjects: 'customers, support users', sub_processors_allowed: false, transfer_outside_eea: true, jurisdiction: 'UK' } },
    { label: 'Global DPA draft', values: { controller_name: 'Example Global Controller Inc', processor_name: 'Example Analytics Processor Inc', processing_purpose: 'Fictional analytics processing scope; no agreement is signed or approved.', data_categories: 'pseudonymous identifiers, usage events', data_subjects: 'application users, administrators', sub_processors_allowed: true, transfer_outside_eea: true, jurisdiction: 'Global' } },
  ],
  'pii-rbac-recommend': [
    { label: 'SaaS access review', values: { organization_description: 'Fictional EU SaaS organization with support, engineering and privacy teams.', roles: 'support agent, engineer, privacy reviewer', datasets_with_pii: 'customer profiles, support tickets, audit logs', sensitivity_overview: 'Contact data and support messages; actual privileges require owner approval.' } },
    { label: 'Retail access review', values: { organization_description: 'Fictional retailer with store operations, ecommerce and finance teams.', roles: 'store manager, ecommerce analyst, finance specialist', datasets_with_pii: 'loyalty profiles, orders, payment references', sensitivity_overview: 'Customer and transaction data; payment credentials are not included in this example.' } },
    { label: 'Workforce access review', values: { organization_description: 'Fictional employer preparing a least-privilege HR review.', roles: 'HR administrator, manager, payroll specialist, privacy reviewer', datasets_with_pii: 'employee directory, payroll records, leave records', sensitivity_overview: 'Workforce data may include special-category records; approval and field-level controls are required.' } },
  ],
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
      <AIResultView response={data} title="OpenRouter privacy report" />
    </div>
  );
}

export default function AIAdvancedTools({ onBack, initialTab = 'audit-third-party-code' }) {
  const fullAIExamples = useFullAIExamples();

  const [tab, setTab] = useState(
    TABS.find((t) => t.key === initialTab) ? initialTab : 'audit-third-party-code'
  );
  useEffect(() => {
    if (TABS.some(item => item.key === initialTab)) setTab(initialTab);
  }, [initialTab]);

  const [forms, setForms] = useState({ ...INITIAL_FORMS });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});
  const [notices, setNotices] = useState({});
  const request = useRef(null);

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  const setField = (k, v) => {
    setForms((prev) => ({
      ...prev,
      [tab]: { ...(prev[tab] || {}), [k]: v },
    }));
  };

  const submit = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setErrors((prev) => ({ ...prev, [tab]: null }));
    setNotices((prev) => ({ ...prev, [tab]: '' }));
    setResults((prev) => ({ ...prev, [tab]: null }));
    try {
      const formValues = forms[tab] || {};
      let payload;
      let res;
      const splitList = (v) => (v ? v.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean) : []);
      if (tab === 'audit-third-party-code') {
        payload = {
          sdks_libraries: splitList(formValues.sdks).map((name) => ({ name })),
          app_or_site_url: formValues.app_context,
          region: formValues.jurisdiction,
        };
        res = await aiService.auditThirdPartyCode(payload, { signal: controller.signal });
      } else if (tab === 'recommendation-engine-bias-check') {
        payload = {
          system_description: formValues.system_description,
          protected_attributes: splitList(formValues.protected_attributes),
          sample_outcomes: splitList(formValues.sample_outcomes),
          use_case: formValues.deployment_context,
        };
        res = await aiService.checkRecommendationBias(payload, { signal: controller.signal });
      } else if (tab === 'dsr-fulfillment-plan') {
        payload = {
          request_type: formValues.request_type,
          data_subject_description: formValues.data_subject_description,
          systems_in_scope: splitList(formValues.systems_in_scope),
          data_categories: splitList(formValues.data_categories),
          jurisdiction: formValues.jurisdiction,
        };
        res = await aiService.dsrFulfillmentPlan(payload, { signal: controller.signal });
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
        res = await aiService.dpaTemplateGenerate(payload, { signal: controller.signal });
      } else if (tab === 'pii-rbac-recommend') {
        payload = {
          organization_description: formValues.organization_description,
          roles: splitList(formValues.roles),
          datasets_with_pii: splitList(formValues.datasets_with_pii),
          sensitivity_overview: formValues.sensitivity_overview,
        };
        res = await aiService.piiRbacRecommend(payload, { signal: controller.signal });
      }
      if (request.current !== controller) return;
      setResults((prev) => ({ ...prev, [tab]: res.data }));
      toast.success('AI result generated');
    } catch (e) {
      if (controller.signal.aborted) {
        setNotices((prev) => ({ ...prev, [tab]: 'OpenRouter request cancelled. Review the inputs or generate again.' }));
      } else {
        const msg = e?.response?.data?.error || e.message || 'Request failed';
        setErrors((prev) => ({ ...prev, [tab]: msg }));
        toast.error(msg);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  const cancel = () => {
    if (!request.current) return;
    request.current.abort();
    request.current = null;
    setLoading(false);
    setNotices((prev) => ({ ...prev, [tab]: 'OpenRouter request cancelled. Review the inputs or generate again.' }));
  };

  const v = forms[tab] || {};

  return (
    <div className="page" data-full-ai-workspace="AIAdvancedTools">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer' }}>← Back</button>
        <h1 style={{ margin: 0 }}>🛡️ AI Advanced Tools</h1>
      </div>

      <p style={{ color: '#64748b', marginBottom: 20 }}>
        Five native AI tools for code audits, recommender bias, DSR fulfillment, DPA drafting and access control.
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
        <FullFieldPresets value={v} presets={ADVANCED_SAMPLES[tab]} disabled={loading} onChange={(next) => {
          setForms((prev) => ({ ...prev, [tab]: { ...INITIAL_FORMS[tab], ...next } }));
          setResults((prev) => ({ ...prev, [tab]: null }));
          setErrors((prev) => ({ ...prev, [tab]: null }));
          setNotices((prev) => ({ ...prev, [tab]: 'Fictional example filled every field. Review it before generating; no approval, consent or evidence is asserted.' }));
        }} />
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.sdks || '', change: (e) => setField('sdks', e.target.value), label: "v.sdks", manual: false, json: false }, "p1-7657", undefined)}
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
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.app_context || '', change: (e) => setField('app_context', e.target.value), label: "v.app_context", manual: false, json: false }, "p1-8273", undefined)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Jurisdiction</label>
                <select
                  value={v.jurisdiction || 'EU/EEA'}
                  onChange={(e) => setField('jurisdiction', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.jurisdiction || 'EU/EEA', change: (e) => setField('jurisdiction', e.target.value), label: "v.jurisdiction", manual: false, json: false }, "p1-8803", undefined)}
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.system_description || '', change: (e) => setField('system_description', e.target.value), label: "v.system_description", manual: false, json: false }, "p1-10053", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Protected attributes (comma-separated)</label>
              <input
                value={v.protected_attributes || ''}
                placeholder="age, gender, race, disability, postal_code"
                onChange={(e) => setField('protected_attributes', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.protected_attributes || '', change: (e) => setField('protected_attributes', e.target.value), label: "v.protected_attributes", manual: false, json: false }, "p1-10663", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Sample outcomes</label>
              <textarea
                rows={5}
                value={v.sample_outcomes || ''}
                placeholder="Aggregate stats / CSV-like rows describing recommendation outcomes per group..."
                onChange={(e) => setField('sample_outcomes', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.sample_outcomes || '', change: (e) => setField('sample_outcomes', e.target.value), label: "v.sample_outcomes", manual: false, json: false }, "p1-11193", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Deployment context</label>
              <textarea
                rows={2}
                value={v.deployment_context || ''}
                placeholder="EU consumer-facing, regulated under EU AI Act high-risk category..."
                onChange={(e) => setField('deployment_context', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.deployment_context || '', change: (e) => setField('deployment_context', e.target.value), label: "v.deployment_context", manual: false, json: false }, "p1-11781", undefined)}
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
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.request_type || 'access', change: (e) => setField('request_type', e.target.value), label: "v.request_type", manual: false, json: false }, "p1-12773", undefined)}
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
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.jurisdiction || 'EU/EEA', change: (e) => setField('jurisdiction', e.target.value), label: "v.jurisdiction", manual: false, json: false }, "p1-13602", undefined)}
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.data_subject_description || '', change: (e) => setField('data_subject_description', e.target.value), label: "v.data_subject_description", manual: false, json: false }, "p1-14341", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Systems in scope (comma-separated)</label>
              <input
                value={v.systems_in_scope || ''}
                placeholder="postgres-prod, salesforce, intercom, s3-archive"
                onChange={(e) => setField('systems_in_scope', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.systems_in_scope || '', change: (e) => setField('systems_in_scope', e.target.value), label: "v.systems_in_scope", manual: false, json: false }, "p1-14950", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data categories (comma-separated)</label>
              <input
                value={v.data_categories || ''}
                placeholder="contact, billing, support_messages, behavioural"
                onChange={(e) => setField('data_categories', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.data_categories || '', change: (e) => setField('data_categories', e.target.value), label: "v.data_categories", manual: false, json: false }, "p1-15495", undefined)}
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
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.controller_name || '', change: (e) => setField('controller_name', e.target.value), label: "v.controller_name", manual: false, json: false }, "p1-16452", undefined)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Processor name</label>
                <input
                  value={v.processor_name || ''}
                  onChange={(e) => setField('processor_name', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.processor_name || '', change: (e) => setField('processor_name', e.target.value), label: "v.processor_name", manual: false, json: false }, "p1-16885", undefined)}
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.processing_purpose || '', change: (e) => setField('processing_purpose', e.target.value), label: "v.processing_purpose", manual: false, json: false }, "p1-17362", undefined)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data categories (comma-separated)</label>
                <input
                  value={v.data_categories || ''}
                  placeholder="contact, billing"
                  onChange={(e) => setField('data_categories', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.data_categories || '', change: (e) => setField('data_categories', e.target.value), label: "v.data_categories", manual: false, json: false }, "p1-18047", undefined)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Data subjects (comma-separated)</label>
                <input
                  value={v.data_subjects || ''}
                  placeholder="customers, employees"
                  onChange={(e) => setField('data_subjects', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.data_subjects || '', change: (e) => setField('data_subjects', e.target.value), label: "v.data_subjects", manual: false, json: false }, "p1-18546", undefined)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!v.sub_processors_allowed}
                  onChange={(e) => setField('sub_processors_allowed', e.target.checked)} data-full-ai-field={fullAIExamples.bind({ current: !!v.sub_processors_allowed, change: (e) => setField('sub_processors_allowed', e.target.checked), label: "!!v.sub_processors_allowed", manual: false, json: false }, "p1-19071", undefined)}
                />
                Sub-processors allowed
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!v.transfer_outside_eea}
                  onChange={(e) => setField('transfer_outside_eea', e.target.checked)} data-full-ai-field={fullAIExamples.bind({ current: !!v.transfer_outside_eea, change: (e) => setField('transfer_outside_eea', e.target.checked), label: "!!v.transfer_outside_eea", manual: false, json: false }, "p1-19433", undefined)}
                />
                Transfer outside EEA
              </label>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Jurisdiction</label>
                <select
                  value={v.jurisdiction || 'EU'}
                  onChange={(e) => setField('jurisdiction', e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.jurisdiction || 'EU', change: (e) => setField('jurisdiction', e.target.value), label: "v.jurisdiction", manual: false, json: false }, "p1-19836", undefined)}
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.organization_description || '', change: (e) => setField('organization_description', e.target.value), label: "v.organization_description", manual: false, json: false }, "p1-20882", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Roles (comma-separated)</label>
              <input
                value={v.roles || ''}
                placeholder="support_agent, sales_rep, engineer, dpo, hr_admin"
                onChange={(e) => setField('roles', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.roles || '', change: (e) => setField('roles', e.target.value), label: "v.roles", manual: false, json: false }, "p1-21481", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Datasets with PII (comma-separated)</label>
              <input
                value={v.datasets_with_pii || ''}
                placeholder="customer_pii, support_tickets, hr_records, payment_logs"
                onChange={(e) => setField('datasets_with_pii', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.datasets_with_pii || '', change: (e) => setField('datasets_with_pii', e.target.value), label: "v.datasets_with_pii", manual: false, json: false }, "p1-22008", undefined)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Sensitivity overview</label>
              <textarea
                rows={3}
                value={v.sensitivity_overview || ''}
                placeholder="customer_pii contains email + DOB + IBAN; hr_records contains health data..."
                onChange={(e) => setField('sensitivity_overview', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} data-full-ai-field={fullAIExamples.bind({ current: v.sensitivity_overview || '', change: (e) => setField('sensitivity_overview', e.target.value), label: "v.sensitivity_overview", manual: false, json: false }, "p1-22550", undefined)}
              />
            </div>
          </>
        )}

        <div className="ai-actions">
        <button type="button" className="btn btn-secondary" onClick={cancel} disabled={!loading}>Cancel</button>
        <button
          type="button"
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
          {loading ? 'Generating...' : 'Generate with OpenRouter'}
        </button>
        </div>

        {notices[tab] && <p role="status">{notices[tab]}</p>}
        <ResultBlock data={results[tab]} error={errors[tab]} />
      </div>
    </div>
  );
}
