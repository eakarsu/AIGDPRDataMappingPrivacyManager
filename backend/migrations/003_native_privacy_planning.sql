-- Owned planning drafts only. No approvals, evidence, provider receipts or
-- governed-case/outbox rows are created or altered by this migration.
CREATE TABLE IF NOT EXISTS privacy_processing_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL,
  lawful_basis TEXT CHECK (lawful_basis IS NULL OR lawful_basis IN
    ('consent','contract','legal_obligation','vital_interests','public_task','legitimate_interests')),
  retention_period_days INTEGER CHECK (retention_period_days IS NULL OR retention_period_days > 0),
  retention_label TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  demo_label TEXT,
  demo_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS privacy_processing_rules_demo_owner_key
  ON privacy_processing_rules(user_id, demo_key) WHERE is_demo;

CREATE TABLE IF NOT EXISTS privacy_decision_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  task TEXT NOT NULL,
  owner TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Critical','High','Medium','Low')),
  status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued','In progress','Review','Done')),
  due DATE,
  source TEXT,
  impact INTEGER CHECK (impact IS NULL OR impact BETWEEN 0 AND 100000),
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  demo_label TEXT,
  demo_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS privacy_decision_drafts_demo_owner_key
  ON privacy_decision_drafts(user_id, demo_key) WHERE is_demo;
