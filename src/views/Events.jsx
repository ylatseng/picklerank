import React, { useState } from 'react';
import { makeS } from '../styles.js';
import { Sec, ConfirmInline } from '../components/Shared.jsx';
import { t, genId } from '../engine.js';

export default function Events({ state, set, theme, isAdmin }) {
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
    const ev = (state.events || []).find(e => e.id === id);
    if (!ev) return;
    set(s => ({
      ...s,
      events: (s.events || []).filter(e => e.id !== id),
      trash: [...(s.trash || []), { id: ev.id, type: 'event', data: ev, deletedAt: Date.now() }]
    }));
    setPendingDelete(null);
  };

  // Toggle a player in/out of the invitees list
  const toggleInvitee = (playerId) => {
    setNewEvent(prev => ({
      ...prev,
      invitees: prev.invitees.includes(playerId)
        ? prev.invitees.filter(id => id !== playerId)
        : [...prev.invitees, playerId]
    }));
  };

  const sortedPlayers = [...(state.players || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={S.view}>
      <Sec title={editingEvent ? t("edit_session") : t("new_session")} theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12*z }}>

          {/* Event name */}
          <input style={S.input} placeholder={t("event_name")} value={newEvent.title}
            onChange={e => setNewEvent({...newEvent, title: e.target.value})} />

          {/* FIX 1: Date/time now has a visible label so users know what the field is */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8*z }}>
            <div>
              <label style={{ fontSize: 10*z, color: theme.sub, marginBottom: 4*z, display: "block" }}>
                {t("date_time_lbl") || "Date & Time"}
              </label>
              <input style={S.input} type="datetime-local" value={newEvent.date}
                onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 10*z, color: theme.sub, marginBottom: 4*z, display: "block" }}>
                {t("venue") || "Venue"}
              </label>
              <input style={S.input} placeholder={t("venue")} value={newEvent.venue}
                onChange={e => setNewEvent({...newEvent, venue: e.target.value})} />
            </div>
          </div>

          {/* FIX 1: Clean native multi-select — hold Ctrl/Cmd or tap to pick multiple */}
          <div>
            <label style={{ fontSize: 10*z, color: theme.sub, marginBottom: 4*z, display: "block" }}>
              {t("invite_players")} <span style={{fontWeight:400, opacity:0.7}}>({t("multi_select_hint") || "Hold Ctrl / tap to select multiple"})</span>
            </label>
            <select
              multiple
              size={Math.min(6, sortedPlayers.length || 1)}
              style={{
                ...S.input,
                width: "100%",
                height: "auto",
                padding: `${4*z}px`,
                background: theme.bg,
                overflowY: "auto"
              }}
              value={newEvent.invitees}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                setNewEvent(prev => ({ ...prev, invitees: selected }));
              }}
            >
              {sortedPlayers.map(p => (
                <option key={p.id} value={p.id} style={{padding: `${4*z}px ${6*z}px`, fontSize: 13*z}}>
                  {p.name}
                </option>
              ))}
            </select>
            {newEvent.invitees.length > 0 && (
              <div style={{ fontSize: 10*z, marginTop: 4*z, color: theme.accent }}>
                ✓ {newEvent.invitees.length} {t("selected") || "selected"}: {newEvent.invitees.map(id => sortedPlayers.find(p=>p.id===id)?.name).filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          <button style={{...S.btnPrimary, padding: "12px", borderRadius: 8*z, fontWeight: 600}} onClick={saveEvent}>
            {editingEvent ? t("save_changes") : t("create_session")}
          </button>
          {editingEvent && (
            <button style={S.btnSecondary} onClick={() => { setEditingEvent(null); setNewEvent({ title: "", date: "", venue: "", invitees: [] }); }}>
              {t("cancel")}
            </button>
          )}
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
                  <div style={{ fontSize: 11*z, color: theme.accent, marginTop: 2*z }}>
                    {new Date(ev.date).toLocaleString()} @ {ev.venue || t("tbd")}
                  </div>
                </div>
                {/* FIX 3: Edit always visible; delete only shown to admin */}
                <div style={{ display: "flex", gap: 4*z }}>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4*z }}
                    onClick={() => startEdit(ev)}>✏️</button>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4*z }}
                    onClick={() => {
                      const text = `🥒 Pickleball: ${ev.title}\n📅 ${new Date(ev.date).toLocaleString()}\n📍 ${ev.venue}`;
                      if (navigator.share) navigator.share({ title: "Pickleball", text });
                      else { navigator.clipboard.writeText(text); alert("Copied!"); }
                    }}>📤</button>
                  {isAdmin && (
                    <button style={{ background: "transparent", border: "none", color: "#e05050", cursor: "pointer", padding: 4*z }}
                      onClick={() => setPendingDelete(ev.id)}>✕</button>
                  )}
                </div>
              </div>
              {ev.invitees?.length > 0 && (
                <div style={{ fontSize: 10*z, color: theme.sub, marginTop: 8*z }}>
                  {t("invited")} {(ev.invitees || []).map(id => state.players.find(p=>p.id===id)?.name).filter(Boolean).join(", ")}
                </div>
              )}
              {pendingDelete === ev.id && (
                <ConfirmInline msg={t("delete_match_q") || "Delete?"} onConfirm={() => deleteEvent(ev.id)} onCancel={() => setPendingDelete(null)} theme={theme} danger />
              )}
            </div>
          ))
        )}
      </Sec>
    </div>
  );
}
