'use strict';
// Pure helpers for the feature-pack tasks / search / export / AI fallback.
// No DB or network access here so tests run offline.
const STATUSES=['todo','in_progress','blocked','done'];
const PRIORITIES=['low','normal','high','urgent'];
function validateTaskInput(body,{partial=false}={}){
  if(!body||typeof body!=='object'||Array.isArray(body)) return {error:'JSON object body is required.'};
  const value={};
  if(body.title!==undefined||!partial){
    const title=typeof body.title==='string'?body.title.trim():'';
    if(!title) return {error:'title is required.'};
    value.title=title;
  }
  for(const k of ['description','record_ref']) if(body[k]!==undefined) value[k]=body[k]==null?body[k]:String(body[k]);
  if(body.status!==undefined){ if(!STATUSES.includes(body.status)) return {error:`status must be one of: ${STATUSES.join(', ')}.`}; value.status=body.status; }
  if(body.priority!==undefined){ if(!PRIORITIES.includes(body.priority)) return {error:`priority must be one of: ${PRIORITIES.join(', ')}.`}; value.priority=body.priority; }
  return {value};
}
function filterTasks(tasks,query={}){
  return filterRecords(tasks,query);
}
function filterRecords(records,query={}){
  const search=String(query.search||query.q||'').trim().toLowerCase();
  let out=Array.isArray(records)?[...records]:[];
  if(search) out=out.filter(r=>Object.values(r||{}).some(v=>v!=null&&String(v).toLowerCase().includes(search)));
  for(const k of ['status','priority','category','risk_level','difficulty','relationship']) if(query[k]) out=out.filter(r=>String(r?.[k]??'')===String(query[k]));
  return out;
}
function csvCell(v){ if(v==null) return ''; const s=typeof v==='object'?JSON.stringify(v):String(v); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
function toCsv(records){
  if(!records||!records.length) return '';
  const cols=[...new Set(records.flatMap(r=>Object.keys(r||{})))];
  return [cols.join(','),...records.map(r=>cols.map(c=>csvCell(r?.[c])).join(','))].join('\n')+'\n';
}
function buildSections(obj){ return Object.entries(obj||{}).map(([k,v])=>({label:k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),value:v})); }
function hasProviderKey(env=process.env){ return Boolean(env.OPENROUTER_API_KEY||env.OPENAI_API_KEY); }
function deterministicTaskInsights(tasks,domainLabel,mode='prioritize'){
  const list=Array.isArray(tasks)?tasks:[];
  const open=list.filter(t=>t.status!=='done');
  const blocked=list.filter(t=>t.status==='blocked');
  const rank={urgent:0,high:1,normal:2,low:3};
  const prioritized=[...open].sort((a,b)=>(rank[a.priority]??2)-(rank[b.priority]??2)).map(t=>({title:t.title,reason:`${t.priority||'normal'} priority / ${t.status||'todo'} in ${domainLabel}`}));
  return {prioritized,nextActions:prioritized.slice(0,3).map(t=>`Work on: ${t.title}`),blockedTitles:blocked.map(t=>t.title),summary:`${list.length} task(s), ${open.length} open, ${blocked.length} blocked for ${domainLabel}.`};
}
function fallbackInsights(tasks,domainLabel,mode='prioritize'){
  const list=Array.isArray(tasks)?tasks:[];
  const done=list.filter(t=>t.status==='done').length;
  const insights=deterministicTaskInsights(list,domainLabel,mode);
  const completionRate=list.length?Math.round((done/list.length)*100):0;
  return {aiGenerated:false,fallback:true,label:'Deterministic fallback (no AI provider configured)',provider:null,mode,domain:domainLabel,total:list.length,open:list.length-done,blocked:list.filter(t=>t.status==='blocked').length,completionRate,...insights,sections:buildSections({total_tasks:list.length,open_tasks:list.length-done,blocked_tasks:list.filter(t=>t.status==='blocked').length,completion_rate_percent:completionRate,has_tasks:list.length>0,summary:insights.summary})};
}
module.exports={STATUSES,PRIORITIES,validateTaskInput,filterTasks,filterRecords,toCsv,buildSections,hasProviderKey,deterministicTaskInsights,deterministicInsights:deterministicTaskInsights,fallbackInsights};
