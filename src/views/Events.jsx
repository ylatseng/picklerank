import React, { useState, useMemo } from 'react';
import { makeS } from '../styles.js';
import { Sec, ConfirmInline, usePersistentFormState } from '../components/Shared.jsx';
import { t, genId } from '../engine.js';

const toYYYYMMDD = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};

export default function Events({ state, set, theme, isAdmin }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  // Form state persists in sessionStorage so accidental tab-aways don't lose progress.
  // Cleared on successful save (or when user closes the form with ✕).
  const [newEvent, setNewEvent, clearNewEvent] = usePersistentFormState(
    "events:newEvent", { title: "", date: "", venue: "", notes: "", invitees: [] }
  );
  const [editingEvent, setEditingEvent] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");      // in the create form
  const [eventSearch, setEventSearch] = useState("");        // main page event search
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [calendarMode, setCalendarMode] = useState("month");

  // ── Save / Edit / Delete ────────────────────────────────────────────────
  const saveEvent = () => {
    // Validate required fields
    const missing = [];
    if (!newEvent.title?.trim()) missing.push(t("event_name") || "Event Name");
    if (!newEvent.date)          missing.push(t("date_time_lbl") || "Date & Time");
    if (!newEvent.venue?.trim()) missing.push(t("venue") || "Venue");
    if (missing.length) {
      setFormError((t("required_fields_msg") || "Please fill in:") + " " + missing.join(", "));
      return;
    }
    setFormError("");
    set(s => ({
      ...s,
      events: editingEvent
        ? (s.events || []).map(e => e.id === editingEvent.id ? { ...newEvent, id: editingEvent.id } : e)
        : [...(s.events || []), { ...newEvent, id: genId() }]
    }));
    setEditingEvent(null);
    clearNewEvent();
    setShowForm(false);
  };

  const startEdit = (ev) => {
    setEditingEvent(ev);
    setNewEvent({ title: ev.title, date: ev.date, venue: ev.venue || "", notes: ev.notes || "", invitees: ev.invitees || [] });
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

  // ── Calendar helpers ────────────────────────────────────────────────────
  const cYear = cursorDate.getFullYear();
  const cMonth = cursorDate.getMonth();
  const todayStr = toYYYYMMDD(new Date());
  const firstDayOfWeek = new Date(cYear, cMonth, 1).getDay();
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const prevCal = () => calendarMode === "year"
    ? setCursorDate(new Date(cYear - 1, cMonth, 1))
    : setCursorDate(new Date(cYear, cMonth - 1, 1));
  const nextCal = () => calendarMode === "year"
    ? setCursorDate(new Date(cYear + 1, cMonth, 1))
    : setCursorDate(new Date(cYear, cMonth + 1, 1));

  // Count events per day for activity dots
  const eventCountsByDay = useMemo(() => {
    const counts = {};
    (state.events || []).forEach(e => {
      if (!e.date) return;
      const dStr = toYYYYMMDD(e.date);
      counts[dStr] = (counts[dStr] || 0) + 1;
    });
    return counts;
  }, [state.events]);

  // ── Search + Filter pipeline ────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return (state.events || []).filter(ev => {
      // Calendar filtering
      if (ev.date) {
        const eDate = new Date(ev.date);
        if (selectedDateStr) {
          if (toYYYYMMDD(eDate) !== selectedDateStr) return false;
        } else {
          if (eDate.getFullYear() !== cYear || eDate.getMonth() !== cMonth) return false;
        }
      }
      // Search filtering — title, venue, notes, OR invitee player names
      if (q) {
        const haystack = [
          ev.title || "",
          ev.venue || "",
          ev.notes || "",
          ...(ev.invitees || []).map(id => state.players?.find(p => p.id === id)?.name || "")
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [state.events, state.players, eventSearch, selectedDateStr, cYear, cMonth]);

  // Sort: starred players first (still alphabetically within each group), then everyone else alphabetically
  const favored = new Set(state.favoredPlayerIds || []);
  const sortedPlayers = [...(state.players || [])]
    .filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
    .sort((a, b) => {
      const aFav = favored.has(a.id), bFav = favored.has(b.id);
      if (aFav !== bFav) return aFav ? -1 : 1;     // starred above unstarred
      return a.name.localeCompare(b.name);          // alphabetical within group
    });

  const mobileDateFix = newEvent.date ? newEvent.date.slice(0, 16) : "";

  const headerTitle = (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span>{selectedDateStr
        ? `📅 ${new Date(selectedDateStr+'T00:00').toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}`
        : `${monthNames[cMonth]} ${cYear} ${t("events") || "Events"}`}
      </span>
      {!showForm && (
        <button
          onClick={() => {
            setEditingEvent(null);
            const defaultDate = selectedDateStr ? `${selectedDateStr}T18:00` : "";
            setNewEvent({ title:"", date: defaultDate, venue:"", notes:"", invitees:[] });
            setShowForm(true);
          }}
          style={{ background: theme.accent, color: theme.invert ? "#fff" : "#0d1a10",
            border:"none", borderRadius:6*z, padding:"4px 12px", fontSize:11*z,
            fontWeight:800, cursor:"pointer" }}>
          + {t("new_session") || "New"}
        </button>
      )}
    </div>
  );

  return (
    <div style={S.view}>

      {/* ── 1. CALENDAR ───────────────────────────────────────────────────── */}
      <Sec theme={theme}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16*z}}>
          <button style={{...S.iconBtn, fontSize:16*z}} onClick={prevCal}>&lt;</button>
          <button style={{background:"transparent", border:"none", color:theme.text, fontSize:15*z, fontWeight:800, cursor:"pointer", textTransform:"uppercase", letterSpacing:"1px"}}
            onClick={() => setCalendarMode(m => m === "month" ? "year" : "month")}>
            {calendarMode === "month" ? `${monthNames[cMonth]} ${cYear}` : cYear} ▾
          </button>
          <button style={{...S.iconBtn, fontSize:16*z}} onClick={nextCal}>&gt;</button>
        </div>

        {calendarMode === "month" ? (
          <div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4*z, marginBottom:8*z}}>
              {['S','M','T','W','T','F','S'].map((d,i) => (
                <div key={i} style={{textAlign:"center", fontSize:11*z, fontWeight:700, color:theme.sub}}>{d}</div>
              ))}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4*z}}>
              {Array.from({length: firstDayOfWeek}).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const day = i + 1;
                const dStr = `${cYear}-${String(cMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isSelected = selectedDateStr === dStr;
                const isToday = todayStr === dStr;
                const count = eventCountsByDay[dStr] || 0;
                return (
                  <div key={day} style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:0}}>
                    <button onClick={() => setSelectedDateStr(isSelected ? null : dStr)} style={{
                      width:"100%", maxWidth:36*z, aspectRatio:"1 / 1",
                      borderRadius:"50%",
                      border: isToday && !isSelected ? `1px solid ${theme.accent}` : "none",
                      background: isSelected ? theme.accent : "transparent",
                      color: isSelected ? theme.bg : theme.text,
                      fontSize:13*z, fontWeight: isSelected || isToday ? 800 : 500,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0
                    }}>{day}</button>
                    <div style={{height:4*z, marginTop:2*z}}>
                      {count > 0 && <div style={{width:4*z, height:4*z, borderRadius:"50%", background: isSelected ? theme.bg : theme.accent}} />}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedDateStr && (
              <button onClick={() => setSelectedDateStr(null)} style={{
                marginTop:12*z, width:"100%", padding:"6px", background:"transparent",
                border:`1px solid ${theme.border}`, borderRadius:8*z, color:theme.sub,
                fontSize:11*z, cursor:"pointer"
              }}>{t("clear_date_filter") || "Show all events this month"}</button>
            )}
          </div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12*z}}>
            {monthNames.map((mName, i) => (
              <button key={i} onClick={() => { setCursorDate(new Date(cYear, i, 1)); setCalendarMode("month"); }}
                style={{
                  background: cMonth === i ? theme.accent : theme.bg,
                  color: cMonth === i ? theme.bg : theme.text,
                  border:`1px solid ${cMonth === i ? theme.accent : theme.border}`,
                  borderRadius:8*z, padding:"12px 0", fontSize:13*z, fontWeight:700, cursor:"pointer"
                }}>{mName}</button>
            ))}
          </div>
        )}
      </Sec>

      {/* ── 2. SEARCH BAR ─────────────────────────────────────────────────── */}
      <Sec theme={theme}>
        <input style={S.input}
          placeholder={t("event_search_placeholder") || "Search events by name, notes, or player..."}
          value={eventSearch}
          onChange={e => setEventSearch(e.target.value)} />
      </Sec>

      {/* ── 3. EVENT LIST ─────────────────────────────────────────────────── */}
      <Sec title={headerTitle} theme={theme}>
        {filteredEvents.length === 0 ? (
          <div style={{textAlign:"center", color:theme.sub, padding:20*z}}>
            {eventSearch ? (t("no_events_match") || "No events match your search.")
                         : (t("no_scheduled_sessions") || "No events scheduled.")}
          </div>
        ) : (
          filteredEvents.map(ev => (
            <div key={ev.id} style={{padding:"14px 0", borderBottom:`1px solid ${theme.border}`}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:800, fontSize:15*z, color:theme.text}}>{ev.title}</div>
                  <div style={{fontSize:12*z, color:theme.accent, marginTop:4*z, fontWeight:600}}>
                    📅 {new Date(ev.date).toLocaleString([], {weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                  </div>
                  <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>📍 {ev.venue || t("tbd")}</div>
                  {ev.notes && (
                    <div style={{fontSize:11*z, color:theme.sub, marginTop:6*z, fontStyle:"italic", paddingLeft:6*z, borderLeft:`2px solid ${theme.border}`}}>
                      📝 {ev.notes}
                    </div>
                  )}
                </div>
                <div style={{display:"flex", gap:8*z, flexShrink:0, marginLeft:8*z}}>
                  {/* Edit is open to all users; delete remains admin-only below */}
                  <button style={{background:theme.card, border:`1px solid ${theme.border}`, borderRadius:6*z, color:theme.text, cursor:"pointer", padding:"6px 10px", fontSize:12*z}}
                    onClick={() => startEdit(ev)}>✏️</button>
                  <button style={{background:theme.accent, border:"none", borderRadius:6*z, color:theme.invert ? "#fff" : "#000", cursor:"pointer", padding:"6px 10px", fontSize:12*z, fontWeight:"bold"}}
                    onClick={() => {
                      const text = `🥒 Pickleball: ${ev.title}\n📅 ${new Date(ev.date).toLocaleString()}\n📍 ${ev.venue}${ev.notes ? `\n📝 ${ev.notes}` : ''}`;
                      if (navigator.share) navigator.share({ title:"Pickleball", text });
                      else { navigator.clipboard.writeText(text); alert("Copied!"); }
                    }}>📤</button>
                </div>
              </div>

              {ev.invitees?.length > 0 && (
                <div style={{marginTop:12*z, display:"flex", alignItems:"center", gap:8*z, flexWrap:"wrap"}}>
                  <div style={{fontSize:11*z, color:theme.sub}}>{ev.invitees.length} {t("invited")}:</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:4*z}}>
                    {ev.invitees.map(id => {
                      const p = state.players.find(pl => pl.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:12*z, padding:"2px 8px", fontSize:10*z, color:theme.text}}>
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
                <div style={{marginTop:10*z, textAlign:"right"}}>
                  <button style={{background:"transparent", border:"none", color:"#e05050", cursor:"pointer", fontSize:11*z, textDecoration:"underline"}}
                    onClick={() => setPendingDelete(ev.id)}>{t("delete_event") || "Delete Event"}</button>
                </div>
              )}
            </div>
          ))
        )}
      </Sec>

      {/* ── 4. CREATE/EDIT MODAL ──────────────────────────────────────────── */}
      {showForm && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, overflowY:"auto", padding:`${20*z}px ${16*z}px`, display:"flex", alignItems:"flex-start", justifyContent:"center"}}>
          <div style={{background:theme.card, border:`1px solid ${theme.border}`, borderRadius:16*z, padding:24*z, width:"100%", maxWidth:480*z, boxShadow:"0 10px 30px rgba(0,0,0,0.5)"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20*z}}>
              <div style={{fontSize:18*z, fontWeight:800, color:theme.text}}>
                {editingEvent ? t("edit_session") : t("new_session")}
              </div>
              <button style={{background:"transparent", border:"none", color:theme.sub, fontSize:20*z, cursor:"pointer"}}
                onClick={() => { setShowForm(false); setEditingEvent(null); setFormError(""); }}>✕</button>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
              <div>
                <label style={S.label}>{t("event_name")} <span style={{color:"#e05050"}}>*</span></label>
                <input style={S.input} placeholder={t("event_name")} value={newEvent.title}
                  onChange={e => { setNewEvent({...newEvent, title: e.target.value}); if (formError) setFormError(""); }} />
              </div>
              <div>
                <label style={S.label}>{t("date_time_lbl") || "Date & Time"} <span style={{color:"#e05050"}}>*</span></label>
                <input style={{...S.input, width:"100%", boxSizing:"border-box", maxWidth:"100%"}}
                  type="datetime-local" value={mobileDateFix}
                  onChange={e => { setNewEvent({...newEvent, date: e.target.value}); if (formError) setFormError(""); }} />
              </div>
              <div>
                <label style={S.label}>{t("venue") || "Venue"} <span style={{color:"#e05050"}}>*</span></label>
                <input style={{...S.input, width:"100%", boxSizing:"border-box"}}
                  placeholder={t("venue")} value={newEvent.venue}
                  onChange={e => { setNewEvent({...newEvent, venue: e.target.value}); if (formError) setFormError(""); }} />
              </div>
              <div>
                <label style={S.label}>{t("notes_lbl") || "Notes"}</label>
                <textarea style={{...S.input, minHeight:60*z, resize:"vertical", fontFamily:"inherit"}}
                  placeholder={t("notes_placeholder") || "Optional notes about the event..."}
                  value={newEvent.notes}
                  onChange={e => setNewEvent({...newEvent, notes: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>{t("invite_players")}</label>
                <div style={{display:"flex", flexWrap:"wrap", gap:6*z, marginBottom:10*z, minHeight:28*z}}>
                  {newEvent.invitees.length === 0 && <span style={{fontSize:12*z, color:theme.sub, fontStyle:"italic", padding:"4px 0"}}>{t("no_players_selected") || "No players selected..."}</span>}
                  {newEvent.invitees.map(id => {
                    const p = state.players.find(x => x.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} onClick={() => toggleInvitee(id)}
                        style={{background:theme.accent+"22", border:`1px solid ${theme.accent}`, color:theme.accent, padding:"4px 10px", borderRadius:16*z, fontSize:11*z, fontWeight:"bold", display:"flex", alignItems:"center", gap:6*z, cursor:"pointer"}}>
                        {p.name} ✕
                      </div>
                    );
                  })}
                </div>
                <input style={{...S.input, marginBottom:8*z, padding:"8px 12px", fontSize:13*z}}
                  placeholder={t("search_roster") || "Search roster..."}
                  value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} />
                <div style={{maxHeight:180*z, overflowY:"auto", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z}}>
                  {sortedPlayers.map(p => {
                    const isSel = newEvent.invitees.includes(p.id);
                    const isFav = favored.has(p.id);
                    return (
                      <div key={p.id} onClick={() => toggleInvitee(p.id)}
                        style={{padding:"10px 14px", borderBottom:`1px solid ${theme.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14*z, cursor:"pointer", background: isSel ? theme.accent+"11" : "transparent"}}>
                        <span style={{color:theme.text, fontWeight: isSel ? 700 : 400, display:"flex", alignItems:"center", gap:6*z}}>
                          {isFav && <span style={{color:"#f0c040", fontSize:12*z}}>★</span>}
                          {p.name}
                        </span>
                        <span style={{color: isSel ? theme.accent : theme.sub, fontSize:16*z}}>{isSel ? "✓" : "+"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div style={{
                  background:"rgba(224,80,80,0.1)", border:"1px solid #e0505044",
                  color:"#e05050", padding:`${8*z}px ${12*z}px`, borderRadius:8*z,
                  fontSize:12*z, fontWeight:600
                }}>
                  ⚠️ {formError}
                </div>
              )}

              <button style={{...S.btnPrimary, padding:"14px", borderRadius:10*z, fontSize:15*z, marginTop:8*z}} onClick={saveEvent}>
                {editingEvent ? t("save_changes") : t("create_session")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
