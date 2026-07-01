import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import QuickLog from './views/QuickLog.jsx';

// ── Draggable Quick Log Floater — proper component so hooks are valid ────────
function DraggableFloater({ theme, onOpen }) {
  const z = theme.zoom || 1;
  const btnSize = 50 * z;
  const STORAGE_KEY = "ql_pos";
  const defaultPos = { right: 16, bottom: 76 };

  const [pos, setPos] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultPos; }
    catch { return defaultPos; }
  });
  const dragging = React.useRef(false);
  const startTouch = React.useRef(null);
  const moved = React.useRef(false);

  const posRef = React.useRef(pos);
  posRef.current = pos;

  const onTouchStart = (e) => {
    dragging.current = true;
    moved.current = false;
    const touch = e.touches[0];
    startTouch.current = { x: touch.clientX, y: touch.clientY, right: posRef.current.right, bottom: posRef.current.bottom };
  };
  const onTouchMove = (e) => {
    if (!dragging.current || !startTouch.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startTouch.current.x;
    const dy = touch.clientY - startTouch.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
    const newRight = Math.max(4, Math.min(window.innerWidth - btnSize - 4, startTouch.current.right - dx));
    const newBottom = Math.max(70, Math.min(window.innerHeight - btnSize - 4, startTouch.current.bottom - dy));
    setPos({ right: newRight, bottom: newBottom });
  };
  const onTouchEnd = () => {
    dragging.current = false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)); } catch {}
    if (!moved.current) onOpen();
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => { if (!moved.current) onOpen(); }}
      style={{
        position:"fixed", bottom:pos.bottom, right:pos.right, zIndex:500,
        width:btnSize, height:btnSize, borderRadius:"50%",
        background:theme.accent, boxShadow:"0 3px 12px rgba(0,0,0,0.35)",
        fontSize:22*z, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff", userSelect:"none", touchAction:"none"
      }}
      title="Quick Log (drag to move)"
    >
      ⚡
    </div>
  );
}
import { LogMatch, SessionMode, KingOfCourt, TournamentMode } from './views/MatchModes.jsx';
import { Sel, Err } from './components/Shared.jsx';

// Engine & Components
import {
  APP_MODES, APP_ACCENTS, APP_FONTS, setLang, t, replayAllMatches, computeStats, APP_VERSION, 
  loadState, saveState, blankState, pingPresence, clearPresence, genId, DEFAULT_RATING,
  syncPendingMatches, readPendingMatches, queueMatchOffline, readCache, subscribeToState, clearLocalCache
} from './engine.js';

import { Header, BottomNav } from './components/Navigation.jsx';

const ADMIN_PASSCODE = "1234";

