import React, { useState, useRef } from 'react';
import { t, APP_MODES, APP_ACCENTS, APP_FONTS, blankState, processImage, APP_VERSION, APP_UPDATED } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Err, ConfirmInline, Sel } from '../components/Shared.jsx';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../engine";

export default function Settings({state,set,nav,theme}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const fileRef=useRef();
  const logoRef=useRef();
  const [importErr,setImportErr]=useState(""), [importOk,setImportOk]=useState(false);
  const [pendingClear,setPendingClear]=useState(false);
  
  const [passInput, setPassInput] = useState("");
  const [newPass, setNewPass] = useState("");
  const [adminErr, setAdminErr] = useState("");

  function exportData(){
    const json=JSON.stringify({players:state.players,matches:state.matches,savedGroups:state.savedGroups,langId:state.langId,modeId:state.modeId,accentId:state.accentId,fontId:state.fontId,logoText:state.logoText,logoData:state.logoData,zoomLevel:state.zoomLevel,favoredPlayerIds:state.favoredPlayerIds,isAdmin:false,adminPass:state.adminPass},null,2);
    const blob=new Blob([json],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`picklerank-backup-${new Date().toISOString().slice(0,10)}.json`;
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
    
    const blob=new Blob(["\uFEFF" + headers + rows],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`picklerank-data-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function importData(e) {
    setImportErr(""); setImportOk(false);
    const file = e.target.files[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data.players) || !Array.isArray(data.matches)) throw new Error("Invalid format.");
        
        set(s => ({
          ...s, 
          players: data.players, 
          matches: data.matches, 
          savedGroups: data.savedGroups || [], 
          langId: data.langId || "en", 
          logoText: data.logoText || "LS", 
          logoData: data.logoData || null, 
          zoomLevel: data.zoomLevel || 1.0, 
          favoredPlayerIds: data.favoredPlayerIds || [], 
          adminPass: data.adminPass || "1234", 
          isAdmin: false
        }));

        const groupRef = doc(db, "picklerank", "main_group");
        await setDoc(groupRef, {
          players: data.players,
          matches: JSON.stringify(data.matches), 
          savedGroups: data.savedGroups || [],
          langId: data.langId || "en",
          logoText: data.logoText || "LS",
          logoData: data.logoData || null,
          zoomLevel: data.zoomLevel || 1.0,
          favoredPlayerIds: data.favoredPlayerIds || [],
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

  function handleLogoUpload(e) { if (e.target.files[0]) processImage(e.target.files[0], (data) => set({logoData: data}), 192); }
  function clearAll(){ set(()=>blankState()); setPendingClear(false); }

  return (
    <div style={S.view}>
      <Sec title={t("admin_sec")} theme={theme}>
        <div style={{marginBottom: 10*z, fontSize: 13*z, color: theme.text}}>
          {t("admin_status")}: <strong style={{color: state.isAdmin ? "#50c878" : theme.sub}}>{state.isAdmin ? t("admin_mode") : t("user_mode")}</strong>
        </div>
        {!state.isAdmin ? (
          <div style={{display:"flex", gap: 8*z}}>
            <input style={{...S.input, flex:1}} type="password" placeholder={t("passcode_lbl")} value={passInput} onChange={e=>{setPassInput(e.target.value); setAdminErr("");}}/>
            <button style={S.btnPrimary} onClick={()=>{
              if(passInput === state.adminPass) { set({isAdmin: true}); setPassInput(""); }
              else setAdminErr(t("wrong_pass"));
            }}>{t("login_btn")}</button>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap: 10*z}}>
            <button style={S.btnSecondary} onClick={()=>set({isAdmin: false})}>{t("logout_btn")}</button>
            <div style={{borderTop:`1px solid ${theme.border}`, margin:`${8*z}px 0`}} />
            <div style={{display:"flex", gap: 8*z}}>
              <input style={{...S.input, flex:1}} type="password" placeholder="New Passcode" value={newPass} onChange={e=>setNewPass(e.target.value)}/>
              <button style={S.btnPrimary} onClick={()=>{
                if(newPass.trim()) { set({adminPass: newPass.trim()}); setNewPass(""); setAdminErr(t("pass_updated")); }
              }}>{t("change_pass_btn")}</button>
            </div>
          </div>
        )}
        {adminErr && <div style={{color: adminErr === t("pass_updated") ? "#50c878" : "#e05050", fontSize: 12*z, marginTop: 8*z}}>{adminErr}</div>}
      </Sec>

      <Sec title={t("appearance_sec") || "Appearance"} theme={theme}>
        <div style={{display:"flex", flexDirection:"column", gap: 14*z}}>
          
          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("lang_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={state.langId || "en"} onChange={v=>set({langId: v})} opts={[
                { value: "en", label: "English" }, 
                { value: "zh_tw", label: "繁體中文" }, 
                { value: "zh_cn", label: "简体中文" }
              ]} theme={theme} />
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("bg_mode_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={state.modeId || "dark"} onChange={v=>set({modeId: v})} opts={APP_MODES.map(m=>({value:m.id, label:m.label}))} theme={theme} />
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("typography_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={state.fontId || "sans"} onChange={v=>set({fontId: v})} opts={APP_FONTS.map(f=>({value:f.id, label:f.label}))} theme={theme} />
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", gap:10*z}}>
            <label style={{...S.label, margin:0, flex:1}}>{t("display_size_sec")}</label>
            <div style={{flex:2}}>
              <Sel value={state.zoomLevel || 1.0} onChange={v=>set({zoomLevel: parseFloat(v)})} opts={[
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
                const active = (state.accentId || "green") === a.id;
                return (
                  <button key={a.id} onClick={()=>set({accentId:a.id})} title={a.label}
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
      </Sec>

      {/* COMPACT BRANDING SECTION */}
      <Sec title={t("branding_sec")} theme={theme}>
        <div style={{display: "flex", alignItems: "center", gap: 12*z}}>
          <div 
            style={{width: 48*z, height: 48*z, borderRadius: 10*z, cursor: "pointer", position: "relative", flexShrink: 0, background: theme.card, border: `1px dashed ${theme.border}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible"}}
            onClick={() => logoRef.current.click()}
            title="Click to change logo"
          >
            {state.logoData ? (
              <>
                <img src={state.logoData} style={{width: "100%", height: "100%", borderRadius: 10*z, objectFit:"cover"}} alt="Logo" />
                <button 
                  style={{position: "absolute", top: -6*z, right: -6*z, background: theme.card, border: `1px solid ${theme.border}`, color: "#e05050", borderRadius: "50%", width: 20*z, height: 20*z, fontSize: 10*z, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0}}
                  onClick={(e) => { e.stopPropagation(); set({logoData: null}); }}
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
            <input style={{...S.input, margin: 0, padding: "8px 12px", fontSize: 14*z}} maxLength="4" placeholder="App Initials (e.g. PR)" value={state.logoText} onChange={e=>set({logoText: e.target.value})} />
          </div>
        </div>
        <input type="file" accept="image/*" ref={logoRef} style={{display:"none"}} onChange={handleLogoUpload} />
      </Sec>
      
      {/* COMPACT BACKUP & RESTORE SECTION */}
      <Sec title={t("backup_restore_sec")} theme={theme}>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8*z}}>
          <button style={{...S.btnPrimary, margin: 0, padding: "10px 4px", fontSize: 12*z}} onClick={exportData}>💾 JSON</button>
          <button style={{...S.btnPrimary, margin: 0, padding: "10px 4px", fontSize: 12*z, background:theme.card, color:theme.accent, border:`1px solid ${theme.accent}`}} onClick={exportCSV}>📊 CSV</button>
          <button style={{...S.btnSecondary, margin: 0, padding: "10px 4px", fontSize: 12*z}} onClick={()=>fileRef.current.click()}>📥 Import</button>
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={importData}/>
        {importErr&&<Err msg={importErr} theme={theme}/>}
      </Sec>
      
      {state.isAdmin && (
        <Sec title={t("danger_zone_sec")} theme={theme}>
          <p style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("danger_desc")}</p>
          {pendingClear?(
            <ConfirmInline msg="Delete ALL data?" note="This cannot be undone."
              onConfirm={clearAll} onCancel={()=>setPendingClear(false)} danger theme={theme}/>
          ):(
            <button style={{...S.btnDanger,width:"100%",padding:12*z,fontSize:14*z,fontWeight:700}} onClick={()=>setPendingClear(true)}>
              {t("clear_all_btn")}
            </button>
          )}
        </Sec>
      )}

      <Sec title={t("about_sec")} theme={theme}>
        <div style={{ fontSize: 13*z, lineHeight: 1.5, color: theme.text }}>
          {t("about_desc")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12*z }}>
          <div style={{ fontSize: 11*z, color: theme.sub, fontWeight: "bold" }}>
            Version {APP_VERSION} ({APP_UPDATED})
          </div>
          <button style={{...S.btnSecondary, margin: 0, padding: "6px 12px", fontSize: 11*z}} onClick={()=>nav("changelog")}>
            View Changelog
          </button>
        </div>
      </Sec>
    </div>
  );
}