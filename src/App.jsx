import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ThemeCtx } from './context.js';
import { makeS } from './styles.js';

// Views
import Dashboard from './views/Dashboard.jsx';
import Players from './views/Players.jsx';
import History from './views/History.jsx';
import Compare from './views/Compare.jsx';
import StatsView from './views/StatsView.jsx';
import Settings from './views/Settings.jsx';
import Profile from './views/Profile.jsx';
import Trash from './views/Trash.jsx';
import Legends from './views/Legends.jsx';
import Changelog from './views/Changelog.jsx'; 
import Events from './views/Events.jsx';
import { LogMatch, SessionMode, KingOfCourt, TournamentMode } from './views/MatchModes.jsx';
import { Sel, Err } from './components/Shared.jsx';

// Engine & Components
import {
  APP_MODES, APP_ACCENTS, APP_FONTS, setLang, t, replayAllMatches, computeStats, 
  loadState, saveState, blankState, pingPresence, clearPresence, genId, DEFAULT_RATING
} from './engine.js';

import { Header, BottomNav } from './components/Navigation.jsx';

const ADMIN_PASSCODE = "1234";

// --- PIN VERIFICATION GATE ---
function PinVerification({ player, onVerify, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  
  if (!player) {
    return <div style={{position:"fixed", inset:0, background:theme.bg, zIndex:9999}} />; 
  }

  return (
    <div style={{position:"fixed", inset:0, background:theme.bg, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20*z}}>
      <div style={{background:theme.card, border:`1px solid ${theme.border}`, padding:24*z, borderRadius:16*z, width:"100%", maxWidth:320*z, textAlign:"center"}}>
        <h2 style={{color:theme.text, marginTop:0}}>{t("verify_identity")}</h2>
        <p style={{color:theme.sub, fontSize:14*z}}>{t("verify_desc").replace("{name}", player.name)}</p>
        <input 
          style={{...S.input, textAlign:"center", fontSize:24*z, letterSpacing:"8px", marginBottom:20*z}} 
          type="password" 
          maxLength="4" 
          autoFocus 
          value={pin}
          onChange={e => {setPin(e.target.value.replace(/\D/g,'')); setError(false);}}
        />
        {error && <Err msg={t("incorrect_pin")} theme={theme} />}
        <button 
          style={{...S.btnPrimary, width:"100%", padding:"12px 0", marginTop:10*z}} 
          disabled={pin.length !== 4}
          onClick={() => { 
            if (pin === player.pin) {
              onVerify(pin);
            } else {
              setError(true); 
            }
          }}>
          {t("unlock")}
        </button>
      </div>
    </div>
  );
}

// --- ONE-TIME WELCOME MODAL ---
function WelcomeModal({ players, onSelect, onCreate, onAdminLogin, theme, user, setUser }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [mode, setMode] = useState("select"); 
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const sortedPlayers = [...players].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20*z}}>
      <div style={{background:theme.card, border:`1px solid ${theme.border}`, borderRadius:16*z, padding:24*z, width:"100%", maxWidth:400*z, boxShadow:"0 10px 30px rgba(0,0,0,0.5)", position: "relative"}}>
        
        {/* Language Toggle in Top Right */}
        <div style={{position:"absolute", top: 16*z, right: 16*z}}>
          <select 
            style={{background:"transparent", border:"none", color:theme.sub, fontSize:13*z, cursor:"pointer", outline:"none"}}
            value={user.langId || "en"}
            onChange={e => setUser({langId: e.target.value})}
          >
            <option value="en">English</option>
            <option value="zh_tw">繁體中文</option>
            <option value="zh_cn">简体中文</option>
          </select>
        </div>

        <div style={{textAlign:"center", marginBottom:20*z, marginTop: 12*z}}>
          <div style={{fontSize:40*z, marginBottom:10*z}}>👋</div>
          <h2 style={{margin:0, fontSize:22*z, color:theme.text}}>{t("welcome_title")}</h2>
          <p style={{fontSize:14*z, color:theme.sub, marginTop:8*z}}>
            {mode === "admin" ? t("welcome_desc_admin") : t("welcome_desc_user")}
          </p>
        </div>

        {mode !== "admin" && (
          <div style={{display:"flex", background:theme.bg, borderRadius:8*z, padding:4*z, marginBottom:16*z}}>
            <button style={{flex:1, padding:"8px 0", borderRadius:6*z, border:"none", background: mode==="select"?theme.card:"transparent", color: mode==="select"?theme.text:theme.sub, fontWeight: mode==="select"?700:500, cursor:"pointer"}} onClick={()=>{setMode("select"); setError(false); setPin("");}}>{t("on_roster_btn")}</button>
            <button style={{flex:1, padding:"8px 0", borderRadius:6*z, border:"none", background: mode==="create"?theme.card:"transparent", color: mode==="create"?theme.text:theme.sub, fontWeight: mode==="create"?700:500, cursor:"pointer"}} onClick={()=>{setMode("create"); setError(false); setPin("");}}>{t("new_player_btn")}</button>
          </div>
        )}

        {mode === "select" ? (
          <div style={{marginBottom: 20*z}}>
            <Sel 
              value={selectedId} 
              onChange={(val) => { setSelectedId(val); setError(false); }} 
              opts={sortedPlayers.map(p => ({ value: p.id, label: p.name }))} 
              placeholder={t("select_name_placeholder")} 
              theme={theme} 
            />
            <input 
              style={{...S.input, marginTop:10*z}} 
              type="password" 
              maxLength="4" 
              placeholder={t("pin_placeholder")} 
              value={pin}
              onChange={e=>{setPin(e.target.value.replace(/\D/g,'')); setError(false);}}
            />
            {error && <div style={{marginTop: 10*z}}><Err msg={t("invalid_pin_msg")} theme={theme} /></div>}
          </div>
        ) : mode === "admin" ? (
          <div style={{marginBottom: 20*z}}>
            <input 
              style={{...S.input, textAlign: "center", letterSpacing: "4px"}} 
              type="password" 
              placeholder={t("admin_pass_placeholder")} 
              value={pin}
              onChange={e=>{setPin(e.target.value); setError(false);}}
            />
            {error && <div style={{marginTop: 10*z}}><Err msg={t("incorrect_pass_msg")} theme={theme} /></div>}
          </div>
        ) : (
          <div style={{marginBottom: 20*z, textAlign: "center", color: theme.sub, fontSize: 13*z, lineHeight: 1.5}}>
            {t("setup_awesome_msg")}
          </div>
        )}

        <button 
          style={{...S.btnPrimary, width:"100%", padding:"12px 0", fontSize:15*z}} 
          disabled={(mode==="select" && (!selectedId || pin.length !== 4)) || (mode==="admin" && !pin)}
          onClick={() => {
            if (mode === "select") {
              const p = players.find(x => x.id === selectedId);
              if (p && p.pin && p.pin === pin) {
                onSelect(selectedId, pin);
              } else {
                setError(true);
              }
            } else if (mode === "admin") {
              if (pin === ADMIN_PASSCODE) {
                onAdminLogin();
              } else {
                setError(true);
              }
            } else {
              onCreate();
            }
          }}
        >
          {mode === "select" ? t("save_enter_app") : mode === "admin" ? t("enter_as_admin") : t("go_to_setup")}
        </button>

        <div style={{textAlign:"center", marginTop:16*z}}>
          {mode !== "admin" ? (
            <button style={{background:"transparent", border:"none", color:theme.sub, fontSize:13*z, cursor:"pointer", textDecoration:"underline"}} onClick={() => {setMode("admin"); setPin(""); setError(false);}}>
              {t("admin_login")}
            </button>
          ) : (
            <button style={{background:"transparent", border:"none", color:theme.sub, fontSize:13*z, cursor:"pointer", textDecoration:"underline"}} onClick={() => {setMode("select"); setPin(""); setError(false);}}>
              {t("return_player_login")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(() => blankState());
  const [isLoading, setIsLoading] = useState(true);

  // 1. Local User Settings (Isolated to browser)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user_settings");
    let parsed = saved ? JSON.parse(saved) : {
      langId: "en",
      isAdmin: false,
      modeId: "dark",
      accentId: "green",
      fontId: "sans",
      zoomLevel: 1.0,
      myPlayerId: "", 
      pendingAutoLink: false,
      verifiedHash: "",
      pinAuthV1: true 
    };
    if (!parsed.pinAuthV1) {
      parsed.myPlayerId = "";
      parsed.verifiedHash = "";
      parsed.isAdmin = false;
      parsed.pendingAutoLink = false;
      parsed.pinAuthV1 = true;
      localStorage.setItem("user_settings", JSON.stringify(parsed));
    }
    return parsed;
  });

  const hashPin = (id, pin) => btoa(id + "-" + pin);

  useEffect(() => {
    let isFetching = false;
    const fetchCloudData = async (isInitialLoad = false) => {
      if (isFetching) return;
      isFetching = true;
      try {
        const cloudData = await loadState();
        setState(prev => {
          let s = { ...prev, ...(cloudData || blankState()) };
          if (isInitialLoad) s.activeView = "dashboard";
          else if (prev.activeView) s.activeView = prev.activeView;
          return s;
        });
      } catch (error) {
        console.error("Firebase Error:", error);
      } finally {
        setIsLoading(false);
        isFetching = false;
      }
    };
    fetchCloudData(true);
    const doRefresh = () => fetchCloudData(false);
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') doRefresh(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", doRefresh); 
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", doRefresh);
    };
  }, []);

  const isCurrentlyVerified = useMemo(() => {
    if (!user.myPlayerId) return false;
    const player = state.players?.find(p => p.id === user.myPlayerId);
    if (!player) return false;
    if (!player.pin) return false;
    return user.verifiedHash === hashPin(user.myPlayerId, player.pin);
  }, [user, state.players]);

  const setShared = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      if (!isLoading) saveState(next); 
      return next;
    });
  }, [isLoading]);

  const setUserSettings = useCallback((updater) => {
    setUser(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem("user_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user.myPlayerId) return;
    const pid = user.myPlayerId;
    // Clear this player's dot from local state AND Firebase when they log out
    // or the device switches to someone else.
    return () => {
      clearPresence(pid);
      setState(prev => ({ ...prev, presence: { ...(prev.presence || {}), [pid]: 0 } }));
    };
  }, [user.myPlayerId]);

  useEffect(() => {
    if (!user.myPlayerId) return;
    const pid = user.myPlayerId;
    // Ping Firebase AND update local state immediately so the dot appears
    // without needing a full page reload (loadState is one-time, not realtime).
    const ping = () => {
      pingPresence(pid);
      setState(prev => ({ ...prev, presence: { ...(prev.presence || {}), [pid]: Date.now() } }));
    };
    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [user.myPlayerId]);

  setLang(user.langId); 
  
  const activeMode = APP_MODES.find(m => m.id === user.modeId) || APP_MODES[0];
  const activeAccent = APP_ACCENTS.find(a => a.id === user.accentId) || APP_ACCENTS[0];
  const activeFont = APP_FONTS.find(f => f.id === user.fontId) || APP_FONTS[0];
  const theme = { ...activeMode, accent: activeAccent.hex, zoom: user.zoomLevel, logoText: state.logoText, logoData: state.logoData, format: state.leaderboardFormat };

  useEffect(() => { 
    document.documentElement.style.background = theme.bg;
    document.body.style.background = theme.bg; 
    document.body.style.color = theme.text;
    document.body.style.fontFamily = activeFont.css;
    const metaThemeColor = document.getElementById("theme-color-meta");
    if (metaThemeColor) metaThemeColor.setAttribute("content", theme.bg);
  }, [theme.bg, theme.text, activeFont.css]);

  const { players = [], matches = [], activeView = "dashboard", profileId, historyPlayerId } = state;
  const { derivedPlayers, derivedMatches } = useMemo(() => replayAllMatches(players, matches), [players, matches]);
  const stats = useMemo(() => computeStats(derivedPlayers, derivedMatches),[derivedPlayers, derivedMatches]);

  // ── Per-user overrides injected into shared state ────────────────────────
  // Stars are keyed by the logged-in player's ID so each person on the same
  // device gets their own private star list.
  const starKey = user.isAdmin ? '__admin__' : (user.myPlayerId || '__guest__');
  const appState = useMemo(() => ({
    ...state,
    favoredPlayerIds: (user.starredPlayers || {})[starKey] || []
  }), [state, user.starredPlayers, starKey]);
  
  const leaderboard = useMemo(()=>{
    return [...stats].sort((a,b) => {
      const gamesA = state.leaderboardFormat === "singles" ? (a.singlesPlayed||0) : (a.doublesPlayed||0);
      const gamesB = state.leaderboardFormat === "singles" ? (b.singlesPlayed||0) : (b.doublesPlayed||0);
      if (gamesA === 0 && gamesB > 0) return 1;
      if (gamesB === 0 && gamesA > 0) return -1;
      const rateA = state.leaderboardFormat === "singles" ? (a.ratingSingles||3) : (a.ratingDoubles||3);
      const rateB = state.leaderboardFormat === "singles" ? (b.ratingSingles||3) : (b.ratingDoubles||3);
      if (rateA !== rateB) return rateB - rateA;
      return (b.gamesPlayed||0) - (a.gamesPlayed||0);
    });
  },[stats, state.leaderboardFormat]);

  const profilePlayer = profileId ? stats.find(p=>p.id===profileId) : null;
  const nav = (view,extra={}) => setShared(s=>({...s,activeView:view,...extra}));

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#121212", color: "#50c878", fontSize: "20px", fontWeight: "bold" }}>
        Loading PickleRank... 🥒
      </div>
    );
  }

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={makeS(theme).app}>
        
        {/* 1. WELCOME MODAL */}
        {(!user.isAdmin && !user.myPlayerId && !user.pendingAutoLink) && (
          <WelcomeModal 
             players={stats} 
             onSelect={(id, pin) => setUserSettings({myPlayerId: id, verifiedHash: hashPin(id, pin)})}
             onCreate={() => setUserSettings({pendingAutoLink: true})}
             onAdminLogin={() => setUserSettings({isAdmin: true, pendingAutoLink: false, myPlayerId: "", verifiedHash: ""})}
             theme={theme}
             user={user}
             setUser={setUserSettings}
          />
        )}
        
        {/* 2. PIN VERIFICATION */}
        {(!user.isAdmin && user.myPlayerId && !isCurrentlyVerified) && (
           <PinVerification 
             player={stats.find(p => p.id === user.myPlayerId)} 
             onVerify={(pin) => setUserSettings({ verifiedHash: hashPin(user.myPlayerId, pin) })} 
             theme={theme} 
           />
        )}

        {/* 3. FORCED SETUP MODE */}
        {(!user.isAdmin && user.pendingAutoLink && !user.myPlayerId) && (
          <div style={{display: "flex", flexDirection: "column", height: "100vh", background: theme.bg}}>
            <div style={{padding: 20, background: theme.nav, display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.border}`}}>
              <button onClick={() => setUserSettings({pendingAutoLink: false})} style={{background: "transparent", border: "none", color: theme.sub, fontSize: 16, cursor: "pointer"}}>← {t("cancel")}</button>
              <div style={{flex: 1, textAlign: "center", color: theme.text, fontWeight: "bold", fontSize: 18}}>{t("create_profile")}</div>
              <div style={{width: 60}}></div>
            </div>
            <main style={{flex: 1, overflowY: "auto"}}>
              <Players players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} setUser={setUserSettings}/>
            </main>
          </div>
        )}

        {/* 4. MAIN FULL APP */}
        {(user.isAdmin || (user.myPlayerId && isCurrentlyVerified)) && (
          <>
            <Header activeView={activeView} nav={nav} profilePlayer={profilePlayer} theme={theme} isAdmin={user.isAdmin}/>
            <main style={makeS(theme).main}>
              {activeView==="dashboard" && <Dashboard players={leaderboard} rawStats={stats} state={appState} matches={derivedMatches} nav={nav} theme={theme} set={setShared} format={state.leaderboardFormat} user={user} setUser={setUserSettings}/>}
              {activeView==="log"       && <LogMatch state={appState} players={stats} set={setShared} nav={nav} theme={theme} user={user} />}
              {activeView==="session"   && <SessionMode players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} />}
              {activeView==="kotc"      && <KingOfCourt players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} />}
              {activeView==="tourney"   && <TournamentMode players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} />}
              {activeView==="compare"   && <Compare players={stats} matches={derivedMatches} compareIds={state.compareIds || []} set={setShared} nav={nav} theme={theme} state={appState} user={user}/>}
              {activeView==="history"   && <History matches={derivedMatches} players={stats} nav={nav} set={setShared} theme={theme} isAdmin={user.isAdmin} initialPlayerId={historyPlayerId} state={appState} user={user}/>}
              {activeView==="profile"   && profilePlayer && <Profile player={profilePlayer} matches={derivedMatches} players={stats} nav={nav} set={setShared} theme={theme} isAdmin={user.isAdmin} user={user} setUser={setUserSettings}/>}
              {activeView==="stats"     && <StatsView players={stats} matches={derivedMatches} nav={nav} theme={theme} user={user}/>}
              {activeView==="settings"  && <Settings state={appState} user={user} setShared={setShared} setUser={setUserSettings} nav={nav} theme={theme}/>}
              {activeView==="trash"     && <Trash state={appState} set={setShared} theme={theme} isAdmin={user.isAdmin} />}
              {activeView==="legends"   && <Legends theme={theme} />}
              {activeView==="changelog" && <Changelog theme={theme} />}
              {activeView==="events"    && <Events state={appState} set={setShared} theme={theme} isAdmin={user.isAdmin} />}
            </main>
            <BottomNav active={activeView} nav={nav} theme={theme}/>
          </>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}