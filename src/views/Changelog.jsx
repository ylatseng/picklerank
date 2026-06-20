import React from 'react';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';
import { RELEASES } from '../engine.js'; // 👉 Pulls the updates directly from engine.js!



export default function Changelog({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  return (
    <div style={S.view}>
      <div style={{ fontSize: 13*z, color: theme.sub, marginBottom: 16*z, padding: "0 4px" }}>
        Follow along with the latest features, fixes, and improvements to PickleRank.
      </div>
      
      {RELEASES.map((release) => (
        <Sec key={release.version} title={`v${release.version} — ${release.title}`} theme={theme}>
          <div style={{ fontSize: 11*z, color: theme.accent, fontWeight: 700, marginBottom: 10*z }}>
            Released on {release.date}
          </div>
          <ul style={{ margin: 0, paddingLeft: 20*z, color: theme.text, fontSize: 13*z, lineHeight: 1.6 }}>
            {release.changes.map((change, i) => (
              <li key={i} style={{ marginBottom: 6*z }}>{change}</li>
            ))}
          </ul>
        </Sec>
      ))}
    </div>
  );
}