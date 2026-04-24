import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { createCrudService } from '../services/api';

const TABS = [
  { key: 'ai-risk-assessment', label: 'Risk Assessment', icon: '⚠️', group: 'general' },
  { key: 'ai-dpia-generator', label: 'DPIA Generator', icon: '📝', group: 'general' },
  { key: 'ai-compliance-gap', label: 'Compliance Gap', icon: '🔎', group: 'general' },
  { key: 'ai-data-classification', label: 'Data Classification', icon: '🏷️', group: 'general' },
  { key: 'ai-breach-response', label: 'Breach Response', icon: '🚑', group: 'general' },
  { key: 'ai-policy-generator', label: 'Policy Generator', icon: '📜', group: 'general' },
  { key: 'ai-activity-analyzer', label: 'Activity Analyzer', icon: '📋', group: 'feature' },
  { key: 'ai-dsr-drafter', label: 'DSR Drafter', icon: '👤', group: 'feature' },
  { key: 'ai-dpia-advisor', label: 'DPIA Advisor', icon: '🔍', group: 'feature' },
  { key: 'ai-consent-optimizer', label: 'Consent Optimizer', icon: '✅', group: 'feature' },
  { key: 'ai-breach-analyzer', label: 'Breach Analyzer', icon: '🚨', group: 'feature' },
  { key: 'ai-vendor-assessor', label: 'Vendor Assessor', icon: '🏢', group: 'feature' },
  { key: 'ai-retention-advisor', label: 'Retention Advisor', icon: '📅', group: 'feature' },
  { key: 'ai-cookie-auditor', label: 'Cookie Auditor', icon: '🍪', group: 'feature' },
  { key: 'ai-transfer-evaluator', label: 'Transfer Evaluator', icon: '🌍', group: 'feature' },
  { key: 'ai-training-recommender', label: 'Training Recommender', icon: '🎓', group: 'feature' },
];

const INITIAL_FORMS = {
  'ai-risk-assessment': { activity_name: '', processing_description: '', data_categories: '', data_subjects: '', legal_basis: '' },
  'ai-dpia-generator': { project_name: '', processing_description: '', data_categories: '', purpose: '', data_subjects: '' },
  'ai-compliance-gap': { regulation: 'GDPR', current_practices: '', organization_type: '', data_processing_activities: '' },
  'ai-data-classification': { data_fields: '', context: '', sample_values: '' },
  'ai-breach-response': { breach_type: '', description: '', data_affected: '', number_of_individuals: '', severity: '' },
  'ai-policy-generator': { policy_type: 'privacy_policy', organization_name: '', organization_type: '', jurisdiction: 'EU/EEA', specific_requirements: '' },
  'ai-activity-analyzer': { activity_name: '', purpose: '', legal_basis: '', data_categories: '', data_subjects: '', recipients: '', retention_period: '' },
  'ai-dsr-drafter': { request_type: 'access', requester_name: '', description: '', data_categories_affected: '', status: 'pending' },
  'ai-dpia-advisor': { assessment_name: '', project_name: '', processing_description: '', identified_risks: '', risk_level: '', status: 'draft' },
  'ai-consent-optimizer': { consent_type: 'marketing', purpose: '', consent_text: '', collection_method: 'web_form', granularity: 'granular' },
  'ai-breach-analyzer': { incident_title: '', description: '', breach_type: '', severity: '', data_categories_affected: '', number_of_individuals: '', root_cause: '' },
  'ai-vendor-assessor': { vendor_name: '', vendor_type: 'processor', country: '', services_provided: '', data_categories_shared: '', dpa_signed: 'true', scc_in_place: 'false', certifications: '' },
  'ai-retention-advisor': { data_category: '', current_retention_period: '', legal_basis: '', department: '', regulatory_requirement: '' },
  'ai-cookie-auditor': { domain: '', cookies_description: '', consent_mechanism: '', country_scope: 'EU' },
  'ai-transfer-evaluator': { source_country: 'Germany', destination_country: '', data_categories: '', transfer_mechanism: '', recipient_name: '', recipient_type: '' },
  'ai-training-recommender': { employee_role: '', department: '', current_training: '', compliance_gaps: '' },
};

