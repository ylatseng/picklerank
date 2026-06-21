import React, { useState } from 'react';
import { makeS } from '../styles.js';
import { Sec, ConfirmInline } from '../components/Shared.jsx';
import { t, genId } from '../engine.js';

export default function Events({ state, set, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  
  const [newEvent, setNewEvent] = useState({ title: "", date: "", venue: "", invitees: [] });
  const [editingEvent, setEditingEvent] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const saveEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    set(s => ({
      ...s,
      events: editingEvent 
        ? (s.events || []).map(e => e.id === editingEvent.id ? { ...newEvent, id: editingEvent.id } : e)
        : [...(s.events || []), { ...newEvent, id: genId() }]
    }));
    setEditingEvent(null);
    setNewEvent({ title: "", date: "", venue: "", invitees: [] });
  };

  const startEdit = (ev) => {
    setEditingEvent(ev);
    setNewEvent({ title: ev.title, date: ev.date, venue: ev.venue, invitees: ev.invitees || [] });
  };

  const deleteEvent = (id) => {
    set(s => ({ ...s, events: (s.events || []).filter(e => e.id !== id) }));
    setPendingDelete(null);
  };

  const toggleInvitee = (playerId) => {
    setNewEvent(prev => ({
      ...prev,
      invitees: prev.invitees.includes(playerId) 
        ? prev.invitees.filter(id => id !== playerId)
        : [...prev.invitees, playerId]
    }));
  };

  return (
    <div style={S.view}>
      <Sec title={editingEvent ? t("edit_session") : t("new_session")} theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12*z }}>
          <input style={S.input} placeholder={t("event_name")} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8*z }}>
            <input style={S.input} type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
            <input style={S.input} placeholder={t("venue")} value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} />
          </div>

          <div style={{ position: "relative" }}>
             <label style={{ fontSize: 10*z, color: theme.sub, marginBottom: 4*z, display: "block" }}>{t("invite_players")}</label>
             <select 
               style={{...S.input, width: "100%", padding: "8px", background: theme.card}}
               onChange={(e) => toggleInvitee(e.target.value)}
               value=""
             >
               <option value="" disabled>{t("select_players_invite")}</option>
               {[...(state.players || [])]
                 .sort((a, b) => a.name.localeCompare(b.name))
                 .map(p => (
                   <option key={p.id} value={p.id}>
                      {newEvent.invitees.includes(p.id) ? "✓ " : ""} {p.name}
                   </option>
                 ))
               }
             </select>
             <div style={{ fontSize: 10*z, marginTop: 6*z, color: theme.accent }}>
               {t("selected")} {newEvent.invitees.map(id => state.players.find(p=>p.id===id)?.name).join(", ")}
             </div>
          </div>

          <button style={{...S.btnPrimary, padding: "12px", borderRadius: 8*z, fontWeight: 600}} onClick={saveEvent}>
            {editingEvent ? t("save_changes") : t("create_session")}
          </button>
          {editingEvent && <button style={S.btnSecondary} onClick={() => { setEditingEvent(null); setNewEvent({ title: "", date: "", venue: "", invitees: [] }); }}>{t("cancel")}</button>}
        </div>
      </Sec>

      <Sec title={t("upcoming_sessions")} theme={theme}>
        {(!state.events || state.events.length === 0) ? (
          <div style={{ textAlign: "center", color: theme.sub, padding: 20*z }}>{t("no_scheduled_sessions")}</div>
        ) : (
          [...state.events].sort((a,b) => new Date(a.date) - new Date(b.date)).map(ev => (
            <div key={ev.id} style={{ padding: "12px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14*z, color: theme.text }}>{ev.title}</div>
                  <div style={{ fontSize: 11*z, color: theme.accent, marginTop: 2*z }}>{new Date(ev.date).toLocaleString()} @ {ev.venue || t("tbd")}</div>
                </div>
                <div style={{ display: "flex", gap: 4*z }}>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4*z }} onClick={() => startEdit(ev)}>✏️</button>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4*z }} onClick={() => {
                     const text = `🥒 Pickleball: ${ev.title}\n📅 ${new Date(ev.date).toLocaleString()}\n📍 ${ev.venue}`;
                     if (navigator.share) navigator.share({ title: "Pickleball", text });
                     else { navigator.clipboard.writeText(text); alert("Copied!"); }
                  }}>📤</button>
                  {state.isAdmin && (
                    <button style={{ background: "transparent", border: "none", color: "#e05050", cursor: "pointer", padding: 4*z }} onClick={() => setPendingDelete(ev.id)}>✕</button>
                  )}
                </div>
              </div>
              {ev.invitees?.length > 0 && (
                <div style={{ fontSize: 10*z, color: theme.sub, marginTop: 8*z, fontStyle: "italic" }}>
                  {t("invited")} {(ev.invitees || []).map(id => state.players.find(p=>p.id===id)?.name).filter(Boolean).join(", ")}
                </div>
              )}
              {pendingDelete === ev.id && <ConfirmInline msg="Delete?" onConfirm={() => deleteEvent(ev.id)} onCancel={() => setPendingDelete(null)} theme={theme} danger />}
            </div>
          ))
        )}
      </Sec>
    </div>
  );
}