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
    getAll: async (search) => {
      const response = await api.get(`/${endpoint}${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload?.data;
      if (!Array.isArray(rows)) throw new Error('The source API did not return a record list.');
      const total = Array.isArray(payload) ? rows.length : Number(payload.total ?? rows.length);
      if (!Number.isInteger(total) || total < 0) throw new Error('The source API returned an invalid record count.');
      return { ...response, data: rows, total, pagination: Array.isArray(payload) ? null : { page: payload.page, limit: payload.limit, total, totalPages: payload.totalPages } };
    },
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
  // Every OpenRouter request accepts an AbortSignal through axios config.
  riskAssessment: (data, config) => api.post('/ai/risk-assessment', data, config),
  dpiaGenerate: (data, config) => api.post('/ai/dpia-generate', data, config),
  complianceGap: (data, config) => api.post('/ai/compliance-gap', data, config),
  classifyData: (data, config) => api.post('/ai/classify-data', data, config),
  breachResponse: (data, config) => api.post('/ai/breach-response', data, config),
  generatePolicy: (data, config) => api.post('/ai/generate-policy', data, config),
  // Feature-Specific AI Tools
  analyzeActivity: (data, config) => api.post('/ai/analyze-activity', data, config),
  draftDsrResponse: (data, config) => api.post('/ai/draft-dsr-response', data, config),
  dpiaAdvice: (data, config) => api.post('/ai/dpia-advice', data, config),
  optimizeConsent: (data, config) => api.post('/ai/optimize-consent', data, config),
  analyzeBreach: (data, config) => api.post('/ai/analyze-breach', data, config),
  assessVendor: (data, config) => api.post('/ai/assess-vendor', data, config),
  retentionAdvice: (data, config) => api.post('/ai/retention-advice', data, config),
  auditCookies: (data, config) => api.post('/ai/audit-cookies', data, config),
  evaluateTransfer: (data, config) => api.post('/ai/evaluate-transfer', data, config),
  recommendTraining: (data, config) => api.post('/ai/recommend-training', data, config),
  // New AI Tools (audit-third-party-code & recommendation-engine-bias-check)
  auditThirdPartyCode: (data, config) => api.post('/ai/audit-third-party-code', data, config),
  checkRecommendationBias: (data, config) => api.post('/ai/recommendation-engine-bias-check', data, config),
  // Apply pass 4 - mechanical backlog
  dsrFulfillmentPlan: (data, config) => api.post('/ai/dsr-fulfillment-plan', data, config),
  dpaTemplateGenerate: (data, config) => api.post('/ai/dpa-template-generate', data, config),
  piiRbacRecommend: (data, config) => api.post('/ai/pii-rbac-recommend', data, config),
};

// Custom non-CRUD feature endpoints (5 new per audit)
export const customService = {
  // 1. Cookie scanner
  cookieScannerScan: (data, config) => api.post('/cookie-scanner/scan', data, config),
  cookieScannerHistory: (params) => api.get('/cookie-scanner/history', { params }),
  // 2. DSR fulfillment
  dsrFulfillmentGenerate: (data, config) => api.post('/dsr-fulfillment/generate', data, config),
  dsrFulfillmentList: (params) => api.get('/dsr-fulfillment/dossiers', { params }),
  // 3. Breach 72h countdown
  breachCountdownRegister: (data, config) => api.post('/breach-countdown/register', data, config),
  breachCountdownList: () => api.get('/breach-countdown'),
  // 4. Vendor renewal/audit calendar
  vendorCalendarSync: () => api.post('/vendor-calendar/sync'),
  vendorCalendarRecommend: (data, config) => api.post('/vendor-calendar/recommend', data, config),
  vendorCalendarList: () => api.get('/vendor-calendar'),
  // 5. Policy corpus RAG
  policyCorpusUpload: (data) => api.post('/policy-corpus', data),
  policyCorpusList: (params) => api.get('/policy-corpus', { params }),
  policyCorpusQuery: (data, config) => api.post('/policy-corpus/query', data, config),
  // Misc
  aiHistory: (params) => api.get('/ai-history', { params }),
  auditLog: (params) => api.get('/audit-log', { params }),
  complianceHealth: () => api.get('/compliance-health'),
  dsrDeadlines: () => api.get('/dsr-deadlines'),
};

export default api;
