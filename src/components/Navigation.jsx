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
    {id:"matches",icon:"🏓",label:t("matches_tab")},
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
            <span style={{fontSize:20*(theme.zoom||1.0)}}>{tab.icon}</span>
            <span style={S.navLabel}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  );
}

export function MatchesSubNav({active, nav, theme}) {
  const z = theme.zoom || 1.0;
  return (
    <div style={{display:"flex", gap:6*z, marginBottom:16*z}}>
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
            <div style={{fontSize:16*z, marginBottom: 2*z}}>{tItem.icon}</div>
            {tItem.label}
          </button>
        )
      })}
    </div>
  );
}