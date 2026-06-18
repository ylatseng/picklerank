import Dashboard from './views/Dashboard.jsx';
import Players from './views/Players.jsx';
import History from './views/History.jsx';
import Compare from './views/Compare.jsx';
import StatsView from './views/StatsView.jsx';
import Settings from './views/Settings.jsx';
import Profile from './views/Profile.jsx';
import { LogMatch, SessionMode, KingOfCourt, TournamentMode } from './views/MatchModes.jsx';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ThemeCtx } from './context.js';
import {
  DEFAULT_RATING, STORAGE_KEY, APP_MODES, APP_ACCENTS, APP_FONTS,
  t, setLang, replayAllMatches, computeStats, genId, ratingColor, ratingLabel,
  fmtDate, isoToDatetimeLocal, sortOptionsAlpha, processImage, 
  loadState, saveState, blankState, validatePickleballScore, calcExpected, initials, avatarColor, fmtDelta
} from './engine.js';
import { makeS } from './styles.js';
import { Header, BottomNav, MatchesSubNav } from './components/Navigation.jsx';
import { 
  Avatar, Sparkline, RadarChart, MatchCard, ConfirmInline, 
  Sec, Empty, Err, Sel, MiniMatchCard, MatchEloBreakdown, MatchEditModal
} from './components/Shared.jsx';

// ─── Main App Router (This was missing!) ──────────────────────────────────────
export default function App() {
  const [state, setState] = useState(() => {
    const s = loadState() || blankState();
    if (!s.langId) s.langId = "en";
    if (!s.fontId) s.fontId = "sans";
    if (!s.zoomLevel) s.zoomLevel = 1.0;
    if (s.logoText === undefined) s.logoText = "LS";
    if (s.isAdmin === undefined) s.isAdmin = false;
    if (!s.adminPass) s.adminPass = "1234";
    if (s.leaderboardFormat === undefined) s.leaderboardFormat = "doubles";
    if (!s.favoredPlayerIds) s.favoredPlayerIds = [];
    return s;
  });

  const {
      players = [], matches = [], activeView = "dashboard", profileId, historyPlayerId, 
      modeId = "dark", accentId = "green", fontId = "sans", langId = "en", zoomLevel = 1.0, 
      logoText = "LS", logoData = null, isAdmin = false, leaderboardFormat = "doubles", 
      favoredPlayerIds = []
  } = state;
  
  setLang(langId); 
  
  const activeMode = APP_MODES.find(m => m.id === modeId) || APP_MODES[0];
  const activeAccent = APP_ACCENTS.find(a => a.id === accentId) || APP_ACCENTS[0];
  const activeFont = APP_FONTS.find(f => f.id === fontId) || APP_FONTS[0];
  const theme = { ...activeMode, accent: activeAccent.hex, zoom: zoomLevel, logoText, logoData, format: leaderboardFormat };

  useEffect(() => { 
    document.documentElement.style.background = theme.bg;
    document.body.style.background = theme.bg; 
    document.body.style.color = theme.text;
    document.body.style.fontFamily = activeFont.css;
    const metaThemeColor = document.getElementById("theme-color-meta");
    if (metaThemeColor) metaThemeColor.setAttribute("content", theme.bg);
  }, [theme.bg, theme.text, activeFont.css]);

  const set = useCallback((updater)=>{
    setState(prev=>{
      const next = typeof updater==="function" ? updater(prev) : {...prev,...updater};
      saveState(next); return next;
    });
  },[]);

  const { derivedPlayers, derivedMatches } = useMemo(() => replayAllMatches(players, matches), [players, matches]);
  const stats = useMemo(() => computeStats(derivedPlayers, derivedMatches),[derivedPlayers, derivedMatches]);
  
  const leaderboard = useMemo(()=>{
    return [...stats].sort((a,b) => {
      const gamesA = leaderboardFormat === "singles" ? (a.singlesPlayed||0) : (a.doublesPlayed||0);
      const gamesB = leaderboardFormat === "singles" ? (b.singlesPlayed||0) : (b.doublesPlayed||0);
      
      if (gamesA === 0 && gamesB > 0) return 1;
      if (gamesB === 0 && gamesA > 0) return -1;

      const rateA = leaderboardFormat === "singles" ? (a.ratingSingles||3) : (a.ratingDoubles||3);
      const rateB = leaderboardFormat === "singles" ? (b.ratingSingles||3) : (b.ratingDoubles||3);
      if (rateA !== rateB) return rateB - rateA;
      
      return (b.gamesPlayed||0) - (a.gamesPlayed||0);
    });
  },[stats, leaderboardFormat]);

  const profilePlayer = profileId ? stats.find(p=>p.id===profileId) : null;
  const nav = (view,extra={}) => set(s=>({...s,activeView:view,...extra}));

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={makeS(theme).app}>
        <Header activeView={activeView} nav={nav} profilePlayer={profilePlayer} theme={theme} isAdmin={isAdmin}/>
        <main style={makeS(theme).main}>
          {activeView==="dashboard"  && <Dashboard players={leaderboard} matches={derivedMatches} nav={nav} theme={theme} set={set} format={leaderboardFormat}/>}
          {activeView==="players"    && <Players players={stats} state={state} set={set} nav={nav} theme={theme} isAdmin={isAdmin}/>}
          {activeView==="log"        && <LogMatch state={state} players={stats} set={set} nav={nav} theme={theme}/>}
          {activeView==="session"    && <SessionMode players={stats} state={state} set={set} nav={nav} theme={theme} isAdmin={isAdmin}/>}
          {activeView==="kotc"       && <KingOfCourt players={stats} state={state} set={set} nav={nav} theme={theme} isAdmin={isAdmin}/>}
          {activeView==="tourney"    && <TournamentMode players={stats} state={state} set={set} nav={nav} theme={theme} isAdmin={isAdmin}/>}
          {activeView==="compare"    && <Compare players={stats} matches={derivedMatches} compareIds={state.compareIds || []} set={set} nav={nav} theme={theme} state={state}/>}
          {activeView==="history"    && <History matches={derivedMatches} players={stats} nav={nav} set={set} theme={theme} isAdmin={isAdmin} initialPlayerId={historyPlayerId} state={state}/>}
          {activeView==="profile"    && profilePlayer && <Profile player={profilePlayer} matches={derivedMatches} players={stats} nav={nav} set={set} theme={theme} isAdmin={isAdmin}/>}
          {activeView==="stats"      && <StatsView players={stats} matches={derivedMatches} nav={nav} theme={theme}/>}
          {activeView==="settings"   && <Settings state={state} set={set} nav={nav} theme={theme}/>}
        </main>
        {/* 👇 ADD THE NEW LINE RIGHT HERE 👇 */}
        <div style={{textAlign: 'center', fontSize: '10px', color: 'gray', paddingBottom: '80px'}}>v1.0.5 - Updated 2026-06-18</div>
        <BottomNav active={activeView} nav={nav} theme={theme}/>
      </div>
    </ThemeCtx.Provider>
  );
}


