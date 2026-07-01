import React, { useState, useEffect, useMemo } from 'react';
import { t, genId, validatePickleballScore, isoToDatetimeLocal, sortOptionsAlpha, replayAllMatches, WIN_TO_OPTIONS, suggestBalancedTeams, computeSessionSummary, getRecentForm, shortName, isLargeZoom, getSessionNum, calcExpected, DEFAULT_RATING } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, PlayerPicker, MatchEloBreakdown, ConfirmInline, MatchEditModal, MatchCard } from '../components/Shared.jsx';
import { usePersistentFormState } from '../hooks.js';
import { MatchesSubNav } from '../components/Navigation.jsx';

// Tiny inline form indicator: shows last 3 results as W/L badges
function FormDots({ pid, matches, z = 1 }) {
  const form = getRecentForm(pid, matches, 3);
  if (!form.length) return null;
  return (
    <div style={{display:"flex", gap:3*z, marginTop:3*z, alignItems:"center"}}>
      <span style={{fontSize:9*z, color:"#888", marginRight:2*z}}>{t("form_lbl") || "Form"}:</span>
      {form.map((r, i) => (
        <span key={i} style={{
          fontSize:9*z, fontWeight:800, borderRadius:3*z, padding:`1px ${3*z}px`,
          color: r==="W" ? "#50c878" : "#e05050",
          background: r==="W" ? "rgba(80,200,120,0.15)" : "rgba(224,80,80,0.15)"
        }}>{r}</span>
      ))}
    </div>
  );
}

