import React, { useState } from 'react';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';
import { genId } from '../engine.js';

export default function Events({ state, set, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [newEvent, setNewEvent] = useState({ title: "", date: "", venue: "" });

  const addEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    set(s => ({
      ...s,
      events: [...(s.events || []), { ...newEvent, id: genId() }]
    }));
    setNewEvent({ title: "", date: "", venue: "" });
  };

  const deleteEvent = (id) => {
    set(s => ({ ...s, events: (s.events || []).filter(e => e.id !== id) }));
  };

  return (
    <div style={S.view}>
      <Sec title="CREATE NEW EVENT" theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8*z }}>
          <input style={S.input} placeholder="Event Name (e.g. Saturday Round Robin)" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
          <input style={S.input} type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
          <input style={S.input} placeholder="Venue" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} />
          <button style={{...S.btnPrimary, marginTop: 4*z}} onClick={addEvent}>Add Event</button>
        </div>
      </Sec>

      <Sec title="UPCOMING SESSIONS" theme={theme}>
        {(state.events || []).length === 0 ? (
          <div style={{ textAlign: "center", color: theme.sub, padding: 20*z }}>No upcoming events.</div>
        ) : (
          (state.events || []).sort((a,b) => new Date(a.date) - new Date(b.date)).map(ev => (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <div style={{ fontWeight: 700, color: theme.text }}>{ev.title}</div>
                <div style={{ fontSize: 11*z, color: theme.accent }}>{new Date(ev.date).toLocaleString()} @ {ev.venue || "TBD"}</div>
              </div>
              <button style={{ background: "transparent", border: "none", color: "#e05050", cursor: "pointer", fontSize: 16*z }} onClick={() => deleteEvent(ev.id)}>✕</button>
            </div>
          ))
        )}
      </Sec>
    </div>
  );
}