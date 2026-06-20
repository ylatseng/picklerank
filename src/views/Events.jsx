import React, { useState } from 'react';
import { makeS } from '../styles.js';
import { Sec, ConfirmInline } from '../components/Shared.jsx';
import { genId } from '../engine.js';

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
    setNewEvent({ 
      title: ev.title || "", 
      date: ev.date || "", 
      venue: ev.venue || "", 
      invitees: ev.invitees || [] 
    });
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
      <Sec title={editingEvent ? "EDIT EVENT" : "CREATE NEW EVENT"} theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8*z }}>
          <input style={S.input} placeholder="Event Name" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
          <input style={S.input} type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
          <input style={S.input} placeholder="Venue" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} />
          
          <div style={{ marginTop: 4*z }}>
            <label style={{...S.label, fontSize: 10*z}}>Invite Players</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6*z, marginTop: 4*z }}>
              {(state.players || []).map(p => {
                const isInvited = newEvent.invitees.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleInvitee(p.id)}
                    style={{ padding: "4px 8px", borderRadius: 12, border: `1px solid ${isInvited ? theme.accent : theme.border}`, background: isInvited ? theme.accent : theme.card, color: isInvited ? theme.bg : theme.text, fontSize: 11*z, cursor: "pointer" }}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8*z, marginTop: 8*z }}>
            <button style={S.btnPrimary} onClick={saveEvent}>{editingEvent ? "Update Event" : "Add Event"}</button>
            {editingEvent && <button style={S.btnSecondary} onClick={() => { setEditingEvent(null); setNewEvent({ title: "", date: "", venue: "", invitees: [] }); }}>Cancel</button>}
          </div>
        </div>
      </Sec>

      <Sec title="UPCOMING SESSIONS" theme={theme}>
        {(!state.events || state.events.length === 0) ? (
          <div style={{ textAlign: "center", color: theme.sub, padding: 20*z }}>No upcoming events.</div>
        ) : (
          [...state.events].sort((a,b) => new Date(a.date) - new Date(b.date)).map(ev => (
            <div key={ev.id} style={{ padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: theme.text }}>{ev.title}</div>
                  <div style={{ fontSize: 11*z, color: theme.accent }}>{new Date(ev.date).toLocaleString()} @ {ev.venue || "TBD"}</div>
                  {ev.invitees?.length > 0 && (
                    <div style={{ fontSize: 10*z, color: theme.sub, marginTop: 4*z }}>
                      Invited: {(ev.invitees || []).map(id => state.players.find(p=>p.id===id)?.name).filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4*z }}>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16*z }} onClick={() => startEdit(ev)}>✏️</button>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18*z }} onClick={() => {
                     const text = `🥒 Pickleball Session!\n📅 ${new Date(ev.date).toLocaleString()}\n📍 Venue: ${ev.venue || "TBD"}\n\nJoin us for: ${ev.title}`;
                     if (navigator.share) navigator.share({ title: "Pickleball", text });
                     else { navigator.clipboard.writeText(text); alert("Copied!"); }
                  }}>📤</button>
                  {state.isAdmin && (
                    <button style={{ background: "transparent", border: "none", color: "#e05050", cursor: "pointer", fontSize: 16*z }} onClick={() => setPendingDelete(ev.id)}>✕</button>
                  )}
                </div>
              </div>
              {pendingDelete === ev.id && <ConfirmInline msg="Delete this event?" onConfirm={() => deleteEvent(ev.id)} onCancel={() => setPendingDelete(null)} theme={theme} danger />}
            </div>
          ))
        )}
      </Sec>
    </div>
  );
}