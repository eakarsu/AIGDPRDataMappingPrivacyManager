import React, { useEffect, useState } from 'react';

/**
 * VIZ 2: Consent Status Heatmap (data category x lawful basis).
 * GET /api/custom-views/consent-heatmap
 */
export default function ConsentHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    fetch(`${base}/custom-views/consent-heatmap`, {
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

  if (loading) return <div style={{ padding: 16, color: '#6b7280' }}>Loading consent heatmap…</div>;
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>Error: {error}</div>;
  if (!data) return null;

  const max = Math.max(1, data.max_cell || 1);
  const cellBg = (n) => {
    if (!n) return '#f3f4f6';
    const ratio = n / max;
    // green-to-red ramp by saturation; using HSL keeps the math simple
    const h = 150 - Math.round(ratio * 150); // 150 (green) -> 0 (red)
    return `hsl(${h}, 70%, ${88 - Math.round(ratio * 35)}%)`;
  };

  return (
    <div
      data-testid="consent-heatmap"
      style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#111827' }}>Consent Status Heatmap</h3>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Data category × lawful basis · {data.grand_total} consent records · darker = more records, hue = consent grant rate
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: '#374151', fontSize: 12 }}>Data Category</th>
              {data.lawful_bases.map((b) => (
                <th
                  key={b}
                  style={{ padding: '6px 10px', color: '#374151', fontSize: 11, textAlign: 'center' }}
                >
                  {b}
                </th>
              ))}
              <th style={{ padding: '6px 10px', color: '#374151', fontSize: 11, textAlign: 'right' }}>row total</th>
            </tr>
          </thead>
          <tbody>
            {data.matrix.length === 0 && (
              <tr>
                <td colSpan={data.lawful_bases.length + 2} style={{ padding: 16, color: '#6b7280' }}>
                  No consent records yet.
                </td>
              </tr>
            )}
            {data.matrix.map((row) => (
              <tr key={row.data_category}>
                <td style={{ padding: '6px 10px', fontSize: 12, color: '#111827', fontWeight: 600 }}>
                  {row.data_category}
                </td>
                {row.cells.map((c) => (
                  <td
                    key={c.basis}
                    title={`${c.total} records · ${c.consent_rate}% granted · ${c.withdrawn} withdrawn · ${c.expired} expired`}
                    style={{
                      width: 80,
                      height: 44,
                      background: cellBg(c.total),
                      textAlign: 'center',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#111827',
                      cursor: 'help',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{c.total}</div>
                    <div style={{ fontSize: 10, color: '#374151' }}>{c.consent_rate}%</div>
                  </td>
                ))}
                <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, color: '#111827', fontWeight: 600 }}>
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
