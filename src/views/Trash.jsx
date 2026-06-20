import React from 'react';
import { t, fmtDate } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty } from '../components/Shared.jsx';

export default function Trash({state, set, theme}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  function restore(item) {
    const destination = item.type === 'match' ? 'matches' : 'players';
    set(s => ({
      ...s,
      [destination]: [...(s[destination] || []), item.data],
      trash: s.trash.filter(t => t.id !== item.id)
    }));
  }

  function emptyTrash() {
    if (confirm("Permanently empty the trash? This cannot be undone.")) {
      set(s => ({ ...s, trash: [] }));
    }
  }

  const trashItems = state.trash || [];

  return (
    <div style={S.view}>
      <Sec title="🗑️ Trash Can" theme={theme}>
        {trashItems.length === 0 ? (
          <Empty text="Trash is empty." theme={theme} />
        ) : (
          <>
            {trashItems.map(item => (
              <div key={item.id} style={{padding: '12px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{fontWeight: 600}}>{item.type === 'player' ? item.data.name : `Match (${item.data.type})`}</div>
                  <small style={{color: theme.sub}}>Deleted: {new Date(item.deletedAt).toLocaleDateString()}</small>
                </div>
                <button style={S.btnPrimary} onClick={() => restore(item)}>Restore</button>
              </div>
            ))}
            <button style={{...S.btnDanger, marginTop: '20px', width: '100%'}} onClick={emptyTrash}>
              Empty Trash Can
            </button>
          </>
        )}
      </Sec>
    </div>
  );
}