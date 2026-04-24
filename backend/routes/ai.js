const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callOpenRouter(messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'GDPR Privacy Manager'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseAIResponse(content) {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return JSON.parse(content);
  } catch {
    return { raw_response: content };
  }
}

// ============================================================
// GENERAL AI TOOLS
// ============================================================

// 1. AI Privacy Risk Assessment
router.post('/risk-assessment', async (req, res) => {
  try {
    const { activity_name, processing_description, data_categories, data_subjects, legal_basis } = req.body;
    if (!processing_description) {
      return res.status(400).json({ error: 'Processing description is required' });
    }
    const messages = [
      { role: 'system', content: `You are a GDPR privacy risk assessment expert. Analyze the given data processing activity and provide a comprehensive risk assessment. Return your response as valid JSON with this structure:
{
  "risk_score": <number 1-100>,
  "overall_risk_level": "<low|medium|high|critical>",
  "summary": "<brief summary>",
  "identified_risks": [
    {"risk": "<risk name>", "likelihood": "<low|medium|high>", "impact": "<low|medium|high>", "description": "<details>", "gdpr_article": "<relevant article>"}
  ],
  "recommendations": [
    {"priority": "<high|medium|low>", "action": "<recommendation>", "timeline": "<suggested timeline>"}
  ],
  "compliance_gaps": [
    {"gap": "<gap description>", "severity": "<critical|major|minor>", "remediation": "<how to fix>"}
  ],
  "data_protection_measures": {
    "technical": ["<measure1>", "<measure2>"],
    "organizational": ["<measure1>", "<measure2>"]
  }
}` },
      { role: 'user', content: `Assess the privacy risks for this processing activity:\nActivity: ${activity_name || 'Not specified'}\nProcessing Description: ${processing_description}\nData Categories: ${data_categories || 'Not specified'}\nData Subjects: ${data_subjects || 'Not specified'}\nLegal Basis: ${legal_basis || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    console.error('Risk assessment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. AI DPIA Generator
router.post('/dpia-generate', async (req, res) => {
  try {
    const { project_name, processing_description, data_categories, purpose, data_subjects } = req.body;
    if (!project_name || !processing_description) {
      return res.status(400).json({ error: 'Project name and processing description are required' });
    }
    const messages = [
      { role: 'system', content: `You are a GDPR Data Protection Impact Assessment expert. Generate a comprehensive DPIA report. Return valid JSON:
{
  "dpia_report": {
    "title": "<DPIA title>",
    "date": "<current date>",
    "version": "1.0",
    "sections": {
      "project_overview": {"description": "<overview>", "scope": "<scope>", "objectives": ["<obj1>"]},
      "processing_description": {"nature": "<nature>", "scope": "<scope>", "context": "<context>", "purposes": ["<purpose1>"]},
      "necessity_assessment": {"necessity": "<why necessary>", "proportionality": "<proportionality analysis>", "legal_basis": "<legal basis>"},
      "risk_assessment": { "risks": [{"risk": "<risk>", "likelihood": "<low|medium|high>", "severity": "<low|medium|high>", "risk_level": "<low|medium|high|critical>"}] },
      "mitigation_measures": [{"risk": "<risk addressed>", "measure": "<mitigation>", "effectiveness": "<expected effectiveness>", "responsible": "<who>", "deadline": "<when>"}],
      "residual_risks": [{"risk": "<remaining risk>", "level": "<low|medium>", "acceptance_rationale": "<why acceptable>"}],
      "dpo_opinion": "<DPO opinion text>",
      "conclusion": {"overall_assessment": "<assessment>", "recommendation": "<approve|approve_with_conditions|reject>", "conditions": ["<condition1>"]}
    }
  }
}` },
      { role: 'user', content: `Generate a DPIA for:\nProject: ${project_name}\nProcessing: ${processing_description}\nData Categories: ${data_categories || 'Not specified'}\nPurpose: ${purpose || 'Not specified'}\nData Subjects: ${data_subjects || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    console.error('DPIA generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. AI Compliance Gap Analysis
router.post('/compliance-gap', async (req, res) => {
  try {
    const { regulation, current_practices, organization_type, data_processing_activities } = req.body;
    if (!current_practices) {
      return res.status(400).json({ error: 'Current practices description is required' });
    }
    const messages = [
      { role: 'system', content: `You are a data protection compliance expert. Analyze compliance gaps against the specified regulation. Return valid JSON:
{
  "compliance_score": <number 0-100>,
  "overall_status": "<compliant|partially_compliant|non_compliant>",
  "regulation": "<regulation name>",
  "summary": "<executive summary>",
  "categories": [
    { "category": "<category name>", "score": <number 0-100>, "status": "<compliant|partially_compliant|non_compliant>",
      "gaps": [ {"requirement": "<requirement>", "current_state": "<what exists>", "gap": "<what's missing>", "severity": "<critical|major|minor>", "article_reference": "<article>", "remediation": "<how to fix>", "effort": "<low|medium|high>"} ]
    }
  ],
  "priority_actions": [ {"action": "<action>", "priority": "<immediate|short_term|medium_term>", "estimated_effort": "<effort>", "impact": "<impact>"} ],
  "timeline": {"immediate": ["<action1>"], "thirty_days": ["<action1>"], "ninety_days": ["<action1>"], "six_months": ["<action1>"]}
}` },
      { role: 'user', content: `Analyze compliance gaps:\nRegulation: ${regulation || 'GDPR'}\nOrganization Type: ${organization_type || 'Not specified'}\nCurrent Practices: ${current_practices}\nProcessing Activities: ${data_processing_activities || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. AI Data Classification
router.post('/classify-data', async (req, res) => {
  try {
    const { data_fields, context, sample_values } = req.body;
    if (!data_fields) {
      return res.status(400).json({ error: 'Data fields are required' });
    }
    const messages = [
      { role: 'system', content: `You are a data classification expert specializing in GDPR. Classify the given data fields. Return valid JSON:
{
  "classification_results": [
    { "field_name": "<field>", "sensitivity_level": "<public|internal|confidential|restricted>", "data_type": "<personal_data|special_category|non_personal>",
      "pii_flag": <boolean>, "phi_flag": <boolean>, "pci_flag": <boolean>, "gdpr_category": "<category under GDPR>", "special_category": <boolean>, "article_9_data": <boolean>,
      "handling_requirements": ["<req1>"], "recommended_controls": ["<control1>"], "retention_recommendation": "<recommended retention>", "encryption_required": <boolean>, "pseudonymization_recommended": <boolean>
    }
  ],
  "overall_summary": { "total_fields": <number>, "personal_data_count": <number>, "special_category_count": <number>, "high_risk_fields": ["<field1>"], "recommendations": ["<rec1>"] }
}` },
      { role: 'user', content: `Classify these data fields:\nFields: ${data_fields}\nContext: ${context || 'Not specified'}\nSample Values: ${sample_values || 'Not provided'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. AI Breach Response Generator
router.post('/breach-response', async (req, res) => {
  try {
    const { breach_type, description, data_affected, number_of_individuals, severity } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Breach description is required' });
    }
    const messages = [
      { role: 'system', content: `You are a GDPR data breach response expert. Generate a comprehensive breach response plan. Return valid JSON:
{
  "breach_assessment": { "severity_level": "<low|medium|high|critical>", "notification_required": <boolean>, "supervisory_authority_notification": <boolean>, "data_subject_notification": <boolean>, "risk_to_rights": "<unlikely|possible|likely|high>", "time_limit_hours": 72 },
  "immediate_actions": [ {"step": <number>, "action": "<action>", "responsible": "<role>", "deadline": "<timeline>", "details": "<details>"} ],
  "containment_plan": { "technical_measures": ["<measure1>"], "organizational_measures": ["<measure1>"], "evidence_preservation": ["<step1>"] },
  "notification_templates": {
    "supervisory_authority": { "subject": "<subject line>", "body_sections": {"nature_of_breach": "<description>", "categories_of_data": "<categories>", "approximate_records": "<number>", "consequences": "<likely consequences>", "measures_taken": "<measures>", "contact_dpo": "<DPO contact info>"} },
    "data_subjects": { "subject": "<subject line>", "body": "<notification letter text>" }
  },
  "remediation_plan": [ {"action": "<action>", "timeline": "<when>", "priority": "<high|medium|low>"} ],
  "lessons_learned_template": { "questions": ["<question1>"], "improvement_areas": ["<area1>"] }
}` },
      { role: 'user', content: `Generate a breach response plan:\nBreach Type: ${breach_type || 'Not specified'}\nDescription: ${description}\nData Affected: ${data_affected || 'Not specified'}\nIndividuals Affected: ${number_of_individuals || 'Unknown'}\nSeverity: ${severity || 'Not assessed'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. AI Policy Generator
router.post('/generate-policy', async (req, res) => {
  try {
    const { policy_type, organization_name, organization_type, jurisdiction, specific_requirements } = req.body;
    if (!policy_type) {
      return res.status(400).json({ error: 'Policy type is required' });
    }
    const messages = [
      { role: 'system', content: `You are a privacy policy drafting expert. Generate a professional, GDPR-compliant policy document. Return valid JSON:
{
  "policy": {
    "title": "<policy title>", "version": "1.0", "effective_date": "<date>", "last_updated": "<date>",
    "sections": [ { "number": "<section number>", "title": "<section title>", "content": "<section content - use full professional language>", "subsections": [ {"title": "<subsection title>", "content": "<content>"} ] } ],
    "definitions": [ {"term": "<term>", "definition": "<definition>"} ],
    "contact_information": { "controller": "<placeholder>", "dpo": "<placeholder>", "supervisory_authority": "<placeholder>" }
  },
  "implementation_notes": ["<note1>"],
  "review_schedule": "<recommended review frequency>"
}` },
      { role: 'user', content: `Generate a ${policy_type} policy:\nOrganization: ${organization_name || '[Organization Name]'}\nOrganization Type: ${organization_type || 'Not specified'}\nJurisdiction: ${jurisdiction || 'EU/EEA'}\nSpecific Requirements: ${specific_requirements || 'Standard GDPR compliance'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE-SPECIFIC AI TOOLS
// ============================================================

// 7. AI Processing Activity Analyzer
router.post('/analyze-activity', async (req, res) => {
  try {
    const { activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, retention_period } = req.body;
    if (!activity_name) return res.status(400).json({ error: 'Activity name is required' });
    const messages = [
      { role: 'system', content: `You are a GDPR Article 30 ROPA expert. Analyze this processing activity for completeness, compliance, and risks. Return valid JSON:
{
  "compliance_score": <number 0-100>,
  "article_30_completeness": "<complete|partially_complete|incomplete>",
  "lawfulness_assessment": { "legal_basis_valid": <boolean>, "analysis": "<analysis of legal basis>", "recommendations": ["<rec1>"] },
  "proportionality_check": { "is_proportionate": <boolean>, "analysis": "<proportionality analysis>", "data_minimization_issues": ["<issue1>"] },
  "missing_elements": [ {"element": "<missing element>", "requirement": "<GDPR article>", "action_needed": "<what to do>"} ],
  "risks": [ {"risk": "<risk>", "level": "<low|medium|high>", "mitigation": "<how to mitigate>"} ],
  "improvement_suggestions": [ {"area": "<area>", "current_state": "<current>", "suggested": "<improvement>", "priority": "<high|medium|low>"} ],
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Analyze this processing activity for GDPR compliance:\nActivity: ${activity_name}\nPurpose: ${purpose || 'Not specified'}\nLegal Basis: ${legal_basis || 'Not specified'}\nData Categories: ${data_categories || 'Not specified'}\nData Subjects: ${data_subjects || 'Not specified'}\nRecipients: ${recipients || 'Not specified'}\nRetention Period: ${retention_period || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. AI DSR Response Drafter
router.post('/draft-dsr-response', async (req, res) => {
  try {
    const { request_type, requester_name, description, data_categories_affected, status } = req.body;
    if (!request_type || !requester_name) return res.status(400).json({ error: 'Request type and requester name are required' });
    const messages = [
      { role: 'system', content: `You are a GDPR data subject rights expert. Draft a professional response to this data subject request. Return valid JSON:
{
  "response_letter": {
    "subject": "<email subject>",
    "greeting": "<greeting>",
    "body_paragraphs": ["<paragraph1>", "<paragraph2>", "<paragraph3>"],
    "closing": "<closing>",
    "signature_block": "<signature>"
  },
  "internal_checklist": [ {"step": "<step>", "completed": false, "notes": "<notes>"} ],
  "legal_assessment": {
    "right_applicable": <boolean>,
    "exemptions": ["<exemption if any>"],
    "deadline": "<response deadline>",
    "identity_verification_needed": <boolean>,
    "third_party_notifications": ["<who to notify>"]
  },
  "data_inventory": {
    "systems_to_check": ["<system1>"],
    "data_categories_involved": ["<category1>"],
    "estimated_processing_time": "<time estimate>"
  },
  "compliance_notes": ["<note1>"]
}` },
      { role: 'user', content: `Draft a response for this data subject request:\nRequest Type: ${request_type}\nRequester: ${requester_name}\nDescription: ${description || 'Standard request'}\nData Categories: ${data_categories_affected || 'Not specified'}\nCurrent Status: ${status || 'pending'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AI DPIA Advisor (for existing assessments)
router.post('/dpia-advice', async (req, res) => {
  try {
    const { assessment_name, project_name, processing_description, identified_risks, risk_level, status } = req.body;
    if (!assessment_name) return res.status(400).json({ error: 'Assessment name is required' });
    const messages = [
      { role: 'system', content: `You are a DPIA expert advisor. Review this existing DPIA and provide improvement recommendations. Return valid JSON:
{
  "overall_quality": "<excellent|good|needs_improvement|inadequate>",
  "quality_score": <number 0-100>,
  "completeness_check": [ {"section": "<section>", "present": <boolean>, "quality": "<good|needs_improvement|missing>", "feedback": "<feedback>"} ],
  "risk_review": { "current_assessment_adequate": <boolean>, "missed_risks": [{"risk": "<missed risk>", "severity": "<high|medium|low>", "why_missed": "<explanation>"}], "overestimated_risks": ["<risk>"] },
  "mitigation_gaps": [ {"risk": "<risk>", "current_mitigation": "<current>", "suggested_improvement": "<improvement>"} ],
  "regulatory_alignment": { "gdpr_article_35_compliance": <boolean>, "missing_requirements": ["<req1>"], "supervisory_authority_consultation_needed": <boolean>, "reason": "<why>" },
  "next_steps": [ {"action": "<action>", "priority": "<high|medium|low>", "assignee": "<suggested role>"} ],
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Review this DPIA:\nAssessment: ${assessment_name}\nProject: ${project_name || 'Not specified'}\nProcessing: ${processing_description || 'Not specified'}\nIdentified Risks: ${identified_risks || 'Not specified'}\nRisk Level: ${risk_level || 'Not assessed'}\nStatus: ${status || 'draft'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. AI Consent Optimizer
router.post('/optimize-consent', async (req, res) => {
  try {
    const { consent_type, purpose, consent_text, collection_method, granularity } = req.body;
    if (!consent_type) return res.status(400).json({ error: 'Consent type is required' });
    const messages = [
      { role: 'system', content: `You are a GDPR consent management expert. Analyze consent practices and generate optimized consent text. Return valid JSON:
{
  "consent_analysis": {
    "gdpr_compliant": <boolean>,
    "freely_given": <boolean>,
    "specific": <boolean>,
    "informed": <boolean>,
    "unambiguous": <boolean>,
    "issues_found": [ {"issue": "<issue>", "severity": "<critical|major|minor>", "gdpr_article": "<article>", "fix": "<how to fix>"} ]
  },
  "optimized_consent_text": {
    "short_version": "<concise consent text>",
    "detailed_version": "<full consent text with all required information>",
    "withdrawal_text": "<text explaining how to withdraw consent>"
  },
  "consent_flow_recommendations": [
    {"step": "<step>", "description": "<what should happen>", "best_practice": "<best practice tip>"}
  ],
  "record_keeping_requirements": ["<req1>"],
  "expiry_recommendation": "<when consent should be renewed>",
  "granularity_advice": "<advice on consent granularity>",
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Analyze and optimize this consent:\nConsent Type: ${consent_type}\nPurpose: ${purpose || 'Not specified'}\nCurrent Consent Text: ${consent_text || 'Not provided'}\nCollection Method: ${collection_method || 'Not specified'}\nGranularity: ${granularity || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. AI Breach Incident Analyzer
router.post('/analyze-breach', async (req, res) => {
  try {
    const { incident_title, description, breach_type, severity, data_categories_affected, number_of_individuals, root_cause } = req.body;
    if (!incident_title) return res.status(400).json({ error: 'Incident title is required' });
    const messages = [
      { role: 'system', content: `You are a GDPR breach analysis expert. Analyze this specific breach incident and provide detailed recommendations. Return valid JSON:
{
  "severity_assessment": { "calculated_severity": "<low|medium|high|critical>", "risk_to_rights_and_freedoms": "<unlikely|possible|likely|high>", "factors": ["<factor1>"] },
  "notification_analysis": {
    "authority_notification_required": <boolean>,
    "authority_deadline": "<deadline>",
    "subject_notification_required": <boolean>,
    "subject_deadline": "<deadline>",
    "reasoning": "<why notification is/isn't required>"
  },
  "root_cause_analysis": { "primary_cause": "<cause>", "contributing_factors": ["<factor1>"], "category": "<human_error|technical|malicious|process_failure>" },
  "impact_assessment": { "data_sensitivity": "<low|medium|high|very_high>", "geographic_scope": "<scope>", "affected_populations": ["<population>"], "potential_harm": ["<harm>"] },
  "containment_recommendations": [ {"action": "<action>", "priority": "<immediate|urgent|standard>", "details": "<details>"} ],
  "prevention_measures": [ {"measure": "<measure>", "type": "<technical|organizational|procedural>", "implementation_effort": "<low|medium|high>"} ],
  "documentation_checklist": [ {"item": "<item>", "required_by": "<regulation/article>", "status": "pending"} ],
  "similar_incidents_insights": "<lessons from similar breaches>",
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Analyze this breach incident:\nTitle: ${incident_title}\nDescription: ${description || 'Not specified'}\nBreach Type: ${breach_type || 'Not specified'}\nSeverity: ${severity || 'Not assessed'}\nData Categories: ${data_categories_affected || 'Not specified'}\nIndividuals Affected: ${number_of_individuals || 'Unknown'}\nRoot Cause: ${root_cause || 'Under investigation'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. AI Vendor Risk Scorer
router.post('/assess-vendor', async (req, res) => {
  try {
    const { vendor_name, vendor_type, country, services_provided, data_categories_shared, dpa_signed, scc_in_place, certifications } = req.body;
    if (!vendor_name) return res.status(400).json({ error: 'Vendor name is required' });
    const messages = [
      { role: 'system', content: `You are a third-party vendor risk assessment expert for GDPR. Assess this vendor's privacy risk. Return valid JSON:
{
  "risk_score": <number 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "due_diligence_assessment": {
    "dpa_status": {"adequate": <boolean>, "recommendations": ["<rec>"]},
    "data_transfer_compliance": {"adequate": <boolean>, "mechanism_needed": "<mechanism>", "issues": ["<issue>"]},
    "security_posture": {"assessment": "<strong|adequate|weak|unknown>", "missing_certifications": ["<cert>"], "recommendations": ["<rec>"]},
    "sub_processor_risk": {"level": "<low|medium|high>", "concerns": ["<concern>"]}
  },
  "contract_recommendations": [ {"clause": "<clause type>", "description": "<what to include>", "priority": "<critical|important|recommended>"} ],
  "monitoring_plan": { "audit_frequency": "<recommended frequency>", "key_metrics": ["<metric1>"], "red_flags": ["<red flag1>"] },
  "country_risk": { "adequacy_decision": <boolean>, "transfer_mechanism_needed": "<mechanism>", "additional_safeguards": ["<safeguard>"] },
  "action_items": [ {"action": "<action>", "priority": "<high|medium|low>", "deadline_suggestion": "<timeline>"} ],
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Assess this vendor:\nVendor: ${vendor_name}\nType: ${vendor_type || 'Not specified'}\nCountry: ${country || 'Not specified'}\nServices: ${services_provided || 'Not specified'}\nData Shared: ${data_categories_shared || 'Not specified'}\nDPA Signed: ${dpa_signed || 'Unknown'}\nSCC in Place: ${scc_in_place || 'Unknown'}\nCertifications: ${certifications || 'None specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. AI Retention Advisor
router.post('/retention-advice', async (req, res) => {
  try {
    const { data_category, current_retention_period, legal_basis, department, regulatory_requirement } = req.body;
    if (!data_category) return res.status(400).json({ error: 'Data category is required' });
    const messages = [
      { role: 'system', content: `You are a GDPR data retention expert. Advise on optimal retention periods and disposal methods. Return valid JSON:
{
  "recommended_retention": { "period": "<recommended period>", "period_days": <number>, "justification": "<why this period>" },
  "legal_analysis": { "applicable_laws": [{"law": "<law>", "requirement": "<retention requirement>", "jurisdiction": "<jurisdiction>"}], "conflicts": ["<any conflicts between requirements>"] },
  "current_assessment": { "adequate": <boolean>, "over_retention_risk": <boolean>, "under_retention_risk": <boolean>, "issues": ["<issue>"] },
  "disposal_recommendation": { "method": "<deletion|anonymization|archival|pseudonymization>", "process": ["<step1>", "<step2>"], "verification": "<how to verify disposal>" },
  "automation_opportunities": [ {"process": "<what can be automated>", "benefit": "<benefit>", "tool_suggestion": "<tool>"} ],
  "exceptions": [ {"scenario": "<exception scenario>", "extended_period": "<how long>", "trigger": "<what triggers exception>"} ],
  "review_schedule": { "frequency": "<recommended frequency>", "next_review": "<when>", "review_checklist": ["<item1>"] },
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Advise on data retention:\nData Category: ${data_category}\nCurrent Retention: ${current_retention_period || 'Not defined'}\nLegal Basis: ${legal_basis || 'Not specified'}\nDepartment: ${department || 'Not specified'}\nRegulatory Requirements: ${regulatory_requirement || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. AI Cookie Auditor
router.post('/audit-cookies', async (req, res) => {
  try {
    const { domain, cookies_description, consent_mechanism, country_scope } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });
    const messages = [
      { role: 'system', content: `You are a cookie compliance and ePrivacy expert. Audit this website's cookie compliance. Return valid JSON:
{
  "compliance_score": <number 0-100>,
  "overall_status": "<compliant|partially_compliant|non_compliant>",
  "cookie_audit": [
    { "category": "<strictly_necessary|performance|functional|targeting>", "compliance_status": "<compliant|needs_attention|non_compliant>",
      "issues": [ {"issue": "<issue>", "severity": "<critical|major|minor>", "regulation": "<ePrivacy/GDPR article>", "fix": "<how to fix>"} ]
    }
  ],
  "consent_mechanism_review": {
    "banner_compliant": <boolean>,
    "pre_ticked_boxes": <boolean>,
    "easy_rejection": <boolean>,
    "granular_choices": <boolean>,
    "issues": ["<issue>"],
    "improvements": ["<improvement>"]
  },
  "regulatory_requirements": [
    {"regulation": "<regulation>", "requirement": "<requirement>", "status": "<met|partially_met|not_met>", "action": "<action needed>"}
  ],
  "best_practices": ["<practice1>"],
  "action_plan": [ {"action": "<action>", "priority": "<high|medium|low>", "effort": "<low|medium|high>"} ],
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Audit cookie compliance for:\nDomain: ${domain}\nCookies: ${cookies_description || 'Not specified'}\nConsent Mechanism: ${consent_mechanism || 'Not specified'}\nCountry Scope: ${country_scope || 'EU'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. AI Transfer Risk Evaluator
router.post('/evaluate-transfer', async (req, res) => {
  try {
    const { source_country, destination_country, data_categories, transfer_mechanism, recipient_name, recipient_type } = req.body;
    if (!destination_country) return res.status(400).json({ error: 'Destination country is required' });
    const messages = [
      { role: 'system', content: `You are a GDPR cross-border data transfer expert. Evaluate this international data transfer. Return valid JSON:
{
  "transfer_risk_score": <number 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "adequacy_assessment": { "has_adequacy_decision": <boolean>, "decision_details": "<details>", "limitations": ["<limitation>"] },
  "transfer_mechanism_review": {
    "current_mechanism_adequate": <boolean>,
    "recommended_mechanism": "<scc|bcr|adequacy|derogation|binding_agreement>",
    "issues": ["<issue>"],
    "supplementary_measures_needed": <boolean>
  },
  "transfer_impact_assessment": {
    "destination_law_analysis": "<analysis of destination country laws>",
    "government_access_risk": "<low|medium|high>",
    "legal_protections": ["<protection>"],
    "concerns": ["<concern>"]
  },
  "supplementary_measures": {
    "technical": ["<measure1>"],
    "contractual": ["<measure1>"],
    "organizational": ["<measure1>"]
  },
  "schrems_ii_compliance": { "compliant": <boolean>, "gaps": ["<gap>"], "actions_needed": ["<action>"] },
  "action_items": [ {"action": "<action>", "priority": "<high|medium|low>", "deadline": "<timeline>"} ],
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Evaluate this cross-border transfer:\nFrom: ${source_country || 'EU/EEA'}\nTo: ${destination_country}\nData Categories: ${data_categories || 'Not specified'}\nTransfer Mechanism: ${transfer_mechanism || 'Not specified'}\nRecipient: ${recipient_name || 'Not specified'}\nRecipient Type: ${recipient_type || 'Not specified'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. AI Training Recommender
router.post('/recommend-training', async (req, res) => {
  try {
    const { employee_role, department, current_training, compliance_gaps } = req.body;
    if (!employee_role && !department) return res.status(400).json({ error: 'Employee role or department is required' });
    const messages = [
      { role: 'system', content: `You are a GDPR privacy training expert. Recommend a training plan for the specified role/department. Return valid JSON:
{
  "training_plan": {
    "role_profile": "<description of role's privacy responsibilities>",
    "risk_areas": ["<area1>"],
    "current_gaps": ["<gap1>"]
  },
  "recommended_courses": [
    { "course_name": "<course name>", "type": "<mandatory|recommended|optional>", "priority": "<high|medium|low>",
      "description": "<course description>", "duration_hours": <number>, "delivery_method": "<online|classroom|webinar|self_paced>",
      "topics": ["<topic1>"], "frequency": "<one_time|annual|quarterly>", "certification": <boolean>
    }
  ],
  "learning_path": [ {"phase": "<phase name>", "duration": "<timeframe>", "courses": ["<course name>"], "milestone": "<what they should know>"} ],
  "assessment_strategy": { "method": "<quiz|practical|scenario|certification>", "passing_score": <number>, "retake_policy": "<policy>" },
  "compliance_requirements": [ {"requirement": "<GDPR article>", "training_needed": "<what training>", "frequency": "<how often>"} ],
  "kpi_metrics": [ {"metric": "<metric>", "target": "<target>", "measurement": "<how to measure>"} ],
  "estimated_investment": { "total_hours": <number>, "timeline": "<completion timeline>" },
  "summary": "<executive summary>"
}` },
      { role: 'user', content: `Recommend privacy training for:\nRole: ${employee_role || 'Not specified'}\nDepartment: ${department || 'Not specified'}\nCurrent Training: ${current_training || 'None completed'}\nKnown Compliance Gaps: ${compliance_gaps || 'General GDPR awareness needed'}` }
    ];
    const aiResponse = await callOpenRouter(messages);
    res.json({ success: true, data: parseAIResponse(aiResponse) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
