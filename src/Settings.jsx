import React, { useState, useRef } from 'react';
import { t, setLang, APP_MODES, APP_ACCENTS, APP_FONTS, processImage, APP_VERSION, APP_UPDATED, blankState, clearLocalCache } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Err, ConfirmInline, Sel, PinManager } from '../components/Shared.jsx';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../engine";
import TestDashboard from '../components/TestDashboard.jsx';

// ── Proper component for inline name editing (avoids Hook-in-IIFE) ────────────
function NameEditor({ player, myPlayerId, theme, z, S, setShared, t }) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(player?.name || "");
  const saveName = () => {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === player?.name) { setEditingName(false); return; }
    setShared(s => ({
      ...s,
      players: (s.players||[]).map(p => p.id === myPlayerId ? {...p, name: trimmed} : p)
    }));
    setEditingName(false);
  };
  return (
    <div>
      <div style={{fontSize:12*z, color:theme.sub, marginBottom:10*z}}>{t("link_device_desc")}</div>
      <div style={{display:"flex", alignItems:"center", gap:8*z, marginBottom:10*z}}>
        {editingName ? (
          <>
            <input value={nameVal} onChange={e=>setNameVal(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveName()}
              style={{...S.input, flex:1, margin:0}} autoFocus />
            <button onClick={saveName} style={{...S.btnPrimary, margin:0, padding:`${6*z}px ${12*z}px`, fontSize:12*z}}>{t("save")||"Save"}</button>
            <button onClick={()=>setEditingName(false)} style={{...S.btnSecondary, margin:0, padding:`${6*z}px ${10*z}px`, fontSize:12*z}}>✕</button>
          </>
        ) : (
          <>
            <div style={{flex:1, fontSize:15*z, fontWeight:700, color:theme.text}}>{player?.name || "?"}</div>
            <button onClick={()=>{ setNameVal(player?.name||""); setEditingName(true); }}
              style={{...S.btnSecondary, margin:0, padding:`${5*z}px ${10*z}px`, fontSize:11*z}}>
              ✏️ {t("edit")||"Edit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Built-in Test Runner — proper component so useState is valid ──────────────
function TestRunner({ theme }) {
  const z = theme.zoom || 1.0;
  const S = makeS(theme);
  const [testResult, setTestResult] = useState(null);
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 50));
    const result = runAllTests();
    setTestResult(result);
    setRunning(false);
  };
  const suiteMap = testResult ? testResult.results.reduce((acc, r) => {
    if (!acc[r.suite]) acc[r.suite] = { pass: 0, fail: 0 };
    acc[r.suite][r.pass ? "pass" : "fail"]++;
    return acc;
  }, {}) : {};

  return (
    <div style={{ marginTop: 14*z, borderTop: `1px solid ${theme.border}`, paddingTop: 12*z }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: testResult ? 10*z : 0 }}>
        <div style={{ fontSize: 11*z, color: theme.sub }}>🧪 Built-in Test Suite</div>
        <button onClick={run} disabled={running} style={{
          ...S.btnSecondary, margin: 0, padding: `${5*z}px ${12*z}px`, fontSize: 11*z, opacity: running ? 0.6 : 1
        }}>
          {running ? "Running…" : "Run Tests"}
        </button>
      </div>
      {testResult && (<>
        <div style={{
          padding: `${8*z}px ${10*z}px`, borderRadius: 8*z, marginBottom: 8*z,
          background: testResult.failed.length === 0 ? "rgba(80,200,120,0.12)" : "rgba(224,80,80,0.1)",
          border: `1px solid ${testResult.failed.length === 0 ? "#50c87844" : "#e0505044"}`,
          fontSize: 12*z, fontWeight: 700,
          color: testResult.failed.length === 0 ? "#50c878" : "#e05050"
        }}>
          {testResult.failed.length === 0
            ? `✅ All ${testResult.total} tests passed`
            : `❌ ${testResult.failed.length} failed / ${testResult.total} total`}
        </div>
        {testResult.failed.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap: 4*z, marginBottom: 8*z }}>
            {testResult.failed.map((f, i) => (
              <div key={i} style={{ fontSize: 10*z, color: "#e05050", background: "rgba(224,80,80,0.06)", borderRadius: 6*z, padding: `${4*z}px ${8*z}px` }}>
                <strong>[{f.suite}]</strong> {f.desc}
                {f.detail && <div style={{ color: theme.sub, marginTop: 2*z }}>{f.detail}</div>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap: 4*z }}>
          {Object.entries(suiteMap).map(([s, { pass, fail }]) => (
            <div key={s} style={{
              fontSize: 9*z, fontWeight: 700, borderRadius: 4*z, padding: `${2*z}px ${6*z}px`,
              background: fail > 0 ? "rgba(224,80,80,0.1)" : "rgba(80,200,120,0.1)",
              color: fail > 0 ? "#e05050" : "#50c878",
              border: `1px solid ${fail > 0 ? "#e0505044" : "#50c87844"}`
            }}>
              {fail > 0 ? "❌" : "✅"} {s} {pass}/{pass+fail}
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}

// Collapsible section for Settings — starts open, user can collapse
function CSec({ title, theme, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const z = theme.zoom || 1.0;
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 12*z, marginBottom: 12*z, overflow: "hidden"
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "transparent", border: "none", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: `${12*z}px ${14*z}px`, textAlign: "left", gap: 8*z
      }}>
        <span style={{fontSize: 12*z, fontWeight: 700, color: theme.accent,
          textTransform: "uppercase", letterSpacing: "0.8px"}}>{title}</span>
        <span style={{fontSize: 12*z, color: theme.sub, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s"}}>▾</span>
      </button>
      {open && (
        <div style={{padding: `0 ${14*z}px ${14*z}px`,
          borderTop: `1px solid ${theme.border}`, paddingTop: 12*z}}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Settings({state, user, setShared, setUser, nav, theme, matchCount=0, isLargeDataset=false}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const fileRef = useRef();
  const logoRef = useRef();
  const [importErr, setImportErr] = useState("");
  const [importOk, setImportOk] = useState(false);
  const [pendingClear, setPendingClear] = useState(false);
  
  const [newPass, setNewPass] = useState("");
  const [adminErr, setAdminErr] = useState("");

  // Resolving the correct active settings to display in the dropdowns
  const pref = (user.myPlayerId && user.preferences) ? user.preferences[user.myPlayerId] : {};
  const activeLangId = pref?.langId || user.langId || "en";
  const activeModeId = pref?.modeId || user.modeId || "sky";
  const activeAccentId = pref?.accentId || user.accentId || "green";
  const activeFontId = pref?.fontId || user.fontId || "heiti";
  const activeZoomLevel = pref?.zoomLevel || user.zoomLevel || 1.0;

  // Helper to save setting exclusively to the logged-in user, or to the device if Guest/Admin
  const updateAppearance = (key, val) => {
    // Apply language change synchronously so t() calls on the very next render
    // use the correct language — without this, there's a one-render lag.
    if (key === 'langId') setLang(val);

    if (user.myPlayerId) {
      setUser(prev => ({
        ...prev,
        preferences: {
          ...(prev.preferences || {}),
          [user.myPlayerId]: {
            ...((prev.preferences || {})[user.myPlayerId] || {}),
            [key]: val
          }
        }
      }));
    } else {
      setUser({ [key]: val });
    }
  };

  const handleLogout = () => {
    // CRITICAL: Wipe per-session draft state so the next user on this device
    // doesn't see the previous user's half-completed match logs, event drafts,
    // tournament brackets, or new-player forms.
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (!k) continue;
        // Match anything our usePersistentFormState hook wrote (namespaced prefixes)
        if (k.startsWith("logMatch:") || k.startsWith("session:") ||
            k.startsWith("kotc:") || k.startsWith("tourney:") ||
            k.startsWith("events:") || k.startsWith("player:") ||
            k.startsWith("event:")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) { /* sessionStorage may be unavailable */ }

    // Wipe localStorage cache so next user loads fresh from Firestore
    clearLocalCache();

    setUser({ 
      myPlayerId: "", 
      guestMode: false, 
      pendingAutoLink: false,
      verifiedHash: "", 
      isAdmin: false    
    });
    nav("dashboard");
  };

  function exportData(){
    const json = JSON.stringify({players:state.players, matches:state.matches, savedGroups:state.savedGroups, logoText:state.logoText, logoData:state.logoData, adminPass:state.adminPass}, null, 2);
    const blob = new Blob([json], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `picklerank-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportCSV(){
    const escapeCSV = s => '"' + String(s || "").replace(/"/g, '""') + '"';
    const headers = "Match ID,Date,Type,Venue,Team 1,Team 2,Winner,Games\n";
    const rows = state.matches.map(m => {
      const getName = id => state.players.find(p=>p.id===id)?.name??"?";
      const t1 = m.teams?.[0]?.map(getName).join(" & ")||"TBD";
      const t2 = m.teams?.[1]?.map(getName).join(" & ")||"TBD";
      const winner = m.winnerTeam === 0 ? t1 : t2;
      const gamesStr = (m.games||[]).map(g => `${g.a}-${g.b}`).join(" | ");
      return [m.id, m.date, m.type, m.venue, t1, t2, winner, gamesStr].map(escapeCSV).join(",");
    }).join("\n");
    
    const blob = new Blob(["\uFEFF" + headers + rows], {type:"text/csv;charset=utf-8Layout;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `picklerank-data-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function importData(e) {
    setImportErr(""); setImportOk(false);
    const file = e.target.files[0]; 
    if (!file) return;
    if (!navigator.onLine) {
      setImportErr("Import requires an internet connection. Please connect and try again.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data.players) || !Array.isArray(data.matches)) throw new Error("Invalid format.");

        // Security: strip isAdminPlayer from imported players — this flag should only
        // be set by an existing admin inside the app, not snuck in via a backup file.
        // Without this, anyone could craft a JSON file with isAdminPlayer:true and
        // import it to silently escalate privileges on their next PIN login.
        const sanitizedPlayers = data.players.map(p => {
          const { isAdminPlayer, ...safe } = p;
          return user.isAdmin && isAdminPlayer
            ? { ...safe, isAdminPlayer: true }  // preserve if current session is already admin
            : safe;
        });
        
        setShared(s => ({
          ...s, 
          players: sanitizedPlayers, 
          matches: data.matches, 
          savedGroups: data.savedGroups || [], 
          logoText: data.logoText || "LS", 
          logoData: data.logoData || null, 
          adminPass: data.adminPass || "1234"
        }));

        const groupRef = doc(db, "picklerank", "main_group");
        await setDoc(groupRef, {
          players: sanitizedPlayers,
          matches: JSON.stringify(data.matches), 
          savedGroups: data.savedGroups || [],
          logoText: data.logoText || "LS",
          logoData: data.logoData || null,
          adminPass: data.adminPass || "1234"
        }, { merge: true });

        setImportOk(true);
      } catch (err) {
        setImportErr("Import failed: " + err.message);
        console.error("Firebase Sync Error:", err); 
      }
    };
    reader.readAsText(file);
  }

  function handleLogoUpload(e) { if (e.target.files[0]) processImage(e.target.files[0], (data) => setShared({logoData: data}), 192); }
  function clearAll(){ setShared(()=>blankState()); setPendingClear(false); }

  return (
    <div style={S.view}>

      {/* ── MY PROFILE + ADMIN (consolidated for isAdminPlayer users) ── */}
      {user.myPlayerId ? (
        /* Player is linked — show editable name, PIN, admin badge, and logout */
        <CSec title={t("my_profile_sec")} theme={theme}>
          <NameEditor
            player={state.players?.find(p => p.id === user.myPlayerId)}
            myPlayerId={user.myPlayerId}
            theme={theme} z={z} S={S}
            setShared={setShared} t={t}
          />

          {/* Admin badge — visible when this player has admin rights */}
          {user.isAdmin && (
            <div style={{
              display:"flex", alignItems:"center", gap:8*z,
              marginTop:10*z, padding:`${8*z}px ${10*z}px`,
              background:"rgba(80,200,120,0.08)", border:"1px solid rgba(80,200,120,0.3)",
              borderRadius:8*z, fontSize:12*z
            }}>
              <span style={{fontSize:14*z}}>🔑</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, color:"#50c878"}}>{t("admin_mode")}</div>
                <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>{t("admin_mode_active")||"Full admin access active"}</div>
              </div>
            </div>
          )}

          {/* PIN management */}
          {(() => {
            const linkedPlayer = state.players?.find(p => p.id === user.myPlayerId);
            const hasPIN = !!linkedPlayer?.pin;
            return (
              <PinManager
                player={linkedPlayer}
                hasPIN={hasPIN}
                theme={theme}
                onSave={(newPin) => {
                  setShared(s => ({
                    ...s,
                    players: (s.players||[]).map(p =>
                      p.id === user.myPlayerId ? { ...p, pin: newPin || null } : p
                    )
                  }));
                }}
              />
            );
          })()}

          {/* Single logout for all linked players */}
          <div style={{marginTop: 16*z}}>
            <button style={{...S.btnSecondary, width: "100%", borderColor: "#e05050", color: "#e05050"}} onClick={handleLogout}>
              {t("logout_btn")}
            </button>
          </div>
        </CSec>

      ) : !user.isAdmin ? (
        /* Guest — not linked, show link selector only */
        <CSec title={t("my_profile_sec")} theme={theme}>
          <div style={{ fontSize: 12*z, color: theme.sub, marginBottom: 10*z }}>
            {t("link_device_desc")}
          </div>
          <Sel
            value=""
            onChange={v => setUser({myPlayerId: v})}
            opts={[
              { value: "", label: t("guest_not_linked") },
              ...[...(state.players || [])]
                  .sort((a,b) => a.name.localeCompare(b.name))
                  .map(p => ({ value: p.id, label: p.name }))
            ]}
            theme={theme}
          />
        </CSec>
      ) : null}

      {/* GLOBAL ADMIN CONTROLS — only for pure admin (no player profile linked) */}
      {user.isAdmin && !user.myPlayerId && (
        <CSec title={t("admin_sec")} theme={theme}>
          <div style={{marginBottom: 10*z, fontSize: 13*z, color: theme.text}}>
            {t("admin_status")}: <strong style={{color: "#50c878"}}>{t("admin_mode")}</strong>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap: 10*z}}>
            <button style={{...S.btnSecondary, borderColor: "#e05050", color: "#e05050"}} onClick={handleLogout}>{t("exit_admin_btn")}</button>
            <div style={{borderTop:`1px solid ${theme.border}`, margin:`${8*z}px 0`}} />
            <div style={{display:"flex", gap: 8*z}}>
              <input style={{...S.input, flex:1}} type="password" placeholder={t("new_passcode_placeholder")} value={newPass} onChange={e=>{setNewPass(e.target.value); setAdminErr("");}}/>
              <button style={S.btnPrimary} onClick={()=>{
                if(newPass.trim()) { setShared({adminPass: newPass.trim()}); setNewPass(""); setAdminErr(t("pass_updated")); }
              }}>{t("change_pass_btn")}</button>
            </div>
          </div>
          {adminErr && <div style={{color: adminErr === t("pass_updated") ? "#50c878" : "#e05050", fontSize: 12*z, marginTop: 8*z}}>{adminErr}</div>}
        </CSec>
      )}

      {/* Passcode change for isAdminPlayer users — shown inside their profile section above,
          but we also need to let them change the global passcode if they're isAdminPlayer */}
      {user.isAdmin && user.myPlayerId && (
        <CSec title={t("admin_sec")} theme={theme}>
          <div style={{display:"flex", gap: 8*z}}>
            <input style={{...S.input, flex:1}} type="password" placeholder={t("new_passcode_placeholder")} value={newPass} onChange={e=>{setNewPass(e.target.value); setAdminErr("");}}/>
            <button style={S.btnPrimary} onClick={()=>{
              if(newPass.trim()) { setShared({adminPass: newPass.trim()}); setNewPass(""); setAdminErr(t("pass_updated")); }
            }}>{t("change_pass_btn")}</button>
          </div>
          {adminErr && <div style={{color: adminErr === t("pass_updated") ? "#50c878" : "#e05050", fontSize: 12*z, marginTop: 8*z}}>{adminErr}</div>}
        </CSec>
      )}

      <CSec title={t("appearance_sec")} theme={theme}>
        <div style={{display:"flex", flexDirection:"column", gap: 14*z}}>
          
          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("lang_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={activeLangId} onChange={v=>updateAppearance('langId', v)} opts={[
                { value: "en", label: "English" }, 
                { value: "zh_tw", label: "繁體中文" }, 
                { value: "zh_cn", label: "简体中文" }
              ]} theme={theme} />
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("bg_mode_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={activeModeId} onChange={v=>updateAppearance('modeId', v)} opts={APP_MODES.map(m=>({value:m.id, label:m.label}))} theme={theme} />
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("typography_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={activeFontId} onChange={v=>updateAppearance('fontId', v)} opts={APP_FONTS.map(f=>({value:f.id, label:f.label}))} theme={theme} />
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("display_size_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={activeZoomLevel} onChange={v=>updateAppearance('zoomLevel', parseFloat(v))} opts={[
                { value: 0.85, label: t("size_compact") }, 
                { value: 1.0, label: t("size_standard") }, 
                { value: 1.15, label: t("size_large") }
              ]} theme={theme} />
            </div>
          </div>

          <div>
            <label style={{...S.label, marginBottom:8*z}}>{t("accent_style_sec")}</label>
            <div style={{display:"flex", flexWrap:"wrap", gap:12*z, marginTop: 4*z}}>
              {APP_ACCENTS.map(a=>{
                const active = activeAccentId === a.id;
                return (
                  <button key={a.id} onClick={()=>updateAppearance('accentId', a.id)} title={a.label}
                    style={{
                      width: 28*z, height: 28*z, borderRadius: "50%", background: a.hex, padding: 0, cursor: "pointer",
                      border: active ? `2px solid ${theme.bg}` : "none", 
                      outline: active ? `2px solid ${a.hex}` : "none", 
                      boxShadow: active ? `0 0 8px ${a.hex}66` : "none"
                    }}
                  />
                );
              })}
            </div>
          </div>

        </div>
      </CSec>

      {/* QUICK LOG TOGGLE */}
      <CSec title={`⚡ ${t("quick_log_floater")||"Quick Log Button"}`} theme={theme}>
        {(() => {
          const isEnabled = user.myPlayerId ? (pref?.quickLogEnabled ?? true) : (user.quickLogEnabled ?? true);
          return (
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={{fontSize:13*z, color:theme.text}}>{t("quick_log_floater")||"Quick Log Button"}</div>
              <div style={{fontSize:11*z, color:theme.sub, marginTop:3*z}}>
                {t("ql_floater_desc")||"Show the ⚡ floating button for rapid score entry"}
              </div>
            </div>
            <button onClick={() => updateAppearance("quickLogEnabled", !isEnabled)} style={{
              width:44*z, height:26*z, borderRadius:13*z, border:"none", cursor:"pointer",
              background: isEnabled ? theme.accent : theme.border,
              position:"relative", transition:"background 0.2s", flexShrink:0
            }}>
              <div style={{
                position:"absolute", top:3*z, left: isEnabled ? (44-20)*z : 3*z,
                width:20*z, height:20*z, borderRadius:"50%", background:"#fff", transition:"left 0.2s"
              }}/>
            </button>
          </div>
          );
        })()}
      </CSec>
      {user.isAdmin && (
        <CSec title={t("login_activity_sec")||"🔐 Login Activity"} theme={theme}>
          <div style={{fontSize:11*z, color:theme.sub, marginBottom:10*z, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <span>{t("most_recent_login")||"Most recent login per player."}</span>
            <button onClick={() => {
              if (!window.confirm(window.confirm ? undefined : t("clear_all_confirm")||"Clear ALL login history?")) return;
              setShared(s => ({
                ...s,
                players: (s.players||[]).map(p => ({...p, loginHistory: [], lastLoginAt: null}))
              }));
            }} style={{fontSize:10*z, color:"#e05050", background:"transparent", border:"1px solid #e0505066",
              borderRadius:6*z, padding:`${2*z}px ${8*z}px`, cursor:"pointer"}}>
              Clear All
            </button>
          </div>
          {(state.players || [])
            .filter(p => p.lastLoginAt)
            .sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0))
            .map(p => {
              const lastAt = new Date(p.lastLoginAt);
              const now = Date.now();
              const diff = now - p.lastLoginAt;
              const diffMin = Math.floor(diff / 60000);
              const diffHr = Math.floor(diff / 3600000);
              const diffDay = Math.floor(diff / 86400000);
              const ago = diff < 60000 ? (t("time_just_now")||"just now")
                        : diffMin < 60 ? `${diffMin}${t("time_min_ago")||"m ago"}`
                        : diffHr < 24 ? `${diffHr}${t("time_hr_ago")||"h ago"}`
                        : diffDay < 7 ? `${diffDay}${t("time_day_ago")||"d ago"}`
                        : lastAt.toLocaleDateString([], {month:"short", day:"numeric"});
              const loginCount = p.loginHistory?.length || 1;
              return (
                <div key={p.id} style={{
                  display:"flex", alignItems:"center", gap:8*z,
                  padding:`${7*z}px 0`, borderBottom:`1px solid ${theme.border}`
                }}>
                  <div style={{width:8*z, height:8*z, borderRadius:"50%", flexShrink:0,
                    background: diff < 300000 ? "#50c878" : diff < 86400000 ? theme.accent : theme.border
                  }}/>
                  <div style={{flex:1, fontSize:13*z, fontWeight:600, color:theme.text}}>{p.name}</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12*z, color:theme.text, fontWeight:600}}>{ago}</div>
                    <div style={{fontSize:10*z, color:theme.sub}}>{loginCount} login{loginCount!==1?"s":""}</div>
                  </div>
                  <button onClick={() => {
                    setShared(s => ({
                      ...s,
                      players: (s.players||[]).map(pl => pl.id !== p.id ? pl : {...pl, loginHistory:[], lastLoginAt:null})
                    }));
                  }} style={{fontSize:10*z, color:theme.sub, background:"transparent", border:`1px solid ${theme.border}`,
                    borderRadius:6*z, padding:`${2*z}px ${6*z}px`, cursor:"pointer", flexShrink:0}}>
                    ✕
                  </button>
                </div>
              );
            })
          }
          {(state.players || []).every(p => !p.lastLoginAt) && (
            <div style={{fontSize:12*z, color:theme.sub, textAlign:"center", padding:16*z}}>
              No login activity recorded yet.
            </div>
          )}
        </CSec>
      )}

      {/* BRANDING (ADMIN ONLY) */}
      {user.isAdmin && (
        <CSec title={t("branding_sec")} theme={theme}>
          <div style={{display: "flex", alignItems: "center", gap: 12*z}}>
            <div 
              style={{width: 48*z, height: 48*z, borderRadius: 10*z, cursor: "pointer", position: "relative", flexShrink: 0, background: theme.card, border: `1px dashed ${theme.border}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible"}}
              onClick={() => logoRef.current.click()}
              title={t("click_to_change_logo")}
            >
              {state.logoData ? (
                <>
                  <img src={state.logoData} style={{width: "100%", height: "100%", borderRadius: 10*z, objectFit:"cover"}} alt="Logo" />
                  <button 
                    style={{position: "absolute", top: -6*z, right: -6*z, background: theme.card, border: `1px solid ${theme.border}`, color: "#e05050", borderRadius: "50%", width: 20*z, height: 20*z, fontSize: 10*z, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0}}
                    onClick={(e) => { e.stopPropagation(); setShared({logoData: null}); }}
                  >✕</button>
                </>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" style={{width: "100%", height: "100%", borderRadius:10*z}}>
                  <rect width="192" height="192" rx="40" fill={theme.card} stroke={theme.border} strokeWidth="4"/>
                  <circle cx="96" cy="96" r="60" stroke={theme.accent} strokeWidth="12" fill="none"/>
                  <text x="50%" y="50%" fontFamily="inherit" fontSize="64" fontWeight="900" fill={theme.accent} textAnchor="middle" dy=".35em">{state.logoText || "LS"}</text>
                </svg>
              )}
            </div>
            <div style={{flex: 1}}>
              <input style={{...S.input, margin: 0, padding: "8px 12px", fontSize: 14*z}} maxLength="4" placeholder={t("app_initials_placeholder")} value={state.logoText} onChange={e=>setShared({logoText: e.target.value})} />
            </div>
          </div>
          <input type="file" accept="image/*" ref={logoRef} style={{display:"none"}} onChange={handleLogoUpload} />
        </CSec>
      )}
      
      {/* BACKUP & RESTORE (ADMIN ONLY) */}
      {user.isAdmin && (
        <CSec title={t("backup_restore_sec")} theme={theme}>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8*z}}>
            <button style={{...S.btnPrimary, margin: 0, padding: "10px 4px", fontSize: 12*z}} onClick={exportData}>💾 JSON</button>
            <button style={{...S.btnPrimary, margin: 0, padding: "10px 4px", fontSize: 12*z, background:theme.card, color:theme.accent, border:`1px solid ${theme.accent}`}} onClick={exportCSV}>📊 CSV</button>
            <button style={{...S.btnSecondary, margin: 0, padding: "10px 4px", fontSize: 12*z}} onClick={()=>fileRef.current.click()}>📥 Import</button>
          </div>
          <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={importData}/>
          {importErr&&<Err msg={importErr} theme={theme}/>}
        </CSec>
      )}
      
      {/* DANGER ZONE (ADMIN ONLY) */}
      {user.isAdmin && (
        <CSec title={t("danger_zone_sec")} theme={theme}>
          <p style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("danger_desc")}</p>
          {pendingClear?(
            <ConfirmInline msg="Delete ALL data?" note="This cannot be undone."
              onConfirm={clearAll} onCancel={()=>setPendingClear(false)} danger theme={theme}/>
          ):(
            <button style={{...S.btnDanger,width:"100%",padding:12*z,fontSize:14*z,fontWeight:700}} onClick={()=>setPendingClear(true)}>
              {t("clear_all_btn")}
            </button>
          )}
        </CSec>
      )}

      <CSec title={t("about_sec")} theme={theme}>
        <div style={{ fontSize: 13*z, lineHeight: 1.5, color: theme.text }}>
          {t("about_desc")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12*z }}>
          <div style={{ fontSize: 11*z, color: theme.sub, fontWeight: "bold" }}>
            {t("version_lbl")}{" "}
            <span style={{ color: theme.accent }}>{APP_VERSION}</span>
            {" "}({APP_UPDATED})
          </div>
          <button style={{...S.btnSecondary, margin: 0, padding: "6px 12px", fontSize: 11*z}} onClick={()=>nav("changelog")}>
            {t("view_changelog_btn")}
          </button>
        </div>
        {user.isAdmin && matchCount > 0 && (
          <div style={{
            marginTop: 12*z, padding: `${8*z}px ${10*z}px`,
            background: isLargeDataset ? "rgba(240,160,40,0.1)" : "rgba(80,200,120,0.08)",
            border: `1px solid ${isLargeDataset ? "#f0a82844" : "#50c87844"}`,
            borderRadius: 8*z, fontSize: 11*z,
            color: isLargeDataset ? "#f0a828" : theme.sub
          }}>
            {isLargeDataset
              ? `⚠️ ${matchCount} matches — rating recalculation may be slow on edits/deletes. Consider exporting a backup.`
              : `✅ ${matchCount} matches — database healthy.`
            }
          </div>
        )}

        {/* ── Built-in Test Runner (admin only) ── */}
        {user.isAdmin && <TestDashboard theme={theme} />}
        
      </CSec>
    </div>
  );
}