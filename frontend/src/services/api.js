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
};

export default api;
