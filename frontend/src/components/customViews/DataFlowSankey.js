import React, { useEffect, useState } from 'react';

/**
 * VIZ 1: Data Flow Sankey (source -> processor -> destination)
 * GET /api/custom-views/data-flow-sankey
 * Renders a 3-column flow diagram in SVG (no external sankey lib needed).
 */
export default function DataFlowSankey() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    fetch(`${base}/custom-views/data-flow-sankey`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        return j;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 16, color: '#6b7280' }}>Loading data-flow…</div>;
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>Error: {error}</div>;
  if (!data || !data.nodes || !data.nodes.length)
    return <div style={{ padding: 16, color: '#6b7280' }}>No data-flow data available.</div>;

  const sources = data.nodes.filter((n) => n.kind === 'source');
  const processors = data.nodes.filter((n) => n.kind === 'processor');
  const destinations = data.nodes.filter((n) => n.kind === 'destination');

  // Compact: clamp to top-N of each column to keep the SVG legible.
  const topN = (arr, n) => [...arr].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, n);
  const srcShown = topN(sources, 8);
  const procShown = topN(processors, 8);
  const destShown = topN(destinations, 10);

  const colW = 220;
  const gap = 60;
  const rowH = 36;
  const totalH = Math.max(srcShown.length, procShown.length, destShown.length) * rowH + 60;
  const totalW = colW * 3 + gap * 2 + 40;

  const yFor = (idx) => 30 + idx * rowH;
  const xCol = (k) => (k === 'source' ? 20 : k === 'processor' ? 20 + colW + gap : 20 + colW * 2 + gap * 2);

  const idIndex = new Map();
  srcShown.forEach((n, i) => idIndex.set(n.id, { col: 'source', y: yFor(i) + rowH / 2 }));
  procShown.forEach((n, i) => idIndex.set(n.id, { col: 'processor', y: yFor(i) + rowH / 2 }));
  destShown.forEach((n, i) => idIndex.set(n.id, { col: 'destination', y: yFor(i) + rowH / 2 }));

  const linksShown = (data.links || []).filter((l) => idIndex.has(l.source) && idIndex.has(l.target));
  const maxLinkW = Math.max(1, ...linksShown.map((l) => l.value || 1));

  const NodeRect = ({ n, x, y, fill }) => (
    <g>
      <rect x={x} y={y} width={colW} height={28} fill={fill} rx={4} />
      <text x={x + 8} y={y + 18} fontSize="12" fill="#fff" fontWeight="600">
        {n.name.length > 28 ? n.name.slice(0, 26) + '…' : n.name}
      </text>
      <text x={x + colW - 8} y={y + 18} textAnchor="end" fontSize="11" fill="#fff" opacity={0.85}>
        {n.value}
      </text>
    </g>
  );

  return (
    <div
      data-testid="data-flow-sankey"
      style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#111827' }}>Data Flow Map</h3>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {data.summary.sources} sources → {data.summary.processors} processors → {data.summary.destinations} destinations
          {' '}({data.summary.total_links} links)
        </div>
      </div>
      <svg width={totalW} height={totalH} style={{ maxWidth: '100%' }}>
        {/* column headers */}
        <text x={xCol('source') + colW / 2} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#374151">
          Source (data subjects)
        </text>
        <text x={xCol('processor') + colW / 2} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#374151">
          Processor (activity)
        </text>
        <text x={xCol('destination') + colW / 2} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#374151">
          Destination (recipient/vendor)
        </text>

        {/* links */}
        {linksShown.map((l, i) => {
          const a = idIndex.get(l.source);
          const b = idIndex.get(l.target);
          const x1 = xCol(a.col) + colW;
          const x2 = xCol(b.col);
          const y1 = a.y;
          const y2 = b.y;
          const cx = (x1 + x2) / 2;
          const w = Math.max(1, ((l.value || 1) / maxLinkW) * 6);
          return (
            <path
              key={`link-${i}`}
              d={`M ${x1},${y1} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`}
              stroke="#6366f1"
              strokeWidth={w}
              strokeOpacity={0.45}
              fill="none"
            />
          );
        })}

        {/* nodes */}
        {srcShown.map((n, i) => <NodeRect key={n.id} n={n} x={xCol('source')} y={yFor(i)} fill="#0ea5e9" />)}
        {procShown.map((n, i) => <NodeRect key={n.id} n={n} x={xCol('processor')} y={yFor(i)} fill="#6366f1" />)}
        {destShown.map((n, i) => <NodeRect key={n.id} n={n} x={xCol('destination')} y={yFor(i)} fill="#10b981" />)}
      </svg>
    </div>
  );
}
