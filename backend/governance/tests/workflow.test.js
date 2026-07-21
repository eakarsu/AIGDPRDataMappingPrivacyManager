'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

test('domain workflow accepts a reviewable, grounded case', () => {
  const evaluation = evaluate({
  systems: [{ id: 'crm', personalDataClasses: ['email'], lineageRefs: ['catalog:crm'],
    retentionDays: 365, retentionPolicyVersion: 'r1', purpose: 'support',
    lawfulBasis: 'contract', jurisdiction: 'EU' }],
  requests: [{ id: 'dsr-1', subjectRef: 'subject:opaque', type: 'access',
    systemIds: ['crm'], status: 'fulfilled', evidenceRefs: ['receipt:1'] }],
  consents: [{ id: 'c1' }], incidents: []
});
  assert.deepEqual(evaluation.errors, []);
  assert.equal(evaluation.result.decision, 'reviewable');
  assert.ok(Array.isArray(evaluation.assumptions));
  assert.equal(typeof evaluation.uncertainty, 'object');
});

test('domain workflow fails closed on unsafe or incomplete input', () => {
  const evaluation = evaluate({ systems: [], requests: [] });
  assert.ok(evaluation.errors.length > 0);
  assert.notEqual(evaluation.result.decision, 'reviewable');
});
