# Apply Pass 5 — AIGDPRDataMappingPrivacyManager
Date: 2026-05-08
Stack: Node-Express + React (CRA), Postgres `pg`.

## Verified present
- All 16 original AI endpoints present.
- Pass-2 additions: `/audit-third-party-code`, `/recommendation-engine-bias-check`.
- Pass-4 additions: `/dsr-fulfillment-plan`, `/dpa-template-generate`, `/pii-rbac-recommend`.
- All 12 non-AI route files present.

## Implemented this pass (2 mechanical, 10 endpoints; additive only)
1. **Regulatory change tracker (custom feature)** — closes "Regulatory change tracker (EU/global feed)".
   - `backend/routes/regulatoryTracker.js` (~120 lines): seeded with 6 reference entries (EDPB, EU AI Act, ePrivacy, UK ICO, CCPA/CPRA, ANPD/LGPD), per-user subscriptions filtered by jurisdiction/tags/min-impact, `/feed` returns the personalized list. Idempotent seed (only on empty table).
   - Endpoints: `GET/POST /api/regulatory-tracker`, `GET/PUT /api/regulatory-tracker/subscriptions/me`, `GET /api/regulatory-tracker/feed`.
2. **LLM usage registry (custom feature)** — closes "LLM/foundation-model usage auditor".
   - `backend/routes/llmUsageRegistry.js` (~120 lines): track each consumer/team/enterprise/self-hosted LLM with DPA status, training opt-out, residency, PII flags. Deterministic risk score 0–100.
   - Endpoints: `GET/POST/PUT/DELETE /api/llm-usage-registry`, `GET /api/llm-usage-registry/summary`.
3. **Frontend** — `frontend/src/components/RegulatoryAndLLM.js` + sidebar entry "Regulatory & LLM Registry" navigating to `regulatory-and-llm`. Uses fetch + JWT bearer matching pattern.
4. Routes wired in `backend/server.js` immediately above `/api/ai`.

## Deferred
- **Cloud storage scanner (S3, GCS) for unencrypted PII** — NEEDS-CREDS (AWS_ACCESS_KEY_ID/SECRET, GCP service account).
- **Continuous library / SDK monitoring (Snyk-like)** — NEEDS-CREDS (Snyk API or GitHub advisory feed).
- **Vendor ecosystem mapping (2nd/3rd parties)** — NEEDS-PRODUCT-DECISION (graph schema, discovery model).
- **Consent banner A/B testing UI / experiment framework** — NEEDS-PRODUCT-DECISION + significant integration.
- **Workforce privacy training platform with adaptive paths** — NEEDS-PRODUCT-DECISION (LMS, content corpus).

## Smoke test
- `node -c` on `regulatoryTracker.js`, `llmUsageRegistry.js`, `server.js` — PASS.
- Did not boot full stack (Postgres). DDL idempotent; seed only when table empty.
