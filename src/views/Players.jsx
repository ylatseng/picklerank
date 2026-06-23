import React, { useState, useRef } from 'react';
import { t, DEFAULT_RATING, genId, ratingColor, processImage } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, Avatar, ConfirmInline } from '../components/Shared.jsx';

export default function Players({players,state,set,nav,theme,isAdmin,user,setUser}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  
  // Accordion State: Open by default ONLY if the user is in the forced setup mode
  const [showAdd, setShowAdd] = useState(!!user?.pendingAutoLink);

  const [name,setName]=useState("");
  const [singlesRating, setSinglesRating] = useState("");
  const [doublesRating, setDoublesRating] = useState("");
  const [notes, setNotes] = useState(""); 
  const [pin, setPin] = useState(""); 
  
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
  const [sortBy, setSortBy] = useState("rating");
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null); 
  
  // ── Starred players: per-player, keyed by myPlayerId ─────────────────────
  // Stars must be indexed by the logged-in player's ID (not just per-device),
  // because multiple people share the same phone. If Allen logs in as Lily
  // and Lily stars Michael, that should be stored under Lily's ID — not bleed
  // into Allen's list when he switches back.
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
    
    setName(""); setSinglesRating(""); setDoublesRating(""); setAvatarData(null); setNotes(""); setPin(""); setErr("");
    
    // Automatically close the accordion after successfully adding a player
    if (!user?.pendingAutoLink) {
      setShowAdd(false);
    }
  }

  function moveToTrash(player) {
    // Only keep raw player fields in trash — not computed stats (gamesPlayed, wins, etc.)
    // that are re-derived on every replay. The critical field is `id`: because every
    // match stores player IDs in its teams array, restoring the same id automatically
    // reconnects ALL match history, ratings, and stats.
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
    // Remove from this user's private star list (keyed by player ID)
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
    set(s=>({...s,players:(s.players||[]).map(p=>p.id===id?{
        ...p, name:tName, ratingSingles: parseFloat(editSR)||3, ratingDoubles: parseFloat(editDR)||3, avatar: editAvatar, notes: editNotes.trim(), pin: editPIN
    }:p)}));
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
      
      {/* Streamlined Accordion Toggle */}
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
               <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => fileInputRef.current.click()}>{t("photo")}</button>
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
          <div style={{display:"flex", gap:12*z, marginBottom:12*z}}>
            <div style={{flex:1}}><label style={S.label}>{t("singles_rating")}</label><input style={S.input} type="number" value={singlesRating} onChange={e=>setSinglesRating(e.target.value)} /></div>
            <div style={{flex:1}}><label style={S.label}>{t("doubles_rating")}</label><input style={S.input} type="number" value={doublesRating} onChange={e=>setDoublesRating(e.target.value)} /></div>
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
      
      {/* Roster Section - Hidden during user setup flow */}
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
                    { value: 'rating', label: t("sort_rating") },
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
                    
                    {/* EDIT PROFILE PICTURE AND NAME */}
                    <div style={{display:"flex", gap:12*z, marginBottom:10*z}}>
                      <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6*z, width: 60*z}}>
                         {editAvatar ? <img src={editAvatar} style={{width:50*z, height:50*z, borderRadius:"50%", objectFit:"cover"}} /> : <div style={{width:50*z, height:50*z, borderRadius:"50%", background:theme.nav, border:`1px dashed ${theme.sub}`, display:"flex", alignItems:"center", justifyContent:"center", color:theme.sub}}>📷</div>}
                         <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => editFileInputRef.current.click()}>{t("change_photo")}</button>
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

                    {/* EDIT RATINGS */}
                    <div style={{display:"flex", gap:10*z}}>
                       <div style={{flex:1}}><label style={S.label}>{t("singles_rating")}</label><input style={S.input} type="number" value={editSR} onChange={e=>setEditSR(e.target.value)}/></div>
                       <div style={{flex:1}}><label style={S.label}>{t("doubles_rating")}</label><input style={S.input} type="number" value={editDR} onChange={e=>setEditDR(e.target.value)}/></div>
                    </div>

                    <div style={{display:"flex", gap:8*z, justifyContent:"flex-end", marginTop:10*z}}>
                      <button style={S.btnSecondary} onClick={()=>setEditingId(null)}>{t("cancel")}</button>
                      <button style={S.btnPrimary} onClick={()=>saveEdit(p.id)}>{t("save")}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{...S.lbRow,cursor:"pointer", display:"flex", alignItems:"center"}} onClick={()=>nav("profile",{profileId:p.id})}>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorited(p.id); }} style={{marginRight: 2*z, border:0, background: 'transparent'}}>{favoredPlayerIds.includes(p.id) ? "⭐" : "☆"}</button>
                    <Avatar name={p.name} url={p.avatar} size={38}/>
                    <div style={S.lbInfo}>
                      <div style={{display:"flex",alignItems:"center",gap:6*z}}>
                        <span style={S.lbName}>{p.name}</span>
                        {isOnline(p.id) && <span style={{width: 8*z, height: 8*z, borderRadius: "50%", background: "#50c878", boxShadow: "0 0 5px #50c878", display: "inline-block"}} title="Online Now"></span>}
                        {p.duprImported && <span style={{ background: "rgba(64, 160, 224, 0.15)", color: "#40a0e0", padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: 800 }}>D</span>}
                        {p.pin && <span style={{fontSize: 10*z}} title="Secured Account">🔒</span>}
                      </div>
                      {/* FIX 4: Show games played + W/L record directly on the roster card */}
                      <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>
                        {(p.gamesPlayed||0)}G · {(p.wins||0)}W {(p.losses||0)}L
                      </div>
                      {p.notes && (
                        <div style={{fontSize: 11*z, color: theme.sub, marginTop: 4*z, display: 'flex', alignItems: 'center', gap: 4*z}}>
                          <span>📝</span> <span style={{fontStyle: 'italic'}}>{p.notes}</span>
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8*z}}>
                      <div style={{display:"flex",flexDirection:"column",gap:4*z,alignItems:"flex-end"}}>
                        <span style={{fontSize:10*z, fontWeight:800, color:"#111", background:ratingColor(p.ratingDoubles), borderRadius:4*z, padding:"2px 6px"}}>D: {(p.ratingDoubles||3).toFixed(2)}</span>
                        <span style={{fontSize:10*z, fontWeight:800, color:"#111", background:ratingColor(p.ratingSingles), borderRadius:4*z, padding:"2px 6px"}}>S: {(p.ratingSingles||3).toFixed(2)}</span>
                      </div>
                      
                      {(isAdmin || user?.myPlayerId === p.id) && (
                        <button style={{...S.btnSecondary,marginTop:0,padding:"5px 9px",fontSize:12*z}} onClick={e=>{e.stopPropagation();startEdit(p);}}>✏️</button>
                      )}
                      
                      {isAdmin && <button style={S.btnDanger} onClick={e=>{e.stopPropagation();setPendingRemove(p.id);}}>✕</button>}
                    </div>
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