// --- PIN VERIFICATION GATE ---
function PinVerification({ player, onVerify, onCancel, onAdminLogin, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminErr, setAdminErr] = useState(false);

  // Brute-force protection: 3 wrong attempts → 30-second lockout per player
  const lockKey = `pr_pin_lock_${player?.id}`;
  const attKey = `pr_pin_att_${player?.id}`;
  const getLockout = () => {
    const until = parseInt(sessionStorage.getItem(lockKey) || "0");
    return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
  };
  const [lockedSecs, setLockedSecs] = useState(() => getLockout());
  useEffect(() => {
    if (lockedSecs <= 0) return;
    const t = setInterval(() => {
      const remaining = getLockout();
      setLockedSecs(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [lockedSecs]);

  const recordWrongAttempt = () => {
    const attempts = parseInt(sessionStorage.getItem(attKey) || "0") + 1;
    sessionStorage.setItem(attKey, String(attempts));
    if (attempts >= 3) {
      sessionStorage.setItem(lockKey, String(Date.now() + 30000));
      sessionStorage.setItem(attKey, "0");
      setLockedSecs(30);
    }
    setError(true);
    setPin("");
  };
  
  if (!player) {
    return <div style={{position:"fixed", inset:0, background:theme.bg, zIndex:9999}} />; 
  }

  return (
    <div style={{position:"fixed", inset:0, background:theme.bg, zIndex:9999, display:"flex", flexDirection:"column"}}>

      {/* Top bar with back button */}
      <div style={{
        padding:`calc(${14*z}px + env(safe-area-inset-top)) calc(${16*z}px + env(safe-area-inset-right)) ${14*z}px calc(${16*z}px + env(safe-area-inset-left))`,
        background:theme.nav,
        borderBottom:`1px solid ${theme.border}`,
        display:"flex", alignItems:"center"
      }}>
        {onCancel && (
          <button onClick={onCancel} style={{background:"transparent", border:"none", color:theme.sub, fontSize:16*z, cursor:"pointer", padding:`${4*z}px ${8*z}px`}}>
            ← {t("cancel")}
          </button>
        )}
        <div style={{flex:1, textAlign:"center", color:theme.text, fontWeight:700, fontSize:16*z}}>
          {t("verify_identity")}
        </div>
        <div style={{width:60*z}} />
      </div>

      {/* Main content */}
      <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:20*z}}>
        <div style={{background:theme.card, border:`1px solid ${theme.border}`, padding:24*z, borderRadius:16*z, width:"100%", maxWidth:320*z, textAlign:"center"}}>

          {!showAdminLogin ? (
            <>
              <div style={{fontSize:32*z, marginBottom:8*z}}>🔒</div>
              <p style={{color:theme.sub, fontSize:14*z, marginBottom:16*z}}>
                {t("verify_desc").replace("{name}", player.name)}
              </p>
              <input 
                style={{...S.input, textAlign:"center", fontSize:24*z, letterSpacing:"8px", marginBottom:8*z}} 
                type="password" 
                maxLength="4" 
                autoFocus 
                placeholder="••••"
                value={pin}
                onChange={e => {setPin(e.target.value.replace(/\D/g,'')); setError(false);}}
                onKeyDown={e => { if (e.key === "Enter" && pin.length === 4 && pin === player.pin) onVerify(pin); }}
              />
              {error && <Err msg={t("incorrect_pin")} theme={theme} />}
              {lockedSecs > 0 && (
                <div style={{marginTop:8*z, padding:`${6*z}px`, background:"rgba(224,80,80,0.1)", borderRadius:8*z, fontSize:12*z, color:"#e05050", fontWeight:600}}>
                  🔒 Too many wrong attempts. Try again in {lockedSecs}s.
                </div>
              )}
              <button 
                style={{...S.btnPrimary, width:"100%", padding:"12px 0", marginTop:10*z, opacity: (pin.length !== 4 || lockedSecs > 0) ? 0.5 : 1}} 
                disabled={pin.length !== 4 || lockedSecs > 0}
                onClick={() => { 
                  if (pin === player.pin) {
                    sessionStorage.removeItem(attKey);
                    sessionStorage.removeItem(lockKey);
                    onVerify(pin);
                  } else { recordWrongAttempt(); }
                }}>
                {lockedSecs > 0 ? `Wait ${lockedSecs}s` : t("unlock")}
              </button>

              {/* Admin login link */}
              {onAdminLogin && (
                <button
                  onClick={() => { setShowAdminLogin(true); setPin(""); setError(false); }}
                  style={{background:"transparent", border:"none", color:theme.sub, fontSize:11*z, cursor:"pointer", marginTop:16*z, textDecoration:"underline"}}>
                  {t("admin_login")}
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{fontSize:32*z, marginBottom:8*z}}>🛡️</div>
              <p style={{color:theme.sub, fontSize:14*z, marginBottom:16*z}}>
                {t("admin_pin_prompt") || "Enter Admin PIN to continue"}
              </p>
              <input
                style={{...S.input, textAlign:"center", fontSize:24*z, letterSpacing:"8px", marginBottom:8*z}}
                type="password"
                autoFocus
                placeholder="••••"
                value={adminPin}
                onChange={e => { setAdminPin(e.target.value); setAdminErr(false); }}
                onKeyDown={e => { if (e.key === "Enter") document.getElementById("adminVerifyBtn")?.click(); }}
              />
              {adminErr && <Err msg={t("incorrect_pin")} theme={theme} />}
              <button
                id="adminVerifyBtn"
                style={{...S.btnPrimary, width:"100%", padding:"12px 0", marginTop:10*z}}
                onClick={() => {
                  if (onAdminLogin(adminPin)) { /* success handled by caller */ }
                  else { setAdminErr(true); setAdminPin(""); }
                }}>
                {t("admin_login")}
              </button>
              <button
                onClick={() => { setShowAdminLogin(false); setAdminPin(""); setAdminErr(false); }}
                style={{background:"transparent", border:"none", color:theme.sub, fontSize:11*z, cursor:"pointer", marginTop:12*z, textDecoration:"underline"}}>
                ← {t("back") || "Back"}
              </button>
            </>
          )}
        </div>
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
  // Local counter forces re-render when language changes so t() reflects immediately
  const [, forceLangRender] = useState(0);

  const sortedPlayers = [...players].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, overflowY:"auto", padding:`calc(${Math.min(16*z, 20)}px + env(safe-area-inset-top)) calc(${Math.min(14*z, 16)}px + env(safe-area-inset-right)) calc(${Math.min(16*z, 20)}px + env(safe-area-inset-bottom)) calc(${Math.min(14*z, 16)}px + env(safe-area-inset-left))`, boxSizing:"border-box"}}>
      <div style={{background:theme.card, border:`1px solid ${theme.border}`, borderRadius:Math.min(16*z,16), padding:Math.min(24*z,20), width:"100%", maxWidth:"min(400px, 100%)", margin:"0 auto", boxShadow:"0 10px 30px rgba(0,0,0,0.5)", position:"relative", boxSizing:"border-box"}}>
        
        {/* Top row: Language + Zoom controls */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8*z}}>
          <select 
            style={{background:"transparent", border:"none", color:theme.sub, fontSize:13*z, cursor:"pointer", outline:"none"}}
            value={user.langId || "en"}
            onChange={e => { setLang(e.target.value); setUser({langId: e.target.value}); forceLangRender(n => n + 1); }}
          >
            <option value="en">English</option>
            <option value="zh_tw">繁體中文</option>
            <option value="zh_cn">简体中文</option>
          </select>
          {/* Zoom adjuster — especially useful when screen is too large */}
          <div style={{display:"flex", alignItems:"center", gap:6*z}}>
            <span style={{fontSize:10*z, color:theme.sub}}>Aa</span>
            {[0.85, 1.0, 1.15].map(zv => (
              <button key={zv} onClick={() => { setUser({zoomLevel: zv}); forceLangRender(n => n + 1); }}
                style={{
                  padding:`${2*z}px ${7*z}px`, borderRadius:6*z, fontSize:11*z,
                  border:`1px solid ${Math.abs((user.zoomLevel||1) - zv) < 0.01 ? theme.accent : theme.border}`,
                  background: Math.abs((user.zoomLevel||1) - zv) < 0.01 ? theme.accent+"22" : "transparent",
                  color: Math.abs((user.zoomLevel||1) - zv) < 0.01 ? theme.accent : theme.sub,
                  cursor:"pointer", fontWeight: Math.abs((user.zoomLevel||1) - zv) < 0.01 ? 700 : 400
                }}>
                {zv === 0.85 ? "S" : zv === 1.0 ? "M" : "L"}
              </button>
            ))}
          </div>
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
              onChange={(val) => { setSelectedId(val); setError(false); setPin(""); }} 
              opts={sortedPlayers.map(p => ({ value: p.id, label: p.name }))} 
              placeholder={t("select_name_placeholder")} 
              theme={theme} 
            />
            {selectedId && players.find(p => p.id === selectedId)?.pin ? (
              <>
                <input 
                  style={{...S.input, marginTop:10*z}} 
                  type="password" 
                  maxLength="4" 
                  placeholder={t("pin_placeholder")} 
                  value={pin}
                  onChange={e=>{setPin(e.target.value.replace(/\D/g,'')); setError(false);}}
                />
                {error && <div style={{marginTop: 10*z}}><Err msg={t("invalid_pin_msg")} theme={theme} /></div>}
              </>
            ) : selectedId ? (
              <div style={{marginTop:10*z, fontSize:11*z, color:"#50c878", textAlign:"center"}}>
                ✓ {t("no_pin_required") || "No PIN required — tap Enter to continue"}
              </div>
            ) : null}
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
          disabled={(mode==="select" && (!selectedId || (players.find(p=>p.id===selectedId)?.pin && pin.length !== 4))) || (mode==="admin" && !pin)}
          onClick={() => {
            if (mode === "select") {
              const p = players.find(x => x.id === selectedId);
              if (!p) return;
              if (!p.pin) {
                // No PIN set — log in directly
                onSelect(selectedId, "");
              } else if (p.pin === pin) {
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
  // Register service worker for offline support and PWA install prompt
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          // When a new SW version is found, activate it immediately
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(err => console.warn('SW registration failed:', err));
    }
  }, []);
  const [state, setState] = useState(() => blankState());
  // activeView lives in its OWN useState — completely isolated from shared state.
  // This means fetchCloudData, saveState, setShared can NEVER touch it.
  const [activeView, setActiveView] = useState("dashboard");
  const [profileId, setProfileId] = useState(null);
  const [historyPlayerId, setHistoryPlayerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // ── Undo last match ────────────────────────────────────────────────────────
  // Store the last logged match IDs in a ref (no re-render needed), plus
  // an undo toast visible for 30 seconds. Undo removes those matches by ID.
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogPrefill, setQuickLogPrefill] = useState(null);

  // Handle QR check-in URL parameter — player scanned a QR code from an event
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkin = params.get("checkin");
    if (checkin) {
      const ids = checkin.split(",").filter(Boolean);
      if (ids.length > 0) {
        try { sessionStorage.setItem("ql_today_players", JSON.stringify(ids)); } catch {}
        // Clean the URL without reloading
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }
    }
  }, []);

  // Offline indicator — tracks network connectivity
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [hasOfflineChanges, setHasOfflineChanges] = useState(
    () => readPendingMatches().length > 0
  );
  const hasOfflineChangesRef = React.useRef(hasOfflineChanges);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

  // Keep ref in sync with state so the goOnline closure always reads current value
  React.useEffect(() => {
    hasOfflineChangesRef.current = hasOfflineChanges;
  }, [hasOfflineChanges]);
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "done" | "error"

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      setOfflineBannerDismissed(false);
      // Read ref (not closed-over state) to get the current value at call time
      const hasPending = hasOfflineChangesRef.current || readPendingMatches().length > 0;
      if (!hasPending) return;
      setSyncStatus("syncing");
      try {
        // Step 1: merge queued offline matches into Firestore
        await syncPendingMatches();
        // Step 2: push full state (players, events, settings) to Firestore.
        // Get current state via setState callback to avoid stale closure.
        await new Promise((resolve) => {
          setState(currentState => {
            saveState(currentState).then(resolve).catch(resolve);
            return currentState; // no state change, just reading
          });
        });
        setHasOfflineChanges(false);
        setSyncStatus("done");
        setTimeout(() => setSyncStatus(null), 4000);
      } catch (e) {
        console.error("Sync error:", e);
        setSyncStatus("error");
        setTimeout(() => setSyncStatus(null), 5000);
      }
    };
    const goOffline = () => { setIsOnline(false); setSyncStatus(null); setOfflineBannerDismissed(false); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // 1. Local User Settings (Isolated to browser)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user_settings");
    let parsed = saved ? JSON.parse(saved) : {
      langId: "en",
      isAdmin: false,
      modeId: "sky",
      accentId: "green",
      fontId: "heiti",
      zoomLevel: 1.0,
      myPlayerId: "", 
      pendingAutoLink: false,
      verifiedHash: "",
      pinAuthV1: true,
      preferences: {} // Stores appearance settings keyed by myPlayerId
    };
    if (!parsed.preferences) parsed.preferences = {};
    if (!parsed.pinAuthV1) {
      parsed.myPlayerId = "";
      parsed.verifiedHash = "";
      parsed.isAdmin = false;
      parsed.pendingAutoLink = false;
      parsed.pinAuthV1 = true;
      parsed.preferences = {};
      localStorage.setItem("user_settings", JSON.stringify(parsed));
    }
    // Migration v1: quickLogEnabled was accidentally stored as false for some players.
    // Remove it from all player prefs so it defaults to true for everyone.
    // Only runs once (guarded by migration flag).
    if (!parsed._migQLReset) {
      Object.keys(parsed.preferences || {}).forEach(pid => {
        if (parsed.preferences[pid]?.quickLogEnabled === false) {
          delete parsed.preferences[pid].quickLogEnabled;
        }
      });
      parsed._migQLReset = true;
      localStorage.setItem("user_settings", JSON.stringify(parsed));
    }
    return parsed;
  });

  const hashPin = (id, pin) => btoa(id + "-" + pin);

  // FETCH CLOUD DATA UPDATED FOR REAL-TIME SYNC
  useEffect(() => {
    let isFetching = false;
    const fetchCloudData = async (isInitialLoad = false) => {
      if (isFetching) return;
      isFetching = true;
      try {
        if (isInitialLoad) {
          const cached = readCache();
          if (cached) {
            const { activeView: _ignored, ...safeCache } = cached;
            setState(prev => ({ ...prev, ...safeCache }));
            setIsLoading(false);

            if (!navigator.onLine) {
              setIsLoading(false);
              isFetching = false;
              return;
            }
          } else if (!navigator.onLine) {
            setIsLoading(false);
            isFetching = false;
            return;
          }
        }

        const cloudData = await loadState();
        if (cloudData && cloudData.players !== undefined) {
          const { activeView: _ignored, ...safeCloudData } = cloudData;
          setState(prev => {
            // GUARD 1: Prevent one-time load from overwriting new local matches
            const currentMatches = prev.matches || [];
            const incomingMatches = safeCloudData.matches || [];
            if (incomingMatches.length < currentMatches.length) return prev;
            return { ...prev, ...safeCloudData };
          }); 
        }
      } catch (error) {
        console.error("Firebase Error:", error);
      } finally {
        setIsLoading(false);
        isFetching = false;
      }
    };
    fetchCloudData(true);

    // 🔥 THE FIX: Start listening to Firebase in real-time
    const unsub = subscribeToState((cloudData) => {
      setState(prev => {
        // GUARD 2: Never let a stale Firebase snapshot wipe local matches
        const currentMatches = prev.matches || [];
        const incomingMatches = cloudData.matches || [];
        
        if (incomingMatches.length < currentMatches.length) {
          console.warn("Ignored stale snapshot to protect local data.");
          return prev; 
        }
        
        const { activeView: _ignored, ...safeCloudData } = cloudData;
        return { ...prev, ...safeCloudData };
      });
    });

    // Clean up the listener if the app closes
    return () => unsub();
  }, []);

  // isCurrentlyVerified is cached in a ref to prevent flash when state.players
  // is refreshed from Firestore (which creates a new array reference and would
  // otherwise cause the memo to briefly return false, flashing the PIN screen).
  const verifiedRef = React.useRef(false);
  const isCurrentlyVerified = useMemo(() => {
    if (!user.myPlayerId) { verifiedRef.current = false; return false; }
    const player = state.players?.find(p => p.id === user.myPlayerId);
    if (!player) {
      // Player not found yet (state still loading) — keep last known verified state
      return verifiedRef.current;
    }
    if (!player.pin) { verifiedRef.current = true; return true; }
    const verified = user.verifiedHash === hashPin(user.myPlayerId, player.pin);
    verifiedRef.current = verified;
    return verified;
  }, [user, state.players]);

  // Auto-elevate players who have been granted isAdminPlayer but are already verified.
  // Also de-elevate if the flag was revoked by admin (handles both directions).
  useEffect(() => {
    if (!user.myPlayerId || !isCurrentlyVerified) return;
    const p = state.players?.find(pl => pl.id === user.myPlayerId);
    if (!p) return;
    if (p.isAdminPlayer && !user.isAdmin) {
      // Grant admin — player has the flag and verified PIN
      setUserSettings(s => ({ ...s, isAdmin: true }));
    } else if (!p.isAdminPlayer && user.isAdmin && user.myPlayerId) {
      // Revoke admin — flag was removed but they're still marked admin locally
      setUserSettings(s => ({ ...s, isAdmin: false }));
    }
  }, [user.myPlayerId, user.isAdmin, isCurrentlyVerified, state.players]);

  // Track login when a player is auto-verified from cached credentials.
  // Without this, players who are remembered from their last session (isCurrentlyVerified=true
  // on mount) never trigger the Welcome or PIN screens — so their login goes unrecorded.
  const didTrackAutoLogin = useRef(false);
  useEffect(() => {
    if (!isCurrentlyVerified || !user.myPlayerId || didTrackAutoLogin.current || isLoading) return;
    didTrackAutoLogin.current = true;
    setShared(s => ({
      ...s,
      players: (s.players || []).map(p => {
        if (p.id !== user.myPlayerId) return p;
        const entry = { at: Date.now() };
        const history = [...(p.loginHistory || []), entry].slice(-50);
        return { ...p, loginHistory: history, lastLoginAt: Date.now() };
      })
    }));
  }, [isCurrentlyVerified, user.myPlayerId, isLoading]);

  // pendingSaveRef holds the next state to save — used to call saveState OUTSIDE
  // the setState updater (React anti-pattern to call async functions inside updaters).
  const pendingSaveRef = React.useRef(null);

  const setShared = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      if (!isLoading) {
        if (!isOnline) {
          // Offline: queue new matches for sync, cache everything
          const prevIds = new Set((prev.matches || []).map(m => m.id));
          const alreadyQueued = new Set(readPendingMatches().map(m => m.id));
          const newMatches = (next.matches || []).filter(
            m => !prevIds.has(m.id) && !alreadyQueued.has(m.id)
          );
          newMatches.forEach(m => queueMatchOffline(m));
          setHasOfflineChanges(true);
        }
        // Queue state for saving — actual save happens in useEffect below
        pendingSaveRef.current = next;
      }
      return next;
    });
  }, [isLoading, isOnline]);

  // Save state outside setState updater — avoids async side-effects in render
  // FIX: Added dependency array to stop the unbounded execution loop
  React.useEffect(() => {
    if (pendingSaveRef.current && !isLoading) {
      saveState(pendingSaveRef.current);
      pendingSaveRef.current = null;
    }
  }, [state, isLoading]);

  // Undo removed — use History tab to edit or delete matches

  const showUndo = undefined;

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
    // Battery optimization: only ping Firebase when the page is visible.
    // Skipping pings in background prevents unnecessary radio wake-ups on mobile.
    const ping = () => {
      if (document.visibilityState === "hidden") return;
      if (!navigator.onLine) return; // skip presence ping when offline — avoids silent Firestore error
      pingPresence(pid);
      setState(prev => ({ ...prev, presence: { ...(prev.presence || {}), [pid]: Date.now() } }));
    };
    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [user.myPlayerId]);

  // ── Compute Active Appearance Settings ─────────────────────────────────────
  // We resolve the theme variables using the currently logged in player's dictionary.
  // If no one is logged in, or the player hasn't saved preferences yet, it falls back to the device defaults.
  const pref = (user.myPlayerId && user.preferences) ? user.preferences[user.myPlayerId] : {};
  const activeLangId = pref?.langId || user.langId || "en";
  const activeModeId = pref?.modeId || user.modeId || "sky";
  const activeAccentId = pref?.accentId || user.accentId || "green";
  const activeFontId = pref?.fontId || user.fontId || "heiti";
  const activeZoomLevel = pref?.zoomLevel || user.zoomLevel || 1.0;
  const quickLogEnabled = user.myPlayerId
    ? (pref?.quickLogEnabled ?? true)   // linked player: only their pref, default true
    : (user.quickLogEnabled ?? true);    // global admin: their root setting, default true

  // setLang is called in a useEffect below to avoid running on every render
  
  const activeMode = APP_MODES.find(m => m.id === activeModeId) || APP_MODES[0];
  const activeAccent = APP_ACCENTS.find(a => a.id === activeAccentId) || APP_ACCENTS[0];
  const activeFont = APP_FONTS.find(f => f.id === activeFontId) || APP_FONTS[0];
  
  // FIX: Memoize the theme object so we stop triggering massive application re-renders
  const theme = useMemo(() => ({
    ...activeMode, 
    accent: activeAccent.hex, 
    zoom: activeZoomLevel, 
    logoText: state.logoText, 
    logoData: state.logoData, 
    format: state.leaderboardFormat 
  }), [activeMode, activeAccent.hex, activeZoomLevel, state.logoText, state.logoData, state.leaderboardFormat]);

  // Apply language change in effect to avoid calling module-level setLang on every render cycle
  // (was previously called directly in render body — caused unnecessary re-renders and battery drain)
  useEffect(() => { setLang(activeLangId); }, [activeLangId]);

  useEffect(() => { 
    document.documentElement.style.background = theme.bg;
    document.body.style.background = theme.bg; 
    document.body.style.color = theme.text;
    document.body.style.fontFamily = activeFont.css;
    document.body.style.overscrollBehavior = "none"; // prevent pull-to-refresh browser reload in PWA
    const metaThemeColor = document.getElementById("theme-color-meta");
    if (metaThemeColor) metaThemeColor.setAttribute("content", theme.bg);
  }, [theme.bg, theme.text, activeFont.css]);

  const { players = [], matches = [] } = state;
  const { derivedPlayers, derivedMatches } = useMemo(() => replayAllMatches(players, matches), [players, matches]);
  const stats = useMemo(() => computeStats(derivedPlayers, derivedMatches),[derivedPlayers, derivedMatches]);
  // Flag for large datasets — replay is O(n²) and can get slow above ~200 matches
  const isLargeDataset = matches.length > 150;

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

  // ── Feature A: Re-register SW event notifications on every app open ──────
  React.useEffect(() => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(reg => {
      const events = state.events || [];
      const now = Date.now();
      events.forEach(ev => {
        if (!ev.date) return;
        const notifyAt = new Date(ev.date).getTime() - 60 * 60 * 1000;
        if (notifyAt <= now) return;
        reg.active?.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          title: `🥒 Pickleball in 1 hour: ${ev.title}`,
          body: `📍 ${ev.venue || 'TBD'} · Tap to open PickleRank`,
          tag: `pr-event-${ev.id}`,
          timestamp: notifyAt,
        });
      });
    }).catch(() => {});
  }, [state.events]);

  // ── Feature B: In-app event banner (within-1-hour alert) ─────────────────
  const [eventBanner, setEventBanner] = React.useState(null);
  const [eventBannerDismissed, setEventBannerDismissed] = React.useState({});

  React.useEffect(() => {
    const check = () => {
      const events = state.events || [];
      const now = Date.now();
      const soonEv = events.find(ev => {
        if (!ev.date) return false;
        const ms = new Date(ev.date).getTime() - now;
        return ms > 0 && ms <= 60 * 60 * 1000 && !eventBannerDismissed[ev.id];
      });
      if (soonEv) {
        const mins = Math.ceil((new Date(soonEv.date).getTime() - now) / 60000);
        setEventBanner({ id: soonEv.id, title: soonEv.title, venue: soonEv.venue, minutesUntil: mins });
      } else {
        setEventBanner(null);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [state.events, eventBannerDismissed]);

  // ── Feature C: RSVP nudge ─────────────────────────────────────────────────
  const [rsvpNudge, setRsvpNudge] = React.useState(null);
  const [rsvpNudgeDismissed, setRsvpNudgeDismissed] = React.useState({});

  React.useEffect(() => {
    const pid = user?.myPlayerId;
    if (!pid) return;
    const events = state.events || [];
    const now = Date.now();
    const unresponded = events.find(ev => {
      if (!ev.date || new Date(ev.date).getTime() < now) return false;
      const isInvited = ev.invitees?.includes(pid);
      const hasRsvp = ev.rsvps?.[pid];
      return isInvited && !hasRsvp && !rsvpNudgeDismissed[ev.id];
    });
    setRsvpNudge(unresponded ? { id: unresponded.id, title: unresponded.title, date: unresponded.date } : null);
  }, [state.events, user?.myPlayerId, rsvpNudgeDismissed]);

  const nav = (view, extra={}) => {
    const mains = document.querySelectorAll("main");
    const m = mains[mains.length - 1];
    if (m) m.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
    setActiveView(view);
    // extra may contain profileId or historyPlayerId
    if (extra.profileId !== undefined) setProfileId(extra.profileId);
    if (extra.historyPlayerId !== undefined) setHistoryPlayerId(extra.historyPlayerId);
    // Pass any other extras into shared state (e.g. compareIds)
    const { profileId: _p, historyPlayerId: _h, ...sharedExtra } = extra;
    if (Object.keys(sharedExtra).length > 0) setShared(s => ({ ...s, ...sharedExtra }));
  };

  // Scroll to top after every view change
  useEffect(() => {
    const mains = document.querySelectorAll("main");
    const m = mains[mains.length - 1];
    if (m) m.scrollTop = 0;
  }, [activeView]);

  if (isLoading) {
    const hasCache = !!readCache();
    const offline = !navigator.onLine;
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#121212", color: "#50c878", fontSize: "clamp(16px, 5vw, 20px)", fontWeight: "bold", gap: 16, padding: 16, boxSizing: "border-box" }}>
        <div>PickleRank 🥒</div>
        {offline && !hasCache ? (
          <div style={{ fontSize: "clamp(12px, 3.5vw, 14px)", color: "#e05050", fontWeight: 700, textAlign: "center", maxWidth: "90vw" }}>
            📶 You're offline and no local data is available yet.<br/>
            <span style={{ fontSize: "clamp(11px, 3vw, 12px)", color: "#888", fontWeight: 400, display: "block", marginTop: 8 }}>
              Please connect to the internet to load your data for the first time. After that, the app will work offline.
            </span>
          </div>
        ) : (
          <div style={{ fontSize: "clamp(11px, 3vw, 13px)", color: "#888", fontWeight: 400 }}>
            {offline ? "📶 Offline — loading from local cache..." : "Loading..."}
          </div>
        )}
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
             onSelect={(id, pin) => {
               setUserSettings({myPlayerId: id, verifiedHash: hashPin(id, pin)});
               // Append full login history entry (keep last 50 per player)
               setShared(s => ({
                 ...s,
                 players: (s.players || []).map(p => {
                   if (p.id !== id) return p;
                   const entry = { at: Date.now() };
                   const history = [...(p.loginHistory || []), entry].slice(-50);
                   return { ...p, loginHistory: history, lastLoginAt: Date.now() };
                 })
               }));
             }}
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
             onVerify={(pin) => {
               // If this player has been granted admin role, elevate them
               const verifyingPlayer = state.players?.find(p => p.id === user.myPlayerId);
               if (verifyingPlayer?.isAdminPlayer) {
                 setUserSettings({ verifiedHash: hashPin(user.myPlayerId, pin), isAdmin: true, myPlayerId: user.myPlayerId });
               } else {
                 setUserSettings({ verifiedHash: hashPin(user.myPlayerId, pin) });
               }
               // Append full login history entry (keep last 50 per player)
               setShared(s => ({
                 ...s,
                 players: (s.players || []).map(p => {
                   if (p.id !== user.myPlayerId) return p;
                   const entry = { at: Date.now() };
                   const history = [...(p.loginHistory || []), entry].slice(-50);
                   return { ...p, loginHistory: history, lastLoginAt: Date.now() };
                 })
               }));
             }}
             onCancel={() => setUserSettings({ myPlayerId: "", verifiedHash: "" })}
             onAdminLogin={(pin) => {
               if (pin === state.adminPass) {
                 setUserSettings({ isAdmin: true, myPlayerId: "", verifiedHash: "", pendingAutoLink: false });
                 return true;
               }
               return false;
             }}
             theme={theme} 
           />
        )}

        {/* 3. FORCED SETUP MODE */}
        {(!user.isAdmin && user.pendingAutoLink && !user.myPlayerId) && (
          <div style={{display: "flex", flexDirection: "column", height: "100vh", background: theme.bg}}>
            <div style={{padding: `${16*(theme.zoom||1)}px`, background: theme.nav, display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.border}`}}>
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
              {activeView==="log"       && <LogMatch state={appState} players={stats} set={setShared} nav={nav} theme={theme} user={user} showUndo={showUndo} />}
              {activeView==="session"   && <SessionMode players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} showUndo={showUndo} />}
              {activeView==="kotc"      && <KingOfCourt players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} showUndo={showUndo} />}
              {activeView==="tourney"   && <TournamentMode players={stats} state={appState} set={setShared} nav={nav} theme={theme} isAdmin={user.isAdmin} user={user} showUndo={showUndo} />}
              {activeView==="compare"   && <Compare players={stats} matches={derivedMatches} compareIds={state.compareIds || []} set={setShared} nav={nav} theme={theme} state={appState} user={user}/>}
              {activeView==="history"   && <History matches={derivedMatches} players={stats} nav={nav} set={setShared} theme={theme} isAdmin={user.isAdmin} initialPlayerId={historyPlayerId} state={appState} user={user} lang={activeLangId}
                onSaveNote={(matchId, playerId, note) => {
                  setShared(s => ({
                    ...s,
                    matches: (s.matches||[]).map(m => m.id !== matchId ? m : {
                      ...m,
                      playerNotes: { ...(m.playerNotes||{}), [playerId]: note }
                    })
                  }));
                }}
                onReplay={(m) => {
                  const t1 = m.teams?.[0] || [];
                  const t2 = m.teams?.[1] || [];
                  setQuickLogPrefill({
                    mode: "custom",
                    type: m.type || "doubles",
                    t1ids: t1,
                    t2ids: t2,
                  });
                  setShowQuickLog(true);
                }}
              />}
              {activeView==="profile"   && profilePlayer && <Profile player={profilePlayer} matches={derivedMatches} players={stats} nav={nav} set={setShared} theme={theme} isAdmin={user.isAdmin} user={user} setUser={setUserSettings}/>}
              {activeView==="stats"     && <StatsView players={stats} matches={derivedMatches} nav={nav} theme={theme} user={user}/>}
              {activeView==="settings"  && <Settings state={appState} user={user} setShared={setShared} setUser={setUserSettings} nav={nav} theme={theme} matchCount={matches.length} isLargeDataset={isLargeDataset}/>}
              {activeView==="trash"     && <Trash state={appState} set={setShared} theme={theme} isAdmin={user.isAdmin} />}
              {activeView==="legends"   && <Legends theme={theme} />}
              {activeView==="changelog" && <Changelog theme={theme} />}
              {activeView==="events"    && <Events state={appState} set={setShared} theme={theme} isAdmin={user.isAdmin} user={user} nav={nav}
                onStartSession={(inviteeIds) => {
                  // Navigate to Session tab with invitees pre-saved as today's players in QuickLog
                  try { sessionStorage.setItem("ql_today_players", JSON.stringify(inviteeIds)); } catch {}
                  setQuickLogPrefill({ mode: "session" });
                  setShowQuickLog(true);
                }}
              />}
            </main>
            <BottomNav active={activeView} nav={nav} theme={theme}/>

            {/* ── Quick Log floating button — draggable ── */}
            {quickLogEnabled && (user.isAdmin || isCurrentlyVerified || (user.myPlayerId && !user.pendingAutoLink)) && !showQuickLog && (
              <DraggableFloater theme={theme} onOpen={() => setShowQuickLog(true)} />
            )}

            {/* ── Quick Log modal ── */}
            {showQuickLog && (
              <QuickLog
                players={stats}
                state={appState}
                set={setShared}
                theme={theme}
                showUndo={showUndo}
                prefill={quickLogPrefill}
                user={user}
                onClose={() => { setShowQuickLog(false); setQuickLogPrefill(null); }}
              />
            )}

            {/* ── Offline banner ── */}
            {!isOnline && !offlineBannerDismissed && (
              <div style={{
                position:"fixed", top:0, left:0, right:0, zIndex:2000,
                background:"#e05050", color:"#fff",
                padding:"6px 12px",
                paddingTop:"calc(6px + env(safe-area-inset-top))",
                fontSize:12, fontWeight:700,
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:6
              }}>
                <span style={{display:"flex", alignItems:"center", gap:6, flex:1, minWidth:0}}>
                  <span style={{flexShrink:0}}>📶</span>
                  <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {hasOfflineChanges
                      ? (t("offline_changes")||"Offline — changes saved locally, will sync on reconnect")
                      : (t("offline_banner")||"Offline — app works, data syncs when reconnected")}
                  </span>
                </span>
                <button
                  onClick={() => setOfflineBannerDismissed(true)}
                  style={{background:"rgba(255,255,255,0.25)", border:"none", borderRadius:4,
                    color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700,
                    padding:"1px 8px", flexShrink:0, lineHeight:1.4}}
                >
                  ✕
                </button>
              </div>
            )}

            {/* ── Sync status banners (online only) ── */}
            {isOnline && syncStatus === "syncing" && (
              <div style={{
                position:"fixed", top:0, left:0, right:0, zIndex:2000,
                background:"#f0a830", color:"#fff",
                padding:"8px 16px", textAlign:"center",
                paddingTop:"calc(8px + env(safe-area-inset-top))",
                fontSize:`${12*(theme.zoom||1)}px`, fontWeight:700
              }}>
                ⏳ {t("syncing_matches")||"Syncing your offline matches to the server..."}
              </div>
            )}
            {isOnline && syncStatus === "done" && (
              <div style={{
                position:"fixed", top:0, left:0, right:0, zIndex:2000,
                background:"#50c878", color:"#fff",
                padding:"8px 16px", textAlign:"center",
                paddingTop:"calc(8px + env(safe-area-inset-top))",
                fontSize:12, fontWeight:700
              }}>
                ✅ {t("sync_done")||"All matches synced successfully!"}
              </div>
            )}
            {isOnline && syncStatus === "error" && (
              <div style={{
                position:"fixed", top:0, left:0, right:0, zIndex:2000,
                background:"#e05050", color:"#fff",
                padding:"8px 16px", textAlign:"center",
                paddingTop:"calc(8px + env(safe-area-inset-top))",
                fontSize:12, fontWeight:700
              }}>
                ❌ {t("sync_error")||"Sync failed — your matches are still saved locally. Will retry when reconnected."}
              </div>
            )}

            {/* ── Feature B: In-app event banner — fires when event is ≤60 min away ── */}
            {eventBanner && !syncStatus && isOnline && (
              <div style={{
                position:"fixed", top:0, left:0, right:0, zIndex:1999,
                background:"#f0a830", color:"#fff",
                padding:"8px 12px",
                paddingTop:"calc(8px + env(safe-area-inset-top))",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
                boxShadow:"0 2px 8px rgba(0,0,0,0.25)"
              }}>
                <span style={{fontSize:14}}>🏓</span>
                <span style={{flex:1, fontSize:12*(theme.zoom||1), fontWeight:700, minWidth:0,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {eventBanner.title} — {eventBanner.minutesUntil} min away
                  {eventBanner.venue ? ` · ${eventBanner.venue}` : ""}
                </span>
                <button
                  onClick={() => { setEventBannerDismissed(d => ({...d, [eventBanner.id]: true})); setEventBanner(null); }}
                  style={{background:"rgba(255,255,255,0.25)", border:"none", borderRadius:4,
                    color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700,
                    padding:"1px 8px", flexShrink:0, lineHeight:1.4}}>
                  ✕
                </button>
              </div>
            )}

            {/* ── Feature C: RSVP nudge — remind logged-in user to respond to upcoming event ── */}
            {rsvpNudge && !eventBanner && (
              <div style={{
                position:"fixed", top:0, left:0, right:0, zIndex:1998,
                background:theme.card, borderBottom:`2px solid ${theme.accent}`,
                padding:"8px 12px",
                paddingTop:"calc(8px + env(safe-area-inset-top))",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
                boxShadow:"0 2px 8px rgba(0,0,0,0.15)"
              }}>
                <span style={{fontSize:14}}>📅</span>
                <span style={{flex:1, fontSize:11*(theme.zoom||1), color:theme.text, minWidth:0,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  <span style={{fontWeight:700, color:theme.accent}}>{rsvpNudge.title}</span>
                  {" — "}{t("going")||"Going"}?
                </span>
                <button onClick={() => { setRsvpNudgeDismissed(d => ({...d, [rsvpNudge.id]: true})); nav("events"); }}
                  style={{background:theme.accent, border:"none", borderRadius:6,
                    color: theme.invert ? "#fff" : "#0d1a10",
                    cursor:"pointer", fontSize:11*(theme.zoom||1), fontWeight:700,
                    padding:`${4*(theme.zoom||1)}px ${8*(theme.zoom||1)}px`, flexShrink:0}}>
                  RSVP →
                </button>
                <button onClick={() => setRsvpNudgeDismissed(d => ({...d, [rsvpNudge.id]: true}))}
                  style={{background:"transparent", border:"none", color:theme.sub,
                    cursor:"pointer", fontSize:13, padding:"0 2px", flexShrink:0}}>
                  ✕
                </button>
              </div>
            )}

          </>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}