// ── Collapsible Section for Custom Match ─────────────────────────────────────
function CollapsibleSec({ title, theme, defaultOpen = true, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const z = theme.zoom || 1.0;
  return (
    <div style={{background:theme.card, border:`1px solid ${theme.border}`, borderRadius:12*z, marginBottom:12*z, overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%", background:"transparent", border:"none", cursor:"pointer",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:`${10*z}px ${14*z}px`, textAlign:"left"
      }}>
        <span style={{fontSize:12*z, fontWeight:700, color:theme.accent, textTransform:"uppercase", letterSpacing:"0.8px"}}>{title}</span>
        <span style={{fontSize:12*z, color:theme.sub, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s"}}>▾</span>
      </button>
      {open && <div style={{padding:`0 ${14*z}px ${14*z}px`, borderTop:`1px solid ${theme.border}`, paddingTop:12*z}}>{children}</div>}
    </div>
  );
}

export function LogMatch({state,players,set,nav,theme,user,showUndo}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [type,setType]=useState(() => {
    try { return localStorage.getItem("pr_lastMatchType") || "doubles"; } catch { return "doubles"; }
  }), [winTo,setWinTo]=useState(11), [winBy,setWinBy]=useState(2);

  // Persist match type preference whenever it changes
  useEffect(() => {
    try { localStorage.setItem("pr_lastMatchType", type); } catch {}
  }, [type]);
  // Persisted in-progress form state — survives tab navigation, cleared after successful Log.
  const [sp,setSp,clearSp]=usePersistentFormState("logMatch:sp", {s1:"",s2:"",d1a:"",d1b:"",d2a:"",d2b:""});
  const [games,setGames,clearGames]=usePersistentFormState("logMatch:games", [{a:"",b:""}]);
  const [tnames,setTnames,clearTnames]=usePersistentFormState("logMatch:tnames", {t1:"",t2:""});
  const [venue,setVenue,clearVenue]=usePersistentFormState("logMatch:venue", "");
  const [notes,setNotes,clearNotes]=usePersistentFormState("logMatch:notes", "");
  const [bestOf,setBestOf]=useState(1); // 1=no series, 3=best-of-3, 5=best-of-5
  const [err,setErr]=useState(""), [result,setResult]=useState(null);
  const [matchDate,setMatchDate]=useState(()=>isoToDatetimeLocal(new Date().toISOString()));

  // Refresh the date to "now" whenever this component mounts so the form
  // never shows a stale datetime from a previous session. Player picks and
  // scores persist across navigation (desirable), but date should always
  // default to the current moment when they open a new match.
  useEffect(() => {
    setMatchDate(isoToDatetimeLocal(new Date().toISOString()));
  }, []);

  useEffect(() => {
    if (user?.myPlayerId) {
       setSp(prev => ({...prev, s1: prev.s1 || user.myPlayerId, d1a: prev.d1a || user.myPlayerId}));
    }
  }, [user?.myPlayerId]);
  
  const activeIds = type === "singles" ? [sp.s1, sp.s2] : [sp.d1a, sp.d1b, sp.d2a, sp.d2b];
  const filledActive = activeIds.filter(Boolean);
  const hasDupes = new Set(filledActive).size < filledActive.length;

  function upSp(k,v){setSp(p=>({...p,[k]:v})); setErr("");}
  function upTn(k,v){setTnames(t=>({...t,[k]:v}));}
  function addGame(){setGames(g=>[...g,{a:"",b:""}]);}
  function rmGame(i){setGames(g=>g.filter((_,idx)=>idx!==i));}
  function updGame(i,side,val){
    const cleanVal = val.replace(/-/g, '');
    setGames(g=>g.map((gm,idx)=>idx===i?{...gm,[side]:cleanVal}:gm));
  }
  function getTeams(){return type==="singles"?[[sp.s1],[sp.s2]]:[[sp.d1a,sp.d1b],[sp.d2a,sp.d2b]];}
  
  function submit(){
    setErr(""); setResult(null);
    if(hasDupes) return setErr(t("err_duplicate"));
    const teams=getTeams(), allIds=teams.flat().filter(Boolean);
    if(type==="singles"&&(!sp.s1||!sp.s2)) return setErr(t("err_select_players"));
    if(type==="doubles"&&allIds.length<4) return setErr(t("err_select_4"));
    
    let t1w=0,t2w=0; const parsedGames=[];
    for(let i=0;i<games.length;i++){
      const a=parseInt(games[i].a),b=parseInt(games[i].b);
      if(isNaN(a)||isNaN(b)) return setErr(t("err_valid_scores"));
      const r=validatePickleballScore(a,b,winTo,winBy);
      if(!r) return setErr(t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy));
      parsedGames.push({a,b,winner:r.winner});
      if(r.winner===0)t1w++;else t2w++;
    }
    if(!parsedGames.length) return setErr(t("err_add_game"));
    if(t1w===t2w) return setErr(t("err_clear_winner"));
    
    const winnerTeam=t1w>t2w?0:1;
    // datetime-local gives "YYYY-MM-DDTHH:MM" — treat as LOCAL time.
    // Without a timezone suffix, some browsers parse as UTC which shifts the time.
    // Appending ":00" (seconds) then using Date constructor with explicit parts is safer.
    let isoDate;
    if (matchDate) {
      const d = new Date(matchDate);
      // If the datetime-local input gave a valid date, use it; otherwise fall back to now
      isoDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else {
      isoDate = new Date().toISOString();
    }
    
    const match={id:genId(),type,date:isoDate,teams:[teams[0].filter(Boolean),teams[1].filter(Boolean)],winnerTeam,
      games:parsedGames,teamNames:{t1:null,t2:null},winTo,winBy,
      team1Wins:t1w,team2Wins:t2w,venue:venue.trim()||null, notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest"};

    const newMatchArray = [...(state.matches||[]), match];
    const { derivedPlayers, derivedMatches } = replayAllMatches(state.players, newMatchArray);
    setResult({ match: derivedMatches.find(m => m.id === match.id), players: derivedPlayers });
    // Scroll to top so user sees ELO breakdown and success card
    setTimeout(() => { const mains = document.querySelectorAll("main"); const m = mains[mains.length-1]; if(m) m.scrollTop=0; window.scrollTo({top:0,behavior:"instant"}); }, 50);
    set(s => ({...s, matches: newMatchArray}));
    showUndo?.([match.id], t("undo_match")||"Match logged");
    // Clear all persisted form state — fresh start for next log
    clearSp(); clearGames(); clearTnames(); clearVenue(); clearNotes(); setBestOf(1);
    // Reset date to NOW so the next match logged always gets a fresh timestamp.
    // Without this, consecutive matches on the same session get the same stale
    // datetime from when the form was first opened — causing wrong History order.
    setMatchDate(isoToDatetimeLocal(new Date().toISOString()));
  }
  
  const rawOpts=players.map(p=>({value:p.id,label:shortName(p.name, isLargeZoom(z) ? "always" : "auto")}));
  const myId = user?.myPlayerId || "";
  // Today's Players (set in QuickLog) float to the top — above starred, above alpha.
  const _todayIds = (() => { try { return JSON.parse(sessionStorage.getItem("ql_today_players")||"[]"); } catch { return []; } })();
  const opts = sortOptionsAlpha(rawOpts, [...new Set([..._todayIds, myId, ...(state.favoredPlayerIds||[])].filter(Boolean))]);

  return (
    <div style={S.view}>
      <MatchesSubNav active="log" nav={nav} theme={theme} players={players} favoredPlayerIds={state.favoredPlayerIds} />
      {result&&(
        <div style={S.successBox}>
          <div style={{fontWeight:800,fontSize:15*z,marginBottom:8*z}}>{t("match_logged_ok")}</div>
          <MatchEloBreakdown match={result.match} players={result.players} theme={theme} />
          <div style={{display:"flex", gap:8*z, marginTop:10*z}}>
            <button style={{...S.btnSecondary, flex:1, marginTop:0}} onClick={()=>nav("history")}>{t("see_history_btn")}</button>
            <button style={{...S.btnSecondary, flex:1, marginTop:0, borderColor:theme.accent, color:theme.accent}}
              onClick={() => {
                const m = result.match;
                const ps = result.players;
                const getName = id => ps.find(p=>p.id===id)?.name ?? "?";
                const t1ids = m.teams?.[0] || [];
                const t2ids = m.teams?.[1] || [];
                const t1 = m.teamNames?.t1 || t1ids.map(getName).join(" & ") || "T1";
                const t2 = m.teamNames?.t2 || t2ids.map(getName).join(" & ") || "T2";
                const score = m.games?.map(g=>`${g.a}–${g.b}`).join("  ") || "";
                const winner = m.winnerTeam === 0 ? t1 : t2;
                const isUpset = (m.upsetFactor||0) > 0.2;
                const dateStr = m.date ? new Date(m.date).toLocaleDateString() : "";
                const accentHex = theme.accent || "#50c878";
                const bg = theme.mode === "dark" ? "#1a1a2e" : "#f0f8ff";
                const cardBg = theme.mode === "dark" ? "#16213e" : "#ffffff";
                const txt = theme.mode === "dark" ? "#e8eaf6" : "#1a1a2e";
                const sub = theme.mode === "dark" ? "#8892b0" : "#64748b";

                // Build delta rows for each player
                const allIds = [...t1ids, ...t2ids];
                const deltaLines = allIds.map(id => {
                  const d = m.ratingDeltas?.[id] ?? 0;
                  const name = getName(id);
                  const sign = d >= 0 ? "+" : "";
                  const color = d >= 0 ? "#50c878" : "#e05050";
                  return { name: name.split(" ")[0], delta: `${sign}${d.toFixed(3)}`, color };
                });

                const svgW = 480, svgH = 280;
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentHex}22"/>
      <stop offset="100%" stop-color="${bg}"/>
    </linearGradient>
  </defs>
  <rect width="${svgW}" height="${svgH}" fill="url(#bg)" rx="16"/>
  <rect x="1" y="1" width="${svgW-2}" height="${svgH-2}" fill="none" stroke="${accentHex}" stroke-width="2" rx="15"/>

  <!-- Header -->
  <text x="240" y="32" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${accentHex}" text-anchor="middle" letter-spacing="2">PICKLERANK · ${dateStr}</text>

  <!-- Team names and score -->
  <text x="110" y="80" font-family="system-ui,sans-serif" font-size="18" font-weight="800" fill="${txt}" text-anchor="middle">${t1.length > 14 ? t1.slice(0,14)+"…" : t1}</text>
  <text x="240" y="80" font-family="system-ui,sans-serif" font-size="22" font-weight="900" fill="${accentHex}" text-anchor="middle">VS</text>
  <text x="370" y="80" font-family="system-ui,sans-serif" font-size="18" font-weight="800" fill="${txt}" text-anchor="middle">${t2.length > 14 ? t2.slice(0,14)+"…" : t2}</text>

  <!-- Score -->
  <rect x="160" y="95" width="160" height="50" rx="10" fill="${accentHex}22"/>
  <text x="240" y="128" font-family="system-ui,monospace" font-size="26" font-weight="900" fill="${accentHex}" text-anchor="middle">${score || "–"}</text>

  <!-- Winner line -->
  <text x="240" y="168" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${txt}" text-anchor="middle">🏆 ${winner.length > 20 ? winner.slice(0,20)+"…" : winner} wins${isUpset ? " 🎉 Upset!" : ""}</text>

  <!-- Rating deltas -->
  ${deltaLines.map((dl, i) => {
    const col = i < t1ids.length ? 0 : 1;
    const row = i < t1ids.length ? i : i - t1ids.length;
    const x = col === 0 ? 60 : 300;
    const y = 195 + row * 22;
    return `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="12" fill="${sub}">${dl.name}</text>
  <text x="${x + 120}" y="${y}" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${dl.color}" text-anchor="end">${dl.delta}</text>`;
  }).join("\n  ")}

  <!-- Footer -->
  <text x="240" y="${svgH - 12}" font-family="system-ui,sans-serif" font-size="10" fill="${sub}" text-anchor="middle">PickleRank · Private Group Rating Tracker</text>
</svg>`;

                const blob = new Blob([svg], {type:"image/svg+xml"});
                const url = URL.createObjectURL(blob);

                if (navigator.share && navigator.canShare?.({files:[new File([blob],"match.svg",{type:"image/svg+xml"})]})) {
                  const file = new File([blob], "picklerank-match.svg", {type:"image/svg+xml"});
                  navigator.share({title:"PickleRank Match", files:[file]}).catch(()=>{});
                } else {
                  // Fallback: open in new tab so user can screenshot/save
                  const win = window.open(url, "_blank");
                  if (!win) {
                    // If popup blocked, copy share text instead
                    const text = `🥒 PickleRank\n${t1} vs ${t2}\n${score}\n🏆 ${winner} wins${isUpset?" 🎉":""}`;
                    navigator.clipboard?.writeText(text).then(()=>alert("Result text copied!"));
                  }
                }
              }}>
              📸 Share Card
            </button>
          </div>
        </div>
      )}
      <CollapsibleSec title={t("match_type_sec")} theme={theme}>
        <div style={S.toggle}>
          {["singles","doubles"].map(tType=>(
            <button key={tType} style={{...S.toggleBtn,...(type===tType?{...S.toggleOn,background:theme.card,borderColor:theme.accent,color:theme.accent}:{})}} onClick={()=>setType(tType)}>
              {tType === "singles" ? t("match_type_singles") : t("match_type_doubles")}
            </button>
          ))}
        </div>
        <div style={{display:"flex", gap:12*z, marginTop:12*z}}>
          <div style={{flex:1, minWidth:0}}>
            <label style={S.label}>{t("win_to_lbl")}</label>
            <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
          </div>
          <div style={{flex:1, minWidth:0}}>
            <label style={S.label}>{t("win_by_lbl")}</label>
            <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
          </div>
        </div>
      </CollapsibleSec>
      
      {type==="singles"?(
        <CollapsibleSec title={t("players")} theme={theme}>
          <div style={{display:"flex",gap:8*z}}>
            <div style={{flex:1, minWidth:0}}>
              <label style={S.label}>{t("player_1")}</label>
              <PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&o.value===sp.s2}))} value={sp.s1} onChange={v=>upSp("s1",v)} placeholder={t("player_1")} theme={theme}/>
              {sp.s1 && <FormDots pid={sp.s1} matches={state.matches} z={z}/>}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <label style={S.label}>{t("player_2")}</label>
              <PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&o.value===sp.s1}))} value={sp.s2} onChange={v=>upSp("s2",v)} placeholder={t("player_2")} theme={theme}/>
              {sp.s2 && <FormDots pid={sp.s2} matches={state.matches} z={z}/>}
            </div>
          </div>
          {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
        </CollapsibleSec>
      ):(
        <CollapsibleSec title={t("teams")} theme={theme}>
          <label style={S.label}>{t("team_name_opt")}</label>
          <input style={S.input} value={tnames.t1} onChange={e=>upTn("t1",e.target.value)} placeholder="e.g. The Bangers"/>
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <div style={{flex:1, minWidth:0}}><label style={S.label}>{t("player_a")}</label><PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&[sp.d1b,sp.d2a,sp.d2b].includes(o.value)}))} value={sp.d1a} onChange={v=>upSp("d1a",v)} placeholder={t("player_a")} theme={theme}/>{sp.d1a&&<FormDots pid={sp.d1a} matches={state.matches} z={z}/>}</div>
            <div style={{flex:1, minWidth:0}}><label style={S.label}>{t("player_b")}</label><PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&[sp.d1a,sp.d2a,sp.d2b].includes(o.value)}))} value={sp.d1b} onChange={v=>upSp("d1b",v)} placeholder={t("player_b")} theme={theme}/>{sp.d1b&&<FormDots pid={sp.d1b} matches={state.matches} z={z}/>}</div>
          </div>
          <div style={{borderTop:`1px solid ${theme.border}`,margin:"14px 0"}}/>
          <label style={S.label}>{t("team_name_opt")}</label>
          <input style={S.input} value={tnames.t2} onChange={e=>upTn("t2",e.target.value)} placeholder="e.g. The Dinkers"/>
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <div style={{flex:1, minWidth:0}}><label style={S.label}>{t("player_a")}</label><PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&[sp.d1a,sp.d1b,sp.d2b].includes(o.value)}))} value={sp.d2a} onChange={v=>upSp("d2a",v)} placeholder={t("player_a")} theme={theme}/>{sp.d2a&&<FormDots pid={sp.d2a} matches={state.matches} z={z}/>}</div>
            <div style={{flex:1, minWidth:0}}><label style={S.label}>{t("player_b")}</label><PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&[sp.d1a,sp.d1b,sp.d2a].includes(o.value)}))} value={sp.d2b} onChange={v=>upSp("d2b",v)} placeholder={t("player_b")} theme={theme}/>{sp.d2b&&<FormDots pid={sp.d2b} matches={state.matches} z={z}/>}</div>
          </div>
          {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
        </CollapsibleSec>
      )}

      {/* ── MATCH PREDICTOR ────────────────────────────────────────────── */}
      {(() => {
        const ids = type === "singles"
          ? [sp.s1, sp.s2]
          : [sp.d1a, sp.d1b, sp.d2a, sp.d2b];
        const allFilled = type === "singles" ? (sp.s1 && sp.s2) : (sp.d1a && sp.d1b && sp.d2a && sp.d2b);
        if (!allFilled) return null;
        const getR = id => players.find(p => p.id === id)?.[type === "singles" ? "ratingSingles" : "ratingDoubles"] ?? DEFAULT_RATING;
        const team1Avg = type === "singles" ? getR(sp.s1) : (getR(sp.d1a) + getR(sp.d1b)) / 2;
        const team2Avg = type === "singles" ? getR(sp.s2) : (getR(sp.d2a) + getR(sp.d2b)) / 2;
        const t1Win = Math.round(calcExpected(team1Avg, team2Avg) * 100);
        const t2Win = 100 - t1Win;
        const t1Name = type === "singles" ? players.find(p=>p.id===sp.s1)?.name?.split(" ")[0] : (tnames.t1 || `${t("team_abbr_1")||"T1"}`);
        const t2Name = type === "singles" ? players.find(p=>p.id===sp.s2)?.name?.split(" ")[0] : (tnames.t2 || `${t("team_abbr_2")||"T2"}`);
        const favColor = "#50c878"; const undColor = "#f0a830";
        const [fav, favPct, und, undPct] = t1Win >= t2Win
          ? [t1Name, t1Win, t2Name, t2Win] : [t2Name, t2Win, t1Name, t1Win];
        return (
          <div style={{background:theme.card, border:`1px solid ${theme.accent}33`, borderRadius:10*z, padding:`${10*z}px ${12*z}px`, marginBottom:12*z}}>
            <div style={{fontSize:11*z, fontWeight:700, color:theme.accent, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8*z}}>
              🔮 {t("match_predictor")||"Match Predictor"}
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8*z}}>
              <span style={{fontSize:12*z, color:theme.text, fontWeight:700, minWidth:50*z, textAlign:"right"}}>{t1Name}</span>
              <div style={{flex:1, height:8*z, borderRadius:4*z, overflow:"hidden", background:theme.bg, display:"flex"}}>
                <div style={{width:`${t1Win}%`, background: t1Win>=t2Win ? favColor : undColor, transition:"width 0.4s"}}/>
                <div style={{flex:1, background: t2Win>t1Win ? favColor : undColor}}/>
              </div>
              <span style={{fontSize:12*z, color:theme.text, fontWeight:700, minWidth:50*z}}>{t2Name}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginTop:4*z}}>
              <span style={{fontSize:11*z, color: t1Win>=t2Win ? "#50c878" : "#f0a830", fontWeight:700}}>{t1Win}% {t("prob_win")||"win"}</span>
              <span style={{fontSize:10*z, color:theme.sub}}>
                {Math.abs(t1Win-t2Win) < 10
                  ? "⚖️ Balanced"
                  : t1Win < t2Win
                    ? `${t1Name} 🐓 underdog`
                    : `${t2Name} 🐓 underdog`
                }
              </span>
              <span style={{fontSize:11*z, color: t2Win>t1Win ? "#50c878" : "#f0a830", fontWeight:700}}>{t2Win}% {t("prob_win")||"win"}</span>
            </div>
          </div>
        );
      })()}

      <CollapsibleSec title={t("game_scores_sec")} theme={theme}>
        {/* Best-of-N series toggle */}
        <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:10*z}}>
          <span style={{fontSize:12*z, color:theme.sub, flexShrink:0}}>{t("series_lbl")||"Series"}:</span>
          {[1,3,5].map(n => (
            <button key={n} onClick={() => {
              setBestOf(n);
              setGames(g => {
                if (n === 1) return [{a:"",b:""}];
                if (n > g.length) return [...g, ...Array(n-g.length).fill({a:"",b:""})];
                if (n < g.length) return g.slice(0, n);
                return g;
              });
            }}
              style={{padding:`${3*z}px ${10*z}px`, borderRadius:8*z, fontSize:11*z, fontWeight:700, cursor:"pointer",
                border:`1px solid ${bestOf===n ? theme.accent : theme.border}`,
                background: bestOf===n ? theme.accent+"22" : "transparent",
                color: bestOf===n ? theme.accent : theme.sub}}>
              {n === 1 ? (t("series_single")||"Single") : n === 3 ? (t("best_of_3")||"Best of 3") : (t("best_of_5")||"Best of 5")}
            </button>
          ))}
        </div>
        {/* Series score display when in series mode */}
        {bestOf > 1 && (() => {
          const t1Wins = games.filter((g,i) => { const r = validatePickleballScore(parseInt(g.a)||0, parseInt(g.b)||0, winTo, winBy); return r?.winner === 0; }).length;
          const t2Wins = games.filter((g,i) => { const r = validatePickleballScore(parseInt(g.a)||0, parseInt(g.b)||0, winTo, winBy); return r?.winner === 1; }).length;
          const needed = Math.ceil(bestOf/2);
          const seriesWinner = t1Wins >= needed ? (tnames.t1 || t("team_abbr_1")||"T1") : t2Wins >= needed ? (tnames.t2 || t("team_abbr_2")||"T2") : null;
          return (
            <div style={{display:"flex", justifyContent:"center", alignItems:"center", gap:12*z, marginBottom:10*z, padding:`${8*z}px`, background:theme.bg, borderRadius:8*z}}>
              <span style={{fontSize:16*z, fontWeight:800, color:theme.accent}}>{t1Wins}</span>
              <span style={{fontSize:11*z, color:theme.sub}}>Series</span>
              <span style={{fontSize:16*z, fontWeight:800, color:"#e05050"}}>{t2Wins}</span>
              {seriesWinner && <span style={{fontSize:11*z, color:"#50c878", fontWeight:700, marginLeft:4*z}}>🏆 {seriesWinner}</span>}
            </div>
          );
        })()}
        <div style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("score_win_by_2").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>
        {games.map((g,i)=>{
          const ga=parseInt(g.a), gb=parseInt(g.b);
          const bothFilled = g.a!=="" && g.b!=="" && !isNaN(ga) && !isNaN(gb);
          const isIllegal = bothFilled && !validatePickleballScore(ga,gb,winTo,winBy);
          const gameWinner = bothFilled && !isIllegal ? validatePickleballScore(ga,gb,winTo,winBy).winner : null;
          // Get team names from selected players
          const getName = id => players.find(p=>p.id===id)?.name || "?";
          const t1Label = type==="singles" ? shortName(getName(sp.s1),"always") : `${shortName(getName(sp.d1a),"always")} / ${shortName(getName(sp.d1b),"always")}`;
          const t2Label = type==="singles" ? shortName(getName(sp.s2),"always") : `${shortName(getName(sp.d2a),"always")} / ${shortName(getName(sp.d2b),"always")}`;
          const hasPlayers = type==="singles" ? (sp.s1 && sp.s2) : (sp.d1a && sp.d1b && sp.d2a && sp.d2b);
          return (
          <div key={i} style={{marginBottom:8*z, padding:`${6*z}px ${8*z}px`, background:theme.bg, borderRadius:8*z, border:`1px solid ${isIllegal?"#e05050":theme.border}`}}>
            <div style={{fontSize:10*z, color:theme.sub, marginBottom:4*z, display:"flex", justifyContent:"space-between"}}>
              <span>{t("game_lbl")==="第" ? `第${i+1}局` : `${t("game_lbl")||"Game"} ${i+1}`}</span>
              {games.length>1&&<button style={{...S.btnDanger, padding:`${1*z}px ${6*z}px`, fontSize:10*z}} onClick={()=>rmGame(i)}>✕</button>}
            </div>
            {/* T1 row */}
            <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:4*z}}>
              <span style={{flex:1, minWidth:0, fontSize:12*z, fontWeight:gameWinner===0?700:500,
                color:gameWinner===0?theme.accent:theme.text,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                {gameWinner===0?"✓ ":""}{hasPlayers ? t1Label : "P1"}
              </span>
              <input style={{...S.scoreInput, width:Math.min(52*z,56), ...(isIllegal?{borderColor:"#e05050"}:{})}}
                type="number" min="0" max="99" placeholder="–" value={g.a} onChange={e=>updGame(i,"a",e.target.value)}/>
            </div>
            {/* T2 row */}
            <div style={{display:"flex", alignItems:"center", gap:8*z}}>
              <span style={{flex:1, minWidth:0, fontSize:12*z, fontWeight:gameWinner===1?700:500,
                color:gameWinner===1?theme.accent:theme.text,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                {gameWinner===1?"✓ ":""}{hasPlayers ? t2Label : "P2"}
              </span>
              <input style={{...S.scoreInput, width:Math.min(52*z,56), ...(isIllegal?{borderColor:"#e05050"}:{})}}
                type="number" min="0" max="99" placeholder="–" value={g.b} onChange={e=>updGame(i,"b",e.target.value)}/>
            </div>
            {isIllegal && <div style={{fontSize:10*z,color:"#e05050",marginTop:4*z}}>{t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>}
          </div>
          );
        })}
        <button style={S.btnSecondary} onClick={addGame}>{t("add_game_btn")}</button>
      </CollapsibleSec>
      
      <CollapsibleSec title={t("date_venue_sec")} theme={theme} defaultOpen={false}>
        <label style={S.label}>{t("date_time_lbl")}</label>
        <input style={{...S.input,marginBottom:12*z}} type="datetime-local" value={matchDate} onChange={e=>setMatchDate(e.target.value)}/>
        <label style={S.label}>{t("venue_opt")}</label>
        <input style={{...S.input,marginBottom:12*z}} placeholder="e.g. Riverside Courts, Court 3" value={venue} onChange={e=>setVenue(e.target.value)}/>
        
        <label style={S.label}>{t("match_notes_sec")||"Match Notes (Optional)"}</label>
        <input style={S.input} placeholder="e.g. Crazy wind, paddle testing..." value={notes} onChange={e=>setNotes(e.target.value)}/>
      </CollapsibleSec>
      
      {err && !hasDupes && <Err msg={err} theme={theme}/>}
      
      <div style={{display:"flex", gap:8*z, marginTop:8*z}}>
        <button
          style={{...S.btnSecondary, marginTop:0, flexShrink:0, paddingLeft:16*z, paddingRight:16*z}}
          onClick={() => {
            // Clear all draft fields — fresh form. Doesn't touch saved matches.
            clearSp(); clearGames(); clearTnames(); clearVenue(); clearNotes(); setBestOf(1);
            setType("singles"); setWinTo(11); setWinBy(2);
            setMatchDate(isoToDatetimeLocal(new Date().toISOString()));
            setErr(""); setResult(null);
          }}>
          {t("reset_btn") || "🔄 Reset"}
        </button>
        <button style={{...S.btnBig, marginTop:0, flex:1, opacity: hasDupes ? 0.5 : 1, cursor: hasDupes ? "not-allowed" : "pointer"}} disabled={hasDupes} onClick={submit}>
          {t("log_match_btn")}
        </button>
      </div>
    </div>
  );
}


// ── Shared Round Card ─────────────────────────────────────────────────────────
// Layout:
//   回合 1
//   Player 1 / Player 2      [11]
//   Player 3 / Player 4      [ 2]
function RoundCard({ round, t1Name, t2Name, t1Score, t2Score, onT1Change, onT2Change,
                     winTo, winBy, highlighted, highlightLabel, theme, z, S, t }) {
  const s1 = parseInt(t1Score), s2 = parseInt(t2Score);
  const bothFilled = t1Score !== "" && t2Score !== "" && !isNaN(s1) && !isNaN(s2);
  const isValid   = bothFilled && !!validatePickleballScore(s1, s2, winTo, winBy);
  const isIllegal = bothFilled && !isValid;
  const winner    = isValid ? validatePickleballScore(s1, s2, winTo, winBy).winner : null;

  const inputStyle = (isWinner) => ({
    ...S.scoreInput,
    width: Math.min(52*z, 56),
    fontSize: Math.min(15*z, 17),
    borderColor: isIllegal ? "#e05050" : isWinner ? theme.accent : undefined,
    fontWeight: isWinner ? 800 : 400,
  });

  return (
    <div style={{
      background: highlighted ? theme.accent + "10" : theme.bg,
      border: `${highlighted ? 2 : 1}px solid ${
        highlighted ? theme.accent : isIllegal ? "#e05050" : theme.border
      }`,
      borderRadius: 10*z, padding: `${8*z}px ${10*z}px`, marginBottom: 8*z,
    }}>
      {/* Round label */}
      <div style={{fontSize:10*z, fontWeight:700, color:theme.accent, marginBottom:5*z, display:"flex", justifyContent:"space-between"}}>
        <span>{t("round_lbl")||"R"}{round}{highlighted && ` · ✅ ${highlightLabel}`}</span>
        {isIllegal && <span style={{color:"#e05050"}}>⚠ {t("err_valid_scores")||"invalid"}</span>}
      </div>

      {/* T1 row: name left, score right */}
      <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:4*z}}>
        <span style={{
          flex:1, minWidth:0, fontSize:12*z,
          fontWeight: winner===0 ? 700 : 500,
          color: winner===0 ? theme.accent : theme.text,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
        }}>
          {winner===0 ? "✓ " : ""}{t1Name}
        </span>
        <input
          style={inputStyle(winner===0)}
          type="number" min="0" max="99" placeholder="–"
          value={t1Score} onChange={e => onT1Change(e.target.value)}
        />
      </div>

      {/* T2 row: name left, score right */}
      <div style={{display:"flex", alignItems:"center", gap:8*z}}>
        <span style={{
          flex:1, minWidth:0, fontSize:12*z,
          fontWeight: winner===1 ? 700 : 500,
          color: winner===1 ? theme.accent : theme.text,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
        }}>
          {winner===1 ? "✓ " : ""}{t2Name}
        </span>
        <input
          style={inputStyle(winner===1)}
          type="number" min="0" max="99" placeholder="–"
          value={t2Score} onChange={e => onT2Change(e.target.value)}
        />
      </div>
    </div>
  );
}

export function SessionMode({ players, state, set, nav, theme, isAdmin, user, showUndo }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  // Persisted draft for Session — survives accidental tab-away. Cleared after Log.
  const [sessionIds, setSessionIds, clearSessionIds] = usePersistentFormState("session:ids", ["","","",""]);
  const [winTo,setWinTo]=useState(11);
  const [winBy,setWinBy]=useState(2);
  const [roundScores, setRoundScores, clearRoundScores] = usePersistentFormState("session:scores", [{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
  const [notes, setNotes, clearSessionNotes] = usePersistentFormState("session:notes", ""); 
  const [err, setErr] = useState(""), [success, setSuccess] = useState("");
  const [groupName, setGroupName] = useState("");
  const [sessionSummary, setSessionSummary] = useState(null);
  const [chosenSplit, setChosenSplit] = useState(null); // team suggester selection
  const savedGroups = state.savedGroups || [];

  // Auto-clear session validation error when scores become valid
  const MATCHUPS_STATIC = [{ t1:[0,1], t2:[2,3] }, { t1:[0,2], t2:[1,3] }, { t1:[0,3], t2:[1,2] }];
  React.useEffect(() => {
    if (!err) return;
    const allValid = MATCHUPS_STATIC.every((_, i) => {
      const s1 = parseInt(roundScores[i]?.t1), s2 = parseInt(roundScores[i]?.t2);
      if (isNaN(s1) || isNaN(s2)) return false;
      return !!validatePickleballScore(s1, s2, winTo, winBy);
    });
    if (allValid && sessionIds.filter(Boolean).length === 4) setErr("");
  }, [roundScores, sessionIds, err, winTo, winBy]);
  
  useEffect(() => {
    if (user?.myPlayerId && !sessionIds[0]) {
       setSessionIds(ids => [user.myPlayerId, ids[1], ids[2], ids[3]]);
    }
  }, [user?.myPlayerId]);

  const filledIds = sessionIds.filter(Boolean);
  const hasDupes = new Set(filledIds).size < filledIds.length;
  const isReady = filledIds.length === 4 && !hasDupes;

  const rawOpts = players.map(p=>({value:p.id,label:shortName(p.name, isLargeZoom(z) ? "always" : "auto")}));
  // Today's Players (set in QuickLog) float to the top — above starred, above alpha.
  const _todayIds = (() => { try { return JSON.parse(sessionStorage.getItem("ql_today_players")||"[]"); } catch { return []; } })();
  const opts = sortOptionsAlpha(rawOpts, [...new Set([..._todayIds, ...(state.favoredPlayerIds||[])].filter(Boolean))]);
  const getName = id => shortName(players.find(p=>p.id===id)?.name ?? "?", isLargeZoom(z) ? "always" : "auto");
  
  const matchups = [{ id: 1, t1: [0, 1], t2: [2, 3] }, { id: 2, t1: [0, 2], t2: [1, 3] }, { id: 3, t1: [0, 3], t2: [1, 2] }];
  
  function upP(idx,val){const n=[...sessionIds];n[idx]=val;setSessionIds(n);}
  function updScore(rIdx, team, val){
     const cleanVal = val.replace(/-/g, '');
     setRoundScores(rs => rs.map((r, i) => i === rIdx ? {...r, [team]: cleanVal} : r));
  }
  
  function saveCurrentGroup() {
    if(!isReady || !groupName.trim()) return;
    set(s => ({...s, savedGroups: [...(s.savedGroups||[]), { id: genId(), name: groupName.trim(), ids: sessionIds }]} ));
    setGroupName(""); setSuccess(t("save") + " OK");
  }
  function loadGroup(g) { setSessionIds(g.ids); }
  function deleteGroup(id) { set(s => ({...s, savedGroups: (s.savedGroups||[]).filter(g=>g.id!==id)})); }
  
  function submitSession(){
    setErr(""); setSuccess("");
    if(sessionIds.some(id => !id)) return setErr(t("err_select_players"));
    if(new Set(sessionIds).size !== 4) return setErr(t("err_duplicate"));

    const matchesToLog = [];
    const baseTime = Date.now();
    const sessionNum = getSessionNum(state.matches, "Session");
    for(let i=0; i<3; i++) {
        const s1 = parseInt(roundScores[i].t1);
        const s2 = parseInt(roundScores[i].t2);
        if (isNaN(s1) || isNaN(s2)) return setErr(`${t("round_lbl")||"Round"} ${i+1}: ${t("err_valid_scores")}`);
        const r = validatePickleballScore(s1, s2, winTo, winBy);
        if(!r) return setErr(`${t("round_lbl")||"Round"} ${i+1}: ${t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}`);
        const winnerTeam = r.winner;
        const t1w = winnerTeam === 0 ? 1 : 0;
        const t2w = winnerTeam === 1 ? 1 : 0;
        const t1Ids = [sessionIds[matchups[i].t1[0]], sessionIds[matchups[i].t1[1]]];
        const t2Ids = [sessionIds[matchups[i].t2[0]], sessionIds[matchups[i].t2[1]]];
        // Stagger timestamps so Round 3 appears on top in reverse-chrono History
        const matchDate = new Date(baseTime + i * 1000).toISOString();
        const roundNote = `${(t("session_round_note")||"Session #{num} Round {round} of 3").replace("{num}", sessionNum).replace("{round}", i+1)}${notes.trim() ? " — " + notes.trim() : ""}`;
        matchesToLog.push({id:genId(),type:"doubles",date:matchDate,teams:[t1Ids, t2Ids],winnerTeam,games:[{a:s1, b:s2, winner: winnerTeam}],teamNames:{t1:null,t2:null},winTo,winBy,team1Wins:t1w,team2Wins:t2w,venue:null, notes:roundNote, loggedBy: user?.myPlayerId || "guest"});
    }

    // Compute rich summary (inline card, not a modal)
    const allMatchesAfter = [...(state.matches||[]), ...matchesToLog];
    const { derivedPlayers: postPlayers } = replayAllMatches(state.players, allMatchesAfter);
    const summary = computeSessionSummary(matchesToLog, players, postPlayers);
    setSessionSummary(summary);

    set(s => ({...s, matches: allMatchesAfter}));
    showUndo?.(matchesToLog.map(m => m.id), t("undo_session")||"Session logged");
    clearRoundScores(); clearSessionIds(); setChosenSplit(null); clearSessionNotes();
  }

  // Team Suggester: compute balanced pairings when 4 players are selected
  const ratingMap = Object.fromEntries(players.map(p => [p.id, p.ratingDoubles || 3]));
  const suggestions = isReady ? suggestBalancedTeams(sessionIds, ratingMap) : [];

  // Share recap text
  const shareRecap = (summary) => {
    if (!summary) return;
    const lines = [`🏓 ${t("session_summary_title")}`, ''];
    summary.matchSummaries.forEach((m, i) => {
      lines.push(`Game ${i+1}: ${m.t1} vs ${m.t2} → ${m.score} (${m.winnerLabel} wins)`);
    });
    lines.push('');
    lines.push(`🏆 MVP: ${summary.mvp?.name} (${summary.mvp?.wins}${t("w_abbr")||"W"} ${summary.mvp?.losses}${t("l_abbr")||"L"}, ${summary.mvp?.delta >= 0 ? '+' : ''}${summary.mvp?.delta.toFixed(3)})`);
    lines.push(`📈 Most Improved: ${summary.mostImproved?.name} (${summary.mostImproved?.delta >= 0 ? '+' : ''}${summary.mostImproved?.delta.toFixed(3)})`);
    lines.push(`🎯 Total points: ${summary.totalPts}`);
    const text = lines.join('\n');
    if (navigator.share) navigator.share({ title: 'PickleRank Session', text });
    else { navigator.clipboard.writeText(text); }
  };

  return (
    <div style={S.view}>
      <MatchesSubNav active="session" nav={nav} theme={theme} players={players} favoredPlayerIds={state.favoredPlayerIds} />
      <div style={{paddingTop:4*z, paddingBottom:2*z, paddingLeft:12*z, paddingRight:12*z}}>
        <div style={{fontSize:10*z, color:theme.sub, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>
          {t("session")||"Session"} — 4-{t("player_n")||"Player"} {t("format_rr")||"Round Robin"}
        </div>
      </div>

      {/* ── Inline session summary — replaces the old modal overlay ─── */}
      {sessionSummary && (
        <Sec title={t("session_summary_title")} theme={theme}>
          {/* Session streak — how many consecutive sessions these 4 players have played */}
          {(() => {
            const playerSet = new Set(sessionSummary.playerStats.map(p => p.id));
            // Sort matches chronologically first — Firestore order is not guaranteed
            const sorted = [...(state.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            // Walk backwards through sorted matches looking for sessions with same 4 players
            const sessions = [];
            let i = sorted.length - 1;
            while (i >= 0) {
              if (i >= 2) {
                const trio = sorted.slice(i-2, i+1);
                if (trio.every(m => m.type === "doubles")) {
                  const trioPlayers = new Set(trio.flatMap(m => m.teams?.flat() || []));
                  if (trioPlayers.size === 4 && [...playerSet].every(id => trioPlayers.has(id))) {
                    sessions.push(trio);
                    i -= 3;
                    continue;
                  }
                }
              }
              i--;
            }
            if (sessions.length < 2) return null;
            return (
              <div style={{background:"rgba(240,192,64,0.12)", border:"1px solid rgba(240,192,64,0.3)",
                borderRadius:10*z, padding:10*z, marginBottom:12*z, textAlign:"center"}}>
                <div style={{fontSize:18*z}}>🔥</div>
                <div style={{fontSize:13*z, fontWeight:700, color:"#f0c040", marginTop:2*z}}>
                  {sessions.length} Sessions in a Row!
                </div>
                <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>
                  Same group playing together
                </div>
              </div>
            );
          })()}
          {/* 2×2 player stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8*z,marginBottom:16*z}}>
            {sessionSummary.playerStats.map(ps => (
              <div key={ps.id} style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10*z,padding:10*z}}>
                <div style={{fontWeight:700,fontSize:12*z,color:theme.text,marginBottom:3*z}}>{ps.name}</div>
                <div style={{fontSize:11*z,color:theme.sub}}>{ps.wins}{t("w_abbr")||"W"} {ps.losses}{t("l_abbr")||"L"}</div>
                <div style={{fontSize:12*z,fontWeight:700,color:ps.delta>=0?"#50c878":"#e05050",marginTop:2*z}}>
                  {ps.delta>=0?"+":""}{ps.delta.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
          {/* Highlights */}
          <div style={{display:"flex",flexDirection:"column",gap:8*z,marginBottom:16*z}}>
            <div style={{background:"rgba(80,200,120,0.1)",border:"1px solid #50c87844",borderRadius:10*z,padding:10*z}}>
              <div style={{fontSize:10*z,color:theme.sub,marginBottom:2*z}}>🏆 {t("session_summary_mvp")}</div>
              <div style={{fontWeight:700,color:"#50c878"}}>{sessionSummary.mvp?.name} — {sessionSummary.mvp?.wins}{t("w_abbr")||"W"} {sessionSummary.mvp?.losses}{t("l_abbr")||"L"}</div>
            </div>
            <div style={{background:"rgba(64,160,224,0.1)",border:"1px solid #40a0e044",borderRadius:10*z,padding:10*z}}>
              <div style={{fontSize:10*z,color:theme.sub,marginBottom:2*z}}>📈 {t("session_summary_improved")}</div>
              <div style={{fontWeight:700,color:"#40a0e0"}}>{sessionSummary.mostImproved?.name} {sessionSummary.mostImproved?.delta>=0?"+":""}{sessionSummary.mostImproved?.delta.toFixed(3)}</div>
            </div>
            <div style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10*z,padding:10*z}}>
              <div style={{fontSize:10*z,color:theme.sub,marginBottom:2*z}}>🎯 {t("session_summary_total_pts")}</div>
              <div style={{fontWeight:700,color:theme.text}}>{sessionSummary.totalPts}</div>
            </div>
          </div>
          {/* Match recap */}
          <div style={{fontSize:11*z,fontWeight:700,color:theme.sub,marginBottom:6*z}}>{t("session_summary_results")}</div>
          {sessionSummary.matchSummaries.map((m, i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11*z,padding:`${5*z}px 0`,borderBottom:`1px solid ${theme.border}`}}>
              <span style={{color:theme.sub,fontWeight:700}}>R{i+1}</span>
              <span style={{color:theme.text,flex:1,textAlign:"center"}}>{m.t1} vs {m.t2}</span>
              <span style={{fontWeight:700,color:"#50c878"}}>{m.score}</span>
            </div>
          ))}

          {/* ── Court Rotation Suggestion ── */}
          {(() => {
            const stats = sessionSummary.playerStats;
            if (stats.length !== 4) return null;
            // Sort players: lowest wins first (they need fresh matchups most)
            const sorted = [...stats].sort((a, b) => a.wins - b.wins || a.delta - b.delta);
            // Suggest: pair players who played together least recently
            // Simple approach: bottom 2 players together, top 2 together
            const nextT1 = [sorted[0], sorted[3]]; // spread skill gap
            const nextT2 = [sorted[1], sorted[2]];
            const getName = p => p.name?.split(" ")[0] || "?";
            return (
              <div style={{
                background: theme.accent+"11", border:`1px solid ${theme.accent}33`,
                borderRadius:10*z, padding:10*z, marginTop:12*z
              }}>
                <div style={{fontSize:10*z, fontWeight:700, color:theme.accent, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6*z}}>
                  🔄 Next Round Suggestion
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8*z, fontSize:12*z}}>
                  <span style={{color:theme.accent, fontWeight:700}}>{nextT1.map(getName).join(" & ")}</span>
                  <span style={{color:theme.sub}}>vs</span>
                  <span style={{color:"#e05050", fontWeight:700}}>{nextT2.map(getName).join(" & ")}</span>
                </div>
                <div style={{fontSize:10*z, color:theme.sub, marginTop:4*z}}>
                  Balances wins — keeps the competition fresh
                </div>
              </div>
            );
          })()}
          <div style={{display:"flex",gap:8*z,marginTop:16*z}}>
            <button style={{...S.btnSecondary,flex:1,marginTop:0}} onClick={() => shareRecap(sessionSummary)}>{t("session_summary_share")}</button>
            <button style={{...S.btnPrimary,flex:1,marginTop:0}} onClick={() => setSessionSummary(null)}>{t("session_summary_close")}</button>
          </div>
        </Sec>
      )}

      {/* ── Player setup + score entry — hidden while results are showing ── */}
      {!sessionSummary && (<>
      <Sec title={t("select_foursome")} theme={theme}>
        {savedGroups.length > 0 && (
          <div style={{marginBottom: 16*z}}>
            <label style={S.label}>{t("load_saved_group")}</label>
            <div style={{display:"flex", gap:8*z, flexWrap:"wrap"}}>
              {savedGroups.map(g => (
                <div key={g.id} style={{display:"flex", alignItems:"center", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z}}>
                  <button style={{...S.btnSecondary, marginTop:0, border:"none", background:"none", padding:"6px 10px"}} onClick={()=>loadGroup(g)}>{g.name}</button>
                  {isAdmin && <button style={{...S.iconBtn, fontSize:12*z, padding:"0 8px", color:theme.sub}} onClick={()=>deleteGroup(g.id)}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10*z}}>
          {[0,1,2,3].map(i => {
            const pid = sessionIds[i];
            const form = pid ? getRecentForm(pid, state.matches) : [];
            return (
              <div key={i} style={{minWidth:0}}>
                <PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&sessionIds.some((id,idx)=>idx!==i&&id===o.value)}))} value={pid} onChange={v=>upP(i,v)} placeholder={`${t("player_n")||"Player"} ${i+1}`} theme={theme}/>
                {form.length > 0 && (
                  <div style={{display:"flex",gap:3*z,marginTop:3*z,justifyContent:"center"}}>
                    {form.map((r,j) => (
                      <span key={j} style={{fontSize:9*z,fontWeight:800,color:r==="W"?"#50c878":"#e05050",
                        background:r==="W"?"rgba(80,200,120,0.15)":"rgba(224,80,80,0.15)",
                        borderRadius:3*z,padding:`1px ${3*z}px`}}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}

        {/* ── BALANCED TEAM SUGGESTER ─────────────────────────────────── */}
        {isReady && suggestions.length > 0 && (
          <div style={{marginTop:12*z, padding:12*z, background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:10*z}}>
            <div style={{fontSize:12*z, fontWeight:700, color:theme.accent, marginBottom:4*z}}>{t("team_suggester_sec")}</div>
            <div style={{fontSize:10*z, color:theme.sub, marginBottom:10*z}}>{t("team_suggester_desc")}</div>
            {suggestions.map((s, i) => {
              const isChosen = chosenSplit === i;
              const isBest = i === 0;
              return (
                <div key={i} onClick={() => setChosenSplit(i)} style={{
                  padding:`${8*z}px ${10*z}px`, marginBottom:6*z, borderRadius:8*z, cursor:"pointer",
                  border:`2px solid ${isChosen ? theme.accent : isBest ? "#50c87844" : theme.border}`,
                  background: isChosen ? theme.accent+"18" : isBest ? "rgba(80,200,120,0.05)" : "transparent",
                  transition:"all 0.15s"
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11*z, fontWeight:700, color: isBest ? "#50c878" : theme.sub}}>
                      {isBest ? `✅ ${t("team_fairest")}` : `${t("option_lbl")||"Option"} ${i+1}`}
                    </span>
                    <span style={{fontSize:10*z, color:theme.sub}}>{t("team_balance_label")} {s.gap.toFixed(3)}</span>
                  </div>
                  <div style={{fontSize:12*z, marginTop:4*z}}>
                    {/* Stacked layout: T1 on one line, T2 on next — readable at all font sizes */}
                    <div style={{display:"flex", alignItems:"center", gap:4*z, flexWrap:"nowrap", overflow:"hidden"}}>
                      <span style={{fontSize:10*z, color:theme.sub, flexShrink:0}}>{t("team_abbr_1")||"T1"}</span>
                      <strong style={{color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1}}>
                        {getName(s.t1[0])} &amp; {getName(s.t1[1])}
                      </strong>
                      <span style={{fontSize:10*z, color:theme.sub, flexShrink:0}}>({s.avg1.toFixed(2)})</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:4*z, flexWrap:"nowrap", overflow:"hidden", marginTop:2*z}}>
                      <span style={{fontSize:10*z, color:theme.sub, flexShrink:0}}>{t("team_abbr_2")||"T2"}</span>
                      <strong style={{color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1}}>
                        {getName(s.t2[0])} &amp; {getName(s.t2[1])}
                      </strong>
                      <span style={{fontSize:10*z, color:theme.sub, flexShrink:0}}>({s.avg2.toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isReady && (
          <div style={{marginTop: 12*z}}>
            <div style={{display:"flex", gap:12*z, marginBottom:12*z}}>
              <div style={{flex:1, minWidth:0}}>
                <label style={S.label}>{t("win_to_lbl")}</label>
                <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
              </div>
              <div style={{flex:1, minWidth:0}}>
                <label style={S.label}>{t("win_by_lbl")}</label>
                <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
              </div>
            </div>
            <div>
              <label style={S.label}>
                {t("save_group_lbl") || "Save Group"}
                <span style={{fontWeight:400, color:theme.sub, fontSize:10*z, marginLeft:6*z}}>
                  — {t("save_group_help") || "Save this 4-player lineup for quick re-selection later"}
                </span>
              </label>
              <div style={{display:"flex", gap:8*z}}>
                <input style={{...S.input, flex:1}} placeholder={t("save_group_placeholder") || "e.g. The Usuals"} value={groupName} onChange={e=>setGroupName(e.target.value)} />
                <button style={{...S.btnPrimary}} onClick={saveCurrentGroup}>{t("save_group_btn")}</button>
              </div>
            </div>
          </div>
        )}
      </Sec>

      {isReady&&(
        <Sec title={t("rr_matchups")} theme={theme}>
          {chosenSplit !== null && suggestions[chosenSplit] && (
            <div style={{
              padding:`${8*z}px ${10*z}px`, marginBottom:12*z,
              background: theme.accent + "11", border: `1px solid ${theme.accent}44`,
              borderRadius: 8*z, fontSize: 11*z, color: theme.sub
            }}>
              💡 {t("rr_suggester_hint") || "Tip: highlighted round below matches your chosen team split. You'll still play all 3 rounds — this is just the matchup with the fairest team balance."}
            </div>
          )}
          <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
            {matchups.map((m, i) => {
              // Map this matchup to a suggestion index by checking if the team-pairing matches.
              // suggestion.t1/t2 contain player IDs; m.t1/t2 contain INDICES into sessionIds.
              const matchupPlayerSet = new Set([sessionIds[m.t1[0]], sessionIds[m.t1[1]]].sort());
              const isChosenMatchup = chosenSplit !== null && suggestions[chosenSplit] &&
                JSON.stringify([...suggestions[chosenSplit].t1].sort()) === JSON.stringify([...matchupPlayerSet]);
              return (
                <div key={i}>
                <RoundCard
                  round={i+1}
                  t1Name={`${getName(sessionIds[m.t1[0]])} / ${getName(sessionIds[m.t1[1]])}`}
                  t2Name={`${getName(sessionIds[m.t2[0]])} / ${getName(sessionIds[m.t2[1]])}`}
                  t1Score={roundScores[i].t1}
                  t2Score={roundScores[i].t2}
                  onT1Change={v => updScore(i, "t1", v)}
                  onT2Change={v => updScore(i, "t2", v)}
                  winTo={winTo} winBy={winBy}
                  highlighted={isChosenMatchup}
                  highlightLabel={t("team_fairest")}
                  theme={theme} z={z} S={S} t={t}
                />
                </div>
              );
            })}
            
            <div>
              <label style={S.label}>{t("session_notes_sec")||"Session Notes (Optional)"}</label>
              <input style={S.input} placeholder="e.g. Really hot day, great rallies..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>

            {/* Live preview — shows as scores are entered, before logging */}
            {(() => {
              const liveResults = matchups.map((m, i) => {
                const s1 = parseInt(roundScores[i].t1), s2 = parseInt(roundScores[i].t2);
                if (isNaN(s1) || isNaN(s2)) return null;
                const r = validatePickleballScore(s1, s2, winTo, winBy);
                if (!r) return null;
                return {
                  t1Name: `${getName(sessionIds[m.t1[0]])} / ${getName(sessionIds[m.t1[1]])}`,
                  t2Name: `${getName(sessionIds[m.t2[0]])} / ${getName(sessionIds[m.t2[1]])}`,
                  winner: r.winner, s1, s2, round: i + 1
                };
              }).filter(Boolean);
              if (!liveResults.length) return null;
              return (
                <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:10*z, padding:10*z}}>
                  <div style={{fontSize:11*z, fontWeight:700, color:theme.accent, marginBottom:8*z, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                    📊 {t("score_preview")||"SCORE PREVIEW"}
                  </div>
                  {liveResults.map(r => (
                    <div key={r.round} style={{padding:`${5*z}px 0`, borderBottom:`1px solid ${theme.border}`}}>
                      <div style={{fontSize:10*z, color:theme.sub, fontWeight:700, marginBottom:3*z}}>
                        {t("round_lbl")||"R"}{r.round}
                      </div>
                      {/* T1 row */}
                      <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:2*z}}>
                        <span style={{flex:1, minWidth:0, fontSize:11*z, fontWeight:r.winner===0?700:400, color:r.winner===0?theme.accent:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                          {r.winner===0?"✓ ":""}{r.t1Name}
                        </span>
                        <span style={{fontSize:12*z, fontWeight:800, color:r.winner===0?theme.accent:theme.text, flexShrink:0, minWidth:24*z, textAlign:"right"}}>{r.s1}</span>
                      </div>
                      {/* T2 row */}
                      <div style={{display:"flex", alignItems:"center", gap:8*z}}>
                        <span style={{flex:1, minWidth:0, fontSize:11*z, fontWeight:r.winner===1?700:400, color:r.winner===1?theme.accent:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                          {r.winner===1?"✓ ":""}{r.t2Name}
                        </span>
                        <span style={{fontSize:12*z, fontWeight:800, color:r.winner===1?theme.accent:theme.text, flexShrink:0, minWidth:24*z, textAlign:"right"}}>{r.s2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {err && <Err msg={err} theme={theme}/>}
            <div style={{display:"flex", gap:8*z}}>
              <button
                style={{...S.btnSecondary, marginTop:0, flexShrink:0, paddingLeft:16*z, paddingRight:16*z}}
                onClick={() => {
                  clearSessionIds(); clearRoundScores(); clearSessionNotes();
                  setChosenSplit(null); setErr(""); setSuccess("");
                }}>
                {t("reset_btn") || "🔄 Reset"}
              </button>
              <button style={{...S.btnBig, marginTop:0, flex:1}} onClick={submitSession}>{t("log_match_btn")}</button>
            </div>
          </div>
        </Sec>
      )}
      </>)} {/* end !sessionSummary */}
    </div>
  );
}

export function KingOfCourt({ players, state, set, nav, theme, isAdmin, user, showUndo }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  // Persisted draft for KOTC — survives accidental tab-away. Cleared after Log.
  const [sessionIds, setSessionIds, clearKotcIds] = usePersistentFormState("kotc:ids", ["","","",""]);
  const [winTo,setWinTo]=useState(11);
  const [winBy,setWinBy]=useState(1);
  const [roundScores, setRoundScores, clearKotcScores] = usePersistentFormState("kotc:scores", [{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
  const [notes, setNotes, clearKotcNotes] = usePersistentFormState("kotc:notes", ""); 
  const [err, setErr] = useState(""), [success, setSuccess] = useState("");
  // Snapshot of leaderboard and matchups captured at submit time, so the analysis
  // panel can keep rendering after the draft state is cleared.
  const [kotcAnalysis, setKotcAnalysis] = useState(null);
  
  useEffect(() => {
    if (user?.myPlayerId && !sessionIds[0]) {
       setSessionIds(ids => [user.myPlayerId, ids[1], ids[2], ids[3]]);
    }
  }, [user?.myPlayerId]);

  const filledIds = sessionIds.filter(Boolean);
  const hasDupes = new Set(filledIds).size < filledIds.length;
  const isReady = filledIds.length === 4 && !hasDupes;

  const rawOpts = players.map(p=>({value:p.id,label:shortName(p.name, isLargeZoom(z) ? "always" : "auto")}));
  // Today's Players (set in QuickLog) float to the top — above starred, above alpha.
  const _todayIds = (() => { try { return JSON.parse(sessionStorage.getItem("ql_today_players")||"[]"); } catch { return []; } })();
  const opts = sortOptionsAlpha(rawOpts, [...new Set([..._todayIds, ...(state.favoredPlayerIds||[])].filter(Boolean))]);
  const getName = id => shortName(players.find(p=>p.id===id)?.name ?? "?", isLargeZoom(z) ? "always" : "auto");
  const matchups = [{ id: 1, t1: [0, 1], t2: [2, 3] }, { id: 2, t1: [0, 2], t2: [1, 3] }, { id: 3, t1: [0, 3], t2: [1, 2] }];
  
  function upP(idx,val){const n=[...sessionIds];n[idx]=val;setSessionIds(n);}
  function updScore(rIdx, team, val){
     const cleanVal = val.replace(/-/g, '');
     setRoundScores(rs => rs.map((r, i) => i === rIdx ? {...r, [team]: cleanVal} : r));
  }
  
  const kotcLeaderboard = sessionIds.map((id, pIdx) => {
      let wins = 0; let pointsFor = 0; let pointsAgainst = 0;
      if (id) {
          matchups.forEach((matchup, rIdx) => {
              const s1 = parseInt(roundScores[rIdx].t1);
              const s2 = parseInt(roundScores[rIdx].t2);
              if (!isNaN(s1) && !isNaN(s2)) {
                  const isT1 = matchup.t1.includes(pIdx);
                  const isT2 = matchup.t2.includes(pIdx);
                  if (isT1) { pointsFor += s1; pointsAgainst += s2; if (s1 > s2) wins++; } 
                  else if (isT2) { pointsFor += s2; pointsAgainst += s1; if (s2 > s1) wins++; }
              }
          });
      }
      return { id, pIdx, wins, diff: pointsFor - pointsAgainst };
  }).sort((a,b) => b.wins - a.wins || b.diff - a.diff);

  function submitTournament(){
    setErr(""); setSuccess("");
    if(sessionIds.some(id => !id)) return setErr(t("err_select_players"));
    if(new Set(sessionIds).size !== 4) return setErr(t("err_duplicate"));

    const matchesToLog = [];
    const baseTime = Date.now();
    for(let i=0; i<3; i++) {
    const kotcNum = getSessionNum(state.matches, "King of the Court");
        const s1 = parseInt(roundScores[i].t1);
        const s2 = parseInt(roundScores[i].t2);
        if (isNaN(s1) || isNaN(s2)) return setErr(`${t("round_lbl")||"Round"} ${i+1}: ${t("err_valid_scores")}`);
        const r = validatePickleballScore(s1, s2, winTo, winBy);
        if(!r) return setErr(`${t("round_lbl")||"Round"} ${i+1}: ${t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}`);
        const winnerTeam = r.winner;
        const t1w = winnerTeam === 0 ? 1 : 0;
        const t2w = winnerTeam === 1 ? 0 : 1;
        const t1Ids = [sessionIds[matchups[i].t1[0]], sessionIds[matchups[i].t1[1]]];
        const t2Ids = [sessionIds[matchups[i].t2[0]], sessionIds[matchups[i].t2[1]]];
        // Stagger timestamps by 1 sec each so reverse-chrono History shows last round on top
        const matchDate = new Date(baseTime + (i * 1000)).toISOString();
        matchesToLog.push({
          id: genId(), type: "doubles", date: matchDate,
          teams: [t1Ids, t2Ids], winnerTeam,
          games: [{a:s1, b:s2, winner: winnerTeam}],
          teamNames: {t1:null, t2:null}, winTo, winBy,
          team1Wins: t1w, team2Wins: t2w, venue: null,
          notes: `${(t("kotc_match_note")||"King of the Court #{num}: Match {round} of 3").replace("{num}", kotcNum).replace("{round}", i+1)}${notes.trim() ? " — " + notes.trim() : ""}`,
          loggedBy: user?.myPlayerId || "guest"
        });
    }
    set(s => ({...s, matches: [...(s.matches||[]), ...matchesToLog]}));
    showUndo?.(matchesToLog.map(m => m.id), t("undo_kotc")||"KOTC logged");
    // Capture analysis snapshot so the panel can render after state clears
    setKotcAnalysis({
      leaderboard: kotcLeaderboard.slice(),
      matchups: matchups.map((m, i) => ({
        round: i + 1,
        t1Ids: [sessionIds[m.t1[0]], sessionIds[m.t1[1]]],
        t2Ids: [sessionIds[m.t2[0]], sessionIds[m.t2[1]]],
        s1: parseInt(roundScores[i].t1), s2: parseInt(roundScores[i].t2),
      })),
    });
    setSuccess(`${t("matches_logged_3")||"✅ 3 Matches Logged."}\n${t("king_crowned")||"King Crowned:"} ${getName(kotcLeaderboard[0].id)}`);
    // Scroll to top so user sees results
    setTimeout(() => { const mains = document.querySelectorAll("main"); const m = mains[mains.length-1]; if(m) m.scrollTop=0; window.scrollTo({top:0,behavior:"instant"}); }, 80);
    // Clear persisted draft
    clearKotcScores();
    clearKotcIds();
    clearKotcNotes();
  }

  return (
    <div style={S.view}>
      <MatchesSubNav active="kotc" nav={nav} theme={theme} players={players} favoredPlayerIds={state.favoredPlayerIds} />
      {success && (
        <div style={{background:"rgba(80,200,120,0.15)", color:"#50c878", padding:`${10*z}px`, borderRadius:8*z, marginBottom:12*z, textAlign:"center"}}>
          {success.split('\n').map((line, i) => (
            <div key={i} style={{fontSize: i===0 ? 12*z : 16*z, fontWeight: i===0 ? 600 : 800, marginTop: i===0 ? 0 : 4*z}}>{line}</div>
          ))}
        </div>
      )}

      {/* ── KOTC analysis panel — shows after matches are logged ───────────────
          Tells the story of why each player landed where they did. */}
      {kotcAnalysis && (
        <Sec title={t("kotc_analysis_title")||"👑 King of the Court — Analysis"} theme={theme}>
          {/* Leaderboard with explanations */}
          <div style={{display:"flex", flexDirection:"column", gap:8*z, marginBottom:14*z}}>
            {kotcAnalysis.leaderboard.map((entry, rank) => {
              const isKing = rank === 0;
              const medal = rank === 0 ? "👑" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank+1}`;
              // Reason text: explain via wins + point diff
              let reason;
              const diffStr = `${entry.diff >= 0 ? '+' : ''}${entry.diff}`;
              if (isKing) {
                reason = (t("kotc_king_reason")||"Won {wins} of 3 matches with a +{diff} point differential — the strongest combined record.")
                  .replace("{wins}", entry.wins).replace("{diff}", entry.diff);
              } else if (entry.wins === kotcAnalysis.leaderboard[0].wins) {
                reason = (t("kotc_tied_reason")||"Tied at {wins} wins but lost the tiebreaker on point differential ({diff}).")
                  .replace("{wins}", entry.wins).replace("{diff}", diffStr);
              } else {
                reason = (t("kotc_lost_reason")||"Won {wins} match (fewer than the King). Point differential: {diff}.")
                  .replace("{wins}", entry.wins).replace("{diff}", diffStr);
              }
              return (
                <div key={entry.id} style={{
                  background: isKing ? "rgba(240,192,64,0.10)" : theme.bg,
                  border: `1px solid ${isKing ? "#f0c04055" : theme.border}`,
                  borderRadius: 10*z, padding: 10*z
                }}>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8*z, marginBottom: 4*z}}>
                    <div style={{display:"flex", alignItems:"center", gap:8*z, flex:1, minWidth:0, overflow:"hidden"}}>
                      <span style={{fontSize:18*z, flexShrink:0}}>{medal}</span>
                      <span style={{fontSize:14*z, fontWeight: isKing ? 800 : 700, color: isKing ? "#f0c040" : theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {getName(entry.id)}{isKing && ` — ${t("kotc_king_suffix")||"KING"}`}
                      </span>
                    </div>
                    <div style={{fontSize:11*z, color:theme.sub, flexShrink:0}}>
                      {entry.wins}{t("w_abbr")||"W"} · {entry.diff >= 0 ? '+' : ''}{entry.diff} pts
                    </div>
                  </div>
                  <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.5}}>{reason}</div>
                </div>
              );
            })}
          </div>
          {/* Per-match recap */}
          <div style={{fontSize:11*z, fontWeight:700, color:theme.sub, marginBottom:6*z, textTransform:"uppercase", letterSpacing:"0.5px"}}>{t("kotc_match_recap")||"Match Recap"}</div>
          <div style={{display:"flex", flexDirection:"column", gap:6*z, marginBottom: 12*z}}>
            {kotcAnalysis.matchups.map(m => {
              const winT1 = m.s1 > m.s2;
              const t1Name = `${shortName(getName(m.t1Ids[0]),"always")} / ${shortName(getName(m.t1Ids[1]),"always")}`;
              const t2Name = `${shortName(getName(m.t2Ids[0]),"always")} / ${shortName(getName(m.t2Ids[1]),"always")}`;
              return (
                <div key={m.round} style={{padding:`${6*z}px ${8*z}px`, background:theme.bg, borderRadius:6*z, marginBottom:4*z}}>
                  <div style={{fontSize:10*z, color:theme.sub, fontWeight:700, marginBottom:3*z}}>#{m.round}</div>
                  <div style={{display:"flex", alignItems:"center", gap:6*z, marginBottom:2*z}}>
                    <span style={{flex:1, minWidth:0, fontSize:11*z, fontWeight:winT1?700:400, color:winT1?theme.accent:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                      {winT1?"✓ ":""}{t1Name}
                    </span>
                    <span style={{fontSize:12*z, fontWeight:800, color:winT1?theme.accent:theme.text, flexShrink:0, minWidth:22*z, textAlign:"right"}}>{m.s1}</span>
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:6*z}}>
                    <span style={{flex:1, minWidth:0, fontSize:11*z, fontWeight:!winT1?700:400, color:!winT1?theme.accent:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                      {!winT1?"✓ ":""}{t2Name}
                    </span>
                    <span style={{fontSize:12*z, fontWeight:800, color:!winT1?theme.accent:theme.text, flexShrink:0, minWidth:22*z, textAlign:"right"}}>{m.s2}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => { setKotcAnalysis(null); setSuccess(""); }}
            style={{...S.btnSecondary, width:"100%", marginTop:0}}>
            {t("kotc_start_another")||"Start Another King of the Court"}
          </button>
        </Sec>
      )}
      
      {!kotcAnalysis && (
      <Sec title={t("kotc")} theme={theme}>
        <div style={{fontSize:12*z, color:theme.sub, marginBottom:12*z}}>{t("kotc_desc")}</div>
        <div style={{display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:8*z, marginBottom:16*z}}>
          {[0,1,2,3].map(i=>(
            <PlayerPicker key={i} opts={opts.map(o=>({...o,disabled:o.value&&sessionIds.some((id,idx)=>idx!==i&&id===o.value)}))} value={sessionIds[i]} onChange={v=>upP(i,v)} placeholder={`${t("player_n")||"Player"} ${i+1}`} theme={theme}/>
          ))}
        </div>

        {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}

        {isReady && (
          <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
            <div style={{display:"flex", gap:12*z}}>
              <div style={{flex:1, minWidth:0}}>
                <label style={S.label}>{t("win_to_lbl")}</label>
                <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
              </div>
              <div style={{flex:1, minWidth:0}}>
                <label style={S.label}>{t("win_by_lbl")}</label>
                <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
              </div>
            </div>

            {matchups.map((m, i) => (
              <div key={i}>
              <RoundCard
                round={i+1}
                t1Name={`${getName(sessionIds[m.t1[0]])} / ${getName(sessionIds[m.t1[1]])}`}
                t2Name={`${getName(sessionIds[m.t2[0]])} / ${getName(sessionIds[m.t2[1]])}`}
                t1Score={roundScores[i].t1}
                t2Score={roundScores[i].t2}
                onT1Change={v => updScore(i, "t1", v)}
                onT2Change={v => updScore(i, "t2", v)}
                winTo={winTo} winBy={winBy}
                highlighted={false}
                theme={theme} z={z} S={S} t={t}
              />
              </div>
            ))}
            
            <div>
              <label style={S.label}>{t("event_notes_sec")||"Event Notes (Optional)"}</label>
              <input style={S.input} placeholder="e.g. Epic comebacks..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>

            {err && <Err msg={err} theme={theme}/>}
            <div style={{display:"flex", gap:8*z}}>
              <button
                style={{...S.btnSecondary, marginTop:0, flexShrink:0, paddingLeft:16*z, paddingRight:16*z}}
                onClick={() => {
                  clearKotcIds(); clearKotcScores(); clearKotcNotes();
                  setErr(""); setSuccess("");
                }}>
                {t("reset_btn") || "🔄 Reset"}
              </button>
              <button style={{...S.btnBig, marginTop:0, flex:1}} onClick={submitTournament}>{t("log_match_btn")}</button>
            </div>
          </div>
        )}
      </Sec>
      )} {/* end !kotcAnalysis */}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TournamentMode — supports Single Elimination, Double Elimination, Round Robin
// ═══════════════════════════════════════════════════════════════════════════════
//
// Format-aware state machine. Each format has its own bracket structure stored
// under a single `bracket` field in sessionStorage. Top-level state:
//   - format: "se" | "de" | "rr"
//   - playerCount: number of player slots (varies by format)
//   - teamMode: "singles" | "doubles" (for SE/DE) — RR currently doubles-only
//   - players: array of player IDs (length = playerCount × 2 for doubles)
//   - bracket: format-specific data — rounds/matches with scores + status
//   - phase: which logical phase we're showing (e.g. "round1", "semis", "final", "done")
//
export function TournamentMode({ players: roster, state, set, nav, theme, user, showUndo }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  // Persisted tournament draft — survives accidental tab-aways
  const [format, setFormat, clearFormat] = usePersistentFormState("tourney:format", "se");
  const [playerCount, setPlayerCount, clearPlayerCount] = usePersistentFormState("tourney:playerCount", 4);
  const [tIds, setTIds, clearTIds] = usePersistentFormState("tourney:ids", []);
  const [bracket, setBracket, clearBracket] = usePersistentFormState("tourney:bracket", null);
  const [winTo, setWinTo] = useState(11);
  const [winBy, setWinBy] = useState(2);
  const [notes, setNotes, clearTNotes] = usePersistentFormState("tourney:notes", "");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(bracket ? 1 : 0);   // 0 = setup, 1 = play
  // Per-round collapse state — track which rounds are expanded vs collapsed
  const [collapsed, setCollapsed] = useState({});

  // ── Helpers ───────────────────────────────────────────────────────────────
  const rawOpts = roster.map(p => ({ value: p.id, label: shortName(p.name, isLargeZoom(z) ? "always" : "auto") }));
  // Today's Players (set in QuickLog) float to the top — above starred, above alpha.
  const _todayIds = (() => { try { return JSON.parse(sessionStorage.getItem("ql_today_players")||"[]"); } catch { return []; } })();
  const opts = sortOptionsAlpha(rawOpts, [...new Set([..._todayIds, ...(state.favoredPlayerIds||[])].filter(Boolean))]);
  const getName = id => shortName(roster.find(p => p.id === id)?.name ?? "TBD", isLargeZoom(z) ? "always" : "auto");
  const getTeamLabel = (team) => (team || []).map(getName).join(" / ");

  // Player slot count = (teams) × 2 for doubles
  // SE: 4 teams × 2 players = 8 slots (or 8 teams × 2 = 16 slots if we add 8-team SE later)
  // DE: 4 teams × 2 players = 8 slots
  // RR: 4–6 teams × 2 players = 8–12 slots
  // For now: SE/DE = 4 teams (8 slots), RR = 4–6 teams configurable
  const teamCount = format === "rr" ? playerCount : 4;
  const slotCount = teamCount * 2;

  // Ensure tIds array length matches slotCount when format/playerCount changes
  useEffect(() => {
    if (tIds.length !== slotCount) {
      setTIds(Array(slotCount).fill(""));
    }
  }, [slotCount]);

  // Helpers to read teams from tIds (pairs of consecutive ids)
  const teamsFromIds = () => {
    const result = [];
    for (let i = 0; i < slotCount; i += 2) result.push([tIds[i] || "", tIds[i+1] || ""]);
    return result;
  };

  const filled = tIds.filter(Boolean);
  const hasDupes = new Set(filled).size < filled.length;
  const allFilled = tIds.length === slotCount && tIds.every(Boolean);

  const updateSlot = (idx, val) => {
    const next = [...tIds];
    while (next.length < slotCount) next.push("");
    next[idx] = val;
    setTIds(next);
    setErr("");
  };

  // ── Bracket builders ──────────────────────────────────────────────────────
  function buildSEBracket() {
    const teams = teamsFromIds();
    // Single elimination 4 teams: 2 semifinals → 1 final
    return {
      format: "se",
      rounds: [
        { name: "semifinal", matches: [
          { teams: [teams[0], teams[1]], scoreA: "", scoreB: "", winner: null },
          { teams: [teams[2], teams[3]], scoreA: "", scoreB: "", winner: null },
        ]},
        { name: "final", matches: [
          { teams: [null, null], scoreA: "", scoreB: "", winner: null },
        ]},
      ],
      champion: null,
    };
  }

  function buildDEBracket() {
    const teams = teamsFromIds();
    // Double elimination 4 teams:
    //   WB-SF1: T1 vs T2 → winner goes to WB-Final
    //   WB-SF2: T3 vs T4 → winner goes to WB-Final
    //   WB-Final: WB-SF1-W vs WB-SF2-W → winner goes to Grand Final
    //   LB-Final: WB-SF1-L vs WB-SF2-L → winner goes to Grand Final
    //   Grand Final: WB-winner vs LB-winner → champion
    return {
      format: "de",
      rounds: [
        { name: "wb_sf", matches: [
          { teams: [teams[0], teams[1]], scoreA: "", scoreB: "", winner: null },
          { teams: [teams[2], teams[3]], scoreA: "", scoreB: "", winner: null },
        ]},
        { name: "wb_final_and_lb_final", matches: [
          { label: t("winners_bracket_final")||"Winners Bracket Final", teams: [null, null], scoreA: "", scoreB: "", winner: null },
          { label: t("losers_bracket_final")||"Losers Bracket Final",  teams: [null, null], scoreA: "", scoreB: "", winner: null },
        ]},
        { name: "grand_final", matches: [
          { teams: [null, null], scoreA: "", scoreB: "", winner: null },
        ]},
      ],
      champion: null,
    };
  }

  function buildRRBracket() {
    const teams = teamsFromIds();
    // Round robin: every team plays every other team exactly once
    const matches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ teams: [teams[i], teams[j]], scoreA: "", scoreB: "", winner: null });
      }
    }
    return {
      format: "rr",
      rounds: [{ name: "all", matches }],
      champion: null,
    };
  }

  function startTournament() {
    setErr("");
    if (hasDupes) return setErr(t("err_duplicate"));
    if (!allFilled) return setErr(t("err_select_players"));
    let b;
    if (format === "se") b = buildSEBracket();
    else if (format === "de") b = buildDEBracket();
    else b = buildRRBracket();
    setBracket(b);
    setCollapsed({});
    setSuccess(""); // clear previous tournament result when starting new one
    setStep(1);
    // Scroll the main container to top so user sees Round 1 immediately
    setTimeout(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTop = 0;
    }, 50);
  }

  // ── Score input handlers ──────────────────────────────────────────────────
  function updateScore(roundIdx, matchIdx, field, val) {
    setBracket(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.rounds[roundIdx].matches[matchIdx][field] = val.replace(/-/g, '');
      return next;
    });
    setErr("");
  }

  // Validate one match's scores; if valid, set winner index (0 or 1) on the match
  function validateMatch(m) {
    const a = parseInt(m.scoreA), b = parseInt(m.scoreB);
    if (isNaN(a) || isNaN(b)) return null;
    const r = validatePickleballScore(a, b, winTo, winBy);
    return r;
  }

  // ── Compute round completion + advance brackets ───────────────────────────
  // Whenever scores change, recompute the bracket — propagating winners forward
  const computedBracket = useMemo(() => {
    if (!bracket) return null;
    const b = JSON.parse(JSON.stringify(bracket));

    // First pass: validate each match independently
    b.rounds.forEach(round => {
      round.matches.forEach(m => {
        if (m.teams[0] && m.teams[1]) {
          const r = validateMatch(m);
          m.winner = r ? r.winner : null;
        }
      });
    });

    // Propagate winners per format
    if (b.format === "se") {
      const sf = b.rounds[0].matches;
      const fin = b.rounds[1].matches[0];
      if (sf[0].winner !== null) fin.teams[0] = sf[0].teams[sf[0].winner];
      if (sf[1].winner !== null) fin.teams[1] = sf[1].teams[sf[1].winner];
      // Re-validate final since teams just got set
      if (fin.teams[0] && fin.teams[1]) {
        const r = validateMatch(fin);
        fin.winner = r ? r.winner : null;
        if (fin.winner !== null) b.champion = fin.teams[fin.winner];
      }
    } else if (b.format === "de") {
      const wbSf = b.rounds[0].matches;
      const wbFinal = b.rounds[1].matches[0];
      const lbFinal = b.rounds[1].matches[1];
      const grand = b.rounds[2].matches[0];
      // WB Final = winners of both WB-SFs; LB Final = losers of both WB-SFs
      if (wbSf[0].winner !== null && wbSf[1].winner !== null) {
        wbFinal.teams[0] = wbSf[0].teams[wbSf[0].winner];
        wbFinal.teams[1] = wbSf[1].teams[wbSf[1].winner];
        lbFinal.teams[0] = wbSf[0].teams[1 - wbSf[0].winner];
        lbFinal.teams[1] = wbSf[1].teams[1 - wbSf[1].winner];
      }
      // Re-validate WB Final + LB Final
      [wbFinal, lbFinal].forEach(m => {
        if (m.teams[0] && m.teams[1]) {
          const r = validateMatch(m);
          m.winner = r ? r.winner : null;
        }
      });
      // Grand Final = WB winner vs LB winner
      if (wbFinal.winner !== null && lbFinal.winner !== null) {
        grand.teams[0] = wbFinal.teams[wbFinal.winner];
        grand.teams[1] = lbFinal.teams[lbFinal.winner];
        const r = validateMatch(grand);
        grand.winner = r ? r.winner : null;
        if (grand.winner !== null) b.champion = grand.teams[grand.winner];
      }
    } else if (b.format === "rr") {
      // Round robin: champion = team with most wins. Ties broken by point differential.
      const teams = teamsFromIds();
      const teamKey = (team) => team ? team.join("|") : null;
      const tally = {};
      teams.forEach(t => { tally[teamKey(t)] = { team: t, wins: 0, pointDiff: 0, matches: 0 }; });
      b.rounds[0].matches.forEach(m => {
        if (m.winner === null) return;
        const a = parseInt(m.scoreA), bb = parseInt(m.scoreB);
        const winTeam = m.teams[m.winner];
        const loseTeam = m.teams[1 - m.winner];
        if (tally[teamKey(winTeam)]) {
          tally[teamKey(winTeam)].wins++;
          tally[teamKey(winTeam)].matches++;
          tally[teamKey(winTeam)].pointDiff += m.winner === 0 ? (a - bb) : (bb - a);
        }
        if (tally[teamKey(loseTeam)]) {
          tally[teamKey(loseTeam)].matches++;
          tally[teamKey(loseTeam)].pointDiff += m.winner === 0 ? (bb - a) : (a - bb);
        }
      });
      const allComplete = b.rounds[0].matches.every(m => m.winner !== null);
      if (allComplete) {
        const sorted = Object.values(tally).sort((x, y) => y.wins - x.wins || y.pointDiff - x.pointDiff);
        b.standings = sorted;
        b.champion = sorted[0].team;
      } else {
        b.standings = Object.values(tally);
      }
    }
    return b;
  }, [bracket, tIds, winTo, winBy]);

  // ── Round progress tracking ───────────────────────────────────────────────
  function isRoundComplete(round) {
    return round.matches.every(m => m.winner !== null);
  }
  function isRoundActive(rounds, idx) {
    // Active = not complete AND all prior rounds complete
    if (isRoundComplete(rounds[idx])) return false;
    for (let i = 0; i < idx; i++) if (!isRoundComplete(rounds[i])) return false;
    return true;
  }
  function isRoundUpcoming(rounds, idx) {
    return !isRoundComplete(rounds[idx]) && !isRoundActive(rounds, idx);
  }

  // Auto-collapse a round when it just completed (only the first time)
  useEffect(() => {
    if (!computedBracket) return;
    computedBracket.rounds.forEach((round, i) => {
      if (isRoundComplete(round) && collapsed[i] === undefined) {
        setCollapsed(prev => ({ ...prev, [i]: true }));
      }
    });
  }, [computedBracket]);

  function toggleCollapse(idx) {
    setCollapsed(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function logTournament() {
    setErr(""); setSuccess("");
    if (!computedBracket) return;
    // Verify ALL matches that should be playable are complete
    const allComplete = computedBracket.rounds.every(round =>
      round.matches.every(m => !m.teams[0] || !m.teams[1] || m.winner !== null)
    );
    if (!allComplete) return setErr(t("err_finish_all_matches") || "Please finish all matches before logging.");
    if (!computedBracket.champion) return setErr(t("err_finish_all_matches") || "Cannot determine champion.");

    const formatLabel = computedBracket.format === "se" ? (t("format_se")||"Single Elimination")
                      : computedBracket.format === "de" ? (t("format_de")||"Double Elimination")
                      : (t("format_rr")||"Round Robin");

    // Stagger match timestamps so reverse-chronological History naturally
    // shows Final on top, then SF2, then SF1 (later round = newer timestamp).
    // 1-second increments are imperceptible to users but produce correct ordering.
    const baseTime = Date.now();
    const matchesToLog = [];
    const tourneyNum = getSessionNum(state.matches, formatLabel);
    let mNum = 0;
    computedBracket.rounds.forEach((round, roundIdx) => {
      round.matches.forEach((m, matchIdx) => {
        if (!m.teams[0] || !m.teams[1] || m.winner === null) return;
        mNum++;
        const a = parseInt(m.scoreA), b = parseInt(m.scoreB);
        const roundDisplay = round.name === "semifinal" ? "Semifinal"
                           : round.name === "final" ? "Final"
                           : round.name === "wb_sf" ? "Winners SF"
                           : round.name === "wb_final_and_lb_final" ? (m.label ? t(`${m.label.toLowerCase().replace(/ /g,"_")}`) || m.label : t("bracket_finals")||"Bracket Final")
                           : round.name === "grand_final" ? "Grand Final"
                           : round.name === "all" ? `Match ${mNum}`
                           : round.name;
        // Earlier rounds get earlier timestamps so History shows Final on top
        const matchDate = new Date(baseTime + (mNum * 1000)).toISOString();
        matchesToLog.push({
          id: genId(), type: "doubles", date: matchDate,
          teams: m.teams, winnerTeam: m.winner,
          games: [{ a, b: b, winner: m.winner }],
          teamNames: { t1: null, t2: null }, winTo, winBy,
          team1Wins: m.winner === 0 ? 1 : 0,
          team2Wins: m.winner === 1 ? 1 : 0,
          venue: null,
          notes: `${formatLabel} #${tourneyNum}: ${roundDisplay}${notes.trim() ? " — " + notes.trim() : ""}`,
          loggedBy: user?.myPlayerId || "guest",
        });
      });
    });

    set(s => ({ ...s, matches: [...(s.matches || []), ...matchesToLog] }));
    showUndo?.(matchesToLog.map(m => m.id), t("undo_tourney")||"Tournament logged");
    const champLabel = `${getName(computedBracket.champion[0])} & ${getName(computedBracket.champion[1])}`;
    setSuccess(`🏆 ${formatLabel} Logged!\n${champLabel}`);
    // Scroll to top so user sees the result
    setTimeout(() => { const mains = document.querySelectorAll("main"); const m = mains[mains.length-1]; if(m) m.scrollTop=0; window.scrollTo({top:0,behavior:"instant"}); }, 80);
    // Reset everything for the next tournament
    clearFormat(); clearPlayerCount(); clearTIds(); clearBracket(); clearTNotes();
    setStep(0);
    setCollapsed({});
  }

  function cancelTournament() {
    clearBracket();
    setStep(0);
    setCollapsed({});
    setErr("");
    setSuccess("");  // clear champion announcement so it doesn't linger into next tournament
  }

  // ── Render: Setup screen (step 0) ─────────────────────────────────────────
  function renderSetup() {
    const formatOptions = [
      { id: "se", label: t("format_se")||"Single Elimination", desc: t("legend_tf_se_desc")||"Lose once, you're out. 4 teams → 2 semifinals → final." },
      { id: "de", label: t("format_de")||"Double Elimination", desc: t("legend_tf_de_desc")||"Lose twice, you're out. Includes a losers bracket so an early loss isn't fatal." },
      { id: "rr", label: t("format_rr")||"Round Robin",        desc: t("legend_tf_rr_desc")||"Every team plays every other team once. Winner = most wins (ties: point differential)." },
    ];
    return (
      <Sec title={t("tourney_setup") || "Tournament Setup"} theme={theme}>
        {/* Format selector */}
        <div style={{marginBottom:16*z}}>
          <label style={S.label}>{t("tourney_format") || "Format"}</label>
          <div style={{display:"flex", flexDirection:"column", gap:8*z}}>
            {formatOptions.map(opt => (
              <div key={opt.id} onClick={() => setFormat(opt.id)} style={{
                padding:`${10*z}px ${12*z}px`,
                background: format === opt.id ? theme.accent + "15" : theme.bg,
                border: `2px solid ${format === opt.id ? theme.accent : theme.border}`,
                borderRadius: 10*z, cursor: "pointer"
              }}>
                <div style={{fontSize:13*z, fontWeight:700, color: format === opt.id ? theme.accent : theme.text}}>
                  {opt.label}
                </div>
                <div style={{fontSize:10*z, color: theme.sub, marginTop:3*z}}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Player count for RR */}
        {format === "rr" && (
          <div style={{marginBottom:16*z}}>
            <label style={S.label}>{t("tourney_team_count") || "Number of Teams"}</label>
            <div style={{display:"flex", gap:6*z}}>
              {[3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setPlayerCount(n)} style={{
                  flex:1, padding:`${8*z}px`,
                  background: playerCount === n ? theme.accent + "15" : theme.bg,
                  border: `2px solid ${playerCount === n ? theme.accent : theme.border}`,
                  borderRadius: 8*z, fontSize: 13*z, fontWeight: 700,
                  color: playerCount === n ? theme.accent : theme.text, cursor: "pointer"
                }}>{n}</button>
              ))}
            </div>
            <div style={{fontSize:10*z, color:theme.sub, marginTop:6*z}}>
              {playerCount} teams → {playerCount * (playerCount - 1) / 2} matches total
            </div>
          </div>
        )}

        {/* Win-To / Win-By */}
        <div style={{display:"flex", gap:12*z, marginBottom:16*z}}>
          <div style={{flex:1, minWidth:0}}>
            <label style={S.label}>{t("win_to_lbl")}</label>
            <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
          </div>
          <div style={{flex:1, minWidth:0}}>
            <label style={S.label}>{t("win_by_lbl")}</label>
            <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
          </div>
        </div>

        {/* Team rosters */}
        <div style={{display:"grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap:12*z}}>
          {Array.from({length: teamCount}).map((_, tIdx) => (
            <div key={tIdx} style={{background:theme.card, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`, minWidth:0, boxSizing:"border-box"}}>
              <div style={{fontSize:12*z, fontWeight:700, color:theme.sub, marginBottom:8*z}}>{t("team")} {tIdx+1}</div>
              <PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&tIds.includes(o.value)&&tIds[tIdx*2]!==o.value}))} value={tIds[tIdx*2]||""} onChange={v=>updateSlot(tIdx*2,v)} placeholder={t("player_1")} theme={theme}/>
              <div style={{height:8*z}}/>
              <PlayerPicker opts={opts.map(o=>({...o,disabled:o.value&&tIds.includes(o.value)&&tIds[tIdx*2+1]!==o.value}))} value={tIds[tIdx*2+1]||""} onChange={v=>updateSlot(tIdx*2+1,v)} placeholder={t("player_2")} theme={theme}/>
            </div>
          ))}
        </div>

        {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
        {err && !hasDupes && <Err msg={err} theme={theme}/>}

        <div style={{marginTop:16*z}}>
          <button
            style={{
              ...S.btnPrimary, width:"100%", marginTop:0,
              opacity: (hasDupes || !allFilled) ? 0.5 : 1,
              cursor: (hasDupes || !allFilled) ? "not-allowed" : "pointer"
            }}
            disabled={hasDupes || !allFilled}
            onClick={startTournament}>
            {t("start_tournament")}
          </button>
          <button
            style={{
              display:"block", width:"100%", marginTop:8*z,
              background:"transparent", border:"none",
              color:theme.sub, fontSize:11*z, cursor:"pointer",
              textAlign:"center", padding:`${6*z}px`
            }}
            onClick={() => {
              clearFormat(); clearPlayerCount(); clearTIds(); clearBracket(); clearTNotes();
              setErr(""); setSuccess("");
            }}>
            {t("reset_btn") || "🔄 Reset"}
          </button>
        </div>
      </Sec>
    );
  }

  // ── Render: Single match card with score input ────────────────────────────
  function renderMatchCard(m, roundIdx, matchIdx, locked) {
    const teamA = getTeamLabel(m.teams[0]);
    const teamB = getTeamLabel(m.teams[1]);
    const winner = m.winner;
    const hasTeams = m.teams[0] && m.teams[1];
    const isDecided = winner !== null;

    return (
      <div style={{
        background: isDecided ? theme.accent + "08" : theme.bg,
        border: `1px solid ${isDecided ? theme.accent + "44" : theme.border}`,
        borderRadius: 10*z, padding: 10*z, marginBottom: 8*z
      }}>
        {m.label && (
          <div style={{fontSize:10*z, fontWeight:700, color:theme.accent, marginBottom:6*z, textTransform:"uppercase", letterSpacing:"0.5px"}}>
            {m.label}
          </div>
        )}
        {/* T1 row: name left, score right */}
        <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:4*z}}>
          <span style={{flex:1, fontSize:12*z, fontWeight: winner === 0 ? 800 : 600,
            color: winner === 0 ? theme.accent : (hasTeams ? theme.text : theme.sub),
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {winner === 0 && "✓ "}
            {hasTeams ? teamA : (m.label ? t("awaiting_prior_round")||"Awaiting prior round" : "TBD")}
          </span>
          <input style={{...S.scoreInput, width:Math.min(52*z,56), opacity: hasTeams ? 1 : 0.4,
            fontWeight: winner===0 ? 800 : 400,
            borderColor: winner===0 ? theme.accent : undefined}}
            type="number" placeholder="–" value={m.scoreA}
            disabled={!hasTeams || locked}
            onChange={e => updateScore(roundIdx, matchIdx, "scoreA", e.target.value)}/>
        </div>
        {/* T2 row: name left, score right */}
        <div style={{display:"flex", alignItems:"center", gap:8*z}}>
          <span style={{flex:1, fontSize:12*z, fontWeight: winner === 1 ? 800 : 600,
            color: winner === 1 ? theme.accent : (hasTeams ? theme.text : theme.sub),
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {winner === 1 && "✓ "}
            {hasTeams ? teamB : (m.label ? t("awaiting_prior_round")||"Awaiting prior round" : "TBD")}
          </span>
          <input style={{...S.scoreInput, width:Math.min(52*z,56), opacity: hasTeams ? 1 : 0.4,
            fontWeight: winner===1 ? 800 : 400,
            borderColor: winner===1 ? theme.accent : undefined}}
            type="number" placeholder="–" value={m.scoreB}
            disabled={!hasTeams || locked}
            onChange={e => updateScore(roundIdx, matchIdx, "scoreB", e.target.value)}/>
        </div>
      </div>
    );
  }

  // ── Render: collapsible round ─────────────────────────────────────────────
  function renderRound(round, idx, b) {
    const complete = isRoundComplete(round);
    const active = isRoundActive(b.rounds, idx);
    const upcoming = isRoundUpcoming(b.rounds, idx);
    const isCollapsed = collapsed[idx];

    const roundTitle = round.name === "semifinal" ? (t("semifinals")||"Semifinals")
                     : round.name === "final" ? `🏆 ${t("finals")||"Final"}`
                     : round.name === "wb_sf" ? (t("winners_bracket_sf")||"Winners Bracket Semifinals")
                     : round.name === "wb_final_and_lb_final" ? (t("bracket_finals")||"Bracket Finals")
                     : round.name === "grand_final" ? `🏆 ${t("grand_final")||"Grand Final"}`
                     : round.name === "all" ? `${t("format_rr")||"Round Robin"} ${t("matches_label")||"Matches"}`
                     : round.name;

    // Upcoming rounds: don't render at all (they appear once active)
    if (upcoming) return null;

    return (
      <div key={idx} style={{
        background: theme.card,
        border: `1px solid ${complete ? theme.border : (active ? theme.accent : theme.border)}`,
        borderRadius: 12*z, marginBottom: 10*z, overflow: "hidden"
      }}>
        <button onClick={() => toggleCollapse(idx)} style={{
          width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
          background:"transparent", border:"none", cursor:"pointer",
          padding: `${12*z}px ${14*z}px`, textAlign:"left"
        }}>
          <div>
            <div style={{fontSize:13*z, fontWeight:800, color: complete ? theme.sub : theme.accent, textTransform:"uppercase", letterSpacing:"0.5px"}}>
              {complete && "✓ "}{roundTitle}
            </div>
            {complete && isCollapsed && (
              <div style={{fontSize:10*z, color:theme.sub, marginTop:2*z}}>
                {round.matches.filter(m => m.winner !== null).length} {t("matches_complete")||"matches complete"} · {t("tap_to_expand")||"tap to expand"}
              </div>
            )}
          </div>
          <span style={{fontSize:14*z, color:theme.sub, transform: isCollapsed ? "none" : "rotate(180deg)", transition:"transform 0.2s"}}>▾</span>
        </button>
        {!isCollapsed && (
          <div style={{padding:`0 ${10*z}px ${10*z}px`}}>
            {round.matches.map((m, mIdx) => renderMatchCard(m, idx, mIdx, complete))}
          </div>
        )}
      </div>
    );
  }

  // ── Render: bracket play screen (step 1) ──────────────────────────────────
  function renderBracket() {
    const b = computedBracket;
    if (!b) return null;
    const tournComplete = !!b.champion;

    return (
      <>
        <Sec theme={theme}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8*z}}>
            <div style={{fontSize:13*z, fontWeight:700, color:theme.accent, textTransform:"uppercase", letterSpacing:"0.5px"}}>
              {b.format === "se" ? (t("format_se")||"Single Elimination") : b.format === "de" ? (t("format_de")||"Double Elimination") : (t("format_rr")||"Round Robin")}
            </div>
            <button onClick={cancelTournament} style={{
              background:"transparent", border:`1px solid ${theme.border}`,
              borderRadius:6*z, padding:`${4*z}px ${10*z}px`, fontSize:10*z, color:theme.sub, cursor:"pointer"
            }}>{t("cancel")}</button>
          </div>

          {/* Render each round */}
          {b.rounds.map((round, idx) => renderRound(round, idx, b))}

          {/* RR standings table — show whenever bracket has standings */}
          {b.format === "rr" && b.standings && (
            <div style={{marginTop:14*z, background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:10*z, padding:10*z}}>
              <div style={{fontSize:12*z, fontWeight:800, color:theme.accent, marginBottom:8*z, textTransform:"uppercase", letterSpacing:"0.5px"}}>{t("standings")||"Standings"}</div>
              {b.standings.map((s, i) => (
                <div key={i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:`${4*z}px 0`, borderBottom: i < b.standings.length - 1 ? `1px solid ${theme.border}` : "none"}}>
                  <div style={{display:"flex", alignItems:"center", gap:8*z, flex:1, overflow:"hidden"}}>
                    <span style={{fontSize:13*z, fontWeight:700, color: i === 0 ? theme.accent : theme.sub, minWidth:20*z}}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                    </span>
                    <span style={{fontSize:12*z, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                      {getTeamLabel(s.team)}
                    </span>
                  </div>
                  <div style={{fontSize:11*z, color:theme.sub, flexShrink:0}}>
                    {s.wins}{t("w_abbr")||"W"} · {s.matches - s.wins}{t("l_abbr")||"L"} · {s.pointDiff >= 0 ? "+" : ""}{s.pointDiff} pts
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Champion announcement */}
          {tournComplete && (
            <div style={{
              marginTop:16*z, padding:`${16*z}px ${12*z}px`,
              background:"rgba(240,192,64,0.15)", border:"2px solid #f0c040",
              borderRadius:12*z, textAlign:"center"
            }}>
              <div style={{fontSize:24*z, marginBottom:6*z}}>🏆</div>
              <div style={{fontSize:11*z, fontWeight:700, color:"#f0c040", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4*z}}>
                {t("champions")||"Champions"}
              </div>
              <div style={{fontSize:16*z, fontWeight:800, color:theme.text}}>
                {getTeamLabel(b.champion)}
              </div>
            </div>
          )}

          {/* Notes field — show when ready to log */}
          {tournComplete && (
            <div style={{marginTop:14*z}}>
              <label style={S.label}>{t("notes_lbl") || "Notes"} ({t("optional") || "Optional"})</label>
              <input style={S.input} placeholder="e.g. Great matches, close finals..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>
          )}

          {err && <Err msg={err} theme={theme}/>}

          {/* Log button — only when complete */}
          {tournComplete && (
            <button style={{...S.btnBig, width:"100%", marginTop:14*z}} onClick={logTournament}>
              🏆 {t("log_match_btn")}
            </button>
          )}
        </Sec>
      </>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={S.view}>
      <MatchesSubNav active="tourney" nav={nav} theme={theme} players={roster} favoredPlayerIds={state.favoredPlayerIds} />

      {success && (
        <div style={{background:"rgba(80,200,120,0.15)", border:"1px solid #50c87844", color:"#50c878", padding:`${12*z}px`, borderRadius:10*z, marginBottom:12*z, textAlign:"center"}}>
          {(() => {
            const parts = success.split('\n');
            return (
              <>
                <div style={{fontSize:13*z, fontWeight:700}}>{parts[0]}</div>
                {parts[1] && (
                  <div style={{marginTop:6*z}}>
                    <div style={{fontSize:11*z, fontWeight:700, color:"#f0c040", textTransform:"uppercase", letterSpacing:"1px"}}>
                      🏆 {t("champions")||"Champions"}
                    </div>
                    <div style={{fontSize:16*z, fontWeight:800, color:theme.text, marginTop:3*z, lineHeight:1.3}}>
                      {parts[1].replace(/^🏆 [^:]+: /, "")}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {step === 0 ? renderSetup() : renderBracket()}
    </div>
  );
}
