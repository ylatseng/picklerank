import React from 'react';
import { t, ratingLabel } from '../engine.js';
import { makeS } from '../styles.js';

export function Header({activeView,nav,profilePlayer,theme,isAdmin}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  
  let title = t(activeView) || t("dashboard");
  let sub = t(activeView + "_sub") || t("dashboard_sub");
  
  // Custom headers for specific views
  if (activeView === "profile") {
    title = profilePlayer?.name ?? t("profile");
    sub = t(ratingLabel(profilePlayer?.ratingDoubles ?? 3));
  } else if (activeView === "trash") {
    title = "🗑️ " + t("trash");
    sub = t("trash_sub");
  } else if (activeView === "legends") {
    title = "📖 " + t("legends");
    sub = t("legends_sub");
  } else if (activeView === "changelog") {
    title = "📜 " + t("changelog");
    sub = t("changelog_sub");
  } else if (activeView === "log" || activeView === "session" || activeView === "compare" || activeView === "kotc" || activeView === "tourney") {
    title = t("matches_tab");
    sub = t("log_sub");
  } else if (activeView === "events") {
    title = "📅 " + t("events");
    sub = t("events_sub");
  } 
  
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        {activeView!=="dashboard"
          ? <button style={S.backBtn} onClick={()=>nav("dashboard")}>‹</button>
          : theme.logoData ? (
              <img src={theme.logoData} style={{width: 36*z, height: 36*z, borderRadius: 8*z, objectFit:"cover"}} alt="App Logo" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" style={{width: 36*z, height: 36*z}}>
                <rect width="192" height="192" rx="40" fill={theme.card} stroke={theme.border} strokeWidth="4"/>
                <circle cx="96" cy="96" r="60" stroke={theme.accent} strokeWidth="12" fill="none"/>
                <text x="50%" y="50%" fontFamily="inherit" fontSize="64" fontWeight="900" fill={theme.accent} textAnchor="middle" dy=".35em">{theme.logoText}</text>
              </svg>
            )
        }
        <div style={{flex:1, marginLeft: 8*z}}>
          <div style={S.appName}>{title}</div>
          <div style={{...S.appSub, color: theme.invert ? theme.accent : theme.accent+"99"}}>{sub}</div>
        </div>
        
        {/* Contextual Header Buttons */}
        <div style={{display: "flex", gap: 4*z}}>
          {activeView==="history" && isAdmin && <button style={S.iconBtn} onClick={()=>nav("trash")} title="Trash">🗑️</button>}
          {activeView==="events"  && isAdmin && <button style={S.iconBtn} onClick={()=>nav("trash")} title="Trash">🗑️</button>}
          {activeView==="dashboard" && (
            <>
              <button style={S.iconBtn} onClick={()=>nav("legends")} title="Legends">ℹ️</button>
              <button style={S.iconBtn} onClick={()=>nav("stats")} title="Stats">📊</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav({active,nav,theme}) {
  const S = makeS(theme);
  const tabs=[
    {id:"dashboard",icon:"🏠",label:t("home")},
    {id:"matches",icon:"🎾",label:t("matches_tab")},
    {id:"history",icon:"📋",label:t("history")},
    {id:"events",icon:"📅",label:t("events")},
    {id:"settings",icon:"⚙️",label:t("settings")}
  ];
  return (
    <nav style={S.bottomNav}>
      {tabs.map(tab=>{
        const isMatchView = ["log", "session", "compare", "kotc", "tourney"].includes(active);
        const isActive = tab.id === active || (tab.id === "matches" && isMatchView);
        
        return (
          <button key={tab.id} onClick={()=>nav(tab.id === "matches" ? "log" : tab.id, tab.id === "history" ? {historyPlayerId: null} : {})} style={{...S.navBtn,...(isActive?{color:theme.accent}:{})}}>
            <span style={{fontSize:20*(theme.zoom||1.0), lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center"}}>
              {tab.id === "matches" ? (
                <svg width={20*(theme.zoom||1.0)} height={20*(theme.zoom||1.0)} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  {/* Paddle head */}
                  <ellipse cx="10" cy="9" rx="7" ry="8"/>
                  {/* Holes */}
                  <circle cx="8"  cy="7"  r="1.2" fill={theme.nav||"#1a1a2e"} opacity="0.8"/>
                  <circle cx="12" cy="7"  r="1.2" fill={theme.nav||"#1a1a2e"} opacity="0.8"/>
                  <circle cx="8"  cy="11" r="1.2" fill={theme.nav||"#1a1a2e"} opacity="0.8"/>
                  <circle cx="12" cy="11" r="1.2" fill={theme.nav||"#1a1a2e"} opacity="0.8"/>
                  <circle cx="10" cy="9"  r="1.2" fill={theme.nav||"#1a1a2e"} opacity="0.8"/>
                  {/* Handle */}
                  <rect x="8.5" y="16.5" width="3" height="6" rx="1.5"/>
                  {/* Ball */}
                  <circle cx="19" cy="5" r="3" opacity="0.75"/>
                  <path d="M17 4 Q19 2.5 21 4M17 6 Q19 7.5 21 6" stroke={theme.nav||"#1a1a2e"} strokeWidth="0.8" fill="none" opacity="0.9"/>
                </svg>
              ) : tab.icon}
            </span>
            <span style={S.navLabel}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  );
}

export function MatchesSubNav({active, nav, theme, players, favoredPlayerIds}) {
  const z = theme.zoom || 1.0;
  const S = makeS(theme);

  // Today's Players — shared sessionStorage key with QuickLog
  const readStorage = () => { try { return JSON.parse(sessionStorage.getItem("ql_today_players") || "[]"); } catch { return []; } };
  const [todayIds, setTodayIds] = React.useState(readStorage);
  const [open, setOpen] = React.useState(() => readStorage().length > 0);

  // Cross-component sync: when QuickLog (or any tab) writes to sessionStorage,
  // update this component's state so they stay in sync without a page reload.
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "ql_today_players") {
        try { setTodayIds(JSON.parse(e.newValue || "[]")); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const writeStorage = (ids) => {
    setTodayIds(ids);
    try {
      sessionStorage.setItem("ql_today_players", JSON.stringify(ids));
      // Dispatch storage event so other components (QuickLog) sync immediately
      window.dispatchEvent(new StorageEvent("storage", { key: "ql_today_players", newValue: JSON.stringify(ids) }));
    } catch {}
  };

  const togglePlayer = (id) => {
    writeStorage(todayIds.includes(id) ? todayIds.filter(x => x !== id) : [...todayIds, id]);
  };
  const clearAll = () => writeStorage([]);
  const selectAll = () => writeStorage((players||[]).map(p => p.id));

  // Sort: selected (Today's) first → starred → alphabetical
  const starred = favoredPlayerIds || [];
  const sortedPlayers = React.useMemo(() => {
    return [...(players||[])].sort((a, b) => {
      const aToday = todayIds.includes(a.id);
      const bToday = todayIds.includes(b.id);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      const aStar = starred.includes(a.id);
      const bStar = starred.includes(b.id);
      if (aStar && !bStar) return -1;
      if (!aStar && bStar) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [players, todayIds, starred]);

  return (
    <div style={{marginBottom:12*z}}>
      {/* Mode tabs */}
      <div style={{display:"flex", gap:6*z, marginBottom:10*z}}>
        {[
          {id:"log", icon:"➕", label:t("custom")},
          {id:"session", icon:"🔄", label:t("session")},
          {id:"kotc", icon:"👑", label:t("kotc")},
          {id:"tourney", icon:"🏆", label:t("tournament")},
          {id:"compare", icon:"⚔️", label:t("h2h")}
        ].map(tItem => {
          const isActive = active === tItem.id;
          return (
            <button key={tItem.id} onClick={()=>nav(tItem.id)}
              style={{flex:1, background:isActive?theme.card:theme.bg, border:`1px solid ${isActive?theme.accent:theme.border}`, borderRadius:8*z, color:isActive?theme.accent:theme.sub, fontSize:10*z, fontWeight:isActive?800:600, padding:`${8*z}px 0`, cursor:"pointer", transition:"all 0.2s"}}>
              <div style={{fontSize:16*z, marginBottom:2*z}}>{tItem.icon}</div>
              {tItem.label}
            </button>
          );
        })}
      </div>

      {/* Today's Players collapsible */}
      {players && players.length > 0 && (
        <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:10*z, overflow:"hidden"}}>
          {/* Header row */}
          <button onClick={() => setOpen(o => !o)}
            style={{width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:`${7*z}px ${10*z}px`, background:"transparent", border:"none", cursor:"pointer"}}>
            <div style={{display:"flex", alignItems:"center", gap:6*z}}>
              <span style={{fontSize:12*z}}>👥</span>
              <span style={{fontSize:11*z, fontWeight:700, color:theme.text}}>{t("todays_players")||"Today's Players"}</span>
              {todayIds.length > 0 && (
                <span style={{fontSize:10*z, background:theme.accent+"22", color:theme.accent,
                  border:`1px solid ${theme.accent}44`, borderRadius:10*z,
                  padding:`${1*z}px ${6*z}px`, fontWeight:700}}>
                  {todayIds.length}
                </span>
              )}
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8*z}}>
              {todayIds.length > 0 && !open && (
                <span style={{fontSize:10*z, color:theme.sub, maxWidth:160*z,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {sortedPlayers.filter(p=>todayIds.includes(p.id)).map(p=>p.name.split(" ")[0]).join(", ")}
                </span>
              )}
              <span style={{fontSize:10*z, color:theme.sub}}>{open ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* Player chip grid — selected first, then starred, then alpha */}
          {open && (
            <div style={{padding:`${0}px ${10*z}px ${10*z}px`}}>
              <div style={{display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:6*z, marginBottom:8*z}}>
                {sortedPlayers.map(p => {
                  const on = todayIds.includes(p.id);
                  const isStar = starred.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePlayer(p.id)}
                      style={{padding:`${7*z}px ${4*z}px`, borderRadius:8*z, boxSizing:"border-box",
                        fontSize:Math.min(11*z, 13), fontWeight: on ? 700 : 500,
                        border:`1.5px solid ${on ? theme.accent : theme.border}`,
                        background: on ? theme.accent+"22" : theme.card,
                        color: on ? theme.accent : theme.sub,
                        cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                      {on ? "✓ " : isStar ? "★ " : ""}{p.name.split(" ")[0]}{p.name.split(" ")[1] ? " "+p.name.split(" ")[1][0]+"." : ""}
                    </button>
                  );
                })}
              </div>
              <div style={{display:"flex", gap:6*z}}>
                <button onClick={selectAll}
                  style={{...S.btnSecondary, flex:1, marginTop:0, fontSize:10*z, padding:`${5*z}px`}}>
                  {t("select_all")||"All"}
                </button>
                <button onClick={clearAll}
                  style={{...S.btnSecondary, flex:1, marginTop:0, fontSize:10*z, padding:`${5*z}px`}}>
                  {t("clear")||"Clear"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}