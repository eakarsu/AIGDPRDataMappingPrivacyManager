BEGIN;
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  department VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  input_snapshot JSONB,
  result JSONB,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
COMMIT;