// Sample presets for every AI feature
const SAMPLES = {
  'ai-risk-assessment': [
    { label: '🏦 Financial Profiling', data: { activity_name: 'Customer Financial Profiling', processing_description: 'Automated analysis of customer transaction patterns, spending habits, and credit history to generate risk scores and personalized financial product recommendations. Uses machine learning models trained on 3 years of historical data.', data_categories: 'Transaction history, Credit scores, Income data, Spending patterns, Bank account details', data_subjects: 'Banking customers, Loan applicants', legal_basis: 'legitimate_interests' }},
    { label: '👁️ Employee Monitoring', data: { activity_name: 'Remote Employee Productivity Monitoring', processing_description: 'Screen capture every 10 minutes, keystroke frequency logging, application usage tracking, and webcam check-ins for remote workers during business hours. Data stored for 6 months.', data_categories: 'Screenshots, Keystroke data, Application logs, Webcam images, Work hours', data_subjects: 'Remote employees', legal_basis: 'legitimate_interests' }},
    { label: '🎯 Marketing Analytics', data: { activity_name: 'Cross-Platform Marketing Attribution', processing_description: 'Tracking user journeys across website, mobile app, email, and social media to attribute conversions and optimize ad spend. Involves cookie syncing with 15 third-party ad networks.', data_categories: 'Cookie IDs, Device fingerprints, Browsing behavior, Purchase history, Email engagement', data_subjects: 'Website visitors, App users, Email subscribers', legal_basis: 'consent' }},
  ],
  'ai-dpia-generator': [
    { label: '🤖 AI Chatbot Deployment', data: { project_name: 'AI Customer Service Chatbot', processing_description: 'Deploying GPT-powered chatbot that handles customer inquiries, accesses customer accounts, processes complaints, and can initiate refunds. Conversations stored for training purposes.', data_categories: 'Customer names, Account details, Purchase history, Complaints, Chat transcripts', purpose: 'Automate customer service to reduce response time from 4 hours to instant', data_subjects: 'Existing customers, Prospective customers' }},
    { label: '📹 Facial Recognition Access', data: { project_name: 'Biometric Office Access Control', processing_description: 'Replacing badge-based entry with facial recognition cameras at all 12 office entrances. Biometric templates stored on-premise. System also logs entry/exit times for fire safety compliance.', data_categories: 'Facial biometric data, Entry/exit timestamps, Employee photos, Badge history', purpose: 'Enhanced security and fire safety compliance', data_subjects: 'Employees, Contractors, Visitors' }},
    { label: '📊 Health Data Platform', data: { project_name: 'Employee Wellness Analytics Platform', processing_description: 'Collecting health metrics from wearable devices, gym attendance, mental health survey responses, and sick leave patterns. AI generates wellness scores and recommends interventions to HR.', data_categories: 'Heart rate, Step count, Sleep data, Mental health scores, Sick leave records, Gym usage', purpose: 'Reduce absenteeism and improve employee wellbeing', data_subjects: 'Employees who opt into wellness program' }},
  ],
  'ai-compliance-gap': [
    { label: '🏢 Mid-size SaaS Company', data: { regulation: 'GDPR', current_practices: 'We have a basic privacy policy on our website. Customer data stored in AWS US-East. No DPO appointed. Consent collected via single checkbox at signup. No ROPA maintained. Basic password policy. Annual security training for IT staff only. No breach notification procedure documented.', organization_type: 'B2B SaaS company with 200 employees', data_processing_activities: 'Customer onboarding, Email marketing, Payment processing, Analytics tracking, Support ticket management' }},
    { label: '🏥 Healthcare Startup', data: { regulation: 'GDPR', current_practices: 'Telemedicine platform storing patient records in cloud. Encryption at rest enabled. Consent per consultation. No DPIA conducted. Using US-based video conferencing tool. Data shared with insurance partners via API. No data retention policy defined.', organization_type: 'Healthcare technology startup', data_processing_activities: 'Patient registration, Video consultations, Prescription management, Insurance claims, Health record storage' }},
    { label: '🛒 E-commerce (CCPA)', data: { regulation: 'CCPA', current_practices: 'Online retailer with 500K California customers. Cookie consent banner implemented. Do-not-sell link in footer. Customer data shared with 20+ marketing partners. No data inventory. Opt-out requests handled manually via email. Response time averaging 45 days.', organization_type: 'E-commerce retailer', data_processing_activities: 'Customer purchases, Loyalty program, Targeted advertising, Product recommendations, Customer reviews' }},
  ],
  'ai-data-classification': [
    { label: '👤 Customer Database Fields', data: { data_fields: 'first_name, last_name, email, phone_number, date_of_birth, street_address, city, postal_code, country, credit_card_number, cvv, card_expiry, purchase_history, loyalty_points, ip_address', context: 'E-commerce customer database', sample_values: 'John Smith, john@email.com, +49-170-1234567, 1985-03-15, Hauptstrasse 42, Berlin, 10115, DE' }},
    { label: '🏥 Healthcare Records', data: { data_fields: 'patient_id, full_name, date_of_birth, social_security_number, blood_type, diagnosis_code, medication_list, allergies, treating_physician, insurance_id, genetic_test_results, mental_health_notes, hiv_status', context: 'Hospital patient management system', sample_values: 'PT-12345, Maria Mueller, A+, ICD-10: J06.9, Ibuprofen 400mg' }},
    { label: '💼 HR System Fields', data: { data_fields: 'employee_id, full_name, email, personal_email, phone, emergency_contact, date_of_birth, national_id, tax_id, bank_account_iban, salary, bonus, performance_score, disability_status, trade_union_membership, religion, ethnicity', context: 'Human Resources Information System (HRIS)', sample_values: 'EMP-0042, Anna Schmidt, DE89370400440532013000, 85000 EUR' }},
  ],
  'ai-breach-response': [
    { label: '🎣 Phishing Attack', data: { breach_type: 'confidentiality', description: 'CFO received sophisticated spear-phishing email appearing to come from the CEO requesting urgent wire transfer. CFO clicked link and entered corporate credentials on fake login page. Attackers accessed email for 3 days, downloading customer contracts and financial reports before detection.', data_affected: 'Customer contracts, Financial reports, Employee emails, Banking credentials', number_of_individuals: '2500', severity: 'high' }},
    { label: '💻 Ransomware Attack', data: { breach_type: 'availability', description: 'Ransomware encrypted entire customer database and backup server at 3 AM Sunday. Ransom demand of 50 BTC. Primary and secondary backups both affected. Customer portal and internal systems offline. Last clean backup is 72 hours old.', data_affected: 'Complete customer database, Order history, Payment records, Employee data', number_of_individuals: '150000', severity: 'critical' }},
    { label: '📧 Accidental Data Leak', data: { breach_type: 'confidentiality', description: 'Marketing intern accidentally sent CSV file containing full customer list (names, emails, purchase amounts, phone numbers) to external marketing agency instead of anonymized segment data. File was attached to regular campaign brief email.', data_affected: 'Customer names, Email addresses, Phone numbers, Purchase history, Account values', number_of_individuals: '45000', severity: 'medium' }},
  ],
  'ai-policy-generator': [
    { label: '🌐 Website Privacy Policy', data: { policy_type: 'privacy_policy', organization_name: 'TechNova Solutions GmbH', organization_type: 'B2B SaaS company providing project management tools', jurisdiction: 'EU/EEA', specific_requirements: 'Processes employee data for HR clients, uses Google Analytics, Intercom chat, Stripe payments, hosts on AWS Frankfurt. Has customers in EU, UK, and US.' }},
    { label: '🍪 Cookie Policy', data: { policy_type: 'cookie_policy', organization_name: 'ShopEurope AG', organization_type: 'E-commerce platform with 2M monthly visitors', jurisdiction: 'EU/EEA', specific_requirements: 'Uses Google Analytics, Facebook Pixel, Hotjar, Stripe, Intercom, HubSpot. Cookie consent via OneTrust banner. Serves EU and UK customers.' }},
    { label: '📋 Data Processing Agreement', data: { policy_type: 'data_processing_agreement', organization_name: 'CloudServ Inc', organization_type: 'Cloud infrastructure provider acting as data processor', jurisdiction: 'EU/EEA', specific_requirements: 'Processes data on behalf of EU controllers. Data centers in Ireland and Germany. Sub-processors include AWS and Cloudflare. Must comply with GDPR Art. 28 requirements.' }},
  ],
  'ai-activity-analyzer': [
    { label: '📋 Customer Onboarding', data: { activity_name: 'Customer Onboarding & KYC', purpose: 'Collecting personal data for new customer account creation, identity verification, and anti-money laundering compliance', legal_basis: 'contract', data_categories: 'Name, Email, Address, Phone, ID Documents, Selfie photo', data_subjects: 'New customers', recipients: 'Sales Team, KYC Provider (Onfido), Compliance Team', retention_period: '5 years after account closure' }},
    { label: '📊 Website Analytics', data: { activity_name: 'Website Behavior Analytics', purpose: 'Tracking visitor behavior patterns including page views, click paths, scroll depth, and session recordings for UX optimization', legal_basis: 'consent', data_categories: 'IP Address, Browser fingerprint, Click data, Session recordings, Page views, Scroll patterns', data_subjects: 'Website visitors', recipients: 'Marketing team, Google Analytics, Hotjar, Mixpanel', retention_period: '26 months' }},
    { label: '🔒 Fraud Detection', data: { activity_name: 'Real-time Fraud Detection System', purpose: 'Automated analysis of all transactions using ML models to detect and block fraudulent activity in real-time', legal_basis: 'legitimate_interests', data_categories: 'Transaction data, IP addresses, Device fingerprints, Geolocation, Behavioral biometrics, Historical patterns', data_subjects: 'All customers making transactions', recipients: 'Risk Team, Anti-fraud AI provider (Featurespace), Law enforcement when required', retention_period: '7 years per anti-fraud regulations' }},
  ],
  'ai-dsr-drafter': [
    { label: '📥 Subject Access Request', data: { request_type: 'access', requester_name: 'Hans Mueller', description: 'I am requesting a complete copy of all personal data you hold about me, including any profiling, automated decision-making outputs, and data shared with third parties. Please also provide information about the purposes of processing and recipients.', data_categories_affected: 'Full profile, Transaction history, Marketing data, Support tickets, Profiling data', status: 'pending' }},
    { label: '🗑️ Right to Erasure', data: { request_type: 'erasure', requester_name: 'Sophie Laurent', description: 'I am exercising my right to be forgotten under GDPR Article 17. Please delete ALL personal data you hold about me across all systems including backups. I closed my account 6 months ago and no longer wish for any data to be retained. Please confirm deletion in writing.', data_categories_affected: 'Complete profile, Purchase history, Marketing preferences, Support logs, Analytics data', status: 'pending' }},
    { label: '📦 Data Portability', data: { request_type: 'portability', requester_name: 'Marco Rossi', description: 'I want to transfer my data to a competitor service. Please provide all my personal data in a structured, commonly used, machine-readable format (preferably JSON or CSV). This includes my account data, purchase history, preferences, and any content I have created.', data_categories_affected: 'Account profile, Purchase history, Saved preferences, User-generated content, Communication preferences', status: 'pending' }},
  ],
  'ai-dpia-advisor': [
    { label: '🤖 AI Chatbot DPIA Review', data: { assessment_name: 'Customer Service AI Bot DPIA', project_name: 'AI-Powered Customer Support Chatbot', processing_description: 'AI chatbot processes customer queries including account details, order information, and complaints. Uses NLP to understand intent and can access customer database to provide personalized responses.', identified_risks: 'Automated decision-making without human oversight, potential for inaccurate responses affecting customer rights, data retention of chat logs, training data containing PII', risk_level: 'high', status: 'in_progress' }},
    { label: '📹 CCTV Monitoring Review', data: { assessment_name: 'Workplace CCTV Assessment', project_name: 'Office Video Surveillance Expansion', processing_description: 'Expanding CCTV coverage from building entrances to include all open-plan office areas, meeting rooms, and break areas. Footage retained for 90 days with AI-powered motion detection alerts.', identified_risks: 'Excessive surveillance of employees, Disproportionate monitoring in break areas, 90-day retention may be excessive, AI alerting could create false accusations', risk_level: 'critical', status: 'draft' }},
    { label: '📊 Predictive Analytics Review', data: { assessment_name: 'Customer Churn Prediction DPIA', project_name: 'ML-based Churn Prediction Model', processing_description: 'Machine learning model analyzing 50+ customer attributes including demographics, behavior, support history, and payment patterns to predict churn probability and trigger retention campaigns.', identified_risks: 'Profiling and automated decision-making, Potential discrimination based on demographics, Lack of transparency in ML model decisions, Purpose creep from analytics to targeting', risk_level: 'high', status: 'completed' }},
  ],
  'ai-consent-optimizer': [
    { label: '📧 Marketing Email Consent', data: { consent_type: 'marketing', purpose: 'Sending promotional emails, newsletters, and personalized product recommendations', consent_text: 'By checking this box, you agree to receive marketing communications from us and our partners.', collection_method: 'web_form', granularity: 'bundled' }},
    { label: '🍪 Cookie Consent Banner', data: { consent_type: 'cookies', purpose: 'Setting analytics, functional, and advertising cookies to improve user experience and serve targeted ads', consent_text: 'We use cookies to improve your experience. By continuing to browse, you accept our use of cookies.', collection_method: 'web_form', granularity: 'bundled' }},
    { label: '📊 Profiling Consent', data: { consent_type: 'profiling', purpose: 'Automated analysis of browsing behavior, purchase history, and preferences to create customer segments and deliver personalized content', consent_text: 'I consent to automated profiling of my data for personalized recommendations. I understand I can object at any time.', collection_method: 'app', granularity: 'granular' }},
  ],
  'ai-breach-analyzer': [
    { label: '🔓 API Data Exposure', data: { incident_title: 'Unauthenticated API Endpoint Exposed Customer Data', description: 'Security researcher reported that the /api/v2/users endpoint was accessible without authentication due to a misconfiguration during the last deployment. The endpoint returned full user profiles including emails, phone numbers, and hashed passwords. Access logs show 47 unique IPs accessed the endpoint over 9 days.', breach_type: 'confidentiality', severity: 'high', data_categories_affected: 'Email addresses, Phone numbers, Hashed passwords, Profile data, Account creation dates', number_of_individuals: '12000', root_cause: 'Authentication middleware was accidentally removed during code refactoring in sprint 47' }},
    { label: '👤 Insider Data Theft', data: { incident_title: 'Departing Employee Downloaded Customer Database', description: 'DLP system flagged that a sales manager who submitted resignation downloaded the entire CRM export (85,000 customer records) to a personal USB drive on their last Friday. The employee had legitimate CRM access but bulk export was unusual. Employee claims they only wanted their personal contacts.', breach_type: 'confidentiality', severity: 'critical', data_categories_affected: 'Customer names, Company names, Email addresses, Phone numbers, Deal values, Meeting notes, Contract details', number_of_individuals: '85000', root_cause: 'No technical controls preventing bulk data export by authorized users, no enhanced monitoring for departing employees' }},
    { label: '☁️ Cloud Misconfiguration', data: { incident_title: 'S3 Bucket with HR Documents Publicly Accessible', description: 'External security firm notified us that an S3 bucket containing HR documents was publicly accessible. The bucket was created 4 months ago during a cloud migration project. It contained employee contracts, salary letters, performance reviews, and ID document scans. No evidence of unauthorized access found in CloudTrail logs.', breach_type: 'confidentiality', severity: 'critical', data_categories_affected: 'Employee contracts, Salary data, Performance reviews, ID document scans, Tax documents, Bank details', number_of_individuals: '340', root_cause: 'Junior developer created bucket with public access during testing and it was promoted to production without security review' }},
  ],
  'ai-vendor-assessor': [
    { label: '☁️ AWS Cloud Provider', data: { vendor_name: 'Amazon Web Services (AWS)', vendor_type: 'processor', country: 'United States', services_provided: 'Cloud infrastructure including EC2, S3, RDS, Lambda. Hosting all production workloads and customer data.', data_categories_shared: 'All customer PII, Transaction data, Application logs, Employee data', dpa_signed: 'true', scc_in_place: 'true', certifications: 'ISO 27001, SOC 2 Type II, SOC 3, CSA STAR, PCI DSS Level 1' }},
    { label: '📊 Analytics Startup', data: { vendor_name: 'DataInsight Analytics Ltd', vendor_type: 'processor', country: 'India', services_provided: 'Customer behavior analytics dashboard, A/B testing platform, custom reporting', data_categories_shared: 'User IDs, Browsing behavior, Purchase history, Device information, IP addresses', dpa_signed: 'false', scc_in_place: 'false', certifications: 'None currently - ISO 27001 certification in progress' }},
    { label: '💳 Payment Processor', data: { vendor_name: 'Stripe Inc', vendor_type: 'processor', country: 'United States', services_provided: 'Payment processing, subscription billing, fraud detection, invoicing', data_categories_shared: 'Cardholder names, Credit card numbers, Bank account details, Transaction amounts, Billing addresses', dpa_signed: 'true', scc_in_place: 'true', certifications: 'PCI DSS Level 1, SOC 2 Type II, ISO 27001' }},
  ],
  'ai-retention-advisor': [
    { label: '📹 CCTV Footage', data: { data_category: 'CCTV video surveillance footage from office premises', current_retention_period: '90 days', legal_basis: 'Legitimate interests - security', department: 'Facilities & Security', regulatory_requirement: 'No specific legal requirement, company policy based on industry practice' }},
    { label: '💼 Employee Records', data: { data_category: 'Employee HR records including contracts, payroll, performance reviews, disciplinary records', current_retention_period: 'Indefinite - currently never deleted', legal_basis: 'Contract and legal obligation', department: 'Human Resources', regulatory_requirement: 'Tax records: 10 years (AO §147). Employment tribunal claims: 3 months after termination. Social security: duration of employment + 5 years.' }},
    { label: '📧 Marketing Data', data: { data_category: 'Email marketing subscriber data including preferences, engagement metrics, and campaign history', current_retention_period: '5 years from last interaction', legal_basis: 'Consent', department: 'Marketing', regulatory_requirement: 'GDPR - consent must be current and demonstrable. No specific statutory retention period.' }},
  ],
  'ai-cookie-auditor': [
    { label: '🛒 E-commerce Website', data: { domain: 'shop-europe.com', cookies_description: 'Google Analytics (_ga, _gid), Facebook Pixel (_fbp), Hotjar (_hj*), Stripe payment cookies, session_id (auth), cart_items (shopping cart), lang (language pref), recently_viewed (product tracking), Criteo retargeting, Google Ads conversion, Mailchimp tracking', consent_mechanism: 'Custom cookie banner with Accept All / Reject All buttons. No granular category selection. Banner reappears every 6 months.', country_scope: 'EU' }},
    { label: '💼 Corporate Website', data: { domain: 'techcorp-solutions.de', cookies_description: 'Google Analytics 4, HubSpot tracking (_hstc, hubspotutk), LinkedIn Insight Tag, Google Tag Manager, WordPress session cookies, WPML language cookie, Cloudflare __cfduid, Intercom messenger cookie', consent_mechanism: 'OneTrust cookie banner with category toggles (Necessary, Performance, Functional, Targeting). Preference center accessible from footer.', country_scope: 'Global' }},
    { label: '📱 SaaS Application', data: { domain: 'app.projectflow.io', cookies_description: 'Authentication JWT in httpOnly cookie, CSRF token, Mixpanel analytics, Sentry error tracking, Intercom support chat, Stripe checkout session, feature_flags (A/B testing), timezone preference, theme preference (dark/light)', consent_mechanism: 'No cookie banner currently. Privacy policy mentions cookies but no active consent collection. Relying on implied consent from continued use.', country_scope: 'EU' }},
  ],
  'ai-transfer-evaluator': [
    { label: '🇺🇸 EU to US Cloud Transfer', data: { source_country: 'Germany', destination_country: 'United States', data_categories: 'Customer PII, Transaction data, Support communications, Employee data', transfer_mechanism: 'scc', recipient_name: 'Amazon Web Services Inc', recipient_type: 'processor' }},
    { label: '🇨🇳 EU to China Outsourcing', data: { source_country: 'Germany', destination_country: 'China', data_categories: 'Product quality data, Supplier contact details, Manufacturing specifications', transfer_mechanism: 'scc', recipient_name: 'ShenTech Manufacturing Ltd', recipient_type: 'processor' }},
    { label: '🇮🇳 EU to India Dev Center', data: { source_country: 'Germany', destination_country: 'India', data_categories: 'Source code with embedded test data, Customer support tickets, Internal communications, Database access for debugging', transfer_mechanism: 'scc', recipient_name: 'TechDev India Pvt Ltd', recipient_type: 'processor' }},
  ],
  'ai-training-recommender': [
    { label: '💻 Software Developer', data: { employee_role: 'Senior Software Developer', department: 'Engineering', current_training: 'Completed basic GDPR awareness training 2 years ago', compliance_gaps: 'No training on privacy by design, secure coding practices for PII handling, or DPIA involvement. Team recently had an incident where test data contained real customer PII.' }},
    { label: '📈 Marketing Manager', data: { employee_role: 'Digital Marketing Manager', department: 'Marketing', current_training: 'None - new hire from non-EU company', compliance_gaps: 'No understanding of consent requirements for email marketing, cookie compliance, legitimate interest assessment, or data sharing with advertising partners. Uses 10+ third-party marketing tools.' }},
    { label: '👔 New DPO', data: { employee_role: 'Data Protection Officer (newly appointed)', department: 'Legal & Compliance', current_training: 'Law degree with 5 years corporate law experience but no formal data protection certification', compliance_gaps: 'Needs comprehensive DPO training covering GDPR Articles 37-39 responsibilities, DPIA methodology, breach notification procedures, supervisory authority liaison, and cross-border transfer mechanisms.' }},
  ],
};

