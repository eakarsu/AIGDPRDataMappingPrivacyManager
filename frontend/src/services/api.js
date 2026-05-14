import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export function createCrudService(endpoint) {
  return {
    getAll: (search) => api.get(`/${endpoint}${search ? `?search=${search}` : ''}`),
    getById: (id) => api.get(`/${endpoint}/${id}`),
    create: (data) => api.post(`/${endpoint}`, data),
    update: (id, data) => api.put(`/${endpoint}/${id}`, data),
    delete: (id) => api.delete(`/${endpoint}/${id}`),
  };
}

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const aiService = {
  // General AI Tools
  riskAssessment: (data) => api.post('/ai/risk-assessment', data),
  dpiaGenerate: (data) => api.post('/ai/dpia-generate', data),
  complianceGap: (data) => api.post('/ai/compliance-gap', data),
  classifyData: (data) => api.post('/ai/classify-data', data),
  breachResponse: (data) => api.post('/ai/breach-response', data),
  generatePolicy: (data) => api.post('/ai/generate-policy', data),
  // Feature-Specific AI Tools
  analyzeActivity: (data) => api.post('/ai/analyze-activity', data),
  draftDsrResponse: (data) => api.post('/ai/draft-dsr-response', data),
  dpiaAdvice: (data) => api.post('/ai/dpia-advice', data),
  optimizeConsent: (data) => api.post('/ai/optimize-consent', data),
  analyzeBreach: (data) => api.post('/ai/analyze-breach', data),
  assessVendor: (data) => api.post('/ai/assess-vendor', data),
  retentionAdvice: (data) => api.post('/ai/retention-advice', data),
  auditCookies: (data) => api.post('/ai/audit-cookies', data),
  evaluateTransfer: (data) => api.post('/ai/evaluate-transfer', data),
  recommendTraining: (data) => api.post('/ai/recommend-training', data),
  // New AI Tools (audit-third-party-code & recommendation-engine-bias-check)
  auditThirdPartyCode: (data) => api.post('/ai/audit-third-party-code', data),
  checkRecommendationBias: (data) => api.post('/ai/recommendation-engine-bias-check', data),
  // Apply pass 4 - mechanical backlog
  dsrFulfillmentPlan: (data) => api.post('/ai/dsr-fulfillment-plan', data),
  dpaTemplateGenerate: (data) => api.post('/ai/dpa-template-generate', data),
  piiRbacRecommend: (data) => api.post('/ai/pii-rbac-recommend', data),
};

// Custom non-CRUD feature endpoints (5 new per audit)
export const customService = {
  // 1. Cookie scanner
  cookieScannerScan: (data) => api.post('/cookie-scanner/scan', data),
  cookieScannerHistory: (params) => api.get('/cookie-scanner/history', { params }),
  // 2. DSR fulfillment
  dsrFulfillmentGenerate: (data) => api.post('/dsr-fulfillment/generate', data),
  dsrFulfillmentList: (params) => api.get('/dsr-fulfillment/dossiers', { params }),
  // 3. Breach 72h countdown
  breachCountdownRegister: (data) => api.post('/breach-countdown/register', data),
  breachCountdownList: () => api.get('/breach-countdown'),
  // 4. Vendor renewal/audit calendar
  vendorCalendarSync: () => api.post('/vendor-calendar/sync'),
  vendorCalendarRecommend: (data) => api.post('/vendor-calendar/recommend', data),
  vendorCalendarList: () => api.get('/vendor-calendar'),
  // 5. Policy corpus RAG
  policyCorpusUpload: (data) => api.post('/policy-corpus', data),
  policyCorpusList: (params) => api.get('/policy-corpus', { params }),
  policyCorpusQuery: (data) => api.post('/policy-corpus/query', data),
  // Misc
  aiHistory: (params) => api.get('/ai-history', { params }),
  auditLog: (params) => api.get('/audit-log', { params }),
  complianceHealth: () => api.get('/compliance-health'),
  dsrDeadlines: () => api.get('/dsr-deadlines'),
};

export default api;
