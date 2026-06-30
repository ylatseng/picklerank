import React, { useState } from 'react';
import { runAllTests } from '../tests/runner.js';
import { makeS } from '../styles.js';

export default function TestDashboard({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [results, setResults] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true); // New state for collapsing

  const runDiagnostics = () => {
    const data = runAllTests();
    setResults(data);
    setIsExpanded(true); // Auto-expand when running new tests
  };

  return (
    <div style={{ marginTop: 12*z }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${6*z}px 0` }}>
        <div style={{ fontSize: 13*z, color: theme.text, display: "flex", alignItems: "center", gap: 6*z }}>
          <span>🧪</span> System Diagnostics
        </div>
        <button onClick={runDiagnostics} style={{...S.btnSecondary, margin: 0, padding: "6px 12px", fontSize: 11*z}}>
          Run Tests
        </button>
      </div>

      {results && (
        <div style={{ marginTop: 8*z, background: theme.bg, borderRadius: 8*z, border: `1px solid ${theme.border}` }}>
          {/* Collapse Header */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              width: "100%", background: "transparent", border: "none", padding: "10px", 
              display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: "pointer", color: theme.text, fontSize: 12*z, fontWeight: 700 
            }}
          >
            {results.passed} Passed / {results.total} Total
            <span style={{ fontSize: 10*z, color: theme.sub }}>{isExpanded ? "▾" : "▴"}</span>
          </button>

          {/* Collapsible Results Panel */}
          {isExpanded && (
            <div style={{ padding: "0 10px 10px 10px", maxHeight: 200*z, overflowY: "auto", fontSize: 11*z }}>
              {results.results.map((r, i) => (
                <div key={i} style={{ padding: "4px 0", color: r.pass ? theme.sub : "#e05050" }}>
                  {r.pass ? "✅" : "❌"} <strong style={{color: theme.text}}>{r.desc}</strong>
                  {!r.pass && <div style={{ fontSize: 10*z, paddingLeft: 18*z }}>{r.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}