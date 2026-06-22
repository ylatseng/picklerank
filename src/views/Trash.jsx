import React from 'react';
import { t, fmtDate } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty } from '../components/Shared.jsx';

export default function Trash({state, set, theme, isAdmin}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  function restore(item) {
    const destination = item.type === 'match' ? 'matches' : item.type === 'event' ? 'events' : 'players';
    set(s => ({
      ...s,
      [destination]: [...(s[destination] || []), item.data],
      trash: s.trash.filter(t => t.id !== item.id)
    }));
  }

  const itemLabel = (item) => {
    if (item.type === 'player') return `👤 ${item.data.name}`;
    if (item.type === 'event')  return `📅 ${item.data.title || 'Event'}`;
    return `🎮 ${t("match_label")} (${t(item.data.type === 'singles' ? 'match_type_singles' : item.data.type === 'doubles' ? 'match_type_doubles' : item.data.type)})`;
  };

  // Events can only be restored by admin (same rule as deletion)
  const canRestore = (item) => item.type === 'event' ? isAdmin : true;

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
              <div key={item.id} style={{padding: `${10*z}px 0`, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8*z}}>
                <div>
                  <div style={{fontWeight: 600, fontSize: 13*z, color: theme.text}}>{itemLabel(item)}</div>
                  <small style={{color: theme.sub, fontSize: 10*z}}>{t("deleted_lbl")} {new Date(item.deletedAt).toLocaleDateString()}</small>
                  {item.type === 'event' && !isAdmin && (
                    <div style={{fontSize: 10*z, color: "#e05050", marginTop: 2*z}}>🔒 {t("event_restore_admin_only") || "Admin only"}</div>
                  )}
                </div>
                {canRestore(item) && (
                  <button style={{...S.btnPrimary, marginTop: 0, padding: `${5*z}px ${10*z}px`, fontSize: 12*z, whiteSpace: "nowrap"}} onClick={() => restore(item)}>{t("restore_btn")}</button>
                )}
              </div>
            ))}
            {isAdmin ? (
              <button style={{...S.btnDanger, marginTop: '20px', width: '100%'}} onClick={emptyTrash}>
                {t("empty_trash_btn")}
              </button>
            ) : (
              <div style={{marginTop: 16*z, padding: `${8*z}px ${10*z}px`, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8*z, fontSize: 11*z, color: theme.sub, textAlign: 'center'}}>
                🔒 {t("trash_admin_only") || "Only an Admin can permanently empty the trash."}
              </div>
            )}
          </>
        )}
      </Sec>
    </div>
  );
}