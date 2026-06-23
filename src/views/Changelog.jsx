import React from 'react';
import { t, RELEASES } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';

export default function Changelog({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  const isMajor = v => v.endsWith(".0.0");

  return (
    <div style={S.view}>
      <Sec title="📜 Changelog" theme={theme}>
        {RELEASES.map((rel, index) => (
          <div key={index} style={{
            marginBottom: 24*z,
            borderBottom: index !== RELEASES.length - 1 ? `1px solid ${theme.border}` : 'none',
            paddingBottom: 16*z,
            ...(isMajor(rel.version) ? {
              background: "rgba(80,200,120,0.05)",
              border: `1px solid rgba(80,200,120,0.2)`,
              borderRadius: 10*z,
              padding: 14*z,
              marginLeft: -4*z,
              marginRight: -4*z,
            } : {})
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8*z }}>
              <div style={{
                fontSize: isMajor(rel.version) ? 18*z : 16*z,
                fontWeight: 800,
                color: isMajor(rel.version) ? "#50c878" : theme.accent,
                display: 'flex', alignItems: 'center', gap: 8*z
              }}>
                {isMajor(rel.version) && <span style={{fontSize:12*z, padding:"2px 8px", background:"rgba(80,200,120,0.15)", borderRadius:20*z, fontWeight:700}}>🎉 MAJOR</span>}
                v{rel.version} — {rel.title}
              </div>
              <div style={{ fontSize: 11*z, color: theme.sub, flexShrink:0, marginLeft:8*z }}>{rel.date}</div>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20*z, color: theme.text, fontSize: 12*z, lineHeight: 1.7 }}>
              {rel.changes.map((change, i) => (
                <li key={i} style={{ marginBottom: 3*z }}>{change}</li>
              ))}
            </ul>
          </div>
        ))}
      </Sec>
    </div>
  );
}