const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/processing-activities', require('./routes/processingActivities'));
app.use('/api/data-subject-requests', require('./routes/dataSubjectRequests'));
app.use('/api/privacy-impact-assessments', require('./routes/privacyImpactAssessments'));
app.use('/api/consent-records', require('./routes/consentRecords'));
app.use('/api/data-breaches', require('./routes/dataBreaches'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/retention-policies', require('./routes/retentionPolicies'));
app.use('/api/cookie-compliance', require('./routes/cookieCompliance'));
app.use('/api/cross-border-transfers', require('./routes/crossBorderTransfers'));
app.use('/api/training-records', require('./routes/trainingRecords'));
app.use('/api/ai', require('./routes/ai'));

app.listen(PORT, () => {
  console.log(`GDPR Privacy Manager Backend running on port ${PORT}`);
});
