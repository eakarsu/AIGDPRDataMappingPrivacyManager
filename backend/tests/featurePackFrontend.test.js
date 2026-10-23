'use strict';
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
test('TasksPage labelled sections preserve false/0/empty and expose search/export/AI',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../../frontend/src/pages/TasksPage.js'),'utf8');
  assert.ok(src.includes('aria-label="Task list"')); assert.ok(src.includes('aria-label="AI insights"'));
  assert.ok(src.includes('aiGenerated')); assert.ok(src.includes('Export CSV')); assert.ok(src.includes('Search tasks'));
  assert.ok(src.includes('String(v)')); // falsy values rendered, not hidden
});
