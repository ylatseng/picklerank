import React, { useState } from 'react';
import { t, RELEASES } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';

export default function Changelog({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  // Latest version expanded by default — that's what users care most about
  const [expanded, setExpanded] = useState({ 0: true });
  const isMajor = v => v.endsWith(".0.0");

  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div style={S.view}>
      <Sec title="📜 Changelog" theme={theme}>
        <div style={{fontSize:11*z, color:theme.sub, marginBottom:12*z}}>
          Tap any version to expand or collapse its details.
        </div>
        {RELEASES.map((rel, index) => {
          const open = !!expanded[index];
          const major = isMajor(rel.version);
          return (
            <div key={index} style={{
              marginBottom: 8*z,
              background: major ? "rgba(80,200,120,0.05)" : theme.bg,
              border: `1px solid ${major ? "rgba(80,200,120,0.3)" : theme.border}`,
              borderRadius: 12*z, overflow: "hidden"
            }}>
              {/* Header — always visible, click to toggle */}
              <button onClick={() => toggle(index)} style={{
                width: "100%", background: "transparent", border: "none",
                cursor: "pointer", padding: `${12*z}px ${14*z}px`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                gap: 8*z, textAlign: "left"
              }}>
                <div style={{display: "flex", alignItems: "center", gap: 8*z, flex: 1, minWidth: 0}}>
                  {major && (
                    <span style={{fontSize:10*z, padding:`2px ${6*z}px`, background:"rgba(80,200,120,0.15)", borderRadius:20*z, fontWeight:700, color:"#50c878", flexShrink:0}}>
                      🎉 MAJOR
                    </span>
                  )}
                  <span style={{
                    fontSize: major ? 15*z : 14*z,
                    fontWeight: 800,
                    color: major ? "#50c878" : theme.accent,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    v{rel.version} — {rel.title}
                  </span>
                </div>
                <div style={{display: "flex", alignItems: "center", gap: 8*z, flexShrink: 0}}>
                  <span style={{fontSize: 10*z, color: theme.sub}}>{rel.date}</span>
                  <span style={{
                    fontSize: 13*z, color: theme.sub,
                    transform: open ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s"
                  }}>▾</span>
                </div>
              </button>
              {/* Expanded content */}
              {open && (
                <div style={{padding: `0 ${14*z}px ${12*z}px`, borderTop: `1px solid ${theme.border}`, paddingTop: 10*z}}>
                  <div style={{fontSize: 10*z, color: theme.sub, marginBottom: 6*z}}>
                    {rel.changes.length} changes
                  </div>
                  <ul style={{margin: 0, paddingLeft: 18*z, color: theme.text, fontSize: 12*z, lineHeight: 1.6}}>
                    {rel.changes.map((change, i) => (
                      <li key={i} style={{marginBottom: 4*z}}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </Sec>
    </div>
  );
}
