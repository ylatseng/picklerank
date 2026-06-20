import React, { useState, useRef } from 'react';
import { t, DEFAULT_RATING, genId, ratingColor, processImage } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, Avatar, ConfirmInline } from '../components/Shared.jsx';

export default function Players({players,state,set,nav,theme,isAdmin}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  
  const [name,setName]=useState("");
  const [singlesRating, setSinglesRating] = useState("");
  const [doublesRating, setDoublesRating] = useState("");
  
  const [err,setErr]=useState(""), [pendingRemove,setPendingRemove]=useState(null);
  
  // Edit State
  const [editingId,setEditingId]=useState(null);
  const [editName,setEditName]=useState("");
  const [editErr,setEditErr]=useState("");
  const [editSR, setEditSR] = useState("");
  const [editDR, setEditDR] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);
  
  const [avatarData, setAvatarData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null); // Ref for the edit mode image upload
  
  const favoredPlayerIds = state.favoredPlayerIds || [];

  function handleFileAdd(e) { if (e.target.files[0]) processImage(e.target.files[0], setAvatarData); }
  function handleEditFileAdd(e) { if (e.target.files[0]) processImage(e.target.files[0], setEditAvatar); }

  function add(){
    const tName=name.trim();
    if(!tName) return setErr(t("err_enter_name"));
    if(players.find(p=>p.name.toLowerCase()===tName.toLowerCase())) return setErr(t("err_exists"));
    
    const sR = parseFloat(singlesRating) || DEFAULT_RATING;
    const dR = parseFloat(doublesRating) || DEFAULT_RATING;
    
    set(s=>({...s, players:[...(s.players||[]), {
      id:genId(), name:tName, ratingSingles: sR, ratingDoubles: dR, baseRating: (sR + dR) / 2,
      duprImported: (singlesRating !== "" || doublesRating !== ""), joinedDate: new Date().toISOString(), avatar: avatarData
    }]}));
    
    setName(""); setSinglesRating(""); setDoublesRating(""); setAvatarData(null); setErr("");
  }

  function moveToTrash(player) {
    set(s => ({
      ...s,
      trash: [...(s.trash || []), { id: player.id, type: 'player', data: player, deletedAt: Date.now() }],
      players: s.players.filter(p => p.id !== player.id),
      favoredPlayerIds: (s.favoredPlayerIds || []).filter(fid => fid !== player.id)
    }));
    setPendingRemove(null);
  }

  function startEdit(p){
    setEditingId(p.id); 
    setEditName(p.name); 
    setEditSR((p.ratingSingles||3).toFixed(3)); 
    setEditDR((p.ratingDoubles||3).toFixed(3));
    setEditAvatar(p.avatar || null);
  }

  function saveEdit(id){
    const tName=editName.trim();
    if(!tName) return setEditErr(t("err_empty"));
    set(s=>({...s,players:(s.players||[]).map(p=>p.id===id?{
        ...p, name:tName, ratingSingles: parseFloat(editSR)||3, ratingDoubles: parseFloat(editDR)||3, avatar: editAvatar
    }:p)}));
    setEditingId(null);
  }

  function toggleFavorited(id) {
     set(s => {
       const favs = s.favoredPlayerIds || [];
       const nextFavs = favs.includes(id) ? favs.filter(fId => fId !== id) : [...favs, id];
       return {...s, favoredPlayerIds: nextFavs};
     });
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
      <Sec title={t("add_player_sec")} theme={theme}>
        <div style={{display:"flex", gap:12*z, marginBottom:10*z}}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6*z, width: 60*z}}>
             {avatarData ? <img src={avatarData} style={{width:50*z, height:50*z, borderRadius:"50%", objectFit:"cover"}} /> : <div style={{width:50*z, height:50*z, borderRadius:"50%", background:theme.nav, border:`1px dashed ${theme.sub}`, display:"flex", alignItems:"center", justifyContent:"center", color:theme.sub}}>📷</div>}
             <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => fileInputRef.current.click()}>{t("photo")}</button>
             <input type="file" accept="image/*" ref={fileInputRef} className="file-input-hidden" onChange={handleFileAdd} />
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>{t("name_lbl")}</label>
            <input style={{...S.input,marginBottom:10*z}} placeholder="e.g. Alex Smith" value={name} onChange={e=>setName(e.target.value)}/>
          </div>
        </div>
        <div style={{display:"flex", gap:12*z, marginBottom:12*z}}>
          <div style={{flex:1}}><label style={S.label}>{t("singles_rating")}</label><input style={S.input} type="number" value={singlesRating} onChange={e=>setSinglesRating(e.target.value)} /></div>
          <div style={{flex:1}}><label style={S.label}>{t("doubles_rating")}</label><input style={S.input} type="number" value={doublesRating} onChange={e=>setDoublesRating(e.target.value)} /></div>
        </div>
        <button style={{...S.btnPrimary,width:"100%"}} onClick={add}>{t("add_player_btn")}</button>
      </Sec>

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
              {t("sort_by") || "Sort by:"}
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
                       <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => editFileInputRef.current.click()}>{t("change_photo") || "Change"}</button>
                       <input type="file" accept="image/*" ref={editFileInputRef} className="file-input-hidden" onChange={handleEditFileAdd} />
                    </div>
                    <div style={{flex:1}}>
                      <label style={S.label}>{t("name_lbl")}</label>
                      <input style={{...S.input, marginBottom: 10*z}} value={editName} onChange={e=>setEditName(e.target.value)}/>
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
                <div style={{...S.lbRow,cursor:"pointer"}} onClick={()=>nav("profile",{profileId:p.id})}>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorited(p.id); }} style={{marginRight: 2*z, border:0, background: 'transparent'}}>{favoredPlayerIds.includes(p.id) ? "⭐" : "☆"}</button>
                  <Avatar name={p.name} url={p.avatar} size={38}/>
                  <div style={S.lbInfo}>
                    <div style={{display:"flex",alignItems:"center",gap:6*z}}>
                      <span style={S.lbName}>{p.name}</span>
                      {p.duprImported && <span style={{ background: "rgba(64, 160, 224, 0.15)", color: "#40a0e0", padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: 800 }}>D</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8*z}}>
                    <div style={{display:"flex",flexDirection:"column",gap:4*z,alignItems:"flex-end"}}>
                      <span style={{fontSize:10*z, fontWeight:800, color:"#111", background:ratingColor(p.ratingDoubles), borderRadius:4*z, padding:"2px 6px"}}>D: {(p.ratingDoubles||3).toFixed(2)}</span>
                      <span style={{fontSize:10*z, fontWeight:800, color:"#111", background:ratingColor(p.ratingSingles), borderRadius:4*z, padding:"2px 6px"}}>S: {(p.ratingSingles||3).toFixed(2)}</span>
                    </div>
                    <button style={{...S.btnSecondary,marginTop:0,padding:"5px 9px",fontSize:12*z}} onClick={e=>{e.stopPropagation();startEdit(p);}}>✏️</button>
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
    </div>
  );
}