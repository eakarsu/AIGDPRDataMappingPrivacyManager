import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { authService, createCrudService, aiService } from './services/api';
import Dashboard from './components/Dashboard';
import CrudPage from './components/CrudPage';
import AIInsights from './components/AIInsights';
import AIAdvancedTools from './components/AIAdvancedTools';
import CustomFeatures from './components/CustomFeatures';
import RegulatoryAndLLM from './components/RegulatoryAndLLM';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticComplianceAuditorContinuously from './pages/CfAgenticComplianceAuditorContinuously';
import CfLlmfoundationModelUsageScannerExtend from './pages/CfLlmfoundationModelUsageScannerExtend';
import CfVendorSupplyChainVisibilityMapping2 from './pages/CfVendorSupplyChainVisibilityMapping2';
import CfConsentBannerAbTesterRecommendingVa from './pages/CfConsentBannerAbTesterRecommendingVa';
import CfRegulatoryChangeTrackerAutoGeneratin from './pages/CfRegulatoryChangeTrackerAutoGeneratin';
import CfAdaptiveWorkforcePrivacyTrainingPlat from './pages/CfAdaptiveWorkforcePrivacyTrainingPlat';
import GapNoThirdPartyCodeSdkAudit from './pages/GapNoThirdPartyCodeSdkAudit';
import GapNoRecommendationEngineBiasCheck from './pages/GapNoRecommendationEngineBiasCheck';
import GapNoAutomatedDpaContractTemplateGener from './pages/GapNoAutomatedDpaContractTemplateGener';
import GapNoAutomatedDsrFulfillmentDataExport from './pages/GapNoAutomatedDsrFulfillmentDataExport';
import GapNoRealTimeDataFlowMonitoring from './pages/GapNoRealTimeDataFlowMonitoring';
import GapLimitedWebhookSurfaceNoWebhookKeywo from './pages/GapLimitedWebhookSurfaceNoWebhookKeywo';
import GapNoPublicFacingPrivacyPortalFor from './pages/GapNoPublicFacingPrivacyPortalFor';
import CustomViewsPage from './pages/CustomViewsPage';
import TransferImpactAssessmentQueue from './pages/TransferImpactAssessmentQueue';

const FEATURES = {
  'processing-activities': { title: 'Processing Activities (ROPA)', endpoint: 'processing-activities', icon: '📋', color: '#6c5ce7' },
  'data-subject-requests': { title: 'Data Subject Requests', endpoint: 'data-subject-requests', icon: '👤', color: '#00b894' },
  'privacy-impact-assessments': { title: 'Privacy Impact Assessments', endpoint: 'privacy-impact-assessments', icon: '🔍', color: '#e17055' },
  'consent-records': { title: 'Consent Management', endpoint: 'consent-records', icon: '✅', color: '#0984e3' },
  'data-breaches': { title: 'Data Breach Incidents', endpoint: 'data-breaches', icon: '🚨', color: '#d63031' },
  'vendors': { title: 'Third-Party Vendors', endpoint: 'vendors', icon: '🏢', color: '#fdcb6e' },
  'retention-policies': { title: 'Retention Policies', endpoint: 'retention-policies', icon: '📅', color: '#00cec9' },
  'cookie-compliance': { title: 'Cookie Compliance', endpoint: 'cookie-compliance', icon: '🍪', color: '#e84393' },
  'cross-border-transfers': { title: 'Cross-Border Transfers', endpoint: 'cross-border-transfers', icon: '🌍', color: '#74b9ff' },
  'training-records': { title: 'Training Records', endpoint: 'training-records', icon: '🎓', color: '#55efc4' },
};