// Mapping of which database endpoint to load for each AI tab
const DATA_SOURCES = {
  'ai-risk-assessment': { endpoint: 'processing-activities', labelField: 'activity_name', mapFn: (item) => ({ activity_name: item.activity_name, processing_description: item.purpose, data_categories: item.data_categories, data_subjects: item.data_subjects, legal_basis: item.legal_basis }) },
  'ai-activity-analyzer': { endpoint: 'processing-activities', labelField: 'activity_name', mapFn: (item) => ({ activity_name: item.activity_name, purpose: item.purpose, legal_basis: item.legal_basis, data_categories: item.data_categories, data_subjects: item.data_subjects, recipients: item.recipients || '', retention_period: item.retention_period || '' }) },
  'ai-dsr-drafter': { endpoint: 'data-subject-requests', labelField: 'requester_name', sublabel: 'request_type', mapFn: (item) => ({ request_type: item.request_type, requester_name: item.requester_name, description: item.description || '', data_categories_affected: item.data_categories_affected || '', status: item.status }) },
  'ai-dpia-advisor': { endpoint: 'privacy-impact-assessments', labelField: 'assessment_name', mapFn: (item) => ({ assessment_name: item.assessment_name, project_name: item.project_name, processing_description: item.processing_description || '', identified_risks: item.identified_risks || '', risk_level: item.risk_level, status: item.status }) },
  'ai-dpia-generator': { endpoint: 'privacy-impact-assessments', labelField: 'assessment_name', mapFn: (item) => ({ project_name: item.project_name, processing_description: item.processing_description || '', data_categories: '', purpose: item.necessity_justification || '', data_subjects: '' }) },
  'ai-consent-optimizer': { endpoint: 'consent-records', labelField: 'data_subject_name', sublabel: 'consent_type', mapFn: (item) => ({ consent_type: item.consent_type, purpose: item.purpose, consent_text: item.consent_text || '', collection_method: item.collection_method || 'web_form', granularity: item.granularity || 'granular' }) },
  'ai-breach-response': { endpoint: 'data-breaches', labelField: 'incident_title', mapFn: (item) => ({ breach_type: item.breach_type, description: item.description, data_affected: item.data_categories_affected || '', number_of_individuals: String(item.number_of_individuals || ''), severity: item.severity }) },
  'ai-breach-analyzer': { endpoint: 'data-breaches', labelField: 'incident_title', mapFn: (item) => ({ incident_title: item.incident_title, description: item.description, breach_type: item.breach_type, severity: item.severity, data_categories_affected: item.data_categories_affected || '', number_of_individuals: String(item.number_of_individuals || ''), root_cause: item.root_cause || '' }) },
  'ai-vendor-assessor': { endpoint: 'vendors', labelField: 'vendor_name', mapFn: (item) => ({ vendor_name: item.vendor_name, vendor_type: item.vendor_type, country: item.country || '', services_provided: item.services_provided || '', data_categories_shared: item.data_categories_shared || '', dpa_signed: String(!!item.dpa_signed), scc_in_place: String(!!item.scc_in_place), certifications: item.certifications || '' }) },
  'ai-retention-advisor': { endpoint: 'retention-policies', labelField: 'policy_name', mapFn: (item) => ({ data_category: item.data_category, current_retention_period: item.retention_period, legal_basis: item.legal_basis || '', department: item.department || '', regulatory_requirement: item.regulatory_requirement || '' }) },
  'ai-cookie-auditor': { endpoint: 'cookie-compliance', labelField: 'cookie_name', sublabel: 'domain', mapFn: (item) => ({ domain: item.domain, cookies_description: `${item.cookie_name} (${item.category}) - ${item.purpose}`, consent_mechanism: item.consent_mechanism || '', country_scope: item.country_scope || 'EU' }) },
  'ai-transfer-evaluator': { endpoint: 'cross-border-transfers', labelField: 'transfer_name', mapFn: (item) => ({ source_country: item.source_country, destination_country: item.destination_country, data_categories: item.data_categories, transfer_mechanism: item.transfer_mechanism, recipient_name: item.recipient_name || '', recipient_type: item.recipient_type || '' }) },
  'ai-training-recommender': { endpoint: 'training-records', labelField: 'employee_name', sublabel: 'training_name', mapFn: (item) => ({ employee_role: item.employee_role || '', department: item.employee_department || '', current_training: item.training_name + (item.passed ? ' (Passed)' : ' (Not completed)'), compliance_gaps: '' }) },
};

