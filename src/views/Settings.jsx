import React, { useState, useRef } from 'react';
import { t, APP_MODES, APP_ACCENTS, APP_FONTS, blankState, processImage } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Err, ConfirmInline } from '../components/Shared.jsx';

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

  function importData(e){
    setImportErr(""); setImportOk(false);
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!Array.isArray(data.players)||!Array.isArray(data.matches)) throw new Error("Invalid format.");
        set(s=>({...s,players:data.players,matches:data.matches,savedGroups:data.savedGroups||[],langId:data.langId||"en",logoText:data.logoText||"LS",logoData:data.logoData||null,zoomLevel:data.zoomLevel||1.0,favoredPlayerIds:data.favoredPlayerIds||[],adminPass:data.adminPass||"1234",isAdmin:false}));
        setImportOk(true);
      }catch(err){setImportErr("Import failed: "+err.message);}
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
      <Sec title={t("branding_sec")} theme={theme}>
        <div style={{display:"flex", gap:16*z, alignItems:"center"}}>
          <div style={{flex: 1}}>
            <label style={S.label}>{t("logo_text")}</label>
            <input style={{...S.input, marginBottom:10*z}} maxLength="4" placeholder="e.g. PR or 🥒" value={state.logoText} onChange={e=>set({logoText: e.target.value})}/>
            <button style={{...S.btnSecondary, width:"100%"}} onClick={() => logoRef.current.click()}>{t("upload_logo")}</button>
            <input type="file" accept="image/*" ref={logoRef} className="file-input-hidden" onChange={handleLogoUpload} />
            {state.logoData && <button style={{...S.btnDanger, width:"100%", marginTop:8*z}} onClick={()=>set({logoData:null})}>✕ Remove Image</button>}
          </div>
          <div style={{width: 80*z, height: 80*z, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
            {state.logoData ? (
              <img src={state.logoData} style={{width: "100%", height: "100%", borderRadius: 16*z, objectFit:"cover"}} alt="Logo" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" style={{width: "100%", height: "100%"}}>
                <rect width="192" height="192" rx="40" fill={theme.card} stroke={theme.border} strokeWidth="4"/>
                <circle cx="96" cy="96" r="60" stroke={theme.accent} strokeWidth="12" fill="none"/>
                <text x="50%" y="50%" fontFamily="inherit" fontSize="64" fontWeight="900" fill={theme.accent} textAnchor="middle" dy=".35em">{state.logoText}</text>
              </svg>
            )}
          </div>
        </div>
      </Sec>
      <Sec title={t("display_size_sec")} theme={theme}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10*z}}>
          {[ { id: 0.85, label: t("size_compact") }, { id: 1.0, label: t("size_standard") }, { id: 1.15, label: t("size_large") } ].map(l => {
            const active = (state.zoomLevel || 1.0) === l.id;
            return (
              <button key={l.id} onClick={()=>set({zoomLevel: l.id})}
                style={{background:theme.card, border:`2px solid ${active?theme.accent:theme.border}`, borderRadius:12*z, padding:"12px 8px", cursor:"pointer", color:theme.text}}>
                <div style={{fontSize:12*z, fontWeight:active?800:600, color:active?theme.accent:theme.sub}}>{l.label}</div>
              </button>
            )
          })}
        </div>
      </Sec>
      <Sec title={t("lang_sec")} theme={theme}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10*z}}>
          {[ { id: "en", label: "English" }, { id: "zh_tw", label: "繁體中文" }, { id: "zh_cn", label: "简体中文" } ].map(l => {
            const active = (state.langId || "en") === l.id;
            return (
              <button key={l.id} onClick={()=>set({langId: l.id})}
                style={{background:theme.card, border:`2px solid ${active?theme.accent:theme.border}`, borderRadius:12*z, padding:"12px 8px", cursor:"pointer", color:theme.text}}>
                <div style={{fontSize:12*z, fontWeight:active?800:600, color:active?theme.accent:theme.sub}}>{l.label}</div>
              </button>
            )
          })}
        </div>
      </Sec>
      <Sec title={t("typography_sec")} theme={theme}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10*z}}>
          {APP_FONTS.map(f=>{
            const active = (state.fontId || "sans") === f.id;
            return (
              <button key={f.id} onClick={()=>set({fontId:f.id})}
                style={{background:theme.bg,border:`2px solid ${active?theme.accent:theme.border}`,borderRadius:12*z,
                  padding:"12px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6*z,
                  outline:"none",transition:"border-color 0.15s", fontFamily: f.css}}>
                <div style={{fontSize:18*z,fontWeight:active?800:600,color:active?theme.accent:theme.text}}>Aa</div>
                <div style={{fontSize:11*z,color:theme.sub}}>{f.label}</div>
              </button>
            );
          })}
        </div>
      </Sec>
      <Sec title={t("bg_mode_sec")} theme={theme}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10*z}}>
          {APP_MODES.map(m=>{
            const active = (state.modeId || "dark") === m.id;
            return (
              <button key={m.id} onClick={()=>set(s=>({...s,modeId:m.id}))}
                style={{background:m.bg,border:`2px solid ${active?theme.accent:m.border}`,borderRadius:12*z,
                  padding:"12px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6*z,
                  outline:"none",transition:"border-color 0.15s"}}>
                <div style={{fontSize:12*z,fontWeight:active?800:600,color:active?theme.accent:m.text}}>{m.label}</div>
              </button>
            );
          })}
        </div>
      </Sec>
      <Sec title={t("accent_style_sec")} theme={theme}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(60px, 1fr))",gap:10*z}}>
          {APP_ACCENTS.map(a=>{
            const active = (state.accentId || "green") === a.id;
            return (
              <button key={a.id} onClick={()=>set(s=>({...s,accentId:a.id}))}
                style={{background:theme.card,border:`2px solid ${active?a.hex:theme.border}`,borderRadius:12*z,
                  padding:"10px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6*z,
                  outline:"none",transition:"border-color 0.15s"}}>
                <div style={{width:24*z,height:24*z,borderRadius:"50%",background:a.hex,boxShadow:active?`0 0 8px ${a.hex}`:""}}/>
                <div style={{fontSize:10*z,fontWeight:active?800:600,color:active?a.hex:theme.sub}}>{a.label}</div>
              </button>
            );
          })}
        </div>
      </Sec>
      <Sec title={t("backup_restore_sec")} theme={theme}>
        <p style={{fontSize:13*z,color:theme.sub,marginBottom:14*z}}>{t("backup_desc")}</p>
        <div style={{display:"flex", gap:10*z}}>
          <button style={{...S.btnPrimary, flex:1}} onClick={exportData}>{t("json_backup_btn")}</button>
          <button style={{...S.btnPrimary, flex:1, background:theme.card, color:theme.accent, border:`1px solid ${theme.accent}`}} onClick={exportCSV}>{t("csv_export_btn")}</button>
        </div>
        <div style={{marginTop:12*z}}>
          <button style={{...S.btnSecondary, width:"100%"}} onClick={()=>fileRef.current.click()}>{t("import_json_btn")}</button>
          <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={importData}/>
        </div>
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
        <div style={{fontSize:13*z,color:theme.sub,lineHeight:1.6}}>
          <div><strong style={{color:theme.text}}>PickleRank Modular v1.0.4</strong></div>
          <div style={{marginTop:8*z}}>{t("about_desc")}</div>
        </div>
      </Sec>
    </div>
  );
}