import React, { useState, useMemo, useCallback, useRef } from 'react';
import { t, genId, replayAllMatches, calcExpected, DEFAULT_RATING, sortOptionsAlpha, shortName } from '../engine.js';

// ── Quick Score Stepper ───────────────────────────────────────────────────────
function ScoreStepper({ value, onChange, color, label, z }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6*z }}>
      <div style={{ fontSize:10*z, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.5px" }}>
        {label}
      </div>
      <button
        onClick={() => onChange(Math.min(30, value + 1))}
        style={{ width:54*z, height:54*z, borderRadius:"50%", fontSize:26*z, fontWeight:900,
          background:color+"22", border:`2px solid ${color}`, color, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
        +
      </button>
      <div style={{ fontSize:52*z, fontWeight:900, color, lineHeight:1, minWidth:60*z, textAlign:"center" }}>
        {value}
      </div>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width:54*z, height:54*z, borderRadius:"50%", fontSize:26*z, fontWeight:900,
          background:"transparent", border:`2px solid ${color}66`, color:color+"99", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
        −
      </button>
    </div>
  );
}

// ── Player Pill ───────────────────────────────────────────────────────────────
function PlayerPill({ player, selected, color, onToggle, z }) {
  return (
    <button onClick={onToggle} style={{
      padding:`${5*z}px ${10*z}px`, borderRadius:20*z,
      fontSize:12*z, fontWeight:700, cursor:"pointer",
      border:`2px solid ${selected ? color : "#88888844"}`,
      background: selected ? color+"22" : "transparent",
      color: selected ? color : "#888",
      transition:"all 0.15s"
    }}>
      {shortName(player.name, "always")}
    </button>
  );
}

// ── How-to Hint Banner (collapsible) ─────────────────────────────────────────
function QuickLogHint({ theme }) {
  const z = theme.zoom || 1.0;
  const [showHint, setShowHint] = React.useState(false);
  return (
    <div style={{marginBottom:12*z, background:theme.accent+"0d", border:`1px solid ${theme.accent}33`, borderRadius:8*z, overflow:"hidden"}}>
      <button onClick={()=>setShowHint(h=>!h)} style={{
        width:"100%", background:"transparent", border:"none", cursor:"pointer",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:`${7*z}px ${10*z}px`
      }}>
        <span style={{fontSize:11*z, fontWeight:700, color:theme.accent}}>💡 {t("how_to_use_ql")||"How to use Quick Log"}</span>
        <span style={{fontSize:10*z, color:theme.sub, transform:showHint?"rotate(180deg)":"none", transition:"transform 0.2s"}}>▾</span>
      </button>
      {showHint && (
        <div style={{padding:`0 ${10*z}px ${8*z}px`, fontSize:11*z, color:theme.sub, lineHeight:1.6}}>
          <div>1. {t("ql_step1")||"Select today's players from the checklist"}</div>
          <div>2. {t("ql_step2")||"Pick teams (T1 / T2) from your Today's Players"}</div>
          <div>3. {t("ql_step3")||"Tap + / − to set scores, or use preset buttons"}</div>
          <div>4. {t("ql_step4")||"Tap ⚡ Log Match — form resets for the next game"}</div>
          <div>5. {t("ql_step5")||"Tap ✕ when done for the session"}</div>
          <div style={{marginTop:6*z, color:theme.accent, fontSize:10*z}}>
            {t("ql_settings_hint")||"To hide the ⚡ button: Settings → 🎨 Appearance → Quick Log Button"}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Log Modal ───────────────────────────────────────────────────────────
export default function QuickLog({ players, state, set, theme, onClose, showUndo, prefill }) {
  const z = theme.zoom || 1.0;
  const T1_COLOR = theme.accent;
  const T2_COLOR = "#e05050";

  const [mode, setMode]   = useState(prefill?.mode || "custom"); // "custom" | "session"
  const [type, setType]   = useState(prefill?.type || "singles");   // "singles" | "doubles"
  const [t1ids, setT1ids] = useState(prefill?.t1ids || []);
  const [t2ids, setT2ids] = useState(prefill?.t2ids || []);
  const [scoreA, setA]    = useState(11);
  const [scoreB, setB]    = useState(0);

  // Session mode state — 4 players + 3 match scores
  const RR_MATCHUPS = [
    { t1: [0,1], t2: [2,3] },
    { t1: [0,2], t2: [1,3] },
    { t1: [0,3], t2: [1,2] },
  ];
  const [sessionIds, setSessionIds] = useState(["","","",""]);
  const [sessionScores, setSessionScores] = useState([{a:11,b:0},{a:11,b:0},{a:11,b:0}]);
  const [err, setErr]     = useState("");
  const [done, setDone]   = useState(false);
  const doneTimerRef      = useRef(null); // prevents race when logging two matches quickly

  // Sorted player list — starred first
  const sortedPlayers = useMemo(() =>
    sortOptionsAlpha(
      players.map(p => ({ value: p.id, label: p.name })),
      state.favoredPlayerIds || []
    ).map(o => players.find(p => p.id === o.value)).filter(Boolean),
  [players, state.favoredPlayerIds]);

  // "Today's players" filter — defaults to starred players, user can adjust
  const [todayIds, setTodayIds] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ql_today_players");
      if (saved) return JSON.parse(saved);
    } catch {}
    return state.favoredPlayerIds || [];
  });
  const _setTodayIds = (ids) => {
    const next = typeof ids === "function" ? ids(todayIds) : ids;
    setTodayIds(next);
    try { sessionStorage.setItem("ql_today_players", JSON.stringify(next)); } catch {}
  };
  // displayPlayers: only today's selected players. Empty when none selected (shows prompt).
  const displayPlayers = useMemo(() => {
    if (todayIds.length === 0) return []; // no selection = show prompt
    return sortedPlayers.filter(p => todayIds.includes(p.id));
  }, [sortedPlayers, todayIds]);

  const toggleTodayPlayer = (id) => {
    _setTodayIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Auto-clear error when player selections change — so the error disappears
  // the moment the user fixes the issue without needing to tap Log again
  React.useEffect(() => {
    if (!err) return;
    const need = type === "singles" ? 1 : 2;
    const t1ok = t1ids.length >= need;
    const t2ok = t2ids.length >= need;
    const noOverlap = !t1ids.some(id => t2ids.includes(id));
    if (t1ok && t2ok && noOverlap) setErr("");
  }, [t1ids, t2ids, type]);

  // Auto-clear session error when all 4 slots filled
  React.useEffect(() => {
    if (!err) return;
    if (sessionIds.filter(Boolean).length === 4 && new Set(sessionIds.filter(Boolean)).size === 4) setErr("");
  }, [sessionIds]);

  const togglePlayer = useCallback((id, slot) => {
    // slot = "t1" | "t2"
    const limit = type === "singles" ? 1 : 2;
    if (slot === "t1") {
      if (t1ids.includes(id)) setT1ids(prev => prev.filter(x => x !== id));
      else if (t1ids.length < limit) setT1ids(prev => [...prev, id]);
    } else {
      if (t2ids.includes(id)) setT2ids(prev => prev.filter(x => x !== id));
      else if (t2ids.length < limit) setT2ids(prev => [...prev, id]);
    }
  }, [type, t1ids, t2ids]);

  // Predict win probability if both teams selected
  const prediction = useMemo(() => {
    const allOk = type === "singles"
      ? t1ids.length === 1 && t2ids.length === 1
      : t1ids.length === 2 && t2ids.length === 2;
    if (!allOk) return null;
    const ratingKey = type === "singles" ? "ratingSingles" : "ratingDoubles";
    const avg = ids => ids.reduce((s, id) => s + (players.find(p=>p.id===id)?.[ratingKey] ?? DEFAULT_RATING), 0) / ids.length;
    const t1pct = Math.round(calcExpected(avg(t1ids), avg(t2ids)) * 100);
    return { t1pct, t2pct: 100 - t1pct };
  }, [type, t1ids, t2ids, players]);

  // Validate and log
  const handleSessionLog = () => {
    setErr("");
    const filled = sessionIds.filter(id => id);
    if (filled.length < 4) return setErr((t("err_select_4")||"Select 4 players"));
    if (new Set(sessionIds).size < 4) return setErr((t("err_duplicate")||"All 4 players must be different"));
    // Validate all 3 scores
    for (let i = 0; i < 3; i++) {
      const {a, b} = sessionScores[i];
      if (a === b) return setErr(`${t('round')||'Match'} ${i+1}: ${t('err_valid_scores')||"scores can't be tied"}`);
    }
    const now = new Date();
    const matchesToLog = RR_MATCHUPS.map((mu, i) => {
      const {a, b} = sessionScores[i];
      const t1Ids = [sessionIds[mu.t1[0]], sessionIds[mu.t1[1]]];
      const t2Ids = [sessionIds[mu.t2[0]], sessionIds[mu.t2[1]]];
      const winnerTeam = a > b ? 0 : 1;
      const matchTime = new Date(now.getTime() + i * 60000).toISOString();
      return { id: genId(), type: "doubles", date: matchTime, teams: [t1Ids, t2Ids], winnerTeam,
        games: [{a, b, winner: winnerTeam}], teamNames:{t1:null,t2:null}, winTo:11, winBy:2,
        venue: null, notes: null, loggedBy: user?.myPlayerId || "quick-session" };
    });
    set(s => ({ ...s, matches: [...(s.matches || []), ...matchesToLog] }));
    showUndo?.(matchesToLog.map(m => m.id), t("undo_session")||"Session logged");
    // Reset session state for next log — stay on screen
    setSessionIds(["","","",""]);
    setSessionScores([{a:11,b:0},{a:11,b:0},{a:11,b:0}]);
    setErr("");
    setDone(true);
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    doneTimerRef.current = setTimeout(() => setDone(false), 2000);
  };

  const handleLog = () => {
    setErr("");
    const need = type === "singles" ? 1 : 2;
    if (t1ids.length < need) return setErr(type === "singles" ? (t("err_select_singles")||"Select 1 player per side") : (t("err_select_doubles")||"Select 2 players per side"));
    if (t2ids.length < need) return setErr(type === "singles" ? (t("err_select_singles")||"Select 1 player per side") : (t("err_select_doubles")||"Select 2 players per side"));
    if (t1ids.some(id => t2ids.includes(id))) return setErr((t("err_same_player")||"Same player on both teams"));
    if (scoreA === scoreB) return setErr((t("err_valid_scores")||"Scores can't be tied"));
    if (scoreA < 0 || scoreB < 0) return setErr("Scores can't be negative");

    const winnerTeam = scoreA > scoreB ? 0 : 1;
    const match = {
      id: genId(),
      type,
      date: new Date().toISOString(),
      teams: [t1ids, t2ids],
      winnerTeam,
      games: [{ a: scoreA, b: scoreB, winner: winnerTeam }],
      teamNames: { t1: null, t2: null },
      winTo: 11, winBy: 2,
      venue: null, notes: null,
      loggedBy: state.players ? (user?.myPlayerId || "quick") : "quick"
    };
    const newMatchArray = [...(state.matches || []), match];
    const { derivedMatches } = replayAllMatches(state.players, newMatchArray);
    const logged = derivedMatches.find(m => m.id === match.id);
    set(s => ({ ...s, matches: newMatchArray }));
    showUndo?.([match.id], t("undo_match")||"Match logged");
    // Reset custom form for next log — stay on screen
    setT1ids([]); setT2ids([]); setA(11); setB(0); setErr("");
    setDone(true);
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    doneTimerRef.current = setTimeout(() => setDone(false), 2000);
  };

  const T1_NEED = type === "singles" ? 1 : 2;
  const T2_NEED = type === "singles" ? 1 : 2;

  const teamLabel = (ids, color) => {
    if (!ids.length) return <span style={{color:"#88888877", fontStyle:"italic"}}>{t("select_prompt")||"Select…"}</span>;
    return <span style={{color, fontWeight:700}}>{ids.map(id => shortName(players.find(p=>p.id===id)?.name||"?", "always")).join(" & ")}</span>;
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:3000,
      background:"rgba(0,0,0,0.7)", display:"flex", flexDirection:"column",
      justifyContent:"flex-end"
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:theme.card, borderRadius:`${20*z}px ${20*z}px 0 0`,
        padding:`${16*z}px ${14*z}px calc(${20*z}px + env(safe-area-inset-bottom, 0px))`,
        maxHeight:"92vh", overflowY:"auto"
      }}>

        {/* Header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14*z}}>
          <div style={{fontSize:17*z, fontWeight:800, color:theme.text}}>
            ⚡ {t("quick_log")||"Quick Log"}
          </div>
          <button onClick={onClose} style={{background:"transparent", border:"none", fontSize:20*z, cursor:"pointer", color:theme.sub, padding:`${4*z}px ${8*z}px`}}>✕</button>
        </div>

        {done && (
          <div style={{textAlign:"center", padding:`${10*z}px`, fontSize:14*z, fontWeight:700, color:"#50c878",
            background:"rgba(80,200,120,0.12)", borderRadius:8*z, marginBottom:12*z}}>
            ✅ {t("match_logged_ok")||"Match logged!"} · {t("undo")||"Undo"} below
          </div>
        )}
        {(<>

          {/* Collapsible how-to hint */}
          <QuickLogHint theme={theme} />

          {/* Custom / Session mode tabs */}
          <div style={{display:"flex", gap:8*z, marginBottom:14*z}}>
            {[
              {id:"custom", label:`➕ ${t("custom")||"Custom"}`},
              {id:"session", label:`🔄 ${t("mode_session")||"Session"}`},
            ].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setErr(""); setDone(false); }} style={{
                flex:1, padding:`${9*z}px`, borderRadius:10*z, fontSize:13*z, fontWeight:700, cursor:"pointer",
                border:`2px solid ${mode===m.id ? theme.accent : theme.border}`,
                background:mode===m.id ? theme.accent+"22" : "transparent",
                color:mode===m.id ? theme.accent : theme.sub
              }}>{m.label}</button>
            ))}
          </div>

          {mode === "session" ? (<>
            {/* Session: pick 4 players via dropdowns — same style as Custom tab */}
            <div style={{fontSize:11*z, fontWeight:700, color:theme.sub, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8*z}}>
              {t("select_foursome")||"Select 4 Players"}
            </div>
            {(() => {
              const COLORS = [theme.accent, "#e05050", "#50c878", "#f0a830"];
              const LABELS = [
                `${t("player_n")||"Player"} 1`, `${t("player_n")||"Player"} 2`,
                `${t("player_n")||"Player"} 3`, `${t("player_n")||"Player"} 4`
              ];
              const poolPlayers = todayIds.length > 0 ? displayPlayers : sortedPlayers;
              return (
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8*z, marginBottom:12*z}}>
                  {[0,1,2,3].map(slot => (
                    <div key={slot}>
                      <div style={{fontSize:10*z, fontWeight:700, color:COLORS[slot], marginBottom:4*z, textTransform:"uppercase"}}>
                        {LABELS[slot]}
                      </div>
                      <select
                        value={sessionIds[slot]}
                        onChange={e => {
                          const val = e.target.value;
                          setSessionIds(prev => {
                            const n = [...prev];
                            // Clear any other slot that has this player
                            for (let i = 0; i < 4; i++) { if (i !== slot && n[i] === val) n[i] = ""; }
                            n[slot] = val;
                            return n;
                          });
                        }}
                        style={{
                          width:"100%", padding:`${7*z}px ${8*z}px`,
                          borderRadius:8*z, border:`2px solid ${sessionIds[slot] ? COLORS[slot] : theme.border}`,
                          background:theme.card, color:sessionIds[slot] ? theme.text : theme.sub,
                          fontSize:12*z, fontWeight:600, cursor:"pointer"
                        }}>
                        <option value="">{t("select_prompt")||"Select…"}</option>
                        {poolPlayers
                          .filter(p => !sessionIds.includes(p.id) || sessionIds[slot] === p.id)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Session matchups with score steppers */}
            {sessionIds.filter(Boolean).length === 4 && (
              <div style={{display:"flex", flexDirection:"column", gap:10*z}}>
                {RR_MATCHUPS.map((mu, i) => {
                  const COLORS = [theme.accent, "#e05050", "#50c878", "#f0a830"];
                  const t1Name = [mu.t1[0],mu.t1[1]].map(idx => shortName(players.find(p=>p.id===sessionIds[idx])?.name||"?","always")).join(" & ");
                  const t2Name = [mu.t2[0],mu.t2[1]].map(idx => shortName(players.find(p=>p.id===sessionIds[idx])?.name||"?","always")).join(" & ");
                  const sc = sessionScores[i];
                  return (
                    <div key={i} style={{background:theme.bg, borderRadius:10*z, padding:`${10*z}px ${12*z}px`}}>
                      <div style={{fontSize:10*z, fontWeight:700, color:theme.sub, marginBottom:8*z, textTransform:"uppercase"}}>
                        {t("round")||"Match"} {i+1}
                      </div>
                      <div style={{display:"flex", alignItems:"center", justifyContent:"space-around"}}>
                        <ScoreStepper value={sc.a} onChange={v => setSessionScores(prev => prev.map((s,j)=>j===i?{...s,a:v}:s))}
                          color={COLORS[mu.t1[0]]} label={t1Name} z={z}/>
                        <span style={{fontSize:20*z, color:theme.sub, fontWeight:900}}>–</span>
                        <ScoreStepper value={sc.b} onChange={v => setSessionScores(prev => prev.map((s,j)=>j===i?{...s,b:v}:s))}
                          color={COLORS[mu.t2[0]]} label={t2Name} z={z}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {todayIds.length > 0 && todayIds.length < 4 && (
              <div style={{fontSize:11*z, color:"#f0a830", marginBottom:8*z, textAlign:"center"}}>
                ⚠️ Session needs 4 players — tap "All" or add more Today's Players
              </div>
            )}

            {err && <div style={{color:"#e05050", fontSize:12*z, marginTop:8*z, textAlign:"center"}}>{err}</div>}

            <button onClick={handleSessionLog} style={{
              width:"100%", padding:`${14*z}px`, borderRadius:12*z, marginTop:14*z,
              background: sessionIds.filter(Boolean).length === 4 ? theme.accent : theme.border,
              border:"none", fontSize:16*z, fontWeight:800, color:"#fff", cursor:"pointer"
            }}>
              🔄 {t("log_match_btn")||"Log Session"}
            </button>
          </>) : (<>

          {/* Singles / Doubles toggle */}
          <div style={{display:"flex", gap:8*z, marginBottom:14*z}}>
            {["singles","doubles"].map(tp => (
              <button key={tp} onClick={() => { setType(tp); setT1ids([]); setT2ids([]); }} style={{
                flex:1, padding:`${9*z}px`, borderRadius:10*z, fontSize:13*z, fontWeight:700, cursor:"pointer",
                border:`2px solid ${type===tp ? theme.accent : theme.border}`,
                background:type===tp ? theme.accent+"22" : "transparent",
                color:type===tp ? theme.accent : theme.sub
              }}>
                {tp === "singles" ? t("match_type_singles")||"Singles" : t("match_type_doubles")||"Doubles"}
              </button>
            ))}
          </div>

          {/* Today's Players selector — dropdown to pick who's playing today */}
          <div style={{marginBottom:12*z}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6*z}}>
              <span style={{fontSize:11*z, fontWeight:700, color:theme.sub, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                👥 {t("todays_players")||"Today's Players"}
              </span>
              <span style={{fontSize:10*z, color:theme.sub}}>
                {todayIds.length > 0 ? `${todayIds.length} ${t("selected")||"selected"}` : t("all_players")||"All"}
              </span>
            </div>
            {/* Compact scrollable player list — checkbox style */}
            <div style={{
              background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:10*z,
              maxHeight:120*z, overflowY:"auto", padding:`${4*z}px`
            }}>
              {sortedPlayers.map(p => {
                const checked = todayIds.includes(p.id);
                return (
                  <label key={p.id} style={{
                    display:"flex", alignItems:"center", gap:8*z,
                    padding:`${5*z}px ${6*z}px`, borderRadius:6*z, cursor:"pointer",
                    background: checked ? theme.accent+"11" : "transparent"
                  }}>
                    <div style={{
                      width:16*z, height:16*z, borderRadius:4*z, flexShrink:0,
                      border:`2px solid ${checked ? "#50c878" : theme.border}`,
                      background: checked ? "#50c878" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center"
                    }}>
                      {checked && <span style={{color:"#fff", fontSize:10*z, fontWeight:900, lineHeight:1}}>✓</span>}
                    </div>
                    <span style={{fontSize:12*z, color: checked ? theme.text : theme.sub, fontWeight: checked ? 600 : 400}}>
                      {p.name}
                    </span>
                    {(state.favoredPlayerIds||[]).includes(p.id) && (
                      <span style={{fontSize:10*z, color:"#f0c040", marginLeft:"auto"}}>★</span>
                    )}
                    <input type="checkbox" checked={checked} onChange={() => toggleTodayPlayer(p.id)}
                      style={{position:"absolute", opacity:0, width:0, height:0}} />
                  </label>
                );
              })}
            </div>
            <div style={{display:"flex", gap:6*z, marginTop:6*z}}>
              <button onClick={() => _setTodayIds(sortedPlayers.map(p=>p.id))} style={{
                flex:1, fontSize:10*z, color:theme.sub, background:"transparent",
                border:`1px solid ${theme.border}`, borderRadius:6*z, padding:`${4*z}px`, cursor:"pointer"
              }}>{t("select_all")||"All"}</button>
              <button onClick={() => _setTodayIds(state.favoredPlayerIds||[])} style={{
                flex:1, fontSize:10*z, color:theme.sub, background:"transparent",
                border:`1px solid ${theme.border}`, borderRadius:6*z, padding:`${4*z}px`, cursor:"pointer"
              }}>★ {t("starred")||"Starred"}</button>
              <button onClick={() => _setTodayIds([])} style={{
                flex:1, fontSize:10*z, color:theme.sub, background:"transparent",
                border:`1px solid ${theme.border}`, borderRadius:6*z, padding:`${4*z}px`, cursor:"pointer"
              }}>{t("clear")||"Clear"}</button>
            </div>
          </div>

          <div style={{height:1, background:theme.border, marginBottom:12*z}}/>

          {/* Team selection — only shown when Today's Players are selected */}
          {displayPlayers.length === 0 ? (
            <div style={{textAlign:"center", color:theme.sub, fontSize:12*z, padding:`${16*z}px`, background:theme.bg, borderRadius:10*z, marginBottom:12*z}}>
              👆 {t("todays_players")||"Select Today's Players"} above to get started
            </div>
          ) : (
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10*z, marginBottom:12*z}}>
            {/* Team 1 */}
            <div>
              <div style={{fontSize:10*z, fontWeight:700, color:T1_COLOR, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6*z}}>
                {t("team_abbr_1")||"T1"} ({t1ids.length}/{T1_NEED})
              </div>
              <div style={{fontSize:12*z, marginBottom:8*z, minHeight:18*z}}>{teamLabel(t1ids, T1_COLOR)}</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4*z}}>
                {displayPlayers
                  .filter(p => !t2ids.includes(p.id))
                  .map(p => (
                    <PlayerPill key={p.id} player={p}
                      selected={t1ids.includes(p.id)} color={T1_COLOR}
                      onToggle={() => togglePlayer(p.id, "t1")} z={z} />
                  ))}
              </div>
            </div>
            {/* Team 2 */}
            <div>
              <div style={{fontSize:10*z, fontWeight:700, color:T2_COLOR, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6*z}}>
                {t("team_abbr_2")||"T2"} ({t2ids.length}/{T2_NEED})
              </div>
              <div style={{fontSize:12*z, marginBottom:8*z, minHeight:18*z}}>{teamLabel(t2ids, T2_COLOR)}</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4*z}}>
                {displayPlayers
                  .filter(p => !t1ids.includes(p.id))
                  .map(p => (
                    <PlayerPill key={p.id} player={p}
                      selected={t2ids.includes(p.id)} color={T2_COLOR}
                      onToggle={() => togglePlayer(p.id, "t2")} z={z} />
                  ))}
              </div>
            </div>
          </div>
          )}{/* end displayPlayers conditional */}

          {/* Win probability bar */}
          {prediction && (
            <div style={{marginBottom:12*z, padding:`${8*z}px ${10*z}px`, background:theme.bg, borderRadius:10*z}}>
              <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:4*z}}>
                <span style={{fontSize:11*z, fontWeight:700, color:T1_COLOR, minWidth:36*z, textAlign:"center"}}>{prediction.t1pct}%</span>
                <div style={{flex:1, height:6*z, borderRadius:3*z, overflow:"hidden", background:theme.border}}>
                  <div style={{height:"100%", width:`${prediction.t1pct}%`, background:T1_COLOR, transition:"width 0.3s"}}/>
                </div>
                <span style={{fontSize:11*z, fontWeight:700, color:T2_COLOR, minWidth:36*z, textAlign:"center"}}>{prediction.t2pct}%</span>
              </div>
              <div style={{textAlign:"center", fontSize:10*z, color:theme.sub}}>
                {t("match_predictor")||"Match Predictor"}
                {Math.abs(prediction.t1pct - prediction.t2pct) > 15 && (
                  <span> · {prediction.t1pct < prediction.t2pct
                    ? `${t("team_abbr_1")||"T1"} 🐓`
                    : `${t("team_abbr_2")||"T2"} 🐓`} underdog</span>
                )}
              </div>
            </div>
          )}

          {/* Score steppers */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-around",
            padding:`${14*z}px ${8*z}px`, background:theme.bg, borderRadius:14*z, marginBottom:14*z
          }}>
            <ScoreStepper value={scoreA} onChange={setA} color={T1_COLOR} label={t("team_abbr_1")||"T1"} z={z} />
            <div style={{fontSize:24*z, color:theme.sub, fontWeight:900, padding:`0 ${8*z}px`}}>–</div>
            <ScoreStepper value={scoreB} onChange={setB} color={T2_COLOR} label={t("team_abbr_2")||"T2"} z={z} />
          </div>

          {/* Quick preset scores */}
          <div style={{display:"flex", gap:6*z, marginBottom:14*z, flexWrap:"wrap"}}>
            {[[11,0],[11,5],[11,8],[11,9]].map(([a,b]) => (
              <button key={`${a}-${b}`} onClick={() => { setA(a); setB(b); }} style={{
                flex:"1 1 auto", padding:`${6*z}px`, borderRadius:8*z, fontSize:11*z, fontWeight:700,
                border:`1px solid ${theme.border}`, background:theme.card, color:theme.sub, cursor:"pointer"
              }}>{a}–{b}</button>
            ))}
            <button onClick={() => { const tmp = scoreA; setA(scoreB); setB(tmp); }} style={{
              flex:"1 1 auto", padding:`${6*z}px`, borderRadius:8*z, fontSize:11*z, fontWeight:700,
              border:`1px solid ${theme.border}`, background:theme.card, color:theme.sub, cursor:"pointer"
            }}>⇄ Flip</button>
          </div>

          {err && <div style={{color:"#e05050", fontSize:12*z, marginBottom:8*z, textAlign:"center"}}>{err}</div>}

          {/* Log button */}
          <button onClick={handleLog} style={{
            width:"100%", padding:`${14*z}px`, borderRadius:12*z,
            background:theme.accent, border:"none",
            fontSize:16*z, fontWeight:800,
            color:"#fff", cursor:"pointer", letterSpacing:"0.3px"
          }}>
            ⚡ {t("log_match_btn")||"Log Match"}
          </button>
          </>)}
        </>)}
      </div>
    </div>
  );
}
