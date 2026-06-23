import React, { useState } from 'react';
import { makeS } from '../styles.js';
import { Sec, ConfirmInline, Avatar } from '../components/Shared.jsx';
import { t, genId } from '../engine.js';

export default function Events({ state, set, theme, isAdmin }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  const [newEvent, setNewEvent] = useState({ title: "", date: "", venue: "", invitees: [] });
  const [editingEvent, setEditingEvent] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showForm, setShowForm] = useState(false); 
  const [search, setSearch] = useState(""); 

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
    setShowForm(false);
  };

  const startEdit = (ev) => {
    setEditingEvent(ev);
    setNewEvent({ title: ev.title, date: ev.date, venue: ev.venue, invitees: ev.invitees || [] });
    setShowForm(true);
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

  const toggleInvitee = (playerId) => {
    setNewEvent(prev => ({
      ...prev,
      invitees: prev.invitees.includes(playerId)
        ? prev.invitees.filter(id => id !== playerId)
        : [...prev.invitees, playerId]
    }));
  };

  const sortedPlayers = [...(state.players || [])]
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const mobileDateFix = newEvent.date ? newEvent.date.slice(0, 16) : "";

  // Custom Header containing the Add Button
  const headerTitle = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{t("upcoming_sessions")}</span>
      {!showForm && (
        <button 
          onClick={() => { 
            setEditingEvent(null); 
            setNewEvent({ title: "", date: "", venue: "", invitees: [] }); 
            setShowForm(true); 
          }} 
          style={{ 
            background: theme.accent, color: theme.invert ? "#fff" : "#0d1a10", 
            border: "none", borderRadius: 6*z, padding: "4px 12px", 
            fontSize: 11*z, fontWeight: 800, cursor: "pointer",
            textTransform: "none", letterSpacing: "normal"
          }}>
          + {t("new_session") || "New"}
        </button>
      )}
    </div>
  );

  return (
    <div style={S.view}>
      
      {/* 1. MAIN FEED (CONSUMPTION VIEW) */}
      <Sec title={headerTitle} theme={theme}>
        {(!state.events || state.events.length === 0) ? (
          <div style={{ textAlign: "center", color: theme.sub, padding: 20*z }}>{t("no_scheduled_sessions")}</div>
        ) : (
          [...state.events].sort((a,b) => new Date(a.date) - new Date(b.date)).map(ev => (
            <div key={ev.id} style={{ padding: "14px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15*z, color: theme.text }}>{ev.title}</div>
                  <div style={{ fontSize: 12*z, color: theme.accent, marginTop: 4*z, fontWeight: 600 }}>
                    📅 {new Date(ev.date).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} 
                  </div>
                  <div style={{ fontSize: 11*z, color: theme.sub, marginTop: 2*z }}>
                    📍 {ev.venue || t("tbd")}
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: 8*z }}>
                  <button style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 6*z, color: theme.text, cursor: "pointer", padding: "6px 10px", fontSize: 12*z }}
                    onClick={() => startEdit(ev)}>✏️ Edit</button>
                  <button style={{ background: theme.accent, border: "none", borderRadius: 6*z, color: theme.invert ? "#fff" : "#000", cursor: "pointer", padding: "6px 10px", fontSize: 12*z, fontWeight: "bold" }}
                    onClick={() => {
                      const text = `🥒 Pickleball: ${ev.title}\n📅 ${new Date(ev.date).toLocaleString()}\n📍 ${ev.venue}`;
                      if (navigator.share) navigator.share({ title: "Pickleball", text });
                      else { navigator.clipboard.writeText(text); alert("Copied!"); }
                    }}>📤 Share</button>
                </div>
              </div>
              
              {/* Stacked Avatars / Tokens for Invitees */}
              {ev.invitees?.length > 0 && (
                <div style={{ marginTop: 12*z, display: "flex", alignItems: "center", gap: 8*z }}>
                  <div style={{ fontSize: 11*z, color: theme.sub }}>{ev.invitees.length} {t("invited")}:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4*z }}>
                    {(ev.invitees || []).map(id => {
                      const p = state.players.find(pl => pl.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 12*z, padding: "2px 8px", fontSize: 10*z, color: theme.text, display: "flex", alignItems: "center" }}>
                          {p.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isAdmin && pendingDelete === ev.id && (
                <ConfirmInline msg={t("delete_match_q") || "Delete?"} onConfirm={() => deleteEvent(ev.id)} onCancel={() => setPendingDelete(null)} theme={theme} danger />
              )}
              {isAdmin && pendingDelete !== ev.id && (
                <div style={{ marginTop: 10*z, textAlign: "right" }}>
                  <button style={{ background: "transparent", border: "none", color: "#e05050", cursor: "pointer", fontSize: 11*z, textDecoration: "underline" }}
                    onClick={() => setPendingDelete(ev.id)}>Delete Event</button>
                </div>
              )}
            </div>
          ))
        )}
      </Sec>

      {/* 2. FULL-SCREEN CREATION MODAL */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, overflowY: "auto", padding: `${20*z}px ${16*z}px`, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16*z, padding: 24*z, width: "100%", maxWidth: 480*z, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", position: "relative" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20*z }}>
              <div style={{ fontSize: 18*z, fontWeight: 800, color: theme.text }}>
                {editingEvent ? t("edit_session") : t("new_session")}
              </div>
              <button style={{ background: "transparent", border: "none", color: theme.sub, fontSize: 20*z, cursor: "pointer" }} 
                onClick={() => { setShowForm(false); setEditingEvent(null); }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16*z }}>
              <div>
                <label style={S.label}>{t("event_name")}</label>
                <input style={S.input} placeholder={t("event_name")} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12*z }}>
                <div>
                  <label style={S.label}>{t("date_time_lbl") || "Date & Time"}</label>
                  {/* MOBILE FIX: Truncated ISO string directly inside the value prop */}
                  <input style={S.input} type="datetime-local" value={mobileDateFix} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                </div>
                <div>
                  <label style={S.label}>{t("venue") || "Venue"}</label>
                  <input style={S.input} placeholder={t("venue")} value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} />
                </div>
              </div>

              {/* TOKEN-BASED INVITES SECTION */}
              <div>
                <label style={S.label}>{t("invite_players")}</label>
                
                {/* Active Tokens (Chips) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6*z, marginBottom: 10*z, minHeight: 28*z }}>
                  {newEvent.invitees.length === 0 && <span style={{ fontSize: 12*z, color: theme.sub, fontStyle: "italic", padding: "4px 0" }}>No players selected...</span>}
                  {newEvent.invitees.map(id => {
                    const p = state.players.find(x => x.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} onClick={() => toggleInvitee(id)} 
                        style={{ background: theme.accent+"22", border: `1px solid ${theme.accent}`, color: theme.accent, padding: "4px 10px", borderRadius: 16*z, fontSize: 11*z, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6*z, cursor: "pointer" }}>
                        {p.name} ✕
                      </div>
                    );
                  })}
                </div>

                {/* Search & List */}
                <input style={{...S.input, marginBottom: 8*z, padding: "8px 12px", fontSize: 13*z}} placeholder="Search roster..." value={search} onChange={e => setSearch(e.target.value)} />
                
                <div style={{ maxHeight: 180*z, overflowY: 'auto', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8*z }}>
                  {sortedPlayers.map(p => {
                    const isSel = newEvent.invitees.includes(p.id);
                    return (
                      <div key={p.id} onClick={() => toggleInvitee(p.id)} 
                        style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14*z, cursor: "pointer", background: isSel ? theme.accent+"11" : "transparent" }}>
                        <span style={{ color: theme.text, fontWeight: isSel ? 700 : 400 }}>{p.name}</span>
                        <span style={{ color: isSel ? theme.accent : theme.sub, fontSize: 16*z }}>{isSel ? "✓" : "+"}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button style={{...S.btnPrimary, padding: "14px", borderRadius: 10*z, fontSize: 15*z, marginTop: 8*z}} onClick={saveEvent}>
                {editingEvent ? t("save_changes") : t("create_session")}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}