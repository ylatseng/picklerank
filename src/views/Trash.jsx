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
    if (window.confirm(t("empty_trash_confirm"))) {
      set(s => ({ ...s, trash: [] }));
    }
  }

  const trashItems = state.trash || [];

  return (
    <div style={S.view}>
      <Sec title={`🗑️ ${t("trash")}`} theme={theme}>
        {trashItems.length === 0 ? (
          <Empty text={t("trash_empty")} theme={theme} />
        ) : (
          <>
            {trashItems.map(item => (
              <div key={item.id} style={{padding: '12px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{fontWeight: 600}}>
                    {item.type === 'player' ? item.data.name : `${t("match_label")} (${t(item.data.type === 'singles' ? 'match_type_singles' : item.data.type === 'doubles' ? 'match_type_doubles' : item.data.type)})`}
                  </div>
                  <small style={{color: theme.sub}}>{t("deleted_lbl")} {new Date(item.deletedAt).toLocaleDateString()}</small>
                </div>
                <button style={S.btnPrimary} onClick={() => restore(item)}>{t("restore_btn")}</button>
              </div>
            ))}
            <button style={{...S.btnDanger, marginTop: '20px', width: '100%'}} onClick={emptyTrash}>
              {t("empty_trash_btn")}
            </button>
          </>
        )}
      </Sec>
    </div>
  );
}