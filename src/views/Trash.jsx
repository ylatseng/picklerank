import React from 'react';
import { t, fmtDate, ratingColor } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Avatar } from '../components/Shared.jsx';

export default function Trash({state, set, theme, isAdmin}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  function restore(item) {
    const destination = item.type === 'match' ? 'matches'
                      : item.type === 'event'  ? 'events'
                      :                          'players';
    set(s => ({
      ...s,
      [destination]: [...(s[destination] || []), item.data],
      trash: s.trash.filter(tr => tr.id !== item.id)
    }));
  }

  function emptyTrash() {
    if (window.confirm(t("empty_trash_confirm"))) {
      set(s => ({ ...s, trash: [] }));
    }
  }

  // Only admin can restore players (only admin can delete them)
  // Only admin can restore events  (only admin can delete them)
  // Anyone can restore matches they participated in — but Trash is only
  // reachable by admin anyway (nav button is admin-gated), so this is safe.
  const canRestore = (item) =>
    item.type === 'player' ? isAdmin :
    item.type === 'event'  ? isAdmin : true;

  const trashItems = [...(state.trash || [])].sort((a, b) => b.deletedAt - a.deletedAt);

  const PlayerCard = ({ item }) => {
    const p = item.data;
    return (
      <div style={{display:'flex', alignItems:'center', gap:10*z}}>
        <Avatar name={p.name} url={p.avatar} size={36} />
        <div style={{flex:1}}>
          <div style={{fontWeight:700, fontSize:13*z, color:theme.text}}>{p.name}</div>
          <div style={{display:'flex', gap:8*z, marginTop:2*z, flexWrap:'wrap'}}>
            <span style={{fontSize:10*z, padding:'1px 6px', borderRadius:10*z,
              background: ratingColor(p.ratingDoubles||3)+'22',
              color: ratingColor(p.ratingDoubles||3), fontWeight:700}}>
              D {(p.ratingDoubles||3).toFixed(3)}
            </span>
            <span style={{fontSize:10*z, padding:'1px 6px', borderRadius:10*z,
              background: ratingColor(p.ratingSingles||3)+'22',
              color: ratingColor(p.ratingSingles||3), fontWeight:700}}>
              S {(p.ratingSingles||3).toFixed(3)}
            </span>
            {p.joinedDate && (
              <span style={{fontSize:10*z, color:theme.sub}}>
                Joined {new Date(p.joinedDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {p.notes && <div style={{fontSize:10*z, color:theme.sub, marginTop:2*z, fontStyle:'italic'}}>📝 {p.notes}</div>}
          <div style={{fontSize:9*z, color:theme.sub, marginTop:3*z}}>
            🔑 ID: <code style={{fontSize:9*z}}>{p.id}</code>
            <span style={{marginLeft:6*z, color:'#50c878'}}>↩ Restoring re-links all match history</span>
          </div>
        </div>
      </div>
    );
  };

  const MatchCard = ({ item }) => {
    const m = item.data;
    const score = (m.games||[]).map(g=>`${g.a}–${g.b}`).join(', ');
    const typeLabel = t(m.type==='singles'?'match_type_singles':m.type==='doubles'?'match_type_doubles':m.type);
    return (
      <div>
        <div style={{fontWeight:700, fontSize:13*z, color:theme.text}}>
          🎮 {t("match_label")} · {typeLabel}
        </div>
        {m.date && <div style={{fontSize:10*z, color:theme.sub}}>{fmtDate(m.date)}{score ? ` · ${score}` : ''}</div>}
        {m.venue && <div style={{fontSize:10*z, color:theme.sub}}>📍 {m.venue}</div>}
      </div>
    );
  };

  const EventCard = ({ item }) => {
    const ev = item.data;
    return (
      <div>
        <div style={{fontWeight:700, fontSize:13*z, color:theme.text}}>📅 {ev.title}</div>
        {ev.date && <div style={{fontSize:10*z, color:theme.sub}}>{new Date(ev.date).toLocaleString()}</div>}
        {ev.venue && <div style={{fontSize:10*z, color:theme.sub}}>📍 {ev.venue}</div>}
      </div>
    );
  };

  return (
    <div style={S.view}>
      <Sec title={`🗑️ ${t("trash")}`} theme={theme}>
        {trashItems.length === 0 ? (
          <Empty text={t("trash_empty")} theme={theme} />
        ) : (
          <>
            {trashItems.map(item => (
              <div key={item.id} style={{
                padding:`${12*z}px 0`,
                borderBottom:`1px solid ${theme.border}`,
                display:'flex', justifyContent:'space-between',
                alignItems:'center', gap:10*z
              }}>
                <div style={{flex:1, minWidth:0}}>
                  {item.type === 'player' && <PlayerCard item={item}/>}
                  {item.type === 'match'  && <MatchCard item={item}/>}
                  {item.type === 'event'  && <EventCard item={item}/>}
                  <div style={{fontSize:10*z, color:theme.sub, marginTop:4*z}}>
                    🗑️ {t("deleted_lbl")} {new Date(item.deletedAt).toLocaleDateString()}
                  </div>
                </div>
                {canRestore(item) ? (
                  <button
                    style={{...S.btnPrimary, marginTop:0, padding:`${5*z}px ${10*z}px`, fontSize:12*z, whiteSpace:'nowrap', flexShrink:0}}
                    onClick={() => restore(item)}
                  >
                    {t("restore_btn")}
                  </button>
                ) : (
                  <span style={{fontSize:10*z, color:'#e05050', flexShrink:0}}>🔒 {t("admin_only")||"Admin only"}</span>
                )}
              </div>
            ))}

            {isAdmin ? (
              <button style={{...S.btnDanger, marginTop:20*z, width:'100%'}} onClick={emptyTrash}>
                {t("empty_trash_btn")}
              </button>
            ) : (
              <div style={{marginTop:16*z, padding:`${8*z}px ${10*z}px`, background:theme.bg,
                border:`1px solid ${theme.border}`, borderRadius:8*z,
                fontSize:11*z, color:theme.sub, textAlign:'center'}}>
                🔒 {t("trash_admin_only") || "Only an Admin can permanently empty the trash."}
              </div>
            )}
          </>
        )}
      </Sec>
    </div>
  );
}
