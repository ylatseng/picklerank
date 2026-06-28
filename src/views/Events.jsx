import React, { useState, useMemo, useEffect } from 'react';
import { makeS } from '../styles.js';
import { Sec, ConfirmInline, usePersistentFormState } from '../components/Shared.jsx';
import { t, genId, getLang } from '../engine.js';

// Register service worker and schedule a notification for an event
async function scheduleEventNotification(event) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  // Notify 1 hour before the event
  const eventTime = new Date(event.date).getTime();
  const notifyAt = eventTime - 60 * 60 * 1000;
  if (notifyAt <= Date.now()) return;
  reg.active?.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    title: `🥒 Pickleball in 1 hour: ${event.title}`,
    body: `📍 ${event.venue || 'TBD'} · Tap to open PickleRank`,
    tag: `pr-event-${event.id}`,
    timestamp: notifyAt
  });
}

const toYYYYMMDD = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};


// Format event date respecting app language
function fmtEventDate(iso, opts = {}) {
  const lang = getLang();
  const d = new Date(iso);
  if (lang === "zh_tw" || lang === "zh_cn") {
    const dayNames = ["日","一","二","三","四","五","六"];
    const pad = n => String(n).padStart(2, "0");
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const min = pad(d.getMinutes());
    const ampm = hour < 12 ? "上午" : "下午";
    const hr = hour % 12 || 12;
    return `${d.getFullYear()}年${month}月${day}日（${dayNames[d.getDay()]}）${ampm}${hr}:${min}`;
  }
  const defaultOpts = {weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'};
  return d.toLocaleString([], {...defaultOpts, ...opts});
}
export default function Events({ state, set, theme, isAdmin, user, nav, onStartSession }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [qrEvent, setQrEvent] = useState(null); // event id showing QR

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
  const [expandedEvents, setExpandedEvents] = useState({});
  const [notifPerm, setNotifPerm] = useState(() => {
    try { if (localStorage.getItem("ql_notif_suppressed")) return "suppressed"; } catch {}
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });

  // Register service worker once on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-notifications.js').catch(() => {});
    }
  }, []);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      // Schedule notifications for all upcoming events
      const upcoming = (state.events || []).filter(e => new Date(e.date) > new Date());
      upcoming.forEach(scheduleEventNotification);
    }
  };

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
    const savedEvent = editingEvent
      ? { ...newEvent, id: editingEvent.id }
      : { ...newEvent, id: genId() };
    set(s => ({
      ...s,
      events: editingEvent
        ? (s.events || []).map(e => e.id === editingEvent.id ? savedEvent : e)
        : [...(s.events || []), savedEvent]
    }));
    // Schedule push notification for the event (1h before)
    scheduleEventNotification(savedEvent);
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
  const monthNames = [
    t("month_jan")||"Jan", t("month_feb")||"Feb", t("month_mar")||"Mar", t("month_apr")||"Apr",
    t("month_may")||"May", t("month_jun")||"Jun", t("month_jul")||"Jul", t("month_aug")||"Aug",
    t("month_sep")||"Sep", t("month_oct")||"Oct", t("month_nov")||"Nov", t("month_dec")||"Dec"
  ];

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
              {[t("day_sun")||'S', t("day_mon")||'M', t("day_tue")||'T', t("day_wed")||'W', t("day_thu")||'T', t("day_fri")||'F', t("day_sat")||'S'].map((d,i) => (
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

      {/* ── NOTIFICATION PERMISSION BANNER ──────────────────────────────── */}
      {notifPerm === 'default' && (
        <div style={{
          background: theme.accent + "11", border: `1px solid ${theme.accent}44`,
          borderRadius: 10*z, padding: `${10*z}px ${12*z}px`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10*z, marginBottom: 8*z
        }}>
          <div>
            <div style={{fontSize:12*z, fontWeight:700, color:theme.accent}}>🔔 Event Reminders</div>
            <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>Get notified 1 hour before each session</div>
          </div>
          <button onClick={requestNotifPermission} style={{
            background: theme.accent, border: "none", borderRadius: 8*z,
            color: "#fff", fontSize: 12*z, fontWeight:700, padding:`${6*z}px ${12*z}px`,
            cursor:"pointer", flexShrink:0
          }}>Enable</button>
        </div>
      )}
      {notifPerm === 'granted' && (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"rgba(80,200,120,0.1)", border:"1px solid rgba(80,200,120,0.3)",
          borderRadius:8*z, padding:`${8*z}px ${12*z}px`, marginBottom:8*z
        }}>
          <div style={{fontSize:11*z, color:"#50c878", fontWeight:600}}>
            🔔 {t("reminders_on")||"Reminders on"}
          </div>
          <button onClick={async () => {
            // Can't revoke Notification permission via JS (browser security).
            // Store user preference to suppress notification scheduling.
            try { localStorage.setItem("ql_notif_suppressed","1"); } catch {}
            setNotifPerm("suppressed");
          }} style={{
            fontSize:11*z, background:"transparent",
            border:"1px solid rgba(80,200,120,0.4)", borderRadius:6*z,
            color:"#50c878", cursor:"pointer", padding:`${3*z}px ${8*z}px`
          }}>
            {t("reminders_off")||"Turn off"}
          </button>
        </div>
      )}
      {notifPerm === 'suppressed' && (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:theme.card, border:`1px solid ${theme.border}`,
          borderRadius:8*z, padding:`${8*z}px ${12*z}px`, marginBottom:8*z
        }}>
          <div style={{fontSize:11*z, color:theme.sub}}>🔕 Reminders off</div>
          <button onClick={async () => {
            try { localStorage.removeItem("ql_notif_suppressed"); } catch {}
            setNotifPerm(Notification.permission);
          }} style={{
            fontSize:11*z, background:"transparent",
            border:`1px solid ${theme.border}`, borderRadius:6*z,
            color:theme.accent, cursor:"pointer", padding:`${3*z}px ${8*z}px`
          }}>
            {t("enable")||"Turn on"}
          </button>
        </div>
      )}

      {/* ── 3. EVENT LIST ─────────────────────────────────────────────────── */}
      <Sec title={headerTitle} theme={theme}>
        {filteredEvents.length === 0 ? (
          <div style={{textAlign:"center", color:theme.sub, padding:20*z}}>
            {eventSearch ? (t("no_events_match") || "No events match your search.")
                         : (t("no_scheduled_sessions") || "No events scheduled.")}
          </div>
        ) : (
          filteredEvents.map(ev => {
            const isExpanded = expandedEvents[ev.id];
            const myId = user?.myPlayerId;
            const myRsvp = ev.rsvps?.[myId];
            const rsvpCounts = { going: 0, maybe: 0, declined: 0 };
            Object.values(ev.rsvps || {}).forEach(r => { if (rsvpCounts[r] !== undefined) rsvpCounts[r]++; });

            const setRsvp = (status) => {
              set(s => ({
                ...s,
                events: (s.events || []).map(e => {
                  if (e.id !== ev.id) return e;
                  const rsvps = { ...(e.rsvps || {}) };
                  if (rsvps[myId] === status) delete rsvps[myId]; // toggle off
                  else rsvps[myId] = status;
                  return { ...e, rsvps };
                })
              }));
            };

            const rsvpOptions = [
              { status: "going",    emoji: "✅", label: t("going")||"Going" },
              { status: "maybe",    emoji: "❓", label: t("maybe")||"Maybe" },
              { status: "declined", emoji: "❌", label: t("cant")||"Can't" },
            ];

            const isPast = new Date(ev.date) < new Date();
            return (
              <div key={ev.id} style={{
                borderBottom:`1px solid ${theme.border}`,
                paddingBottom:10*z, marginBottom:2*z,
                opacity: isPast ? 0.7 : 1
              }}>
                {/* ── Collapsed header — always visible ── */}
                <div
                  onClick={() => setExpandedEvents(prev => ({...prev, [ev.id]: !prev[ev.id]}))}
                  style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:`${10*z}px 0`, cursor:"pointer", gap:8*z}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:6*z}}>
                      <div style={{fontWeight:800, fontSize:14*z, color: isPast ? theme.sub : theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {ev.title}
                      </div>
                      {isPast && (
                        <span style={{fontSize:9*z, fontWeight:700, color:theme.sub,
                          border:`1px solid ${theme.border}`, borderRadius:4*z,
                          padding:`${1*z}px ${4*z}px`, flexShrink:0, textTransform:"uppercase"}}>
                          {t("event_past")||"Past"}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11*z, color: isPast ? theme.sub : theme.accent, marginTop:2*z, fontWeight:600}}>
                      📅 {fmtEventDate(ev.date)}
                      {rsvpCounts.going > 0 && <span style={{marginLeft:8*z, color:"#50c878"}}>· {rsvpCounts.going} {t("going")||"going"}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:12*z, color:theme.sub, transform: isExpanded?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0}}>▾</span>
                </div>

                {/* ── RSVP pills — always visible if invited or logged in ── */}
                {myId && (
                  <div style={{display:"flex", gap:6*z, marginBottom:6*z}}>
                    {rsvpOptions.map(opt => (
                      <button key={opt.status}
                        onClick={e => { e.stopPropagation(); setRsvp(opt.status); }}
                        style={{
                          padding:`${4*z}px ${10*z}px`, borderRadius:20*z, fontSize:11*z,
                          fontWeight: myRsvp === opt.status ? 800 : 500,
                          border:`1px solid ${myRsvp === opt.status ? theme.accent : theme.border}`,
                          background: myRsvp === opt.status ? theme.accent+"22" : "transparent",
                          color: myRsvp === opt.status ? theme.accent : theme.sub,
                          cursor:"pointer"
                        }}>
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Expanded details ── */}
                {isExpanded && (
                  <div style={{paddingBottom:6*z}}>
                    <div style={{fontSize:11*z, color:theme.sub, marginBottom:4*z}}>📍 {ev.venue || t("tbd")}</div>
                    {ev.notes && (
                      <div style={{fontSize:11*z, color:theme.sub, marginBottom:8*z, fontStyle:"italic",
                        paddingLeft:8*z, borderLeft:`2px solid ${theme.border}`}}>
                        📝 {ev.notes}
                      </div>
                    )}

                    {/* Invitee list with RSVP statuses */}
                    {ev.invitees?.length > 0 && (
                      <div style={{marginTop:8*z}}>
                        <div style={{fontSize:10*z, color:theme.sub, fontWeight:700, marginBottom:6*z, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                          {t("invited")||"Invited"} ({ev.invitees.length})
                        </div>
                        <div style={{display:"flex", flexWrap:"wrap", gap:4*z}}>
                          {ev.invitees.map(id => {
                            const p = state.players.find(pl => pl.id === id);
                            if (!p) return null;
                            const rsvp = ev.rsvps?.[id];
                            const rsvpEmoji = rsvp === "going" ? "✅" : rsvp === "maybe" ? "❓" : rsvp === "declined" ? "❌" : "•";
                            return (
                              <div key={id} style={{
                                background:theme.bg, border:`1px solid ${
                                  rsvp === "going" ? "#50c87866" : rsvp === "maybe" ? theme.accent+"66" : theme.border
                                }`,
                                borderRadius:12*z, padding:"3px 8px", fontSize:10*z,
                                color: rsvp === "going" ? "#50c878" : rsvp === "declined" ? "#e05050" : theme.text,
                                display:"flex", gap:3*z, alignItems:"center"
                              }}>
                                <span>{rsvpEmoji}</span>
                                <span>{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{display:"flex", gap:8*z, marginTop:12*z, alignItems:"center", flexWrap:"wrap"}}>
                      {/* Start Session — pre-fills Quick Log with event attendees */}
                      {!isPast && onStartSession && ev.invitees?.length >= 2 && (
                        <button style={{
                          ...S.btnPrimary, marginTop:0, flex:"1 1 auto",
                          display:"flex", alignItems:"center", justifyContent:"center", gap:6*z
                        }} onClick={() => onStartSession(ev.invitees)}>
                          ▶ {t("create_session")||"Start Session"}
                        </button>
                      )}
                      {/* QR check-in — admin shows QR so players self-select */}
                      {!isPast && isAdmin && ev.invitees?.length >= 2 && (
                        <button style={{
                          background:"transparent", border:`1px solid ${theme.border}`,
                          borderRadius:8*z, color:theme.sub, cursor:"pointer",
                          padding:`${6*z}px ${10*z}px`, fontSize:12*z
                        }} onClick={() => setQrEvent(qrEvent === ev.id ? null : ev.id)}>
                          📱 QR
                        </button>
                      )}
                      {/* QR code display */}
                      {qrEvent === ev.id && (() => {
                        const base = window.location.origin + window.location.pathname;
                        const ids = ev.invitees.join(",");
                        const checkInUrl = `${base}?checkin=${encodeURIComponent(ids)}`;
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(checkInUrl)}`;
                        return (
                          <div style={{width:"100%", marginTop:8*z, textAlign:"center", padding:`${10*z}px`, background:theme.bg, borderRadius:10*z}}>
                            <div style={{fontSize:11*z, color:theme.sub, marginBottom:8*z}}>
                              📱 Players scan to auto-join Today's Players
                            </div>
                            <img src={qrUrl} alt="Check-in QR" style={{width:160*z, height:160*z, borderRadius:8*z}} />
                            <div style={{fontSize:10*z, color:theme.sub, marginTop:6*z}}>
                              {ev.invitees.length} invited · tap ✕ to close
                            </div>
                          </div>
                        );
                      })()}
                      <button style={{background:theme.card, border:`1px solid ${theme.border}`,
                        borderRadius:6*z, color:theme.text, cursor:"pointer", padding:"6px 10px", fontSize:12*z}}
                        onClick={() => startEdit(ev)}>✏️ Edit</button>
                      <button style={{background:theme.accent, border:"none", borderRadius:6*z,
                        color:theme.invert ? "#fff" : "#000", cursor:"pointer", padding:"6px 10px",
                        fontSize:12*z, fontWeight:"bold"}}
                        onClick={() => {
                          const goingNames = ev.invitees?.filter(id => ev.rsvps?.[id] === "going").map(id => state.players.find(p=>p.id===id)?.name).filter(Boolean).join(", ");
                          const text = `🥒 Pickleball: ${ev.title}\n📅 ${fmtEventDate(ev.date)}\n📍 ${ev.venue || "TBD"}${goingNames ? `\n✅ Going: ${goingNames}` : ""}${ev.notes ? `\n📝 ${ev.notes}` : ""}`;
                          if (navigator.share) navigator.share({ title:"Pickleball", text });
                          else { navigator.clipboard.writeText(text); alert("Copied!"); }
                        }}>📤</button>

                      {/* Notify attendees — sends a push notification to anyone who has enabled reminders */}
                      {isAdmin && ev.invitees?.length > 0 && notifPerm === 'granted' && (
                        <button style={{background:"transparent", border:`1px solid ${theme.accent}`,
                          borderRadius:6*z, color:theme.accent, cursor:"pointer", padding:"6px 10px", fontSize:12*z, fontWeight:600}}
                          onClick={async () => {
                            if (!('serviceWorker' in navigator)) { alert("Notifications not supported."); return; }
                            const reg = await navigator.serviceWorker.ready;
                            const goingIds = ev.invitees?.filter(id => ev.rsvps?.[id] === "going") || ev.invitees || [];
                            const names = goingIds.map(id => state.players.find(p=>p.id===id)?.name?.split(" ")[0]).filter(Boolean).join(", ");
                            const eventDate = new Date(ev.date);
                            const body = `📅 ${fmtEventDate(eventDate.toISOString())}\n📍 ${ev.venue || "TBD"}${names ? `\n✅ Going: ${names}` : ""}`;
                            reg.active?.postMessage({
                              type: 'SCHEDULE_NOTIFICATION',
                              title: `🥒 Reminder: ${ev.title}`,
                              body,
                              tag: `pr-remind-${ev.id}-${Date.now()}`,
                              timestamp: Date.now() + 1000 // fire in 1 second
                            });
                            alert(`Notification sent! ${goingIds.length} attendee${goingIds.length!==1?"s":""} will be notified.`);
                          }}>
                          🔔 Notify
                        </button>
                      )}

                      {isAdmin && pendingDelete !== ev.id && (
                        <button style={{background:"transparent", border:"none", color:"#e05050",
                          cursor:"pointer", fontSize:11*z, textDecoration:"underline", marginLeft:"auto"}}
                          onClick={() => setPendingDelete(ev.id)}>{t("delete_event") || "Delete"}</button>
                      )}
                    </div>

                    {isAdmin && pendingDelete === ev.id && (
                      <ConfirmInline msg={t("delete_match_q") || "Delete?"} onConfirm={() => deleteEvent(ev.id)} onCancel={() => setPendingDelete(null)} theme={theme} danger />
                    )}
                  </div>
                )}
              </div>
            );
          })
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
