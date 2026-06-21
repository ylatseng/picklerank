import React from 'react';
import { t, RELEASES } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';

export default function Changelog({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  return (
    <div style={S.view}>
      <Sec title="📜 Changelog" theme={theme}>
        {RELEASES.map((rel, index) => (
          <div key={index} style={{ marginBottom: 24 * z, borderBottom: index !== RELEASES.length - 1 ? `1px solid ${theme.border}` : 'none', paddingBottom: 16 * z }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 * z }}>
              <div style={{ fontSize: 16 * z, fontWeight: 800, color: theme.accent }}>
                v{rel.version} - {rel.title}
              </div>
              <div style={{ fontSize: 11 * z, color: theme.sub }}>{rel.date}</div>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20 * z, color: theme.text, fontSize: 13 * z, lineHeight: 1.6 }}>
              {rel.changes.map((change, i) => (
                <li key={i} style={{ marginBottom: 4 * z }}>{change}</li>
              ))}
            </ul>
          </div>
        ))}
      </Sec>
    </div>
  );
}