import React, { useState } from 'react';

/**
 * NON-VIZ 1: DPIA / ROPA PDF Report Panel.
 * POST /api/custom-views/dpia-ropa-pdf
 */
export default function DpiaRopaPdfPanel() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(25);

  const generate = async (format) => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const r = await fetch(`${base}/custom-views/dpia-ropa-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ format, limit }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setResult(j);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!result || !result.pdf_base64) return;
    const bin = atob(result.pdf_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: result.mime_type || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'dpia_ropa_report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadText = () => {
    if (!result || !result.text) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'dpia_ropa_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="dpia-ropa-pdf-panel"
      style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}
    >
      <h3 style={{ margin: 0, color: '#111827' }}>DPIA / ROPA Compliance Report</h3>
      <p style={{ marginTop: 6, color: '#6b7280', fontSize: 13 }}>
        Generates a combined Article 30 (ROPA) + Article 35 (DPIA) report. PDF format requires
        <code style={{ background: '#f3f4f6', padding: '0 4px', margin: '0 4px', borderRadius: 3 }}>pdfkit</code>
        on the server; otherwise a text fallback is returned.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Max rows per section{' '}
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10) || 25)}
            style={{ width: 70, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </label>
        <button
          data-testid="generate-pdf-btn"
          onClick={() => generate('pdf')}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Generating…' : 'Generate PDF'}
        </button>
        <button
          onClick={() => generate('text')}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          Generate Text
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: '#111827' }}>
              <strong>{result.format?.toUpperCase()}</strong> · {result.filename}
              {result.bytes ? ` · ${result.bytes.toLocaleString()} bytes` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {result.pdf_base64 && (
                <button onClick={downloadPdf} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  Download PDF
                </button>
              )}
              {result.text && (
                <button onClick={downloadText} style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  Download Text
                </button>
              )}
            </div>
          </div>
          {result.summary && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#374151' }}>
              Activities: {result.summary.activities} · DPIAs: {result.summary.dpias} · Open breaches: {result.summary.open_breaches}
            </div>
          )}
          {result.text && (
            <pre style={{ marginTop: 12, padding: 10, background: '#111827', color: '#d1d5db', borderRadius: 6, maxHeight: 320, overflow: 'auto', fontSize: 11, whiteSpace: 'pre-wrap' }}>
              {result.text.slice(0, 4000)}
              {result.text.length > 4000 ? '\n…(truncated for display)' : ''}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
