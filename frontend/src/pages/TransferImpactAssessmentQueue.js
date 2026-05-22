import React, { useEffect, useState } from 'react';

export default function TransferImpactAssessmentQueue() {
  const [data, setData] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/transfer-impact-assessment-queue', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()).then(setData).catch(() => {});
  }, [token]);

  return (
    <div className="page-container">
      <h1>Transfer Impact Assessment Queue</h1>
      <p>Prioritizes cross-border transfers by TIA completion, safeguards, transfer mechanism, and vendor risk.</p>
      {data && (
        <div className="card-grid">
          {data.queue.map((item) => (
            <div className="card" key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.destination_country} - {item.mechanism}</p>
              <strong>{item.priority} - {item.risk_score}</strong>
              <ul>{item.required_artifacts.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
