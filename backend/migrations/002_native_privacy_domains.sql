-- Additive native domain/storage tables only. No reset, account changes or provider receipt seed.
CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        changes JSONB,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_analysis_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        tool_name TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        input_snapshot JSONB,
        result JSONB,
        model TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cookie_scans (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL,
        scanned_at TIMESTAMP DEFAULT NOW(),
        discovered_cookies JSONB,
        declared_cookies JSONB,
        diff JSONB,
        ai_classification JSONB,
        score INTEGER,
        user_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS dsr_dossiers (
        id SERIAL PRIMARY KEY,
        request_id INTEGER,
        requester_name TEXT,
        request_type TEXT,
        dossier JSONB,
        status TEXT DEFAULT 'draft',
        generated_at TIMESTAMP DEFAULT NOW(),
        user_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS breach_countdowns (
        id SERIAL PRIMARY KEY,
        breach_id INTEGER,
        deadline TIMESTAMP NOT NULL,
        last_alert_at TIMESTAMP,
        last_alert_hours_remaining INTEGER,
        ai_draft_notification JSONB,
        notified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS compliance_deadlines (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER,
        deadline_type TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date DATE NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        ai_recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS policy_corpus (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT[],
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS regulatory_changes (
  id SERIAL PRIMARY KEY, jurisdiction TEXT NOT NULL, source TEXT NOT NULL,
  title TEXT NOT NULL, summary TEXT, effective_date DATE,
  impact TEXT NOT NULL DEFAULT 'medium', tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS regulatory_subscriptions (
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
  jurisdictions TEXT[] DEFAULT ARRAY[]::TEXT[], tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  min_impact TEXT NOT NULL DEFAULT 'low', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);
CREATE TABLE IF NOT EXISTS llm_usage_registry (
  id SERIAL PRIMARY KEY, vendor TEXT NOT NULL, product TEXT NOT NULL, business_owner TEXT,
  tier TEXT NOT NULL DEFAULT 'consumer', data_residency TEXT,
  processes_personal_data BOOLEAN DEFAULT FALSE, processes_special_categories BOOLEAN DEFAULT FALSE,
  dpa_status TEXT NOT NULL DEFAULT 'none', training_opt_out BOOLEAN DEFAULT FALSE,
  retention_days INTEGER, use_case TEXT, risk_score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE policy_corpus ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE policy_corpus ADD COLUMN IF NOT EXISTS demo_label TEXT;
ALTER TABLE policy_corpus ADD COLUMN IF NOT EXISTS demo_owner_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE policy_corpus ADD COLUMN IF NOT EXISTS demo_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS policy_corpus_demo_owner_key ON policy_corpus(demo_owner_id,demo_key) WHERE is_demo;

ALTER TABLE llm_usage_registry ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE llm_usage_registry ADD COLUMN IF NOT EXISTS demo_label TEXT;
ALTER TABLE llm_usage_registry ADD COLUMN IF NOT EXISTS demo_owner_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE llm_usage_registry ADD COLUMN IF NOT EXISTS demo_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS llm_usage_registry_demo_owner_key ON llm_usage_registry(demo_owner_id,demo_key) WHERE is_demo;

ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS demo_label TEXT;
ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS demo_owner_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE regulatory_changes ADD COLUMN IF NOT EXISTS demo_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS regulatory_changes_demo_owner_key ON regulatory_changes(demo_owner_id,demo_key) WHERE is_demo;