const FIELD_CONFIGS = {
  'processing-activities': {
    tableColumns: ['activity_name', 'purpose', 'legal_basis', 'department', 'status', 'risk_level'],
    formFields: [
      { name: 'activity_name', label: 'Activity Name', type: 'text', required: true },
      { name: 'purpose', label: 'Purpose', type: 'textarea', required: true },
      { name: 'legal_basis', label: 'Legal Basis', type: 'select', options: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'], required: true },
      { name: 'data_categories', label: 'Data Categories', type: 'text', required: true },
      { name: 'data_subjects', label: 'Data Subjects', type: 'text', required: true },
      { name: 'recipients', label: 'Recipients', type: 'text' },
      { name: 'third_country_transfers', label: 'Third Country Transfers', type: 'checkbox' },
      { name: 'transfer_safeguards', label: 'Transfer Safeguards', type: 'text' },
      { name: 'retention_period', label: 'Retention Period', type: 'text' },
      { name: 'technical_measures', label: 'Technical Measures', type: 'textarea' },
      { name: 'organizational_measures', label: 'Organizational Measures', type: 'textarea' },
      { name: 'data_source', label: 'Data Source', type: 'text' },
      { name: 'automated_decision_making', label: 'Automated Decision Making', type: 'checkbox' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'controller_name', label: 'Controller Name', type: 'text' },
      { name: 'processor_name', label: 'Processor Name', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'under_review', 'archived'] },
      { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
    ],
  },
  'data-subject-requests': {
    tableColumns: ['requester_name', 'request_type', 'received_date', 'due_date', 'status', 'assigned_to'],
    formFields: [
      { name: 'request_type', label: 'Request Type', type: 'select', options: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'], required: true },
      { name: 'requester_name', label: 'Requester Name', type: 'text', required: true },
      { name: 'requester_email', label: 'Requester Email', type: 'email', required: true },
      { name: 'requester_id_verified', label: 'ID Verified', type: 'checkbox' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'data_categories_affected', label: 'Data Categories Affected', type: 'text' },
      { name: 'systems_affected', label: 'Systems Affected', type: 'text' },
      { name: 'received_date', label: 'Received Date', type: 'date', required: true },
      { name: 'due_date', label: 'Due Date', type: 'date', required: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'response_method', label: 'Response Method', type: 'select', options: ['email', 'postal', 'portal'] },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed', 'denied', 'extended'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'privacy-impact-assessments': {
    tableColumns: ['assessment_name', 'project_name', 'assessment_type', 'risk_level', 'status', 'outcome'],
    formFields: [
      { name: 'assessment_name', label: 'Assessment Name', type: 'text', required: true },
      { name: 'project_name', label: 'Project Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'assessment_type', label: 'Type', type: 'select', options: ['full_dpia', 'threshold_assessment', 'preliminary'], required: true },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'assessor', label: 'Assessor', type: 'text' },
      { name: 'processing_description', label: 'Processing Description', type: 'textarea' },
      { name: 'necessity_justification', label: 'Necessity Justification', type: 'textarea' },
      { name: 'identified_risks', label: 'Identified Risks', type: 'textarea' },
      { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'mitigation_measures', label: 'Mitigation Measures', type: 'textarea' },
      { name: 'dpo_consulted', label: 'DPO Consulted', type: 'checkbox' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'in_progress', 'completed', 'approved', 'rejected'] },
      { name: 'outcome', label: 'Outcome', type: 'select', options: ['', 'approved', 'approved_with_conditions', 'rejected'] },
    ],
  },
  'consent-records': {
    tableColumns: ['data_subject_name', 'consent_type', 'purpose', 'consent_given', 'consent_date', 'status'],
    formFields: [
      { name: 'data_subject_name', label: 'Data Subject Name', type: 'text', required: true },
      { name: 'data_subject_email', label: 'Email', type: 'email', required: true },
      { name: 'consent_type', label: 'Consent Type', type: 'select', options: ['marketing', 'analytics', 'third_party_sharing', 'profiling', 'cookies', 'research'], required: true },
      { name: 'purpose', label: 'Purpose', type: 'textarea', required: true },
      { name: 'consent_given', label: 'Consent Given', type: 'checkbox' },
      { name: 'consent_date', label: 'Consent Date', type: 'datetime-local', required: true },
      { name: 'collection_method', label: 'Collection Method', type: 'select', options: ['web_form', 'paper', 'verbal', 'app', 'api'] },
      { name: 'consent_text', label: 'Consent Text', type: 'textarea' },
      { name: 'version', label: 'Version', type: 'text' },
      { name: 'granularity', label: 'Granularity', type: 'select', options: ['granular', 'bundled'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'withdrawn', 'expired'] },
    ],
  },
  'data-breaches': {
    tableColumns: ['incident_title', 'breach_type', 'severity', 'discovery_date', 'status', 'number_of_individuals'],
    formFields: [
      { name: 'incident_title', label: 'Incident Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'breach_type', label: 'Breach Type', type: 'select', options: ['confidentiality', 'integrity', 'availability'], required: true },
      { name: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'], required: true },
      { name: 'discovery_date', label: 'Discovery Date', type: 'datetime-local', required: true },
      { name: 'occurrence_date', label: 'Occurrence Date', type: 'datetime-local' },
      { name: 'data_categories_affected', label: 'Data Categories Affected', type: 'text' },
      { name: 'number_of_records', label: 'Number of Records', type: 'number' },
      { name: 'number_of_individuals', label: 'Number of Individuals', type: 'number' },
      { name: 'systems_affected', label: 'Systems Affected', type: 'text' },
      { name: 'root_cause', label: 'Root Cause', type: 'textarea' },
      { name: 'containment_actions', label: 'Containment Actions', type: 'textarea' },
      { name: 'remediation_actions', label: 'Remediation Actions', type: 'textarea' },
      { name: 'assigned_to', label: 'Assigned To', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['investigating', 'contained', 'resolved', 'closed'] },
    ],
  },
  'vendors': {
    tableColumns: ['vendor_name', 'vendor_type', 'country', 'dpa_signed', 'risk_level', 'status'],
    formFields: [
      { name: 'vendor_name', label: 'Vendor Name', type: 'text', required: true },
      { name: 'vendor_type', label: 'Vendor Type', type: 'select', options: ['processor', 'sub_processor', 'controller', 'joint_controller'], required: true },
      { name: 'contact_name', label: 'Contact Name', type: 'text' },
      { name: 'contact_email', label: 'Contact Email', type: 'email' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'services_provided', label: 'Services Provided', type: 'textarea' },
      { name: 'data_categories_shared', label: 'Data Categories Shared', type: 'text' },
      { name: 'dpa_signed', label: 'DPA Signed', type: 'checkbox' },
      { name: 'scc_in_place', label: 'SCC in Place', type: 'checkbox' },
      { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high'] },
      { name: 'certifications', label: 'Certifications', type: 'text' },
      { name: 'contract_start_date', label: 'Contract Start', type: 'date' },
      { name: 'contract_end_date', label: 'Contract End', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'under_review', 'terminated', 'pending'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'retention-policies': {
    tableColumns: ['policy_name', 'data_category', 'retention_period', 'disposal_method', 'department', 'status'],
    formFields: [
      { name: 'policy_name', label: 'Policy Name', type: 'text', required: true },
      { name: 'data_category', label: 'Data Category', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'retention_period', label: 'Retention Period', type: 'text', required: true },
      { name: 'retention_period_days', label: 'Retention Days', type: 'number' },
      { name: 'legal_basis', label: 'Legal Basis', type: 'text' },
      { name: 'regulatory_requirement', label: 'Regulatory Requirement', type: 'text' },
      { name: 'disposal_method', label: 'Disposal Method', type: 'select', options: ['deletion', 'anonymization', 'archival', 'shredding'] },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'applies_to_systems', label: 'Applies To Systems', type: 'text' },
      { name: 'review_frequency', label: 'Review Frequency', type: 'select', options: ['annual', 'biannual', 'quarterly'] },
      { name: 'data_owner', label: 'Data Owner', type: 'text' },
      { name: 'automated_enforcement', label: 'Automated Enforcement', type: 'checkbox' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'draft', 'archived', 'under_review'] },
    ],
  },
  'cookie-compliance': {
    tableColumns: ['cookie_name', 'domain', 'category', 'provider', 'duration', 'compliant', 'status'],
    formFields: [
      { name: 'cookie_name', label: 'Cookie Name', type: 'text', required: true },
      { name: 'domain', label: 'Domain', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['strictly_necessary', 'performance', 'functional', 'targeting'], required: true },
      { name: 'purpose', label: 'Purpose', type: 'textarea', required: true },
      { name: 'provider', label: 'Provider', type: 'text' },
      { name: 'duration', label: 'Duration', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['first_party', 'third_party'] },
      { name: 'data_collected', label: 'Data Collected', type: 'text' },
      { name: 'consent_required', label: 'Consent Required', type: 'checkbox' },
      { name: 'consent_mechanism', label: 'Consent Mechanism', type: 'select', options: ['banner', 'preference_center', 'implicit', 'none'] },
      { name: 'compliant', label: 'Compliant', type: 'checkbox' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'deprecated', 'blocked'] },
    ],
  },
  'cross-border-transfers': {
    tableColumns: ['transfer_name', 'source_country', 'destination_country', 'transfer_mechanism', 'risk_level', 'status'],
    formFields: [
      { name: 'transfer_name', label: 'Transfer Name', type: 'text', required: true },
      { name: 'source_country', label: 'Source Country', type: 'text', required: true },
      { name: 'destination_country', label: 'Destination Country', type: 'text', required: true },
      { name: 'data_categories', label: 'Data Categories', type: 'text', required: true },
      { name: 'data_subjects', label: 'Data Subjects', type: 'text' },
      { name: 'transfer_mechanism', label: 'Transfer Mechanism', type: 'select', options: ['adequacy_decision', 'scc', 'bcr', 'derogation', 'consent'], required: true },
      { name: 'recipient_name', label: 'Recipient', type: 'text' },
      { name: 'recipient_type', label: 'Recipient Type', type: 'select', options: ['processor', 'controller', 'joint_controller'] },
      { name: 'adequacy_decision', label: 'Adequacy Decision', type: 'checkbox' },
      { name: 'tia_completed', label: 'TIA Completed', type: 'checkbox' },
      { name: 'encryption_in_transit', label: 'Encryption in Transit', type: 'checkbox' },
      { name: 'encryption_at_rest', label: 'Encryption at Rest', type: 'checkbox' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'under_review', 'suspended', 'terminated'] },
    ],
  },
  'training-records': {
    tableColumns: ['training_name', 'employee_name', 'training_type', 'completion_date', 'passed', 'status'],
    formFields: [
      { name: 'training_name', label: 'Training Name', type: 'text', required: true },
      { name: 'training_type', label: 'Training Type', type: 'select', options: ['onboarding', 'annual_refresh', 'role_specific', 'incident_response', 'dpia_training'], required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'provider', label: 'Provider', type: 'text' },
      { name: 'delivery_method', label: 'Delivery Method', type: 'select', options: ['online', 'classroom', 'webinar', 'self_paced'] },
      { name: 'duration_hours', label: 'Duration (hours)', type: 'number' },
      { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
      { name: 'employee_email', label: 'Employee Email', type: 'email' },
      { name: 'employee_department', label: 'Department', type: 'text' },
      { name: 'employee_role', label: 'Role', type: 'text' },
      { name: 'assigned_date', label: 'Assigned Date', type: 'date' },
      { name: 'completion_date', label: 'Completion Date', type: 'date' },
      { name: 'score', label: 'Score', type: 'number' },
      { name: 'passed', label: 'Passed', type: 'checkbox' },
      { name: 'certificate_issued', label: 'Certificate Issued', type: 'checkbox' },
      { name: 'topics_covered', label: 'Topics Covered', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: ['assigned', 'in_progress', 'completed', 'overdue', 'expired'] },
    ],
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await authService.login(loginForm.email, loginForm.password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Welcome back!');
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCurrentPage('dashboard');
  };

  const autoFill = () => {
    setLoginForm({ email: 'admin@privacyguard.com', password: 'Admin@2026!' });
  };

  const navigate = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  if (!token || !user) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-logo">🛡️</div>
          <h1>GDPR Privacy Manager</h1>
          <p className="login-subtitle">AI-Powered Data Protection & Compliance Platform</p>
          {loginError && <div className="error-msg">{loginError}</div>}
          <button className="btn btn-auto-fill" onClick={autoFill}>
            ⚡ Auto-Fill Demo Credentials
          </button>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} placeholder="Enter your email" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="Enter your password" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }

  const isAIAdvancedPage = currentPage.startsWith('aix-');
  const isAIPage = !isAIAdvancedPage && currentPage.startsWith('ai-');
  const isCrudPage = FEATURES[currentPage];
  const isCustomFeaturePage = currentPage.startsWith('cf-');

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🛡️ Privacy Manager</h2>
          <p>GDPR Compliance Platform</p>
        </div>

        <div className="sidebar-section">
          <div className={`sidebar-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
            📊 Dashboard
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Data Management</div>
          {Object.entries(FEATURES).map(([key, feat]) => (
            <div key={key} className={`sidebar-item ${currentPage === key ? 'active' : ''}`} onClick={() => navigate(key)}>
              {feat.icon} {feat.title}
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">General AI Tools</div>
          <div className={`sidebar-item ${currentPage === 'ai-risk-assessment' ? 'active' : ''}`} onClick={() => navigate('ai-risk-assessment')}>
            ⚠️ AI Risk Assessment
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-dpia-generator' ? 'active' : ''}`} onClick={() => navigate('ai-dpia-generator')}>
            📝 AI DPIA Generator
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-compliance-gap' ? 'active' : ''}`} onClick={() => navigate('ai-compliance-gap')}>
            🔎 AI Compliance Gap
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-data-classification' ? 'active' : ''}`} onClick={() => navigate('ai-data-classification')}>
            🏷️ AI Data Classification
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-breach-response' ? 'active' : ''}`} onClick={() => navigate('ai-breach-response')}>
            🚑 AI Breach Response
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-policy-generator' ? 'active' : ''}`} onClick={() => navigate('ai-policy-generator')}>
            📜 AI Policy Generator
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Feature AI Tools</div>
          <div className={`sidebar-item ${currentPage === 'ai-activity-analyzer' ? 'active' : ''}`} onClick={() => navigate('ai-activity-analyzer')}>
            📋 AI Activity Analyzer
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-dsr-drafter' ? 'active' : ''}`} onClick={() => navigate('ai-dsr-drafter')}>
            👤 AI DSR Response Drafter
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-dpia-advisor' ? 'active' : ''}`} onClick={() => navigate('ai-dpia-advisor')}>
            🔍 AI DPIA Advisor
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-consent-optimizer' ? 'active' : ''}`} onClick={() => navigate('ai-consent-optimizer')}>
            ✅ AI Consent Optimizer
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-breach-analyzer' ? 'active' : ''}`} onClick={() => navigate('ai-breach-analyzer')}>
            🚨 AI Breach Analyzer
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-vendor-assessor' ? 'active' : ''}`} onClick={() => navigate('ai-vendor-assessor')}>
            🏢 AI Vendor Risk Assessor
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-retention-advisor' ? 'active' : ''}`} onClick={() => navigate('ai-retention-advisor')}>
            📅 AI Retention Advisor
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-cookie-auditor' ? 'active' : ''}`} onClick={() => navigate('ai-cookie-auditor')}>
            🍪 AI Cookie Auditor
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-transfer-evaluator' ? 'active' : ''}`} onClick={() => navigate('ai-transfer-evaluator')}>
            🌍 AI Transfer Evaluator
          </div>
          <div className={`sidebar-item ${currentPage === 'ai-training-recommender' ? 'active' : ''}`} onClick={() => navigate('ai-training-recommender')}>
            🎓 AI Training Recommender
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Advanced AI Tools</div>
          <div className={`sidebar-item ${currentPage === 'aix-audit-third-party-code' ? 'active' : ''}`} onClick={() => navigate('aix-audit-third-party-code')}>
            🔌 Third-party Code Audit
          </div>
          <div className={`sidebar-item ${currentPage === 'aix-recommendation-engine-bias-check' ? 'active' : ''}`} onClick={() => navigate('aix-recommendation-engine-bias-check')}>
            ⚖️ Recommender Bias Check
          </div>
          <div className={`sidebar-item ${currentPage === 'aix-dsr-fulfillment-plan' ? 'active' : ''}`} onClick={() => navigate('aix-dsr-fulfillment-plan')}>
            📤 DSR Fulfillment Plan
          </div>
          <div className={`sidebar-item ${currentPage === 'aix-dpa-template-generate' ? 'active' : ''}`} onClick={() => navigate('aix-dpa-template-generate')}>
            📄 DPA Template
          </div>
          <div className={`sidebar-item ${currentPage === 'aix-pii-rbac-recommend' ? 'active' : ''}`} onClick={() => navigate('aix-pii-rbac-recommend')}>
            🔐 PII RBAC Matrix
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Advanced Features</div>
          <div className={`sidebar-item ${currentPage === 'cf-cookie-scanner' ? 'active' : ''}`} onClick={() => navigate('cf-cookie-scanner')}>
            🔎 Cookie Scanner
          </div>
          <div className={`sidebar-item ${currentPage === 'cf-dsr-fulfillment' ? 'active' : ''}`} onClick={() => navigate('cf-dsr-fulfillment')}>
            📦 DSR Fulfillment
          </div>
          <div className={`sidebar-item ${currentPage === 'cf-breach-countdown' ? 'active' : ''}`} onClick={() => navigate('cf-breach-countdown')}>
            ⏱️ Breach 72h Countdown
          </div>
          <div className={`sidebar-item ${currentPage === 'cf-vendor-calendar' ? 'active' : ''}`} onClick={() => navigate('cf-vendor-calendar')}>
            📅 Vendor Calendar
          </div>
          <div className={`sidebar-item ${currentPage === 'cf-policy-rag' ? 'active' : ''}`} onClick={() => navigate('cf-policy-rag')}>
            📚 Policy Corpus RAG
          </div>
          <div className={`sidebar-item ${currentPage === 'regulatory-and-llm' ? 'active' : ''}`} onClick={() => navigate('regulatory-and-llm')}>
            🌐 Regulatory & LLM Registry
          </div>
          <div data-testid="sidebar-custom-views" className={`sidebar-item ${currentPage === 'custom-views' ? 'active' : ''}`} onClick={() => navigate('custom-views')}>
            🛡️ GDPR Views
          </div>
          <div className={`sidebar-item ${currentPage === 'transfer-impact-assessment-queue' ? 'active' : ''}`} onClick={() => navigate('transfer-impact-assessment-queue')}>
            🌍 TIA Queue
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">{user.full_name?.charAt(0)}</div>
            <div>
              <div className="sidebar-user-name">{user.full_name}</div>
              <div className="sidebar-user-role">{user.role} • {user.department}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        {currentPage === 'dashboard' && (
          <Dashboard features={FEATURES} onNavigate={navigate} />
        )}
        {currentPage === 'regulatory-and-llm' && (
          <RegulatoryAndLLM />
        )}
        {currentPage === 'custom-views' && (
          <CustomViewsPage />
        )}
        {currentPage === 'transfer-impact-assessment-queue' && (
          <TransferImpactAssessmentQueue />
        )}
        {isCrudPage && (
          <CrudPage
            key={currentPage}
            feature={FEATURES[currentPage]}
            fieldConfig={FIELD_CONFIGS[currentPage]}
            service={createCrudService(FEATURES[currentPage].endpoint)}
            onBack={() => navigate('dashboard')}
          />
        )}
        {isAIPage && (
          <AIInsights aiService={aiService} onBack={() => navigate('dashboard')} initialTab={currentPage} />
        )}
        {isAIAdvancedPage && (
          <AIAdvancedTools onBack={() => navigate('dashboard')} initialTab={currentPage.replace('aix-', '')} />
        )}
        {isCustomFeaturePage && (
          <CustomFeatures
            initialTab={currentPage.replace('cf-', '')}
            onBack={() => navigate('dashboard')}
          />
        )}
      </main>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
