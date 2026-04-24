const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_NAME = process.env.DB_NAME || 'gdpr_privacy_manager';

async function seed() {
  // Connect to postgres to create database
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    const dbCheck = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Database ${DB_NAME} created`);
    } else {
      console.log(`Database ${DB_NAME} already exists`);
    }
  } finally {
    await adminPool.end();
  }

  // Connect to application database
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS processing_activities (
        id SERIAL PRIMARY KEY,
        activity_name VARCHAR(255) NOT NULL,
        purpose TEXT NOT NULL,
        legal_basis VARCHAR(100) NOT NULL,
        data_categories TEXT NOT NULL,
        data_subjects VARCHAR(255) NOT NULL,
        recipients TEXT,
        third_country_transfers BOOLEAN DEFAULT false,
        transfer_safeguards VARCHAR(255),
        retention_period VARCHAR(100),
        technical_measures TEXT,
        organizational_measures TEXT,
        data_source VARCHAR(255),
        automated_decision_making BOOLEAN DEFAULT false,
        dpo_review_date DATE,
        department VARCHAR(100),
        controller_name VARCHAR(255),
        processor_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        risk_level VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id SERIAL PRIMARY KEY,
        request_type VARCHAR(50) NOT NULL,
        requester_name VARCHAR(255) NOT NULL,
        requester_email VARCHAR(255) NOT NULL,
        requester_id_verified BOOLEAN DEFAULT false,
        description TEXT,
        data_categories_affected TEXT,
        systems_affected TEXT,
        received_date DATE NOT NULL,
        acknowledgement_date DATE,
        due_date DATE NOT NULL,
        completed_date DATE,
        status VARCHAR(30) DEFAULT 'pending',
        denial_reason TEXT,
        assigned_to VARCHAR(255),
        department VARCHAR(100),
        response_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
        id SERIAL PRIMARY KEY,
        assessment_name VARCHAR(255) NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        description TEXT,
        assessment_type VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        assessor VARCHAR(255),
        processing_description TEXT,
        necessity_justification TEXT,
        identified_risks TEXT,
        risk_level VARCHAR(20) DEFAULT 'medium',
        mitigation_measures TEXT,
        residual_risk VARCHAR(20),
        dpo_opinion TEXT,
        dpo_consulted BOOLEAN DEFAULT false,
        supervisory_authority_consulted BOOLEAN DEFAULT false,
        start_date DATE,
        completion_date DATE,
        review_date DATE,
        status VARCHAR(30) DEFAULT 'draft',
        outcome VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS consent_records (
        id SERIAL PRIMARY KEY,
        data_subject_name VARCHAR(255) NOT NULL,
        data_subject_email VARCHAR(255) NOT NULL,
        consent_type VARCHAR(100) NOT NULL,
        purpose TEXT NOT NULL,
        legal_basis VARCHAR(100) DEFAULT 'consent',
        consent_given BOOLEAN NOT NULL,
        consent_date TIMESTAMP NOT NULL,
        withdrawal_date TIMESTAMP,
        expiry_date DATE,
        collection_method VARCHAR(100),
        consent_text TEXT,
        version VARCHAR(20),
        ip_address VARCHAR(50),
        granularity VARCHAR(50),
        freely_given BOOLEAN DEFAULT true,
        specific BOOLEAN DEFAULT true,
        informed BOOLEAN DEFAULT true,
        unambiguous BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS data_breaches (
        id SERIAL PRIMARY KEY,
        incident_title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        breach_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        discovery_date TIMESTAMP NOT NULL,
        occurrence_date TIMESTAMP,
        containment_date TIMESTAMP,
        notification_date TIMESTAMP,
        data_categories_affected TEXT,
        number_of_records INTEGER,
        number_of_individuals INTEGER,
        systems_affected TEXT,
        root_cause TEXT,
        containment_actions TEXT,
        remediation_actions TEXT,
        supervisory_authority_notified BOOLEAN DEFAULT false,
        data_subjects_notified BOOLEAN DEFAULT false,
        notification_required BOOLEAN DEFAULT true,
        risk_to_individuals VARCHAR(50),
        reported_by VARCHAR(255),
        assigned_to VARCHAR(255),
        department VARCHAR(100),
        status VARCHAR(30) DEFAULT 'investigating',
        lessons_learned TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        vendor_name VARCHAR(255) NOT NULL,
        vendor_type VARCHAR(50) NOT NULL,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        country VARCHAR(100),
        services_provided TEXT,
        data_categories_shared TEXT,
        legal_basis VARCHAR(100),
        dpa_signed BOOLEAN DEFAULT false,
        dpa_date DATE,
        scc_in_place BOOLEAN DEFAULT false,
        risk_level VARCHAR(20) DEFAULT 'medium',
        last_audit_date DATE,
        next_audit_date DATE,
        certifications TEXT,
        sub_processors TEXT,
        data_breach_notification_hours INTEGER DEFAULT 72,
        contract_start_date DATE,
        contract_end_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS retention_policies (
        id SERIAL PRIMARY KEY,
        policy_name VARCHAR(255) NOT NULL,
        data_category VARCHAR(255) NOT NULL,
        description TEXT,
        retention_period VARCHAR(100) NOT NULL,
        retention_period_days INTEGER,
        legal_basis VARCHAR(255),
        regulatory_requirement TEXT,
        disposal_method VARCHAR(100),
        department VARCHAR(100),
        applies_to_systems TEXT,
        review_frequency VARCHAR(50),
        last_review_date DATE,
        next_review_date DATE,
        data_owner VARCHAR(255),
        exceptions TEXT,
        automated_enforcement BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cookie_compliance (
        id SERIAL PRIMARY KEY,
        cookie_name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        purpose TEXT NOT NULL,
        provider VARCHAR(255),
        duration VARCHAR(100),
        type VARCHAR(50),
        data_collected TEXT,
        consent_required BOOLEAN DEFAULT true,
        consent_mechanism VARCHAR(100),
        opt_out_available BOOLEAN DEFAULT true,
        privacy_policy_link VARCHAR(500),
        country_scope TEXT,
        legal_basis VARCHAR(100),
        last_scan_date DATE,
        compliant BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cross_border_transfers (
        id SERIAL PRIMARY KEY,
        transfer_name VARCHAR(255) NOT NULL,
        source_country VARCHAR(100) NOT NULL,
        destination_country VARCHAR(100) NOT NULL,
        data_categories TEXT NOT NULL,
        data_subjects TEXT,
        transfer_mechanism VARCHAR(100) NOT NULL,
        legal_basis VARCHAR(255),
        recipient_name VARCHAR(255),
        recipient_type VARCHAR(50),
        adequacy_decision BOOLEAN DEFAULT false,
        safeguards_description TEXT,
        tia_completed BOOLEAN DEFAULT false,
        tia_date DATE,
        supplementary_measures TEXT,
        volume_estimate VARCHAR(100),
        frequency VARCHAR(50),
        encryption_in_transit BOOLEAN DEFAULT true,
        encryption_at_rest BOOLEAN DEFAULT true,
        department VARCHAR(100),
        risk_level VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'active',
        review_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS training_records (
        id SERIAL PRIMARY KEY,
        training_name VARCHAR(255) NOT NULL,
        training_type VARCHAR(100) NOT NULL,
        description TEXT,
        provider VARCHAR(255),
        delivery_method VARCHAR(50),
        duration_hours DECIMAL(5,2),
        employee_name VARCHAR(255) NOT NULL,
        employee_email VARCHAR(255),
        employee_department VARCHAR(100),
        employee_role VARCHAR(100),
        assigned_date DATE,
        completion_date DATE,
        expiry_date DATE,
        score DECIMAL(5,2),
        passing_score DECIMAL(5,2) DEFAULT 80.00,
        passed BOOLEAN DEFAULT false,
        certificate_issued BOOLEAN DEFAULT false,
        topics_covered TEXT,
        status VARCHAR(20) DEFAULT 'assigned',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('All tables created');

    // Seed users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      const hash = await bcrypt.hash('Admin@2026!', 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, department) VALUES ($1, $2, $3, $4, $5)`,
        ['admin@privacyguard.com', hash, 'Sarah Mitchell', 'DPO', 'Legal & Compliance']
      );
      console.log('Demo user created');
    }

    // Seed processing activities
    const paCount = await pool.query('SELECT COUNT(*) FROM processing_activities');
    if (parseInt(paCount.rows[0].count) === 0) {
      const activities = [
        ['Customer Onboarding', 'Collecting and processing personal data for new customer account creation and identity verification', 'contract', 'Name, Email, Address, Phone, ID Documents', 'Customers', 'Sales Team, KYC Provider', false, null, '5 years after account closure', 'TLS encryption, Access controls', 'Privacy training, Need-to-know basis', 'Customer directly', false, '2026-01-15', 'Sales', 'PrivacyGuard Ltd', null, 'active', 'medium'],
        ['Employee Payroll Processing', 'Monthly salary computation, tax withholding, and payment processing for employees', 'contract', 'Name, Bank Details, Tax ID, Salary, Benefits', 'Employees', 'Finance Team, Tax Authority, Bank', false, null, '7 years after employment ends', 'Database encryption, MFA', 'Segregation of duties, Regular audits', 'HR System', false, '2026-02-01', 'Human Resources', 'PrivacyGuard Ltd', 'PayrollCo Inc', 'active', 'high'],
        ['Marketing Email Campaigns', 'Sending promotional emails and newsletters to opted-in subscribers', 'consent', 'Email, Name, Preferences, Click behavior', 'Newsletter Subscribers', 'Marketing Team, Email Service Provider', false, null, 'Until consent withdrawal', 'API encryption, Token-based auth', 'Consent management, Unsubscribe mechanism', 'Website sign-up form', false, '2026-03-10', 'Marketing', 'PrivacyGuard Ltd', 'MailChimp', 'active', 'low'],
        ['CCTV Surveillance', 'Video monitoring of office premises for security and safety purposes', 'legitimate_interests', 'Video footage, Timestamps, Location', 'Employees, Visitors', 'Security Team', false, null, '30 days', 'Encrypted storage, Physical security', 'Access logs, Retention schedule', 'CCTV cameras', false, '2025-12-01', 'Facilities', 'PrivacyGuard Ltd', null, 'active', 'medium'],
        ['Website Analytics', 'Tracking website visitor behavior for improving user experience and conversion optimization', 'consent', 'IP Address, Browser data, Page views, Click paths', 'Website Visitors', 'Marketing Team, Analytics Provider', true, 'Standard Contractual Clauses', '26 months', 'Data anonymization, Cookie consent', 'Privacy policy, Cookie banner', 'Website cookies', true, '2026-01-20', 'Digital', 'PrivacyGuard Ltd', 'Google LLC', 'active', 'medium'],
        ['Customer Support Tickets', 'Managing customer inquiries, complaints, and support requests', 'contract', 'Name, Email, Phone, Order history, Communication logs', 'Customers', 'Support Team, CRM Provider', false, null, '3 years after resolution', 'Encrypted communications, Role-based access', 'Training, Escalation procedures', 'Customer communication', false, '2026-02-15', 'Customer Service', 'PrivacyGuard Ltd', 'Zendesk Inc', 'active', 'low'],
        ['Recruitment and Hiring', 'Processing candidate applications, conducting interviews, and managing hiring decisions', 'consent', 'CV, Cover letter, References, Interview notes, Assessment scores', 'Job Applicants', 'HR Team, Recruitment Agency', false, null, '6 months after decision (unsuccessful), Duration of employment (successful)', 'Applicant tracking system encryption', 'Hiring committee confidentiality', 'Job applications', false, '2026-03-01', 'Human Resources', 'PrivacyGuard Ltd', 'Workable Inc', 'active', 'medium'],
        ['Health Insurance Administration', 'Managing employee health insurance enrollment, claims, and benefits', 'legal_obligation', 'Name, DOB, Health data, Dependents, Insurance ID', 'Employees, Dependents', 'HR Team, Insurance Provider', false, null, '10 years after employment ends', 'Special category data encryption, Strict access controls', 'DPO oversight, Minimal disclosure', 'Employee enrollment forms', false, '2025-11-15', 'Human Resources', 'PrivacyGuard Ltd', 'HealthCare Partners', 'active', 'critical'],
        ['Loyalty Program Management', 'Operating customer loyalty rewards program including points tracking and redemption', 'consent', 'Name, Email, Purchase history, Points balance, Preferences', 'Loyalty Members', 'Marketing Team, Loyalty Platform', false, null, '2 years after last activity', 'Tokenized rewards, API security', 'Terms and conditions, Opt-out option', 'Point of sale, Website', false, '2026-01-05', 'Marketing', 'PrivacyGuard Ltd', 'LoyaltyTech Ltd', 'active', 'low'],
        ['Fraud Detection System', 'Automated analysis of transactions to detect and prevent fraudulent activity', 'legitimate_interests', 'Transaction data, IP addresses, Device fingerprints, Behavioral patterns', 'Customers', 'Risk Team, Anti-fraud Provider', true, 'Standard Contractual Clauses', '5 years', 'ML model encryption, Secure APIs', 'DPIA conducted, Regular algorithm audits', 'Transaction systems', true, '2026-02-20', 'Risk Management', 'PrivacyGuard Ltd', 'FraudShield AI', 'under_review', 'high'],
        ['Employee Performance Reviews', 'Annual and quarterly performance evaluations and goal tracking', 'contract', 'Name, Performance scores, Manager feedback, Goals, Development plans', 'Employees', 'HR Team, Direct Managers', false, null, '5 years after employment ends', 'HR system access controls', 'Manager training, Confidentiality agreements', 'HR performance system', false, '2026-03-15', 'Human Resources', 'PrivacyGuard Ltd', null, 'active', 'medium'],
        ['Supplier Due Diligence', 'Conducting background checks and compliance verification on suppliers and vendors', 'legitimate_interests', 'Company details, Director names, Financial data, Compliance records', 'Supplier Contacts', 'Procurement Team, Due Diligence Provider', true, 'Adequacy Decision', '3 years after contract end', 'Secure file transfer, Encrypted storage', 'Need-to-know access, Audit trail', 'Supplier applications', false, '2026-01-30', 'Procurement', 'PrivacyGuard Ltd', 'ComplianceCheck Ltd', 'active', 'medium'],
        ['Mobile App Usage Tracking', 'Collecting app usage data for product improvement and crash reporting', 'consent', 'Device ID, Usage patterns, Crash logs, App version, OS version', 'App Users', 'Product Team, Analytics Provider', true, 'Standard Contractual Clauses', '12 months', 'Data minimization, Anonymization', 'Privacy by design, App privacy policy', 'Mobile application', false, '2026-02-10', 'Product', 'PrivacyGuard Ltd', 'Firebase (Google)', 'active', 'low'],
        ['Legal Case Management', 'Processing personal data in connection with legal proceedings, claims, and disputes', 'legal_obligation', 'Name, Contact details, Case documents, Witness statements', 'Claimants, Defendants, Witnesses', 'Legal Team, External Counsel', false, null, '6 years after case closure', 'Document encryption, Legal hold system', 'Legal privilege, Restricted access', 'Legal proceedings', false, '2025-10-20', 'Legal', 'PrivacyGuard Ltd', 'LawFirm Partners LLP', 'active', 'high'],
        ['Visitor Management System', 'Registration and tracking of visitors to company premises', 'legitimate_interests', 'Name, Company, Visit purpose, Photo, Badge number', 'Office Visitors', 'Reception, Security Team', false, null, '90 days', 'Badge system encryption, Auto-deletion', 'Sign-in procedures, Visitor policy', 'Reception kiosk', false, '2026-03-05', 'Facilities', 'PrivacyGuard Ltd', null, 'active', 'low'],
      ];

      for (const a of activities) {
        await pool.query(
          `INSERT INTO processing_activities (activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, third_country_transfers, transfer_safeguards, retention_period, technical_measures, organizational_measures, data_source, automated_decision_making, dpo_review_date, department, controller_name, processor_name, status, risk_level)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          a
        );
      }
      console.log('Processing activities seeded (15 records)');
    }

    // Seed data subject requests
    const dsrCount = await pool.query('SELECT COUNT(*) FROM data_subject_requests');
    if (parseInt(dsrCount.rows[0].count) === 0) {
      const requests = [
        ['access', 'John Smith', 'john.smith@email.com', true, 'I would like to receive a copy of all personal data you hold about me', 'Account data, Purchase history, Communication logs', 'CRM, E-commerce, Email', '2026-03-01', '2026-03-02', '2026-03-31', '2026-03-15', 'completed', null, 'Maria Lopez', 'Customer Service', 'email', 'Responded with full data export'],
        ['erasure', 'Emma Wilson', 'emma.w@gmail.com', true, 'Please delete all my personal data from your systems. I am no longer a customer', 'Full profile, Orders, Marketing preferences', 'CRM, Database, Marketing platform', '2026-03-05', '2026-03-06', '2026-04-04', null, 'in_progress', null, 'Tom Brown', 'Legal', 'email', 'Checking retention obligations before deletion'],
        ['rectification', 'Michael Chen', 'mchen@company.com', true, 'My address and phone number on file are incorrect and need updating', 'Contact information', 'CRM, Billing system', '2026-03-10', '2026-03-10', '2026-04-09', '2026-03-12', 'completed', null, 'Maria Lopez', 'Customer Service', 'portal', 'Updated records in all systems'],
        ['portability', 'Lisa Anderson', 'l.anderson@email.co.uk', true, 'I want my data in a machine-readable format to transfer to another provider', 'Account data, Transaction history, Preferences', 'CRM, Payment system', '2026-03-12', '2026-03-13', '2026-04-11', null, 'in_progress', null, 'James Wright', 'IT', 'email', 'Preparing CSV export'],
        ['restriction', 'Robert Taylor', 'rtaylor@outlook.com', false, 'I contest the accuracy of my data and want processing restricted until verified', 'Employment verification data', 'HR System', '2026-03-15', null, '2026-04-14', null, 'pending', null, null, 'Human Resources', 'email', 'Awaiting ID verification'],
        ['objection', 'Sarah Davis', 'sdavis@icloud.com', true, 'I object to the processing of my data for direct marketing purposes', 'Marketing preferences, Email, Behavioral data', 'Marketing platform, CRM', '2026-02-28', '2026-03-01', '2026-03-30', '2026-03-05', 'completed', null, 'Tom Brown', 'Marketing', 'email', 'Removed from all marketing lists'],
        ['access', 'David Miller', 'dmiller@proton.me', true, 'Subject access request - please provide all data including any profiling', 'Full profile, Profiling data, Consent records', 'All systems', '2026-02-20', '2026-02-21', '2026-03-22', '2026-03-10', 'completed', null, 'James Wright', 'Legal', 'portal', 'Comprehensive data package sent'],
        ['erasure', 'Anna Martinez', 'anna.m@email.de', true, 'Right to be forgotten - please erase all data and confirm in writing', 'Complete personal data', 'All systems, Backups', '2026-03-08', '2026-03-09', '2026-04-07', null, 'in_progress', null, 'Maria Lopez', 'Legal', 'email', 'Processing through all systems'],
        ['access', 'Thomas Wilson', 'twils@yahoo.com', false, 'I want to know what data you have on me', 'Unknown - full audit needed', 'All systems', '2026-03-18', null, '2026-04-17', null, 'pending', null, null, 'Customer Service', 'email', 'Awaiting identity verification document'],
        ['rectification', 'Jennifer Lee', 'jlee@gmail.com', true, 'My name has changed due to marriage, please update all records', 'Name across all systems', 'CRM, HR, Email, Directory', '2026-03-02', '2026-03-02', '2026-04-01', '2026-03-08', 'completed', null, 'Maria Lopez', 'Human Resources', 'portal', 'Name updated across all systems with marriage certificate on file'],
        ['erasure', 'Paul Johnson', 'pjohnson@email.com', true, 'Delete my trial account and all associated data immediately', 'Trial account data, Usage logs', 'Application, Analytics', '2026-03-20', '2026-03-21', '2026-04-19', null, 'in_progress', null, 'Tom Brown', 'Product', 'email', 'Verifying no legal hold requirements'],
        ['portability', 'Karen White', 'kwhite@company.org', true, 'Export all my health insurance records in structured format', 'Health insurance data, Claims history', 'HR System, Insurance portal', '2026-02-25', '2026-02-26', '2026-03-27', '2026-03-20', 'completed', null, 'James Wright', 'Human Resources', 'email', 'Provided JSON export of all health records'],
        ['objection', 'Mark Thompson', 'mthompson@email.com', true, 'I object to automated decision-making in my fraud risk scoring', 'Transaction data, Risk scores', 'Fraud detection system', '2026-03-14', '2026-03-15', '2026-04-13', null, 'in_progress', null, 'Tom Brown', 'Risk Management', 'portal', 'Escalated for human review of algorithm decision'],
        ['access', 'Sophie Brown', 'sbrown@email.fr', true, 'Please send me all CCTV footage where I appear from March visits', 'CCTV footage, Visit logs', 'Visitor management, CCTV system', '2026-03-22', '2026-03-23', '2026-04-21', null, 'pending', null, 'Maria Lopez', 'Facilities', 'email', 'Reviewing footage for relevant clips'],
        ['restriction', 'Alex Garcia', 'agarcia@email.es', true, 'Restrict processing while my complaint is being investigated', 'Service records, Communication logs', 'CRM, Support system', '2026-03-16', '2026-03-17', '2026-04-15', null, 'in_progress', null, 'Tom Brown', 'Legal', 'email', 'Processing restricted, investigation ongoing'],
      ];

      for (const r of requests) {
        await pool.query(
          `INSERT INTO data_subject_requests (request_type, requester_name, requester_email, requester_id_verified, description, data_categories_affected, systems_affected, received_date, acknowledgement_date, due_date, completed_date, status, denial_reason, assigned_to, department, response_method, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          r
        );
      }
      console.log('Data subject requests seeded (15 records)');
    }

    // Seed privacy impact assessments
    const piaCount = await pool.query('SELECT COUNT(*) FROM privacy_impact_assessments');
    if (parseInt(piaCount.rows[0].count) === 0) {
      const assessments = [
        ['Employee Monitoring DPIA', 'Workplace Monitoring System', 'Assessment of new employee monitoring tools including email scanning and productivity tracking', 'full_dpia', 'Human Resources', 'Dr. James Carter', 'Monitoring employee email, web browsing, and application usage during work hours', 'Required for IT security and productivity management', 'High risk of excessive surveillance, Employee trust impact', 'high', 'Implement transparent monitoring policy, Limit scope to work devices only', 'medium', 'Proceed with enhanced safeguards and clear employee notification', true, false, '2026-01-10', '2026-02-28', '2026-08-28', 'completed', 'approved_with_conditions'],
        ['AI Chatbot Implementation', 'Customer Service AI Bot', 'DPIA for deploying AI-powered chatbot handling customer queries and personal data', 'full_dpia', 'IT', 'Maria Santos', 'AI chatbot processing customer names, account details, and support queries in real-time', 'Improves response time and customer satisfaction while reducing costs', 'Automated decision-making risks, Data accuracy concerns, Transparency challenges', 'high', 'Human escalation option, Regular accuracy audits, Clear AI disclosure', 'low', 'Approved with requirement for human oversight mechanism', true, false, '2026-02-01', '2026-03-15', '2026-09-15', 'completed', 'approved_with_conditions'],
        ['Facial Recognition Access', 'Biometric Entry System', 'Assessment of facial recognition technology for office building access control', 'full_dpia', 'Facilities', 'Dr. James Carter', 'Processing biometric data (facial features) for employee building access', 'Enhanced security over traditional badge systems', 'Special category data processing, Proportionality concerns, Storage security risks', 'critical', 'Offer alternative access method, Strict data minimization, On-premise processing only', 'medium', 'Concerns about proportionality - recommend alternative assessment', true, true, '2026-01-20', null, null, 'in_progress', null],
        ['Cloud CRM Migration', 'Salesforce Implementation', 'DPIA for migrating customer data from on-premise CRM to cloud-based Salesforce', 'full_dpia', 'Sales', 'Linda Park', 'Transfer and ongoing processing of 500K customer records in cloud environment', 'Business scalability and improved sales operations', 'Cross-border data transfer risks, Vendor lock-in, Data sovereignty', 'medium', 'Implement SCCs, Data encryption at rest and transit, Regular vendor audits', 'low', 'Approved subject to SCC execution and annual vendor audit', true, false, '2025-12-01', '2026-01-31', '2026-07-31', 'completed', 'approved'],
        ['Predictive Analytics Platform', 'Customer Churn Prediction', 'Assessment of ML model predicting customer churn using behavioral and transaction data', 'full_dpia', 'Data Science', 'Maria Santos', 'Machine learning analysis of customer behavior patterns to predict churn likelihood', 'Proactive customer retention and business revenue protection', 'Profiling concerns, Transparency of algorithm, Potential discrimination', 'high', 'Algorithm fairness testing, Customer notification, Opt-out mechanism', 'medium', 'Recommend additional fairness testing before production deployment', true, false, '2026-02-15', null, null, 'in_progress', null],
        ['Health Data Platform', 'Employee Wellness Program', 'DPIA for employee wellness platform collecting health and fitness data', 'full_dpia', 'Human Resources', 'Dr. James Carter', 'Voluntary collection of health metrics, fitness data, and wellness survey responses', 'Employee wellbeing improvement and health insurance optimization', 'Special category health data, Voluntary vs coerced participation, Data minimization', 'critical', 'Strict opt-in only, Anonymized reporting, Independent data processor', 'medium', 'Must ensure genuine voluntary participation with no employment consequences', true, false, '2026-03-01', null, null, 'draft', null],
        ['Smart Office IoT', 'Building Automation System', 'Assessment of IoT sensors for smart office (occupancy, temperature, lighting)', 'threshold_assessment', 'Facilities', 'Linda Park', 'IoT sensors collecting occupancy patterns, environmental data, and space utilization', 'Energy efficiency and improved workplace comfort', 'Employee tracking potential, Data aggregation risks', 'low', 'Use anonymous occupancy counters, No individual tracking', 'low', 'Low risk - proceed with privacy notice update', true, false, '2026-01-05', '2026-01-20', '2027-01-20', 'completed', 'approved'],
        ['Third-Party Data Enrichment', 'Marketing Data Enhancement', 'DPIA for purchasing and integrating third-party consumer data for marketing', 'full_dpia', 'Marketing', 'Maria Santos', 'Enriching existing customer profiles with third-party demographic and behavioral data', 'More targeted marketing campaigns and improved ROI', 'Consent validity for third-party data, Data accuracy, Fair processing', 'high', 'Verify consent chain, Implement data quality checks, Provide opt-out', 'medium', 'Significant concerns about consent chain validity - further review needed', true, false, '2026-02-20', null, null, 'in_progress', null],
        ['Remote Work Monitoring', 'WFH Productivity Tools', 'Assessment of remote work monitoring tools including screen capture and activity logging', 'full_dpia', 'IT', 'Dr. James Carter', 'Periodic screen captures, keystroke frequency logging, and application usage tracking for remote workers', 'Ensure productivity and security compliance during remote work', 'Excessive surveillance, Privacy in home environment, Psychological impact', 'critical', 'Limit to work hours only, No continuous surveillance, Clear policy communication', 'high', 'Strongly recommend less intrusive alternatives to screen capture', true, false, '2026-03-10', null, null, 'draft', null],
        ['Payment Tokenization', 'PCI DSS Compliance Upgrade', 'DPIA for implementing payment tokenization across all sales channels', 'threshold_assessment', 'Finance', 'Linda Park', 'Replacing stored credit card numbers with tokenized references', 'PCI DSS compliance and reduced data breach impact', 'Minimal new risk - reduces existing risk significantly', 'low', 'Standard security controls for tokenization vault', 'low', 'Approved - this actually reduces privacy risk', true, false, '2025-11-15', '2025-12-15', '2026-12-15', 'completed', 'approved'],
        ['Geolocation Fleet Tracking', 'Delivery Vehicle GPS', 'Assessment of GPS tracking for company delivery fleet', 'full_dpia', 'Operations', 'Maria Santos', 'Real-time GPS tracking of company delivery vehicles during operating hours', 'Route optimization, delivery ETAs, and fleet security', 'Employee location monitoring, Out-of-hours tracking risk, Purpose limitation', 'medium', 'Track vehicles not individuals, Automatic off-hours disable, Driver notification', 'low', 'Approved with clear driver communication and off-hours shutdown', true, false, '2026-01-25', '2026-03-01', '2026-09-01', 'completed', 'approved_with_conditions'],
        ['Social Media Listening', 'Brand Monitoring Platform', 'DPIA for social media monitoring tool that tracks brand mentions and sentiment', 'threshold_assessment', 'Marketing', 'Linda Park', 'Automated collection of public social media posts mentioning the company brand', 'Brand reputation management and customer insight', 'Processing publicly available data at scale, Potential for individual profiling', 'medium', 'Only aggregate analysis, No individual profiling, Public data only', 'low', 'Proceed with aggregation-only approach', true, false, '2026-02-05', '2026-02-20', '2026-08-20', 'completed', 'approved'],
        ['Visitor WiFi Analytics', 'Store WiFi Tracking', 'Assessment of using WiFi signals to track customer movement patterns in retail stores', 'full_dpia', 'Retail Operations', 'Dr. James Carter', 'Passive WiFi probe collection to analyze foot traffic and dwell times in stores', 'Store layout optimization and customer experience improvement', 'Tracking without explicit consent, MAC address as personal data, Proportionality', 'high', 'Implement MAC randomization handling, Clear signage, Opt-out mechanism', 'medium', 'Concerns about transparency - require prominent notice and easy opt-out', true, false, '2026-03-05', null, null, 'in_progress', null],
        ['Automated Background Checks', 'Pre-Employment Screening', 'DPIA for automated employment background checking system', 'full_dpia', 'Human Resources', 'Maria Santos', 'Automated criminal record, credit, and reference checking for job candidates', 'Efficient and consistent hiring decisions while ensuring workplace safety', 'Automated decision-making, Fairness concerns, Data accuracy', 'high', 'Human review of all adverse decisions, Candidate notification and appeal process', 'medium', 'Approved with mandatory human review of any automated adverse decisions', true, false, '2026-02-10', '2026-03-20', '2026-09-20', 'completed', 'approved_with_conditions'],
        ['Internal Whistleblowing Platform', 'Ethics Reporting System', 'DPIA for anonymous whistleblowing and ethics reporting platform', 'full_dpia', 'Legal', 'Dr. James Carter', 'Processing reports of misconduct including personal data of reporters and subjects', 'Legal compliance and fostering ethical workplace culture', 'Confidentiality risks, Subject rights vs investigation needs, Data retention', 'high', 'Strong anonymity protections, Restricted access, Clear retention limits', 'medium', 'Approved with enhanced access controls and audit logging', true, false, '2026-01-15', '2026-02-28', '2026-08-28', 'completed', 'approved_with_conditions'],
      ];

      for (const a of assessments) {
        await pool.query(
          `INSERT INTO privacy_impact_assessments (assessment_name, project_name, description, assessment_type, department, assessor, processing_description, necessity_justification, identified_risks, risk_level, mitigation_measures, residual_risk, dpo_opinion, dpo_consulted, supervisory_authority_consulted, start_date, completion_date, review_date, status, outcome)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          a
        );
      }
      console.log('Privacy impact assessments seeded (15 records)');
    }

    // Seed consent records
    const crCount = await pool.query('SELECT COUNT(*) FROM consent_records');
    if (parseInt(crCount.rows[0].count) === 0) {
      const consents = [
        ['Alice Johnson', 'alice.j@email.com', 'marketing', 'Receive promotional emails and newsletters about products and services', 'consent', true, '2026-01-15 10:30:00', null, '2027-01-15', 'web_form', 'I agree to receive marketing emails from PrivacyGuard Ltd.', 'v2.1', '192.168.1.100', 'granular', true, true, true, true, 'active'],
        ['Bob Williams', 'bob.w@email.com', 'analytics', 'Allow website usage analytics and performance monitoring cookies', 'consent', true, '2026-02-01 14:22:00', null, '2027-02-01', 'web_form', 'I consent to analytics cookies for website improvement', 'v2.1', '10.0.0.55', 'granular', true, true, true, true, 'active'],
        ['Carol Davis', 'carol.d@email.com', 'third_party_sharing', 'Share data with partner companies for integrated services', 'consent', true, '2026-01-20 09:15:00', '2026-03-10 16:00:00', null, 'web_form', 'I agree to share my data with authorized partner companies', 'v1.8', '172.16.0.23', 'granular', true, true, true, true, 'withdrawn'],
        ['Daniel Brown', 'dan.b@email.com', 'profiling', 'Allow automated analysis of preferences for personalized recommendations', 'consent', true, '2026-02-10 11:45:00', null, '2027-02-10', 'app', 'I consent to personalized profiling for product recommendations', 'v2.0', '192.168.2.50', 'granular', true, true, true, true, 'active'],
        ['Eva Martinez', 'eva.m@email.com', 'marketing', 'Receive SMS marketing messages about special offers', 'consent', true, '2026-01-05 16:30:00', null, '2027-01-05', 'web_form', 'I agree to receive SMS marketing messages', 'v2.1', '10.10.0.12', 'granular', true, true, true, true, 'active'],
        ['Frank Garcia', 'frank.g@email.com', 'cookies', 'Accept all cookies including targeting and advertising cookies', 'consent', true, '2026-03-01 08:00:00', null, '2026-09-01', 'web_form', 'I accept all cookies as described in the cookie policy', 'v3.0', '192.168.5.77', 'bundled', true, true, true, true, 'active'],
        ['Grace Lee', 'grace.l@email.com', 'research', 'Participate in customer satisfaction surveys and product research', 'consent', true, '2026-02-15 13:20:00', null, '2027-02-15', 'web_form', 'I agree to participate in research activities and surveys', 'v1.5', '10.0.1.88', 'granular', true, true, true, true, 'active'],
        ['Henry Wilson', 'henry.w@email.com', 'marketing', 'Receive personalized product recommendations via email', 'consent', false, '2026-01-25 10:00:00', null, null, 'web_form', 'I decline marketing communications', 'v2.1', '172.16.1.45', 'granular', true, true, true, true, 'active'],
        ['Iris Thompson', 'iris.t@email.com', 'analytics', 'Allow performance and functionality cookies', 'consent', true, '2026-02-20 15:45:00', '2026-03-15 09:30:00', null, 'web_form', 'I consent to performance cookies', 'v2.1', '192.168.3.22', 'granular', true, true, true, true, 'withdrawn'],
        ['Jack Anderson', 'jack.a@email.com', 'third_party_sharing', 'Share order data with delivery partners for fulfillment', 'consent', true, '2026-01-10 12:00:00', null, '2027-01-10', 'app', 'I agree to share necessary data with delivery partners', 'v2.0', '10.0.2.33', 'granular', true, true, true, true, 'active'],
        ['Kate Robinson', 'kate.r@email.com', 'profiling', 'Allow credit scoring and financial profiling for loan applications', 'consent', true, '2026-03-05 09:30:00', null, '2027-03-05', 'web_form', 'I consent to automated credit assessment', 'v1.2', '192.168.4.11', 'granular', true, true, true, true, 'active'],
        ['Liam Clark', 'liam.c@email.com', 'marketing', 'Receive event invitations and webinar notifications', 'consent', true, '2026-02-05 17:15:00', null, '2027-02-05', 'web_form', 'I agree to receive event and webinar communications', 'v2.1', '172.16.2.67', 'granular', true, true, true, true, 'active'],
        ['Mia Lewis', 'mia.l@email.com', 'cookies', 'Accept functional cookies for enhanced website features', 'consent', true, '2026-01-30 14:00:00', null, '2026-07-30', 'web_form', 'I accept functional cookies', 'v3.0', '10.10.1.99', 'granular', true, true, true, true, 'active'],
        ['Noah Walker', 'noah.w@email.com', 'research', 'Allow anonymized data usage for academic research partnership', 'consent', true, '2026-02-25 11:30:00', null, '2027-02-25', 'paper', 'I consent to anonymized data being used for academic research', 'v1.0', null, 'granular', true, true, true, true, 'active'],
        ['Olivia Hall', 'olivia.h@email.com', 'marketing', 'Receive postal marketing materials and catalogs', 'consent', true, '2026-01-18 10:45:00', '2026-02-28 14:20:00', null, 'web_form', 'I agree to receive postal marketing', 'v2.1', '192.168.6.44', 'granular', true, true, true, true, 'withdrawn'],
      ];

      for (const c of consents) {
        await pool.query(
          `INSERT INTO consent_records (data_subject_name, data_subject_email, consent_type, purpose, legal_basis, consent_given, consent_date, withdrawal_date, expiry_date, collection_method, consent_text, version, ip_address, granularity, freely_given, specific, informed, unambiguous, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          c
        );
      }
      console.log('Consent records seeded (15 records)');
    }

    // Seed data breaches
    const dbCount = await pool.query('SELECT COUNT(*) FROM data_breaches');
    if (parseInt(dbCount.rows[0].count) === 0) {
      const breaches = [
        ['Phishing Attack on Finance Team', 'Employee clicked malicious email link leading to credential compromise of 3 finance team members', 'confidentiality', 'high', '2026-02-15 09:30:00', '2026-02-14 22:00:00', '2026-02-15 14:00:00', '2026-02-16 10:00:00', 'Login credentials, Email contents, Financial documents', 150, 3, 'Email system, Finance portal', 'Sophisticated spear-phishing email mimicking CEO', 'Password resets, MFA enforcement, Email quarantine', 'Phishing awareness training, Email filtering upgrade', true, false, true, 'possible', 'IT Security Team', 'Mark Thompson', 'IT', 'resolved', 'Implement mandatory phishing simulations quarterly'],
        ['Ransomware Incident', 'Ransomware encrypted customer database server affecting service availability', 'availability', 'critical', '2026-01-20 03:15:00', '2026-01-19 23:45:00', '2026-01-22 18:00:00', '2026-01-21 08:00:00', 'Customer records, Order history, Contact details', 45000, 45000, 'Customer database, Backup server', 'Unpatched vulnerability in database management software', 'Isolated affected servers, Restored from clean backup', 'Patch management overhaul, Enhanced backup strategy', true, true, true, 'likely', 'SOC Alert', 'Sarah Mitchell', 'IT', 'closed', 'Implement automated patch management and air-gapped backups'],
        ['Accidental Email Disclosure', 'Employee sent spreadsheet with customer data to wrong external email address', 'confidentiality', 'medium', '2026-03-05 11:20:00', '2026-03-05 11:15:00', '2026-03-05 11:45:00', null, 'Names, Email addresses, Order values', 230, 230, 'Email system', 'Human error - incorrect recipient selection', 'Contacted recipient for deletion, Email recall attempted', 'Implement DLP rules, Mandatory external email confirmation', false, false, true, 'unlikely', 'Employee self-report', 'Maria Lopez', 'Sales', 'contained', 'Deploy email DLP with PII scanning'],
        ['Lost Company Laptop', 'Sales manager laptop stolen from car containing unencrypted customer presentations', 'confidentiality', 'medium', '2026-02-28 08:00:00', '2026-02-27 19:00:00', '2026-02-28 10:00:00', null, 'Customer names, Business proposals, Contact details', 50, 35, 'Laptop local storage', 'Theft of unencrypted device from vehicle', 'Remote wipe initiated, Police report filed', 'Full disk encryption mandate, Mobile device management', false, false, true, 'possible', 'Employee report', 'Tom Brown', 'Sales', 'resolved', 'Enforce full disk encryption on all portable devices'],
        ['API Data Exposure', 'Misconfigured API endpoint exposed customer profile data without authentication', 'confidentiality', 'high', '2026-03-10 16:30:00', '2026-03-01 00:00:00', '2026-03-10 17:00:00', '2026-03-11 09:00:00', 'Customer profiles, Email addresses, Phone numbers', 12000, 8500, 'REST API, Customer portal', 'Developer misconfiguration during deployment', 'API endpoint secured, Access logs reviewed', 'API security testing in CI/CD, Authentication gateway', true, true, true, 'likely', 'Security researcher report', 'James Wright', 'IT', 'resolved', 'Mandatory API security reviews before deployment'],
        ['Insider Data Theft', 'Departing employee downloaded customer database before resignation', 'confidentiality', 'critical', '2026-01-10 14:00:00', '2026-01-08 20:30:00', '2026-01-11 09:00:00', '2026-01-12 10:00:00', 'Full customer database, Financial records', 100000, 75000, 'CRM, Data warehouse', 'Malicious insider with privileged access', 'Access revoked, Legal action initiated, Data recovery attempted', 'Enhanced off-boarding procedures, DLP monitoring, Access reviews', true, true, true, 'high', 'DLP alert', 'Sarah Mitchell', 'Legal', 'closed', 'Implement just-in-time access and enhanced monitoring for departing employees'],
        ['Third-Party Vendor Breach', 'Marketing analytics vendor suffered breach exposing shared customer data', 'confidentiality', 'high', '2026-02-05 10:00:00', '2026-02-01 00:00:00', '2026-02-06 12:00:00', '2026-02-07 09:00:00', 'Email addresses, Behavioral data, Marketing preferences', 25000, 25000, 'Vendor analytics platform', 'Vendor security vulnerability', 'Suspended data sharing, Vendor incident assessment', 'Enhanced vendor security requirements, Regular vendor audits', true, true, true, 'possible', 'Vendor notification', 'Tom Brown', 'Marketing', 'resolved', 'Require vendors to meet minimum security standards and provide breach notification within 24h'],
        ['SQL Injection Attack', 'Automated SQL injection attack on legacy web form exposed partial database', 'confidentiality', 'high', '2026-03-15 02:45:00', '2026-03-14 23:00:00', '2026-03-15 04:30:00', '2026-03-15 12:00:00', 'Usernames, Hashed passwords, Email addresses', 5000, 5000, 'Legacy web application, User database', 'Unpatched SQL injection vulnerability in legacy system', 'Application taken offline, WAF rules updated', 'Legacy system migration, Code security audit', true, true, true, 'likely', 'WAF alert', 'James Wright', 'IT', 'resolved', 'Accelerate legacy system decommission plan'],
        ['Misdirected Postal Mail', 'Batch of customer account statements sent to wrong addresses due to mail merge error', 'confidentiality', 'low', '2026-02-20 16:00:00', '2026-02-18 09:00:00', '2026-02-20 17:00:00', null, 'Names, Account numbers, Transaction summaries', 150, 150, 'Mail merge system, Printing vendor', 'Corrupted address file in mail merge process', 'Recall letters sent, Affected customers notified by email', 'Dual verification for bulk mailings, Test prints required', false, true, false, 'unlikely', 'Customer complaint', 'Maria Lopez', 'Operations', 'closed', 'Implement address verification step and test mailings before bulk dispatch'],
        ['Cloud Storage Misconfiguration', 'S3 bucket containing HR documents found publicly accessible', 'confidentiality', 'critical', '2026-01-28 11:15:00', '2025-12-15 00:00:00', '2026-01-28 12:00:00', '2026-01-29 09:00:00', 'Employee contracts, Salary data, Performance reviews, ID copies', 500, 320, 'AWS S3, HR document storage', 'Misconfigured bucket permissions during cloud migration', 'Bucket permissions corrected, Access logs analyzed', 'Cloud security posture management, Automated config scanning', true, true, true, 'high', 'External security alert', 'Sarah Mitchell', 'IT', 'closed', 'Deploy CSPM tool and mandatory infrastructure-as-code reviews'],
        ['Physical Document Disposal Failure', 'Unshreded employee files found in public recycling bin outside office', 'confidentiality', 'medium', '2026-03-08 08:30:00', '2026-03-07 17:00:00', '2026-03-08 09:00:00', null, 'Employee personal files, Tax documents, Medical certificates', 25, 25, 'Physical document storage', 'Cleaning staff used wrong disposal bin', 'Documents recovered, Secure disposal completed', 'Locking shred bins, Staff awareness training, Clear signage', false, false, true, 'possible', 'Employee found documents', 'Tom Brown', 'Facilities', 'resolved', 'Install locked confidential waste bins on every floor'],
        ['Session Hijacking Incident', 'Customer sessions hijacked through XSS vulnerability in forum feature', 'confidentiality', 'high', '2026-02-12 19:00:00', '2026-02-12 15:00:00', '2026-02-12 20:30:00', '2026-02-13 10:00:00', 'Session tokens, Account access, Personal profiles', 80, 80, 'Web application, Forum module', 'Stored XSS vulnerability in user-generated content', 'Forum disabled, All sessions invalidated', 'Input sanitization review, CSP headers implementation', true, false, true, 'possible', 'Customer report', 'James Wright', 'IT', 'resolved', 'Implement Content Security Policy and automated XSS scanning'],
        ['Backup Tape Lost in Transit', 'Encrypted backup tape lost during transport to off-site storage facility', 'availability', 'low', '2026-01-15 14:00:00', '2026-01-14 10:00:00', '2026-01-15 16:00:00', null, 'Full database backup including personal data', 200000, 150000, 'Backup system', 'Courier mishandled package during transport', 'New backup created, Courier investigation initiated', 'Switch to encrypted electronic backup transfer', false, false, false, 'unlikely', 'Storage facility report', 'Mark Thompson', 'IT', 'closed', 'Migrate to electronic backup transfer, eliminate physical tape transport'],
        ['Social Engineering Phone Scam', 'Caller impersonated IT support and obtained employee credentials by phone', 'confidentiality', 'medium', '2026-03-18 10:45:00', '2026-03-18 10:30:00', '2026-03-18 11:30:00', null, 'Employee credentials, Internal system access', 1, 1, 'Phone system, Internal applications', 'Social engineering attack targeting help desk', 'Credential reset, Account monitoring enabled', 'Verification procedures for phone requests, Security awareness', false, false, true, 'unlikely', 'Employee realized and reported', 'Tom Brown', 'IT', 'contained', 'Implement callback verification for all credential-related phone requests'],
        ['Database Migration Data Loss', 'Partial data loss during database migration with incorrect field mapping', 'integrity', 'medium', '2026-02-08 22:00:00', '2026-02-08 20:00:00', '2026-02-09 06:00:00', null, 'Customer preferences, Communication history', 3000, 3000, 'Legacy database, New CRM', 'Incorrect ETL mapping and insufficient testing', 'Restored from pre-migration backup, Migration re-planned', 'Mandatory migration testing in staging, Data validation checks', false, false, false, 'unlikely', 'QA testing discovery', 'James Wright', 'IT', 'resolved', 'Require complete data validation and rollback plan for all migrations'],
      ];

      for (const b of breaches) {
        await pool.query(
          `INSERT INTO data_breaches (incident_title, description, breach_type, severity, discovery_date, occurrence_date, containment_date, notification_date, data_categories_affected, number_of_records, number_of_individuals, systems_affected, root_cause, containment_actions, remediation_actions, supervisory_authority_notified, data_subjects_notified, notification_required, risk_to_individuals, reported_by, assigned_to, department, status, lessons_learned)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
          b
        );
      }
      console.log('Data breaches seeded (15 records)');
    }

    // Seed vendors
    const vCount = await pool.query('SELECT COUNT(*) FROM vendors');
    if (parseInt(vCount.rows[0].count) === 0) {
      const vendors = [
        ['Amazon Web Services', 'processor', 'Cloud Support', 'aws-support@amazon.com', 'United States', 'Cloud infrastructure, compute, storage, and database services', 'All categories hosted in cloud', 'contract', true, '2025-06-01', true, 'medium', '2025-12-01', '2026-06-01', 'ISO 27001, SOC 2 Type II, CSA STAR', 'Multiple sub-processors per region', 48, '2024-01-01', '2027-01-01', 'active', 'Primary cloud provider'],
        ['Salesforce Inc', 'processor', 'Enterprise Support', 'dpa@salesforce.com', 'United States', 'Customer relationship management platform', 'Customer names, Emails, Phone numbers, Purchase history', 'contract', true, '2025-03-15', true, 'medium', '2025-09-15', '2026-03-15', 'ISO 27001, SOC 2, TRUSTe', 'Salesforce sub-processor list', 72, '2025-01-01', '2027-12-31', 'active', 'CRM platform for sales and support'],
        ['Stripe Inc', 'processor', 'Privacy Team', 'privacy@stripe.com', 'United States', 'Payment processing and billing', 'Cardholder names, Payment card data, Transaction amounts', 'contract', true, '2025-04-01', true, 'high', '2025-10-01', '2026-04-01', 'PCI DSS Level 1, SOC 2, ISO 27001', 'Banking partners per region', 24, '2024-06-01', '2027-06-01', 'active', 'Payment processor - PCI compliant'],
        ['Google LLC', 'processor', 'Data Protection Office', 'privacy@google.com', 'United States', 'Website analytics, advertising, cloud email', 'Website usage data, Email contents, IP addresses', 'consent', true, '2025-05-01', true, 'medium', '2025-11-01', '2026-05-01', 'ISO 27001, SOC 2, SOC 3', 'Google sub-processor list', 72, '2025-01-01', '2026-12-31', 'active', 'Analytics and workspace provider'],
        ['HubSpot Inc', 'processor', 'Privacy Manager', 'gdpr@hubspot.com', 'United States', 'Marketing automation and CRM', 'Contact details, Marketing preferences, Engagement data', 'consent', true, '2025-07-01', true, 'low', '2025-07-01', '2026-07-01', 'SOC 2 Type II', 'HubSpot sub-processor list', 72, '2025-03-01', '2027-03-01', 'active', 'Marketing automation platform'],
        ['Zendesk Inc', 'processor', 'DPO', 'privacy@zendesk.com', 'United States', 'Customer support ticketing and help desk', 'Customer names, Emails, Support communications', 'contract', true, '2025-02-15', true, 'low', '2025-08-15', '2026-02-15', 'SOC 2, ISO 27001, ISO 27018', 'Zendesk infrastructure providers', 48, '2024-09-01', '2026-09-01', 'active', 'Customer support platform'],
        ['Workday Inc', 'processor', 'Privacy Office', 'privacy@workday.com', 'United States', 'Human resources management system', 'Employee PII, Salary data, Performance records', 'contract', true, '2025-01-01', true, 'high', '2025-06-01', '2026-06-01', 'ISO 27001, SOC 1, SOC 2', 'Workday sub-processor list', 48, '2025-01-01', '2027-12-31', 'active', 'HR management system'],
        ['Mailchimp (Intuit)', 'processor', 'Privacy Team', 'privacy@mailchimp.com', 'United States', 'Email marketing and campaign management', 'Email addresses, Names, Campaign engagement', 'consent', true, '2025-04-15', true, 'low', '2025-04-15', '2026-04-15', 'SOC 2 Type II', 'Mailchimp sub-processor list', 72, '2025-01-01', '2026-12-31', 'active', 'Email marketing provider'],
        ['Cloudflare Inc', 'processor', 'Legal', 'privacyquestions@cloudflare.com', 'United States', 'CDN, DDoS protection, DNS services', 'IP addresses, Request metadata, Traffic data', 'legitimate_interests', true, '2025-03-01', true, 'low', '2025-09-01', '2026-03-01', 'ISO 27001, SOC 2', 'Cloudflare infrastructure partners', 24, '2025-01-01', '2026-12-31', 'active', 'CDN and security provider'],
        ['DataDog Inc', 'processor', 'Privacy Office', 'privacy@datadoghq.com', 'United States', 'Application monitoring and logging', 'Log data, Performance metrics, Trace data', 'legitimate_interests', true, '2025-06-15', true, 'medium', '2025-12-15', '2026-06-15', 'SOC 2 Type II, ISO 27001', 'DataDog cloud providers', 48, '2025-03-01', '2027-03-01', 'active', 'Monitoring and observability'],
        ['TechAudit GmbH', 'processor', 'Hans Mueller', 'h.mueller@techaudit.de', 'Germany', 'IT security auditing and penetration testing', 'System configurations, Vulnerability data', 'contract', true, '2025-08-01', false, 'low', '2025-08-01', '2026-08-01', 'ISO 27001', null, 48, '2025-08-01', '2026-08-01', 'active', 'Annual security audit provider'],
        ['LegalDoc SaaS', 'processor', 'Marie Dupont', 'm.dupont@legaldoc.eu', 'France', 'Document management and e-signature', 'Contract documents, Signatory details', 'contract', true, '2025-05-15', false, 'low', '2025-11-15', '2026-05-15', 'ISO 27001, eIDAS compliant', null, 72, '2025-01-01', '2027-01-01', 'active', 'EU-based document management'],
        ['InsurePartner AG', 'controller', 'Klaus Weber', 'k.weber@insurepartner.ch', 'Switzerland', 'Employee health and life insurance', 'Employee health data, Personal details, Dependents', 'legal_obligation', true, '2025-04-01', false, 'high', '2025-10-01', '2026-04-01', 'FINMA regulated', null, 24, '2024-01-01', '2027-01-01', 'active', 'Insurance provider - handles special category data'],
        ['MarketResearch Ltd', 'processor', 'James O Brien', 'j.obrien@marketresearch.co.uk', 'United Kingdom', 'Customer survey and market research', 'Survey responses, Demographics, Preferences', 'consent', true, '2025-09-01', true, 'low', '2025-09-01', '2026-09-01', 'ISO 20252', null, 72, '2025-06-01', '2026-06-01', 'under_review', 'Post-Brexit adequacy review needed'],
        ['PrintSecure BV', 'processor', 'Anna de Vries', 'a.devries@printsecure.nl', 'Netherlands', 'Secure document printing and mailing', 'Names, Addresses, Account statements', 'contract', true, '2025-07-15', false, 'medium', '2025-07-15', '2026-07-15', 'ISO 27001', null, 48, '2025-01-01', '2026-12-31', 'active', 'Handles postal customer communications'],
      ];

      for (const v of vendors) {
        await pool.query(
          `INSERT INTO vendors (vendor_name, vendor_type, contact_name, contact_email, country, services_provided, data_categories_shared, legal_basis, dpa_signed, dpa_date, scc_in_place, risk_level, last_audit_date, next_audit_date, certifications, sub_processors, data_breach_notification_hours, contract_start_date, contract_end_date, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
          v
        );
      }
      console.log('Vendors seeded (15 records)');
    }

    // Seed retention policies
    const rpCount = await pool.query('SELECT COUNT(*) FROM retention_policies');
    if (parseInt(rpCount.rows[0].count) === 0) {
      const policies = [
        ['Customer Account Data Policy', 'Customer Personal Data', 'Retention rules for customer account information and profiles', '5 years after account closure', 1825, 'GDPR Art. 17, Contract necessity', 'Commercial law record keeping requirements', 'anonymization', 'Customer Service', 'CRM, Customer Portal, Billing System', 'annual', '2026-01-15', '2027-01-15', 'Data Privacy Officer', 'Extended for active legal disputes', true, 'active'],
        ['Employee Records Policy', 'Employee Personal Data', 'HR records including contracts, payroll, and performance data', '7 years after employment ends', 2555, 'Employment law, Tax regulations', 'Labor law Sec 195 BGB, Tax retention AO', 'deletion', 'Human Resources', 'HR System, Payroll, Performance Management', 'annual', '2026-02-01', '2027-02-01', 'HR Director', 'Health records retained for 30 years per regulation', false, 'active'],
        ['CCTV Footage Policy', 'Video Surveillance Data', 'Retention of CCTV recordings from office premises', '30 days', 30, 'Legitimate interests', 'Data protection best practices', 'deletion', 'Facilities', 'CCTV System, NVR Storage', 'quarterly', '2026-03-01', '2026-06-01', 'Security Manager', 'Extended to 90 days for active investigations', true, 'active'],
        ['Marketing Consent Records', 'Marketing Preferences', 'Records of marketing consent and withdrawal', 'Duration of consent + 3 years', 1095, 'GDPR Art. 7(1) - Proof of consent', 'GDPR accountability requirement', 'deletion', 'Marketing', 'Marketing Platform, CRM', 'annual', '2026-01-20', '2027-01-20', 'Marketing Director', 'Withdrawal records kept longer than active consent records', false, 'active'],
        ['Financial Transaction Records', 'Transaction Data', 'Customer payment and transaction records', '10 years', 3650, 'Tax law, Anti-money laundering', 'AML Directive, Tax regulations', 'archival', 'Finance', 'Payment System, Accounting Software, Bank Integrations', 'annual', '2025-12-15', '2026-12-15', 'CFO', 'Suspicious transaction records retained indefinitely pending investigation', false, 'active'],
        ['Website Analytics Data', 'Web Usage Data', 'Website visitor analytics and behavioral data', '26 months', 790, 'Consent-based', 'ICO guidance on analytics retention', 'anonymization', 'Digital Marketing', 'Google Analytics, Hotjar, Internal Analytics', 'biannual', '2026-02-10', '2026-08-10', 'Digital Marketing Manager', 'Anonymized aggregate data may be kept indefinitely', true, 'active'],
        ['Recruitment Data Policy', 'Applicant Data', 'Job application and recruitment process data', '6 months after decision (unsuccessful)', 180, 'Consent, Legitimate interests', 'Employment tribunal limitation period', 'deletion', 'Human Resources', 'ATS, Email, Interview Platform', 'annual', '2026-01-10', '2027-01-10', 'Recruitment Manager', 'Successful candidates data moves to employee records', false, 'active'],
        ['Support Ticket Archives', 'Customer Support Data', 'Customer support tickets and communication history', '3 years after resolution', 1095, 'Contract, Legitimate interests', 'Statute of limitations for service disputes', 'anonymization', 'Customer Support', 'Zendesk, Email, Phone System', 'annual', '2026-03-15', '2027-03-15', 'Support Director', 'Escalated complaints retained for 6 years', false, 'active'],
        ['Audit Trail Logs', 'System Audit Logs', 'System access and activity audit trails', '5 years', 1825, 'Legal obligation, Security', 'ISO 27001, SOC 2 requirements', 'deletion', 'IT Security', 'SIEM, Application Logs, Database Logs', 'quarterly', '2026-02-20', '2026-05-20', 'CISO', 'Security incident logs retained for 7 years', true, 'active'],
        ['Cookie Data Policy', 'Cookie and Tracking Data', 'Browser cookies and tracking technology data', 'Session to 12 months depending on type', 365, 'Consent (except strictly necessary)', 'ePrivacy Directive, GDPR', 'deletion', 'IT', 'Web Application, CDN, Analytics', 'quarterly', '2026-01-05', '2026-04-05', 'Web Development Lead', 'Strictly necessary cookies exempt from consent', true, 'active'],
        ['Data Breach Records', 'Incident Records', 'Records of data breach investigations and responses', '5 years after incident closure', 1825, 'GDPR Art. 33(5)', 'GDPR documentation obligation', 'archival', 'Legal', 'Incident Management System, Email, Reports', 'annual', '2026-02-15', '2027-02-15', 'DPO', 'Records involving litigation retained until proceedings conclude', false, 'active'],
        ['Vendor Assessment Records', 'Vendor Due Diligence Data', 'Third-party vendor risk assessments and compliance records', '3 years after contract end', 1095, 'Legitimate interests, GDPR Art. 28', 'GDPR processor oversight obligations', 'deletion', 'Procurement', 'Vendor Management System, Document Storage', 'annual', '2026-03-01', '2027-03-01', 'Procurement Manager', 'Active vendor records retained throughout relationship', false, 'active'],
        ['DPIA Documentation', 'Assessment Records', 'Data Protection Impact Assessment documentation', '3 years after last review or project end', 1095, 'GDPR Art. 35(7)', 'GDPR accountability requirement', 'archival', 'Legal', 'DPIA Tool, Document Management', 'annual', '2026-01-25', '2027-01-25', 'DPO', 'Ongoing processing DPIAs retained for duration of processing', false, 'active'],
        ['Training Completion Records', 'Training Data', 'Employee privacy training completion and certification records', '3 years after employment ends', 1095, 'GDPR Art. 39(1)(b)', 'Accountability and compliance evidence', 'deletion', 'Human Resources', 'LMS, HR System', 'annual', '2026-02-05', '2027-02-05', 'Training Manager', 'Certification records may be retained longer if regulatory required', false, 'active'],
        ['Consent Withdrawal Records', 'Consent Audit Trail', 'Records documenting consent withdrawals and related actions', '5 years after withdrawal', 1825, 'GDPR Art. 7(1), Art. 5(2)', 'GDPR accountability and proof requirements', 'deletion', 'Legal', 'Consent Management Platform, CRM', 'biannual', '2026-03-10', '2026-09-10', 'DPO', 'Must demonstrate compliance with withdrawal request timeline', false, 'active'],
      ];

      for (const p of policies) {
        await pool.query(
          `INSERT INTO retention_policies (policy_name, data_category, description, retention_period, retention_period_days, legal_basis, regulatory_requirement, disposal_method, department, applies_to_systems, review_frequency, last_review_date, next_review_date, data_owner, exceptions, automated_enforcement, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          p
        );
      }
      console.log('Retention policies seeded (15 records)');
    }

    // Seed cookie compliance
    const ccCount = await pool.query('SELECT COUNT(*) FROM cookie_compliance');
    if (parseInt(ccCount.rows[0].count) === 0) {
      const cookies = [
        ['_ga', 'privacyguard.com', 'performance', 'Google Analytics tracking for website usage statistics', 'Google LLC', '2 years', 'third_party', 'Page views, Session duration, User interactions', true, 'banner', true, null, 'Global', 'consent', '2026-03-01', true, 'active', 'Primary analytics cookie'],
        ['_gid', 'privacyguard.com', 'performance', 'Google Analytics cookie to distinguish users', 'Google LLC', '24 hours', 'third_party', 'User identification for analytics', true, 'banner', true, null, 'Global', 'consent', '2026-03-01', true, 'active', 'Session-level analytics'],
        ['_fbp', 'privacyguard.com', 'targeting', 'Facebook Pixel for ad targeting and conversion tracking', 'Meta Platforms', '3 months', 'third_party', 'Browser ID, Page visits, Ad interactions', true, 'banner', true, null, 'Global', 'consent', '2026-03-01', true, 'active', 'Facebook advertising pixel'],
        ['_hjSessionUser', 'privacyguard.com', 'performance', 'Hotjar session tracking for heatmaps and user behavior analysis', 'Hotjar Ltd', '1 year', 'third_party', 'Session replays, Heatmaps, Click patterns', true, 'banner', true, null, 'EU', 'consent', '2026-02-15', true, 'active', 'UX analysis tool'],
        ['intercom-session', 'privacyguard.com', 'functional', 'Intercom live chat session management', 'Intercom Inc', 'Session', 'third_party', 'Chat history, User identification', true, 'banner', true, null, 'Global', 'consent', '2026-03-01', true, 'active', 'Customer support chat'],
        ['__stripe_mid', 'privacyguard.com', 'strictly_necessary', 'Stripe fraud detection and payment security', 'Stripe Inc', '1 year', 'third_party', 'Device fingerprint for fraud prevention', false, 'none', false, null, 'Global', 'legitimate_interests', '2026-03-01', true, 'active', 'Payment security - no consent needed'],
        ['session_id', 'privacyguard.com', 'strictly_necessary', 'Application session management and authentication', 'First Party', 'Session', 'first_party', 'Session token, Authentication state', false, 'none', false, null, 'Global', 'legitimate_interests', '2026-03-01', true, 'active', 'Essential for app functionality'],
        ['csrf_token', 'privacyguard.com', 'strictly_necessary', 'Cross-site request forgery protection token', 'First Party', 'Session', 'first_party', 'Security token', false, 'none', false, null, 'Global', 'legitimate_interests', '2026-03-01', true, 'active', 'Security essential'],
        ['cookie_consent', 'privacyguard.com', 'strictly_necessary', 'Stores user cookie consent preferences', 'First Party', '1 year', 'first_party', 'Consent choices', false, 'none', false, null, 'Global', 'legitimate_interests', '2026-03-01', true, 'active', 'Required for consent management'],
        ['_hubspot_utk', 'privacyguard.com', 'targeting', 'HubSpot tracking for marketing attribution and lead scoring', 'HubSpot Inc', '13 months', 'third_party', 'Visitor tracking, Form submissions, Page views', true, 'banner', true, null, 'Global', 'consent', '2026-02-20', true, 'active', 'Marketing automation tracking'],
        ['_gcl_au', 'privacyguard.com', 'targeting', 'Google Ads conversion tracking', 'Google LLC', '3 months', 'third_party', 'Ad click data, Conversion events', true, 'banner', true, null, 'Global', 'consent', '2026-03-01', true, 'active', 'Google advertising conversion'],
        ['lang', 'privacyguard.com', 'functional', 'Stores user language preference', 'First Party', '1 year', 'first_party', 'Language selection', false, 'none', false, null, 'Global', 'legitimate_interests', '2026-03-01', true, 'active', 'UX preference cookie'],
        ['_li_fat_id', 'privacyguard.com', 'targeting', 'LinkedIn Insight Tag for B2B ad targeting', 'LinkedIn Corp', '30 days', 'third_party', 'Professional profile matching, Ad engagement', true, 'banner', true, null, 'Global', 'consent', '2026-02-28', true, 'active', 'LinkedIn B2B advertising'],
        ['mp_mixpanel', 'privacyguard.com', 'performance', 'Mixpanel product analytics and event tracking', 'Mixpanel Inc', '1 year', 'third_party', 'Product usage events, Feature engagement', true, 'banner', true, null, 'Global', 'consent', '2026-03-01', true, 'active', 'Product analytics platform'],
        ['_dd_s', 'privacyguard.com', 'performance', 'DataDog real user monitoring for application performance', 'DataDog Inc', 'Session', 'third_party', 'Page load times, Errors, User sessions', true, 'banner', true, null, 'Global', 'consent', '2026-02-25', true, 'active', 'Application performance monitoring'],
      ];

      for (const c of cookies) {
        await pool.query(
          `INSERT INTO cookie_compliance (cookie_name, domain, category, purpose, provider, duration, type, data_collected, consent_required, consent_mechanism, opt_out_available, privacy_policy_link, country_scope, legal_basis, last_scan_date, compliant, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          c
        );
      }
      console.log('Cookie compliance seeded (15 records)');
    }

    // Seed cross-border transfers
    const cbtCount = await pool.query('SELECT COUNT(*) FROM cross_border_transfers');
    if (parseInt(cbtCount.rows[0].count) === 0) {
      const transfers = [
        ['AWS Cloud Hosting', 'Germany', 'United States', 'Customer data, Employee data, Business records', 'Customers, Employees', 'scc', 'GDPR Art. 46(2)(c)', 'Amazon Web Services Inc', 'processor', false, 'SCCs with supplementary technical measures including encryption', true, '2025-12-01', 'Encryption in transit and at rest, Pseudonymization where possible', '500K+ records', 'continuous', true, true, 'IT', 'medium', 'active', '2026-06-01'],
        ['Salesforce CRM', 'Germany', 'United States', 'Customer names, Emails, Purchase history, Support tickets', 'Customers', 'scc', 'GDPR Art. 46(2)(c)', 'Salesforce Inc', 'processor', false, 'EU-US DPF certified, SCCs as backup mechanism', true, '2026-01-15', 'Data residency options, Field-level encryption', '200K records', 'continuous', true, true, 'Sales', 'medium', 'active', '2026-07-15'],
        ['Stripe Payments', 'Germany', 'United States', 'Cardholder names, Payment amounts, Transaction IDs', 'Customers', 'scc', 'GDPR Art. 46(2)(c)', 'Stripe Inc', 'processor', false, 'PCI DSS compliant, SCCs in place', true, '2025-10-01', 'Tokenization, End-to-end encryption', '100K+ transactions/month', 'continuous', true, true, 'Finance', 'medium', 'active', '2026-04-01'],
        ['Google Analytics', 'Germany', 'United States', 'IP addresses, Website behavior, Device information', 'Website Visitors', 'consent', 'Consent per GDPR Art. 49(1)(a)', 'Google LLC', 'processor', false, 'IP anonymization enabled, Data retention limited', true, '2026-02-01', 'IP anonymization, Data minimization', '1M+ pageviews/month', 'continuous', true, false, 'Marketing', 'high', 'under_review', '2026-04-01'],
        ['UK Office Operations', 'Germany', 'United Kingdom', 'Employee data, Customer data for UK operations', 'Employees, Customers', 'adequacy_decision', 'EU Adequacy Decision for UK', 'PrivacyGuard UK Ltd', 'controller', true, 'UK GDPR provides adequate protection per EU adequacy decision', false, null, null, '50K records', 'continuous', true, true, 'Operations', 'low', 'active', '2026-12-01'],
        ['India Development Center', 'Germany', 'India', 'Source code, Test data, Internal communications', 'Employees, Contractors', 'scc', 'GDPR Art. 46(2)(c)', 'PrivacyGuard India Pvt Ltd', 'processor', false, 'SCCs executed, VPN access only, No production data', true, '2025-11-01', 'VPN-only access, No local data storage, DLP controls', '100 employees data', 'continuous', true, true, 'IT', 'high', 'active', '2026-05-01'],
        ['Singapore Backup DC', 'Germany', 'Singapore', 'Full database backups, Disaster recovery data', 'All data subjects', 'scc', 'GDPR Art. 46(2)(c)', 'DataCenter SG Pte Ltd', 'processor', false, 'SCCs with supplementary measures, Encrypted backups only', true, '2026-01-01', 'AES-256 encryption, No local decryption capability', '500K+ records (encrypted)', 'daily', true, true, 'IT', 'medium', 'active', '2026-07-01'],
        ['Swiss Insurance Partner', 'Germany', 'Switzerland', 'Employee health data, Insurance claims', 'Employees', 'adequacy_decision', 'EU Adequacy Decision for Switzerland', 'InsurePartner AG', 'controller', true, 'Swiss FADP provides adequate protection', false, null, null, '5K records', 'monthly', true, true, 'HR', 'low', 'active', '2027-01-01'],
        ['Japan Customer Support', 'Germany', 'Japan', 'Customer support tickets, Contact details', 'Customers', 'adequacy_decision', 'EU Adequacy Decision for Japan', 'SupportTech Japan KK', 'processor', true, 'APPI provides adequate protection per EU adequacy decision', true, '2026-02-15', 'Encrypted communications, Limited access scope', '10K tickets/year', 'continuous', true, true, 'Support', 'low', 'active', '2026-08-15'],
        ['Canada HR Platform', 'Germany', 'Canada', 'Employee names, Roles, Training records', 'Employees', 'adequacy_decision', 'EU Adequacy Decision for Canada (PIPEDA)', 'WorkForce Canada Inc', 'processor', true, 'PIPEDA coverage confirmed for commercial activities', false, null, null, '2K records', 'weekly', true, true, 'HR', 'low', 'active', '2026-09-01'],
        ['Brazil Marketing Agency', 'Germany', 'Brazil', 'Customer emails, Marketing campaign data', 'Customers', 'scc', 'GDPR Art. 46(2)(c)', 'MarketBR Ltda', 'processor', false, 'SCCs executed, LGPD alignment verified', true, '2025-09-01', 'Data minimization, Purpose limitation enforced', '50K email addresses', 'weekly', true, true, 'Marketing', 'medium', 'active', '2026-03-01'],
        ['US Legal Counsel', 'Germany', 'United States', 'Legal case files, Witness statements', 'Employees, Customers', 'derogation', 'GDPR Art. 49(1)(e) - Legal claims', 'Baker & Associates LLP', 'controller', false, 'Transfer necessary for legal proceedings and claims', false, null, 'Attorney-client privilege protections', 'Case-by-case', 'ad_hoc', true, true, 'Legal', 'high', 'active', '2026-06-01'],
        ['China Manufacturing QC', 'Germany', 'China', 'Product quality data, Supplier contact details', 'Suppliers, Employees', 'scc', 'GDPR Art. 46(2)(c)', 'QualityCheck China Ltd', 'processor', false, 'SCCs with enhanced monitoring, TIA identified higher risks', true, '2025-08-01', 'Data minimization, VPN access, No bulk transfers', '500 contacts', 'monthly', true, true, 'Supply Chain', 'high', 'under_review', '2026-02-01'],
        ['Australia Sales Office', 'Germany', 'Australia', 'Customer leads, Sales pipeline data', 'Prospective Customers', 'scc', 'GDPR Art. 46(2)(c)', 'PrivacyGuard Australia Pty Ltd', 'controller', false, 'SCCs executed, Australian Privacy Act alignment', true, '2026-01-20', 'Encrypted CRM access, Regional data segmentation', '15K records', 'continuous', true, true, 'Sales', 'medium', 'active', '2026-07-20'],
        ['South Korea Analytics', 'Germany', 'South Korea', 'Anonymized usage analytics, Market research data', 'Website Visitors', 'adequacy_decision', 'EU Adequacy Decision for South Korea', 'AnalyticsSK Corp', 'processor', true, 'PIPA provides adequate protection per EU decision', false, null, null, 'Anonymized datasets', 'monthly', true, true, 'Data Science', 'low', 'active', '2026-10-01'],
      ];

      for (const t of transfers) {
        await pool.query(
          `INSERT INTO cross_border_transfers (transfer_name, source_country, destination_country, data_categories, data_subjects, transfer_mechanism, legal_basis, recipient_name, recipient_type, adequacy_decision, safeguards_description, tia_completed, tia_date, supplementary_measures, volume_estimate, frequency, encryption_in_transit, encryption_at_rest, department, risk_level, status, review_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
          t
        );
      }
      console.log('Cross-border transfers seeded (15 records)');
    }

    // Seed training records
    const trCount = await pool.query('SELECT COUNT(*) FROM training_records');
    if (parseInt(trCount.rows[0].count) === 0) {
      const trainings = [
        ['GDPR Fundamentals', 'onboarding', 'Comprehensive introduction to GDPR principles, rights, and obligations', 'PrivacyGuard Academy', 'online', 4.0, 'Emma Watson', 'e.watson@company.com', 'Marketing', 'Marketing Analyst', '2026-01-10', '2026-01-12', '2027-01-12', 92.0, 80.0, true, true, 'GDPR principles, Data subject rights, Lawful basis, Accountability', 'completed', null],
        ['Data Breach Response', 'incident_response', 'How to identify, report, and respond to data breaches within 72 hours', 'External: DataProtect Training', 'classroom', 8.0, 'James Miller', 'j.miller@company.com', 'IT Security', 'Security Engineer', '2026-02-01', '2026-02-05', '2027-02-05', 88.0, 80.0, true, true, 'Breach identification, 72-hour notification, Containment procedures, Documentation', 'completed', null],
        ['DPIA Workshop', 'dpia_training', 'Hands-on workshop for conducting Data Protection Impact Assessments', 'PrivacyGuard Academy', 'classroom', 6.0, 'Linda Park', 'l.park@company.com', 'Legal', 'Privacy Analyst', '2026-01-15', '2026-01-20', '2027-01-20', 95.0, 80.0, true, true, 'DPIA methodology, Risk assessment, Mitigation strategies, Documentation', 'completed', null],
        ['Annual Privacy Refresh', 'annual_refresh', 'Yearly refresher on privacy policies, procedures, and recent regulatory changes', 'PrivacyGuard Academy', 'online', 2.0, 'Robert Chen', 'r.chen@company.com', 'Sales', 'Account Manager', '2026-03-01', '2026-03-05', '2027-03-05', 85.0, 80.0, true, true, 'Policy updates, New regulations, Case studies, Best practices', 'completed', null],
        ['DPO Certification Course', 'role_specific', 'Professional DPO certification covering all aspects of data protection officer role', 'IAPP', 'online', 40.0, 'Sarah Mitchell', 's.mitchell@company.com', 'Legal & Compliance', 'DPO', '2025-11-01', '2026-01-30', '2028-01-30', 94.0, 75.0, true, true, 'DPO responsibilities, GDPR compliance, Risk management, Audit techniques', 'completed', 'CIPT/M certified'],
        ['Privacy by Design', 'role_specific', 'Implementing privacy by design and default principles in software development', 'PrivacyGuard Academy', 'webinar', 3.0, 'Tom Brown', 't.brown@company.com', 'Engineering', 'Software Developer', '2026-02-10', '2026-02-12', '2027-02-12', 90.0, 80.0, true, true, 'PbD principles, Data minimization, Pseudonymization, Security controls', 'completed', null],
        ['Vendor Risk Management', 'role_specific', 'Assessing and managing privacy risks in third-party vendor relationships', 'External: RiskPro Training', 'webinar', 4.0, 'Anna Schmidt', 'a.schmidt@company.com', 'Procurement', 'Vendor Manager', '2026-01-25', '2026-01-28', '2027-01-28', 87.0, 80.0, true, true, 'Vendor assessment, DPA requirements, Ongoing monitoring, Sub-processor management', 'completed', null],
        ['GDPR Fundamentals', 'onboarding', 'Comprehensive introduction to GDPR principles, rights, and obligations', 'PrivacyGuard Academy', 'online', 4.0, 'Michael Torres', 'm.torres@company.com', 'Finance', 'Financial Analyst', '2026-03-10', null, '2027-03-10', null, 80.0, false, false, 'GDPR principles, Data subject rights, Lawful basis, Accountability', 'in_progress', 'Started module 3 of 5'],
        ['Cross-Border Data Transfers', 'role_specific', 'Understanding international data transfer mechanisms and compliance requirements', 'IAPP', 'online', 6.0, 'Sophie Laurent', 's.laurent@company.com', 'Legal', 'International Counsel', '2026-02-20', '2026-03-01', '2027-03-01', 91.0, 80.0, true, true, 'SCCs, Adequacy decisions, BCRs, TIA methodology', 'completed', null],
        ['Data Subject Rights Handling', 'role_specific', 'Processing and responding to data subject access requests and other rights', 'PrivacyGuard Academy', 'classroom', 3.0, 'Maria Lopez', 'm.lopez@company.com', 'Customer Service', 'Support Lead', '2026-01-05', '2026-01-08', '2027-01-08', 93.0, 80.0, true, true, 'SAR processing, Identity verification, Response timelines, Exemptions', 'completed', null],
        ['Annual Privacy Refresh', 'annual_refresh', 'Yearly refresher on privacy policies, procedures, and recent regulatory changes', 'PrivacyGuard Academy', 'online', 2.0, 'David Kim', 'd.kim@company.com', 'Product', 'Product Manager', '2026-03-15', null, null, null, 80.0, false, false, 'Policy updates, New regulations, Case studies, Best practices', 'assigned', 'Not yet started'],
        ['Secure Data Handling', 'onboarding', 'Proper handling, storage, and disposal of personal and sensitive data', 'PrivacyGuard Academy', 'online', 2.0, 'Rachel Green', 'r.green@company.com', 'Operations', 'Operations Coordinator', '2026-02-15', '2026-02-16', '2027-02-16', 88.0, 80.0, true, true, 'Classification, Handling procedures, Disposal methods, Clean desk policy', 'completed', null],
        ['Cookie Compliance Training', 'role_specific', 'Implementing and managing cookie consent mechanisms for websites', 'External: WebPrivacy Ltd', 'webinar', 2.0, 'Chris Evans', 'c.evans@company.com', 'Engineering', 'Frontend Developer', '2026-03-05', '2026-03-06', '2027-03-06', 85.0, 80.0, true, true, 'Cookie types, Consent mechanisms, Banner implementation, Compliance testing', 'completed', null],
        ['Records of Processing Activities', 'role_specific', 'Creating and maintaining Article 30 records of processing activities', 'PrivacyGuard Academy', 'classroom', 4.0, 'Julia Weber', 'j.weber@company.com', 'Legal', 'Compliance Officer', '2026-02-25', '2026-02-28', '2027-02-28', 96.0, 80.0, true, true, 'ROPA requirements, Documentation standards, Review processes, Tool usage', 'completed', null],
        ['GDPR Fundamentals', 'onboarding', 'Comprehensive introduction to GDPR principles, rights, and obligations', 'PrivacyGuard Academy', 'online', 4.0, 'Alex Petrov', 'a.petrov@company.com', 'Sales', 'Sales Representative', '2026-03-20', null, null, null, 80.0, false, false, 'GDPR principles, Data subject rights, Lawful basis, Accountability', 'overdue', 'Reminder sent on 2026-04-01'],
      ];

      for (const t of trainings) {
        await pool.query(
          `INSERT INTO training_records (training_name, training_type, description, provider, delivery_method, duration_hours, employee_name, employee_email, employee_department, employee_role, assigned_date, completion_date, expiry_date, score, passing_score, passed, certificate_issued, topics_covered, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          t
        );
      }
      console.log('Training records seeded (15 records)');
    }

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