function AIInsights({ aiService, onBack, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'ai-risk-assessment');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [forms, setForms] = useState(INITIAL_FORMS);
  const [dbData, setDbData] = useState({});

  useEffect(() => {
    if (initialTab && TABS.find(t => t.key === initialTab)) {
      setActiveTab(initialTab);
      setResult(null);
    }
  }, [initialTab]);

  // Load database data for current tab
  const loadDbData = useCallback(async (tab) => {
    const source = DATA_SOURCES[tab];
    if (!source || dbData[tab]) return;
    try {
      const res = await createCrudService(source.endpoint).getAll();
      setDbData(prev => ({ ...prev, [tab]: res.data }));
    } catch {
      // silently fail
    }
  }, [dbData]);

  useEffect(() => {
    loadDbData(activeTab);
  }, [activeTab, loadDbData]);

  const updateForm = (field, value) => {
    setForms(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [field]: value } }));
  };

  const setFormData = (data) => {
    setForms(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], ...data } }));
  };

  const loadFromDb = (item) => {
    const source = DATA_SOURCES[activeTab];
    if (source && source.mapFn) {
      setFormData(source.mapFn(item));
      toast.info(`Loaded: ${item[source.labelField]}`);
    }
  };

  const loadSample = (sample) => {
    setFormData(sample.data);
    toast.info(`Sample loaded: ${sample.label}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let res;
      const d = forms[activeTab];
      switch (activeTab) {
        case 'ai-risk-assessment': res = await aiService.riskAssessment(d); break;
        case 'ai-dpia-generator': res = await aiService.dpiaGenerate(d); break;
        case 'ai-compliance-gap': res = await aiService.complianceGap(d); break;
        case 'ai-data-classification': res = await aiService.classifyData(d); break;
        case 'ai-breach-response': res = await aiService.breachResponse(d); break;
        case 'ai-policy-generator': res = await aiService.generatePolicy(d); break;
        case 'ai-activity-analyzer': res = await aiService.analyzeActivity(d); break;
        case 'ai-dsr-drafter': res = await aiService.draftDsrResponse(d); break;
        case 'ai-dpia-advisor': res = await aiService.dpiaAdvice(d); break;
        case 'ai-consent-optimizer': res = await aiService.optimizeConsent(d); break;
        case 'ai-breach-analyzer': res = await aiService.analyzeBreach(d); break;
        case 'ai-vendor-assessor': res = await aiService.assessVendor(d); break;
        case 'ai-retention-advisor': res = await aiService.retentionAdvice(d); break;
        case 'ai-cookie-auditor': res = await aiService.auditCookies(d); break;
        case 'ai-transfer-evaluator': res = await aiService.evaluateTransfer(d); break;
        case 'ai-training-recommender': res = await aiService.recommendTraining(d); break;
        default: return;
      }
      setResult(res.data.data || res.data);
      toast.success('AI analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI analysis failed. Check your OpenRouter API key.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreLevel = (score) => {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  };

  // ======================== RENDER HELPERS ========================

  const renderGenericResult = (data) => {
    if (!data) return null;
    if (data.raw_response) return <div className="ai-result-section"><p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{data.raw_response}</p></div>;
    return <div className="ai-result">{renderScoreSection(data)}{renderSections(data)}</div>;
  };

  const renderScoreSection = (data) => {
    const score = data.risk_score || data.compliance_score || data.quality_score || data.transfer_risk_score;
    const level = data.overall_risk_level || data.risk_level || data.overall_status || data.overall_quality;
    const summary = data.summary;
    if (!score && !summary) return null;
    return (
      <div className="ai-result-section">
        <h3>Assessment Summary</h3>
        <div className="ai-score">
          {score && <div className={`ai-score-circle ${getScoreLevel(typeof level === 'string' && ['low','medium','high','critical'].includes(level) ? {low:20,medium:40,high:70,critical:90}[level] : score)}`}>{score}</div>}
          <div>
            {level && <div style={{ fontSize: 18, fontWeight: 600 }}>Status: <span className={`badge badge-${level === 'compliant' || level === 'excellent' || level === 'good' ? 'active' : level === 'partially_compliant' || level === 'needs_improvement' ? 'medium' : level}`}>{String(level).replace(/_/g, ' ').toUpperCase()}</span></div>}
            {summary && <p style={{ color: '#666', marginTop: 4 }}>{summary}</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderArray = (arr, title) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    return (
      <div key={title} className="ai-result-section">
        <h3>{title}</h3>
        {arr.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="ai-recommendation"><div><p>{item}</p></div></div>;
          const mainKey = ['risk','action','requirement','course_name','element','issue','step','measure','clause','metric','section','category','process','scenario','term','field_name','item'].find(k => item[k]) || Object.keys(item)[0];
          return (
            <div key={i} className="ai-risk-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{item[mainKey]}</h4>
                {(item.priority || item.severity || item.level || item.type || item.quality) && (
                  <span className={`badge badge-${item.priority || item.severity || item.level || item.type || item.quality}`}>
                    {String(item.priority || item.severity || item.level || item.type || item.quality).replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {Object.entries(item).filter(([k]) => k !== mainKey && !['priority','severity','level','type','quality'].includes(k)).map(([k, v]) => (
                <p key={k} style={{ fontSize: 13, color: '#666', margin: '4px 0' }}>
                  <strong>{k.replace(/_/g, ' ')}:</strong> {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : String(v)}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderObject = (obj, title) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    return (
      <div key={title} className="ai-result-section">
        <h3>{title}</h3>
        <div className="detail-grid">
          {Object.entries(obj).map(([k, v]) => (
            <div key={k} className={`detail-item ${(typeof v === 'string' && v.length > 100) || Array.isArray(v) ? 'full-width' : ''}`}>
              <label>{k.replace(/_/g, ' ')}</label>
              {typeof v === 'boolean' ? <span className={`badge badge-${v ? 'active' : 'high'}`}>{v ? 'Yes' : 'No'}</span> :
               Array.isArray(v) ? <p>{v.join(', ')}</p> :
               typeof v === 'object' ? <p>{JSON.stringify(v, null, 2)}</p> :
               <p>{String(v)}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSections = (data) => {
    const skipKeys = ['risk_score','compliance_score','quality_score','transfer_risk_score','overall_risk_level','overall_status','overall_quality','risk_level','summary','raw_response'];
    const sections = [];
    for (const [key, value] of Object.entries(data)) {
      if (skipKeys.includes(key)) continue;
      if (key === 'dpia_report' && value?.sections) {
        const report = value;
        sections.push(<div key="dpia-header" className="ai-result-section"><h3>{report.title || 'DPIA Report'}</h3><p style={{ color: '#888' }}>Version: {report.version} | Date: {report.date}</p></div>);
        const s = report.sections;
        if (s.project_overview) sections.push(renderObject(s.project_overview, 'Project Overview'));
        if (s.processing_description) sections.push(renderObject(s.processing_description, 'Processing Description'));
        if (s.necessity_assessment) sections.push(renderObject(s.necessity_assessment, 'Necessity & Proportionality'));
        if (s.risk_assessment?.risks) sections.push(renderArray(s.risk_assessment.risks, 'Risk Assessment'));
        if (s.mitigation_measures) sections.push(renderArray(s.mitigation_measures, 'Mitigation Measures'));
        if (s.residual_risks) sections.push(renderArray(s.residual_risks, 'Residual Risks'));
        if (s.dpo_opinion) sections.push(<div key="dpo" className="ai-result-section"><h3>DPO Opinion</h3><p>{s.dpo_opinion}</p></div>);
        if (s.conclusion) sections.push(renderObject(s.conclusion, 'Conclusion'));
        continue;
      }
      if (key === 'policy' && value?.sections) {
        sections.push(<div key="policy-header" className="ai-result-section"><h3>{value.title || 'Generated Policy'}</h3><p style={{ color: '#888' }}>Version: {value.version} | Effective: {value.effective_date}</p></div>);
        value.sections.forEach((s, i) => {
          sections.push(<div key={`pol-${i}`} className="ai-policy-section"><h4>{s.number}. {s.title}</h4><p>{s.content}</p>{s.subsections?.map((sub, j) => (<div key={j} style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid #e0e0e0' }}><h4 style={{ fontSize: 13 }}>{sub.title}</h4><p>{sub.content}</p></div>))}</div>);
        });
        if (value.definitions) sections.push(renderArray(value.definitions, 'Definitions'));
        continue;
      }
      if (key === 'notification_templates') {
        sections.push(<div key={key} className="ai-result-section"><h3>Notification Templates</h3>{value.supervisory_authority && (<div className="notification-template"><h4>Supervisory Authority Notification</h4><p><strong>Subject:</strong> {value.supervisory_authority.subject}</p>{value.supervisory_authority.body_sections && Object.entries(value.supervisory_authority.body_sections).map(([k, v]) => (<p key={k}><strong>{k.replace(/_/g, ' ')}:</strong> {v}</p>))}</div>)}{value.data_subjects && (<div className="notification-template"><h4>Data Subject Notification</h4><p><strong>Subject:</strong> {value.data_subjects.subject}</p><p style={{ whiteSpace: 'pre-wrap' }}>{value.data_subjects.body}</p></div>)}</div>);
        continue;
      }
      if (key === 'response_letter') {
        sections.push(<div key={key} className="ai-result-section"><h3>Draft Response Letter</h3><div className="notification-template"><p><strong>Subject:</strong> {value.subject}</p><p style={{ marginTop: 12 }}>{value.greeting}</p>{value.body_paragraphs?.map((p, i) => <p key={i} style={{ margin: '8px 0', lineHeight: 1.7 }}>{p}</p>)}<p style={{ marginTop: 12 }}>{value.closing}</p><p style={{ fontStyle: 'italic', color: '#888' }}>{value.signature_block}</p></div></div>);
        continue;
      }
      if (key === 'optimized_consent_text') {
        sections.push(<div key={key} className="ai-result-section"><h3>Optimized Consent Text</h3><div className="notification-template"><h4>Short Version</h4><p style={{ background: '#f0f8ff', padding: 12, borderRadius: 8, lineHeight: 1.7 }}>{value.short_version}</p></div><div className="notification-template" style={{ marginTop: 12 }}><h4>Detailed Version</h4><p style={{ background: '#f0f8ff', padding: 12, borderRadius: 8, lineHeight: 1.7 }}>{value.detailed_version}</p></div>{value.withdrawal_text && (<div className="notification-template" style={{ marginTop: 12 }}><h4>Withdrawal Text</h4><p style={{ background: '#fff8f0', padding: 12, borderRadius: 8, lineHeight: 1.7 }}>{value.withdrawal_text}</p></div>)}</div>);
        continue;
      }
      if (key === 'classification_results' && Array.isArray(value)) {
        sections.push(<div key={key} className="ai-result-section"><h3>Classification Results</h3>{value.map((c, i) => (<div key={i} className="classification-card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h4 style={{ margin: 0 }}>{c.field_name}</h4><span className={`badge badge-${c.sensitivity_level === 'restricted' ? 'critical' : c.sensitivity_level === 'confidential' ? 'high' : c.sensitivity_level === 'internal' ? 'medium' : 'active'}`}>{c.sensitivity_level}</span></div><p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Type: {c.data_type?.replace(/_/g, ' ')} | GDPR: {c.gdpr_category}</p><div className="classification-flags"><span className={`flag flag-${c.pii_flag}`}>PII: {c.pii_flag ? 'Yes' : 'No'}</span><span className={`flag flag-${c.phi_flag}`}>PHI: {c.phi_flag ? 'Yes' : 'No'}</span><span className={`flag flag-${c.pci_flag}`}>PCI: {c.pci_flag ? 'Yes' : 'No'}</span>{c.article_9_data && <span className="flag flag-true">Art. 9</span>}{c.encryption_required && <span className="flag flag-true">Encryption Req.</span>}</div>{c.handling_requirements?.length > 0 && <p style={{ fontSize: 12, marginTop: 6 }}><strong>Handling:</strong> {c.handling_requirements.join(', ')}</p>}</div>))}</div>);
        continue;
      }
      if (key === 'immediate_actions' && Array.isArray(value)) {
        sections.push(<div key={key} className="ai-result-section"><h3>Immediate Action Plan</h3>{value.map((a, i) => (<div key={i} className="timeline-item"><span className="timeline-step">{a.step || i + 1}</span><div><p style={{ fontWeight: 500 }}>{a.action}</p><p style={{ fontSize: 12, color: '#888' }}>Responsible: {a.responsible} | Deadline: {a.deadline}</p>{a.details && <p style={{ fontSize: 12, color: '#666' }}>{a.details}</p>}</div></div>))}</div>);
        continue;
      }
      if (key === 'recommended_courses' && Array.isArray(value)) {
        sections.push(<div key={key} className="ai-result-section"><h3>Recommended Courses</h3>{value.map((c, i) => (<div key={i} className="ai-risk-card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h4 style={{ margin: 0 }}>{c.course_name}</h4><div style={{ display: 'flex', gap: 6 }}><span className={`badge badge-${c.type === 'mandatory' ? 'critical' : c.type === 'recommended' ? 'medium' : 'active'}`}>{c.type}</span><span className={`badge badge-${c.priority}`}>{c.priority}</span></div></div><p style={{ color: '#666', fontSize: 13, margin: '6px 0' }}>{c.description}</p><p style={{ fontSize: 12, color: '#888' }}>Duration: {c.duration_hours}h | Method: {c.delivery_method} | Frequency: {c.frequency}</p>{c.topics?.length > 0 && <p style={{ fontSize: 12, marginTop: 4 }}><strong>Topics:</strong> {c.topics.join(', ')}</p>}</div>))}</div>);
        continue;
      }
      if (key === 'learning_path' && Array.isArray(value)) {
        sections.push(<div key={key} className="ai-result-section"><h3>Learning Path</h3>{value.map((p, i) => (<div key={i} className="timeline-item"><span className="timeline-step">{i + 1}</span><div><p style={{ fontWeight: 500 }}>{p.phase}</p><p style={{ fontSize: 12, color: '#888' }}>Duration: {p.duration} | Milestone: {p.milestone}</p><p style={{ fontSize: 12 }}>Courses: {p.courses?.join(', ')}</p></div></div>))}</div>);
        continue;
      }
      if (Array.isArray(value) && value.length > 0) {
        sections.push(renderArray(value, key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
        continue;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const hasArrays = Object.values(value).some(v => Array.isArray(v));
        if (hasArrays) {
          const subSections = [];
          subSections.push(<h3 key={`${key}-title`}>{title}</h3>);
          for (const [sk, sv] of Object.entries(value)) {
            if (Array.isArray(sv) && sv.length > 0) {
              if (typeof sv[0] === 'string') {
                subSections.push(<div key={sk} style={{ marginBottom: 8 }}><h4>{sk.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4><ul>{sv.map((item, j) => <li key={j}>{item}</li>)}</ul></div>);
              } else {
                subSections.push(renderArray(sv, sk.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
              }
            } else if (typeof sv !== 'object') {
              subSections.push(<p key={sk} style={{ fontSize: 13, margin: '4px 0' }}><strong>{sk.replace(/_/g, ' ')}:</strong> {typeof sv === 'boolean' ? (sv ? 'Yes' : 'No') : String(sv)}</p>);
            }
          }
          sections.push(<div key={key} className="ai-result-section">{subSections}</div>);
        } else {
          sections.push(renderObject(value, title));
        }
      }
    }
    return sections;
  };

  // ======================== DATA DROPDOWN + SAMPLES ========================

  const renderDataDropdownAndSamples = () => {
    const source = DATA_SOURCES[activeTab];
    const samples = SAMPLES[activeTab];
    const items = dbData[activeTab] || [];

    return (
      <div style={{ background: '#f8f5ff', borderRadius: 12, padding: 16, marginBottom: 20, border: '2px solid rgba(168,85,247,0.15)' }}>
        {/* Database Dropdown */}
        {source && (
          <div style={{ marginBottom: samples ? 12 : 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6c5ce7', display: 'block', marginBottom: 6 }}>
              Load from Database ({items.length} records)
            </label>
            <select
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #e0e0e0', fontSize: 14, fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
              value=""
              onChange={(e) => {
                const item = items.find(it => String(it.id) === e.target.value);
                if (item) loadFromDb(item);
              }}
            >
              <option value="">-- Select existing record to populate form --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item[source.labelField]}{source.sublabel ? ` (${item[source.sublabel]})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sample Buttons */}
        {samples && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6c5ce7', display: 'block', marginBottom: 8 }}>
              Load Sample Data
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {samples.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'white', border: '2px solid #e0e0e0', color: '#333', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                  onMouseOver={e => { e.target.style.borderColor = '#a855f7'; e.target.style.background = '#faf5ff'; }}
                  onMouseOut={e => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = 'white'; }}
                  onClick={() => loadSample(sample)}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ======================== FORM RENDERER ========================

  const renderForm = () => {
    const f = forms[activeTab] || {};
    const set = (field, value) => updateForm(field, value);

    switch (activeTab) {
      case 'ai-risk-assessment':
        return (<><div className="form-row"><div className="form-group"><label>Activity Name</label><input type="text" value={f.activity_name} onChange={e => set('activity_name', e.target.value)} placeholder="e.g., Customer Data Analytics" /></div><div className="form-group"><label>Legal Basis</label><select value={f.legal_basis} onChange={e => set('legal_basis', e.target.value)}><option value="">Select...</option><option value="consent">Consent</option><option value="contract">Contract</option><option value="legal_obligation">Legal Obligation</option><option value="legitimate_interests">Legitimate Interests</option></select></div></div><div className="form-group"><label>Processing Description *</label><textarea value={f.processing_description} onChange={e => set('processing_description', e.target.value)} required placeholder="Describe the data processing activity..." rows={4} /></div><div className="form-row"><div className="form-group"><label>Data Categories</label><input type="text" value={f.data_categories} onChange={e => set('data_categories', e.target.value)} placeholder="e.g., Names, Emails, Financial data" /></div><div className="form-group"><label>Data Subjects</label><input type="text" value={f.data_subjects} onChange={e => set('data_subjects', e.target.value)} placeholder="e.g., Customers, Employees" /></div></div></>);
      case 'ai-dpia-generator':
        return (<><div className="form-row"><div className="form-group"><label>Project Name *</label><input type="text" value={f.project_name} onChange={e => set('project_name', e.target.value)} required placeholder="e.g., AI Customer Profiling" /></div><div className="form-group"><label>Data Categories</label><input type="text" value={f.data_categories} onChange={e => set('data_categories', e.target.value)} placeholder="e.g., Behavioral data" /></div></div><div className="form-group"><label>Processing Description *</label><textarea value={f.processing_description} onChange={e => set('processing_description', e.target.value)} required placeholder="Describe processing activities..." rows={4} /></div><div className="form-row"><div className="form-group"><label>Purpose</label><input type="text" value={f.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g., Customer retention" /></div><div className="form-group"><label>Data Subjects</label><input type="text" value={f.data_subjects} onChange={e => set('data_subjects', e.target.value)} placeholder="e.g., EU Customers" /></div></div></>);
      case 'ai-compliance-gap':
        return (<><div className="form-row"><div className="form-group"><label>Regulation</label><select value={f.regulation} onChange={e => set('regulation', e.target.value)}><option value="GDPR">GDPR</option><option value="CCPA">CCPA</option><option value="LGPD">LGPD</option><option value="PIPEDA">PIPEDA</option></select></div><div className="form-group"><label>Organization Type</label><input type="text" value={f.organization_type} onChange={e => set('organization_type', e.target.value)} placeholder="e.g., SaaS company" /></div></div><div className="form-group"><label>Current Practices *</label><textarea value={f.current_practices} onChange={e => set('current_practices', e.target.value)} required placeholder="Describe current data protection practices..." rows={4} /></div><div className="form-group"><label>Processing Activities</label><textarea value={f.data_processing_activities} onChange={e => set('data_processing_activities', e.target.value)} placeholder="List main activities..." rows={3} /></div></>);
      case 'ai-data-classification':
        return (<><div className="form-group"><label>Data Fields *</label><textarea value={f.data_fields} onChange={e => set('data_fields', e.target.value)} required placeholder="List fields (comma-separated)&#10;e.g., full_name, email, credit_card, blood_type" rows={4} /></div><div className="form-row"><div className="form-group"><label>Context</label><input type="text" value={f.context} onChange={e => set('context', e.target.value)} placeholder="e.g., Customer database" /></div><div className="form-group"><label>Sample Values</label><input type="text" value={f.sample_values} onChange={e => set('sample_values', e.target.value)} placeholder="e.g., John Doe, john@email.com" /></div></div></>);
      case 'ai-breach-response':
        return (<><div className="form-row"><div className="form-group"><label>Breach Type</label><select value={f.breach_type} onChange={e => set('breach_type', e.target.value)}><option value="">Select...</option><option value="confidentiality">Confidentiality</option><option value="integrity">Integrity</option><option value="availability">Availability</option></select></div><div className="form-group"><label>Severity</label><select value={f.severity} onChange={e => set('severity', e.target.value)}><option value="">Select...</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div><div className="form-group"><label>Description *</label><textarea value={f.description} onChange={e => set('description', e.target.value)} required placeholder="Describe the breach..." rows={4} /></div><div className="form-row"><div className="form-group"><label>Data Affected</label><input type="text" value={f.data_affected} onChange={e => set('data_affected', e.target.value)} placeholder="e.g., Customer emails" /></div><div className="form-group"><label>Individuals Affected</label><input type="text" value={f.number_of_individuals} onChange={e => set('number_of_individuals', e.target.value)} placeholder="e.g., 5000" /></div></div></>);
      case 'ai-policy-generator':
        return (<><div className="form-row"><div className="form-group"><label>Policy Type *</label><select value={f.policy_type} onChange={e => set('policy_type', e.target.value)}><option value="privacy_policy">Privacy Policy</option><option value="cookie_policy">Cookie Policy</option><option value="data_retention_policy">Data Retention Policy</option><option value="data_processing_agreement">Data Processing Agreement</option><option value="acceptable_use_policy">Acceptable Use Policy</option><option value="incident_response_policy">Incident Response Policy</option></select></div><div className="form-group"><label>Organization</label><input type="text" value={f.organization_name} onChange={e => set('organization_name', e.target.value)} placeholder="Your company name" /></div></div><div className="form-row"><div className="form-group"><label>Org Type</label><input type="text" value={f.organization_type} onChange={e => set('organization_type', e.target.value)} placeholder="e.g., SaaS" /></div><div className="form-group"><label>Jurisdiction</label><select value={f.jurisdiction} onChange={e => set('jurisdiction', e.target.value)}><option value="EU/EEA">EU/EEA</option><option value="United Kingdom">UK</option><option value="United States">US</option><option value="Global">Global</option></select></div></div><div className="form-group"><label>Specific Requirements</label><textarea value={f.specific_requirements} onChange={e => set('specific_requirements', e.target.value)} placeholder="Any specific provisions..." rows={3} /></div></>);
      case 'ai-activity-analyzer':
        return (<><div className="form-row"><div className="form-group"><label>Activity Name *</label><input type="text" value={f.activity_name} onChange={e => set('activity_name', e.target.value)} required placeholder="e.g., Customer Onboarding" /></div><div className="form-group"><label>Legal Basis</label><select value={f.legal_basis} onChange={e => set('legal_basis', e.target.value)}><option value="">Select...</option><option value="consent">Consent</option><option value="contract">Contract</option><option value="legal_obligation">Legal Obligation</option><option value="legitimate_interests">Legitimate Interests</option></select></div></div><div className="form-group"><label>Purpose</label><textarea value={f.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Purpose of processing..." rows={3} /></div><div className="form-row"><div className="form-group"><label>Data Categories</label><input type="text" value={f.data_categories} onChange={e => set('data_categories', e.target.value)} placeholder="e.g., Names, Emails" /></div><div className="form-group"><label>Data Subjects</label><input type="text" value={f.data_subjects} onChange={e => set('data_subjects', e.target.value)} placeholder="e.g., Customers" /></div></div><div className="form-row"><div className="form-group"><label>Recipients</label><input type="text" value={f.recipients} onChange={e => set('recipients', e.target.value)} placeholder="Who receives data?" /></div><div className="form-group"><label>Retention Period</label><input type="text" value={f.retention_period} onChange={e => set('retention_period', e.target.value)} placeholder="e.g., 5 years" /></div></div></>);
      case 'ai-dsr-drafter':
        return (<><div className="form-row"><div className="form-group"><label>Request Type *</label><select value={f.request_type} onChange={e => set('request_type', e.target.value)}><option value="access">Access (SAR)</option><option value="erasure">Erasure</option><option value="rectification">Rectification</option><option value="portability">Data Portability</option><option value="restriction">Restriction</option><option value="objection">Objection</option></select></div><div className="form-group"><label>Requester Name *</label><input type="text" value={f.requester_name} onChange={e => set('requester_name', e.target.value)} required placeholder="e.g., John Smith" /></div></div><div className="form-group"><label>Request Description</label><textarea value={f.description} onChange={e => set('description', e.target.value)} placeholder="Details of the request..." rows={3} /></div><div className="form-row"><div className="form-group"><label>Data Categories</label><input type="text" value={f.data_categories_affected} onChange={e => set('data_categories_affected', e.target.value)} placeholder="e.g., Account data" /></div><div className="form-group"><label>Status</label><select value={f.status} onChange={e => set('status', e.target.value)}><option value="pending">Pending</option><option value="in_progress">In Progress</option></select></div></div></>);
      case 'ai-dpia-advisor':
        return (<><div className="form-row"><div className="form-group"><label>Assessment Name *</label><input type="text" value={f.assessment_name} onChange={e => set('assessment_name', e.target.value)} required placeholder="e.g., AI Chatbot DPIA" /></div><div className="form-group"><label>Project Name</label><input type="text" value={f.project_name} onChange={e => set('project_name', e.target.value)} placeholder="e.g., Customer AI Bot" /></div></div><div className="form-group"><label>Processing Description</label><textarea value={f.processing_description} onChange={e => set('processing_description', e.target.value)} placeholder="What processing is being assessed..." rows={3} /></div><div className="form-group"><label>Identified Risks</label><textarea value={f.identified_risks} onChange={e => set('identified_risks', e.target.value)} placeholder="Current identified risks..." rows={3} /></div><div className="form-row"><div className="form-group"><label>Risk Level</label><select value={f.risk_level} onChange={e => set('risk_level', e.target.value)}><option value="">Select...</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div className="form-group"><label>Status</label><select value={f.status} onChange={e => set('status', e.target.value)}><option value="draft">Draft</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div></div></>);
      case 'ai-consent-optimizer':
        return (<><div className="form-row"><div className="form-group"><label>Consent Type *</label><select value={f.consent_type} onChange={e => set('consent_type', e.target.value)}><option value="marketing">Marketing</option><option value="analytics">Analytics</option><option value="third_party_sharing">Third-Party Sharing</option><option value="profiling">Profiling</option><option value="cookies">Cookies</option><option value="research">Research</option></select></div><div className="form-group"><label>Collection Method</label><select value={f.collection_method} onChange={e => set('collection_method', e.target.value)}><option value="web_form">Web Form</option><option value="app">App</option><option value="paper">Paper</option><option value="verbal">Verbal</option></select></div></div><div className="form-group"><label>Purpose</label><textarea value={f.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Purpose of consent..." rows={2} /></div><div className="form-group"><label>Current Consent Text</label><textarea value={f.consent_text} onChange={e => set('consent_text', e.target.value)} placeholder="Paste your current consent text for review..." rows={4} /></div><div className="form-group"><label>Granularity</label><select value={f.granularity} onChange={e => set('granularity', e.target.value)}><option value="granular">Granular</option><option value="bundled">Bundled</option></select></div></>);
      case 'ai-breach-analyzer':
        return (<><div className="form-row"><div className="form-group"><label>Incident Title *</label><input type="text" value={f.incident_title} onChange={e => set('incident_title', e.target.value)} required placeholder="e.g., Phishing Attack" /></div><div className="form-group"><label>Severity</label><select value={f.severity} onChange={e => set('severity', e.target.value)}><option value="">Select...</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div><div className="form-group"><label>Description</label><textarea value={f.description} onChange={e => set('description', e.target.value)} placeholder="Describe the incident..." rows={3} /></div><div className="form-row"><div className="form-group"><label>Breach Type</label><select value={f.breach_type} onChange={e => set('breach_type', e.target.value)}><option value="">Select...</option><option value="confidentiality">Confidentiality</option><option value="integrity">Integrity</option><option value="availability">Availability</option></select></div><div className="form-group"><label>Individuals</label><input type="text" value={f.number_of_individuals} onChange={e => set('number_of_individuals', e.target.value)} placeholder="Number affected" /></div></div><div className="form-row"><div className="form-group"><label>Data Categories</label><input type="text" value={f.data_categories_affected} onChange={e => set('data_categories_affected', e.target.value)} placeholder="e.g., Credentials, PII" /></div><div className="form-group"><label>Root Cause</label><input type="text" value={f.root_cause} onChange={e => set('root_cause', e.target.value)} placeholder="e.g., Human error" /></div></div></>);
      case 'ai-vendor-assessor':
        return (<><div className="form-row"><div className="form-group"><label>Vendor Name *</label><input type="text" value={f.vendor_name} onChange={e => set('vendor_name', e.target.value)} required placeholder="e.g., AWS, Salesforce" /></div><div className="form-group"><label>Vendor Type</label><select value={f.vendor_type} onChange={e => set('vendor_type', e.target.value)}><option value="processor">Processor</option><option value="sub_processor">Sub-Processor</option><option value="controller">Controller</option></select></div></div><div className="form-row"><div className="form-group"><label>Country</label><input type="text" value={f.country} onChange={e => set('country', e.target.value)} placeholder="e.g., United States" /></div><div className="form-group"><label>Certifications</label><input type="text" value={f.certifications} onChange={e => set('certifications', e.target.value)} placeholder="e.g., ISO 27001, SOC 2" /></div></div><div className="form-group"><label>Services Provided</label><textarea value={f.services_provided} onChange={e => set('services_provided', e.target.value)} placeholder="What services?" rows={2} /></div><div className="form-group"><label>Data Categories Shared</label><input type="text" value={f.data_categories_shared} onChange={e => set('data_categories_shared', e.target.value)} placeholder="e.g., Customer PII" /></div><div className="form-row"><div className="form-group"><label>DPA Signed</label><select value={f.dpa_signed} onChange={e => set('dpa_signed', e.target.value)}><option value="true">Yes</option><option value="false">No</option></select></div><div className="form-group"><label>SCC in Place</label><select value={f.scc_in_place} onChange={e => set('scc_in_place', e.target.value)}><option value="true">Yes</option><option value="false">No</option></select></div></div></>);
      case 'ai-retention-advisor':
        return (<><div className="form-row"><div className="form-group"><label>Data Category *</label><input type="text" value={f.data_category} onChange={e => set('data_category', e.target.value)} required placeholder="e.g., Customer records" /></div><div className="form-group"><label>Current Retention</label><input type="text" value={f.current_retention_period} onChange={e => set('current_retention_period', e.target.value)} placeholder="e.g., 5 years" /></div></div><div className="form-row"><div className="form-group"><label>Legal Basis</label><input type="text" value={f.legal_basis} onChange={e => set('legal_basis', e.target.value)} placeholder="e.g., Contract" /></div><div className="form-group"><label>Department</label><input type="text" value={f.department} onChange={e => set('department', e.target.value)} placeholder="e.g., HR" /></div></div><div className="form-group"><label>Regulatory Requirements</label><textarea value={f.regulatory_requirement} onChange={e => set('regulatory_requirement', e.target.value)} placeholder="Any specific regulatory requirements..." rows={3} /></div></>);
      case 'ai-cookie-auditor':
        return (<><div className="form-row"><div className="form-group"><label>Domain *</label><input type="text" value={f.domain} onChange={e => set('domain', e.target.value)} required placeholder="e.g., example.com" /></div><div className="form-group"><label>Country Scope</label><select value={f.country_scope} onChange={e => set('country_scope', e.target.value)}><option value="EU">EU</option><option value="Global">Global</option><option value="US">US</option><option value="UK">UK</option></select></div></div><div className="form-group"><label>Cookies Description</label><textarea value={f.cookies_description} onChange={e => set('cookies_description', e.target.value)} placeholder="List cookies used..." rows={4} /></div><div className="form-group"><label>Consent Mechanism</label><input type="text" value={f.consent_mechanism} onChange={e => set('consent_mechanism', e.target.value)} placeholder="e.g., Cookie banner" /></div></>);
      case 'ai-transfer-evaluator':
        return (<><div className="form-row"><div className="form-group"><label>Source Country</label><input type="text" value={f.source_country} onChange={e => set('source_country', e.target.value)} placeholder="e.g., Germany" /></div><div className="form-group"><label>Destination Country *</label><input type="text" value={f.destination_country} onChange={e => set('destination_country', e.target.value)} required placeholder="e.g., United States" /></div></div><div className="form-row"><div className="form-group"><label>Data Categories</label><input type="text" value={f.data_categories} onChange={e => set('data_categories', e.target.value)} placeholder="e.g., Customer PII" /></div><div className="form-group"><label>Transfer Mechanism</label><select value={f.transfer_mechanism} onChange={e => set('transfer_mechanism', e.target.value)}><option value="">Select...</option><option value="scc">SCCs</option><option value="adequacy_decision">Adequacy Decision</option><option value="bcr">BCRs</option><option value="consent">Consent</option><option value="derogation">Derogation</option></select></div></div><div className="form-row"><div className="form-group"><label>Recipient Name</label><input type="text" value={f.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="e.g., AWS Inc" /></div><div className="form-group"><label>Recipient Type</label><select value={f.recipient_type} onChange={e => set('recipient_type', e.target.value)}><option value="">Select...</option><option value="processor">Processor</option><option value="controller">Controller</option><option value="joint_controller">Joint Controller</option></select></div></div></>);
      case 'ai-training-recommender':
        return (<><div className="form-row"><div className="form-group"><label>Employee Role</label><input type="text" value={f.employee_role} onChange={e => set('employee_role', e.target.value)} placeholder="e.g., Software Developer" /></div><div className="form-group"><label>Department</label><input type="text" value={f.department} onChange={e => set('department', e.target.value)} placeholder="e.g., Engineering" /></div></div><div className="form-group"><label>Current Training</label><textarea value={f.current_training} onChange={e => set('current_training', e.target.value)} placeholder="List any training completed..." rows={3} /></div><div className="form-group"><label>Known Compliance Gaps</label><textarea value={f.compliance_gaps} onChange={e => set('compliance_gaps', e.target.value)} placeholder="Areas needing improvement..." rows={3} /></div></>);
      default:
        return <p>Select an AI tool from the tabs above.</p>;
    }
  };

  const currentTab = TABS.find(t => t.key === activeTab);
  const generalTabs = TABS.filter(t => t.group === 'general');
  const featureTabs = TABS.filter(t => t.group === 'feature');

  return (
    <div>
      <button className="btn-back" onClick={onBack}>← Back to Dashboard</button>
      <div className="page-header">
        <h1>{currentTab?.icon || '🤖'} {currentTab?.label || 'AI Tools'}</h1>
      </div>

      <div className="ai-container">
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>General AI Tools</div>
          <div className="ai-tabs" style={{ borderBottom: 'none', paddingBottom: 8 }}>
            {generalTabs.map(tab => (
              <button key={tab.key} className={`ai-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => { setActiveTab(tab.key); setResult(null); }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Feature-Specific AI Tools</div>
          <div className="ai-tabs">
            {featureTabs.map(tab => (
              <button key={tab.key} className={`ai-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => { setActiveTab(tab.key); setResult(null); }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {renderDataDropdownAndSamples()}

        <form className="ai-form" onSubmit={handleSubmit}>
          {renderForm()}
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '12px 32px', marginTop: 16 }} disabled={loading}>
            {loading ? (<><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing...</>) : (`🤖 Run ${currentTab?.label || 'AI Analysis'}`)}
          </button>
        </form>

        {loading && (
          <div className="loading-spinner"><div className="spinner" /> AI is analyzing your data... This may take a moment.</div>
        )}

        {result && renderGenericResult(result)}
      </div>
    </div>
  );
}

export default AIInsights;
