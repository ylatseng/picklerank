import React, { useState, useRef } from 'react';
import { t, DEFAULT_RATING, genId, ratingColor, processImage, shortName, isLargeZoom } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, Avatar, ConfirmInline, usePersistentFormState } from '../components/Shared.jsx';

export default function Players({players,state,set,nav,theme,isAdmin,user,setUser}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  
  // Accordion State: Open by default ONLY if the user is in the forced setup mode
  const [showAdd, setShowAdd] = useState(!!user?.pendingAutoLink);

  // Persisted draft for new-player form — survives accidental navigation away.
  const [name,setName,clearName]=usePersistentFormState("player:name", "");
  const [singlesRating, setSinglesRating, clearSR] = usePersistentFormState("player:sr", "");
  const [doublesRating, setDoublesRating, clearDR] = usePersistentFormState("player:dr", "");
  const [notes, setNotes, clearNotes] = usePersistentFormState("player:notes", ""); 
  const [pin, setPin, clearPin] = usePersistentFormState("player:pin", ""); 
  
  const [err,setErr]=useState(""), [pendingRemove,setPendingRemove]=useState(null);
  
  // Edit State
  const [editingId,setEditingId]=useState(null);
  const [editName,setEditName]=useState("");
  const [editSR, setEditSR] = useState("");
  const [editDR, setEditDR] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);
  const [editNotes, setEditNotes] = useState(""); 
  const [editPIN, setEditPIN] = useState(""); 
  
  const [avatarData, setAvatarData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("starred");
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null); 
  
  // ── Starred players: per-player, keyed by myPlayerId ─────────────────────
  const starKey = user?.isAdmin ? '__admin__' : (user?.myPlayerId || '__guest__');
  const favoredPlayerIds = (user?.starredPlayers || {})[starKey] || [];

  function toggleFavorited(id) {
    const key = starKey;
    const favs = (user?.starredPlayers || {})[key] || [];
    const nextFavs = favs.includes(id) ? favs.filter(fId => fId !== id) : [...favs, id];
    setUser(prev => ({
      ...prev,
      starredPlayers: { ...(prev.starredPlayers || {}), [key]: nextFavs }
    }));
  }

  const isOnline = (pid) => {
    const lastSeen = (state.presence || {})[pid];
    if (!lastSeen) return false;
    return (Date.now() - lastSeen) < 90000;
  };

  function add(){
    const tName=name.trim();
    if(!tName) return setErr(t("err_enter_name"));
    if(players.find(p=>p.name.toLowerCase()===tName.toLowerCase())) return setErr(t("err_exists"));
    if(pin.length !== 4) return setErr("Please enter a 4-digit PIN for security."); 
    
    const sR = parseFloat(singlesRating) || DEFAULT_RATING;
    const dR = parseFloat(doublesRating) || DEFAULT_RATING;
    const newId = genId(); 
    
    set(s=>({...s, players:[...(s.players||[]), {
      id:newId, name:tName, ratingSingles: sR, ratingDoubles: dR, baseRating: (sR + dR) / 2,
      duprImported: (singlesRating !== "" || doublesRating !== ""), joinedDate: new Date().toISOString(), avatar: avatarData,
      notes: notes.trim(), pin: pin
    }]}));

    if (user?.pendingAutoLink && setUser) {
       setUser({ myPlayerId: newId, pendingAutoLink: false, verifiedHash: btoa(newId + "-" + pin) });
    }
    
    clearName(); clearSR(); clearDR(); setAvatarData(null); clearNotes(); clearPin(); setErr("");
    
    if (!user?.pendingAutoLink) {
      setShowAdd(false);
    }
  }

  function moveToTrash(player) {
    const rawPlayer = {
      id:            player.id,
      name:          player.name,
      ratingSingles: player.ratingSingles,
      ratingDoubles: player.ratingDoubles,
      baseRating:    player.baseRating,
      duprImported:  player.duprImported,
      joinedDate:    player.joinedDate,
      avatar:        player.avatar,
      notes:         player.notes,
      pin:           player.pin,
    };
    set(s => ({
      ...s,
      trash: [...(s.trash || []), { id: player.id, type: 'player', data: rawPlayer, deletedAt: Date.now() }],
      players: s.players.filter(p => p.id !== player.id)
    }));
    if (setUser) setUser(prev => {
      const key = prev?.isAdmin ? '__admin__' : (prev?.myPlayerId || '__guest__');
      const starred = prev?.starredPlayers || {};
      return { ...prev, starredPlayers: { ...starred, [key]: (starred[key] || []).filter(fid => fid !== player.id) } };
    });
    setPendingRemove(null);
  }

  function handleFileAdd(e) { if (e.target.files[0]) processImage(e.target.files[0], setAvatarData); }
  function handleEditFileAdd(e) { if (e.target.files[0]) processImage(e.target.files[0], setEditAvatar); }

  function startEdit(p){
    setEditingId(p.id); 
    setEditName(p.name); 
    setEditSR((p.ratingSingles||3).toFixed(3)); 
    setEditDR((p.ratingDoubles||3).toFixed(3));
    setEditAvatar(p.avatar || null);
    setEditNotes(p.notes || "");
    setEditPIN(p.pin || "");
  }

  function saveEdit(id){
    const tName=editName.trim();
    if(!tName) return;
    set(s=>({...s,players:(s.players||[]).map(p=>{
      if(p.id!==id) return p;
      const base = { ...p, name:tName, avatar: editAvatar, notes: editNotes.trim() };
      if (isAdmin) {
        return { ...base,
          ratingSingles: parseFloat(editSR) || p.ratingSingles || 3,
          ratingDoubles: parseFloat(editDR) || p.ratingDoubles || 3,
          pin: editPIN
        };
      }
      return base;
    })}));
    setEditingId(null);
  }

  let displayedPlayers = [...players];
  if(searchQuery) displayedPlayers = displayedPlayers.filter(p => (p.name||"").toLowerCase().includes(searchQuery.toLowerCase()));
  
  displayedPlayers.sort((a,b) => {
    if(sortBy === 'starred') {
      const favA = favoredPlayerIds.includes(a.id) ? 1 : 0;
      const favB = favoredPlayerIds.includes(b.id) ? 1 : 0;
      return favB - favA || (a.name||"").localeCompare(b.name||"");
    }
    if(sortBy === 'rating') return Math.max(b.ratingDoubles||0, b.ratingSingles||0) - Math.max(a.ratingDoubles||0, a.ratingSingles||0);
    if(sortBy === 'games') return (b.gamesPlayed||0) - (a.gamesPlayed||0);
    return (a.name||"").localeCompare(b.name||"");
  });

  return (
    <div style={S.view}>
      
      {!showAdd ? (
        <button 
          style={{...S.btnSecondary, width:"100%", marginBottom: 16*z, padding: "12px 0", fontWeight: "bold", border: `1px dashed ${theme.accent}`, color: theme.accent}} 
          onClick={() => setShowAdd(true)}
        >
          {t("add_new_player_btn")}
        </button>
      ) : (
        <Sec title={t("add_player_sec")} theme={theme}>
          
          {user?.pendingAutoLink && (
            <div style={{background: "rgba(80,200,120,0.15)", color: "#50c878", padding: 12*z, borderRadius: 8*z, marginBottom: 16*z, fontSize: 13*z, fontWeight: "bold", border: `1px solid rgba(80,200,120,0.3)`}}>
              {t("welcome_setup_desc")}
            </div>
          )}

          {err && <div style={{marginBottom: 10*z}}><Err msg={err} theme={theme} /></div>}

          <div style={{display:"flex", gap:12*z, marginBottom:10*z}}>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6*z, width: 60*z}}>
               {avatarData ? <img src={avatarData} style={{width:50*z, height:50*z, borderRadius:"50%", objectFit:"cover"}} /> : <div style={{width:50*z, height:50*z, borderRadius:"50%", background:theme.nav, border:`1px dashed ${theme.sub}`, display:"flex", alignItems:"center", justifyContent:"center", color:theme.sub}}>📷</div>}
               <div style={{display:"flex", gap:4*z}}>
                 <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => fileInputRef.current.click()}>{t("change_photo")}</button>
                 {avatarData && (
                   <button style={{...S.btnDanger, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => setAvatarData(null)}>✕</button>
                 )}
               </div>
               <input type="file" accept="image/*" ref={fileInputRef} className="file-input-hidden" onChange={handleFileAdd} />
            </div>
            <div style={{flex:1}}>
              <label style={S.label}>{t("name_lbl")}</label>
              <input style={{...S.input,marginBottom:10*z}} placeholder="e.g. Alex Smith" value={name} onChange={e=>setName(e.target.value)}/>
              <label style={S.label}>{t("notes_optional")}</label>
              <input style={{...S.input,marginBottom:10*z}} placeholder={t("paddle_playstyle_hint")} value={notes} onChange={e=>setNotes(e.target.value)}/>
              <label style={S.label}>{t("security_pin_lbl")}</label>
              <input style={S.input} type="password" maxLength="4" placeholder={t("pin_placeholder")} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/>
            </div>
          </div>
          <div style={{display:"flex", gap:12*z, marginBottom:4*z}}>
            <div style={{flex:1}}>
              <label style={S.label}>{t("singles_rating")}</label>
              <input style={S.input} type="number" value={singlesRating} onChange={e=>setSinglesRating(e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <label style={S.label}>{t("doubles_rating")}</label>
              <input style={S.input} type="number" value={doublesRating} onChange={e=>setDoublesRating(e.target.value)} />
            </div>
          </div>
          <div style={{fontSize:11*z, color:theme.sub, marginBottom:12*z, textAlign:"center"}}>
            {t("rating_skip_hint")||"Skip if unsure — defaults to 3.000"}
          </div>
          
          <div style={{display: "flex", gap: 8*z}}>
            {!user?.pendingAutoLink && (
              <button style={{...S.btnSecondary, flex: 1}} onClick={() => { setShowAdd(false); setErr(""); }}>
                {t("cancel")}
              </button>
            )}
            <button style={{...S.btnPrimary, flex: user?.pendingAutoLink ? "1 1 100%" : 2}} onClick={add}>
              {t("add_player_btn")}
            </button>
          </div>
        </Sec>
      )}
      
      {!user?.pendingAutoLink && (
        <Sec title={`${t("roster_lbl")} (${players.length})`} theme={theme}>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12*z, marginBottom: 16*z, paddingBottom: 16*z, borderBottom: `1px solid ${theme.border}`, alignItems: "center" }}>
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <span style={{ position: "absolute", left: 10*z, top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: 14*z }}>🔍</span>
              <input 
                style={{ ...S.input, margin: 0, paddingLeft: 32*z }} 
                placeholder={t("search_players_placeholder")} 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8*z, flex: "1 1 180px" }}>
              <span style={{ ...S.label, margin: 0, whiteSpace: "nowrap", color: theme.sub, fontSize: 13*z }}>
                {t("sort_by")}
              </span>
              <div style={{ flex: 1 }}>
                <Sel 
                  opts={[
                    { value: 'starred', label: t("sort_starred") },
                    { value: 'games', label: t("sort_games") },
                    { value: 'name', label: t("sort_fn") }
                  ]} 
                  value={sortBy} 
                  onChange={setSortBy} 
                  theme={theme} 
                />
              </div>
            </div>
          </div>

          {displayedPlayers.length === 0 ? <Empty text={t("no_players")} theme={theme} /> : 
            displayedPlayers.map(p=>(
              <div key={p.id}>
                {editingId===p.id ? (
                  <div style={{padding:"10px 0",borderBottom:`1px solid ${theme.border}`}}>
                    
                    <div style={{display:"flex", gap:12*z, marginBottom:10*z}}>
                      <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6*z, width: 60*z}}>
                         {editAvatar ? <img src={editAvatar} style={{width:50*z, height:50*z, borderRadius:"50%", objectFit:"cover"}} /> : <div style={{width:50*z, height:50*z, borderRadius:"50%", background:theme.nav, border:`1px dashed ${theme.sub}`, display:"flex", alignItems:"center", justifyContent:"center", color:theme.sub}}>📷</div>}
                         <div style={{display:"flex", gap:4*z}}>
                           <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => editFileInputRef.current.click()}>{t("change_photo")}</button>
                           {editAvatar && (
                             <button style={{...S.btnDanger, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => setEditAvatar(null)}>✕</button>
                           )}
                         </div>
                         <input type="file" accept="image/*" ref={editFileInputRef} className="file-input-hidden" onChange={handleEditFileAdd} />
                      </div>
                      <div style={{flex:1}}>
                        <label style={S.label}>{t("name_lbl")}</label>
                        <input style={{...S.input, marginBottom: 10*z}} value={editName} onChange={e=>setEditName(e.target.value)}/>
                        <label style={S.label}>{t("notes_lbl")}</label>
                        <input style={{...S.input, marginBottom: 10*z}} placeholder={t("player_notes_placeholder")} value={editNotes} onChange={e=>setEditNotes(e.target.value)}/>
                        
                        {isAdmin && (
                          <>
                            <label style={S.label}>{t("security_pin_lbl")}</label>
                            <input style={S.input} type="text" maxLength="4" placeholder={t("pin_placeholder")} value={editPIN} onChange={e=>setEditPIN(e.target.value.replace(/\D/g,''))}/>
                          </>
                        )}
                      </div>
                    </div>

                    {isAdmin ? (
                      <div style={{display:"flex", gap:10*z}}>
                         <div style={{flex:1}}><label style={S.label}>{t("singles_rating")}</label><input style={S.input} type="number" value={editSR} onChange={e=>setEditSR(e.target.value)}/></div>
                         <div style={{flex:1}}><label style={S.label}>{t("doubles_rating")}</label><input style={S.input} type="number" value={editDR} onChange={e=>setEditDR(e.target.value)}/></div>
                      </div>
                    ) : (
                      <div style={{display:"flex", gap:10*z}}>
                        <div style={{flex:1}}>
                          <label style={S.label}>{t("singles_rating")}</label>
                          <div style={{...S.input, opacity:0.6, display:"flex", alignItems:"center"}}>{(p.ratingSingles||3).toFixed(3)} 🔒</div>
                        </div>
                        <div style={{flex:1}}>
                          <label style={S.label}>{t("doubles_rating")}</label>
                          <div style={{...S.input, opacity:0.6, display:"flex", alignItems:"center"}}>{(p.ratingDoubles||3).toFixed(3)} 🔒</div>
                        </div>
                      </div>
                    )}

                    <div style={{display:"flex", gap:8*z, justifyContent:"flex-end", marginTop:10*z}}>
                      <button style={S.btnSecondary} onClick={()=>setEditingId(null)}>{t("cancel")}</button>
                      <button style={S.btnPrimary} onClick={()=>saveEdit(p.id)}>{t("save")}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{...S.lbRow,cursor:"pointer", display:"flex", alignItems:"center", minWidth:0}} onClick={()=>nav("profile",{profileId:p.id})}>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorited(p.id); }} style={{marginRight: 2*z, border:0, background: 'transparent', cursor: 'pointer', flexShrink:0}}>
                      <span style={{ 
                        color: favoredPlayerIds.includes(p.id) ? "#f0c040" : theme.sub, 
                        fontSize: 16*z,
                        opacity: favoredPlayerIds.includes(p.id) ? 1 : 0.4}}>
                        ★
                      </span>
                    </button>
                    <div style={{flexShrink:0}}><Avatar name={p.name} url={p.avatar} size={38}/></div>
                    <div style={{...S.lbInfo, minWidth:0, overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6*z, flexWrap:"wrap"}}>
                        <span style={{...S.lbName, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%"}} title={p.name}>
                          {shortName(p.name, isLargeZoom(z) ? "always" : "auto")}
                        </span>
                        {/* C/P: Provisional if either singles or doubles is under 5 matches separately.
                            A player with 4S + 4D = 8 total is still provisional in each format. */}
                        {(() => {
                          const doublesOk = (p.doublesPlayed || 0) >= 5;
                          const singlesOk = (p.singlesPlayed || 0) >= 5;
                          // Show C only if they're certified in at least the format they play most
                          const isProv = !doublesOk && !singlesOk;
                          const isMixed = doublesOk !== singlesOk; // one cert, one not
                          const label = isProv ? "P" : isMixed ? "P/C" : "C";
                          const bg = isProv ? "rgba(245,158,11,0.12)" : isMixed ? "rgba(100,150,255,0.12)" : "rgba(80,200,120,0.12)";
                          const color = isProv ? "#f59e0b" : isMixed ? "#6496ff" : "#50c878";
                          const tip = isProv ? "Provisional (both formats under 5 matches)"
                            : isMixed ? `Doubles: ${doublesOk?"✓":"P"} · Singles: ${singlesOk?"✓":"P"}`
                            : "Certified (5+ matches in both formats)";
                          return (
                            <span style={{fontSize:9*z, padding:"1px 4px", borderRadius:4, background:bg, color, fontWeight:700, flexShrink:0}}
                              title={tip}>
                              {label}
                            </span>
                          );
                        })()}
                        {isOnline(p.id) && <span style={{width: 8*z, height: 8*z, borderRadius: "50%", background: "#50c878", boxShadow: "0 0 5px #50c878", display: "inline-block", flexShrink:0}} title="Online Now"></span>}
                        {p.duprImported && <span style={{ background: "rgba(64, 160, 224, 0.15)", color: "#40a0e0", padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: 800, flexShrink:0 }}>D</span>}
                        {p.pin && <span style={{fontSize: 10*z, flexShrink:0}} title="Secured Account">🔒</span>}
                        {(isAdmin || user?.myPlayerId === p.id) && (
                          <button 
                            style={{background: "transparent", border: "none", padding: "0 4px", fontSize: 12*z, cursor: "pointer", opacity: 0.6, flexShrink:0}} 
                            onClick={e=>{e.stopPropagation();startEdit(p);}}
                            title="Edit Profile"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                      {p.notes && (
                        <div style={{fontSize: 11*z, color: theme.sub, marginTop: 4*z, display: 'flex', alignItems: 'center', gap: 4*z, overflow:"hidden"}}>
                          <span style={{flexShrink:0}}>📝</span> <span style={{fontStyle: 'italic', overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.notes}</span>
                        </div>
                      )}
                      {isAdmin && p.lastLoginAt && (
                        <div style={{fontSize: 10*z, color: theme.sub, marginTop: 3*z, opacity: 0.7}}>
                          🕐 Last login: {new Date(p.lastLoginAt).toLocaleString([], {month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                          {p.loginHistory?.length > 1 && ` (${p.loginHistory.length} total)`}
                        </div>
                      )}
                    </div>
                    
                    {/* Right column — only delete button now (admin only) */}
                    {isAdmin && (
                      <div style={{display:"flex", alignItems:"center", justifyContent: "flex-end", flexShrink:0, marginLeft: 8*z}}>
                        <button style={S.btnDanger} onClick={e=>{e.stopPropagation();setPendingRemove(p.id);}}>✕</button>
                      </div>
                    )}
                    
                  </div>
                )}
                {pendingRemove===p.id&&(
                  <ConfirmInline msg={t("remove_player_q")} note={t("match_history_stays")}
                    onConfirm={()=>moveToTrash(p)} onCancel={()=>setPendingRemove(null)} theme={theme}/>
                )}
              </div>
            ))
          }
        </Sec>
      )}
    </div>
  );
}