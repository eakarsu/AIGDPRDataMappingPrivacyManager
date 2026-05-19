import React, { useState } from 'react';
import DataFlowSankey         from '../components/customViews/DataFlowSankey';
import ConsentHeatmap         from '../components/customViews/ConsentHeatmap';
import DpiaRopaPdfPanel       from '../components/customViews/DpiaRopaPdfPanel';
import ProcessingRulesEditor  from '../components/customViews/ProcessingRulesEditor';

/**
 * GDPR Custom Views page.
 *   VIZ:     data-flow sankey, consent heatmap
 *   NON-VIZ: DPIA / ROPA PDF, processing-rules editor
 */
const TABS = [
  { key: 'flow',    label: 'Data Flow Map',      icon: '🌐' },
  { key: 'consent', label: 'Consent Heatmap',    icon: '🔥' },
  { key: 'report',  label: 'DPIA / ROPA Report', icon: '📄' },
  { key: 'rules',   label: 'Processing Rules',   icon: '⚙️' },
];

export default function CustomViewsPage() {
  const [tab, setTab] = useState('flow');

  return (
    <div data-testid="custom-views-page" style={{ maxWidth: 1280, margin: '0 auto', padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#111827' }}>GDPR Custom Views</h2>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 14 }}>
          Privacy-officer operational views: data-flow mapping, consent posture heatmap, DPIA/ROPA reports,
          and processing-rule configuration.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent',
                color: active ? '#4f46e5' : '#6b7280',
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'flow'    && <DataFlowSankey />}
        {tab === 'consent' && <ConsentHeatmap />}
        {tab === 'report'  && <DpiaRopaPdfPanel />}
        {tab === 'rules'   && <ProcessingRulesEditor />}
      </div>
    </div>
  );
}
