import React, { useState, useRef } from 'react';
import { t, DEFAULT_RATING, genId, ratingColor, ratingLabel, processImage } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, Avatar, ConfirmInline } from '../components/Shared.jsx';

export default function Players({players,state,set,nav,theme,isAdmin}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [name,setName]=useState(""), [startRating,setStartRating]=useState("");
  const [err,setErr]=useState(""), [pendingRemove,setPendingRemove]=useState(null);
  const [editingId,setEditingId]=useState(null), [editName,setEditName]=useState(""), [editErr,setEditErr]=useState("");
  const [avatarData, setAvatarData] = useState(null);
  const [editAvatarData, setEditAvatarData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const favoredPlayerIds = state.favoredPlayerIds || [];

  const parsedRating=parseFloat(startRating);
  const ratingValid=startRating===""||(!isNaN(parsedRating)&&parsedRating>=1.5&&parsedRating<=6.5);
  const previewRating=(!isNaN(parsedRating)&&parsedRating>=1.5&&parsedRating<=6.5)?parsedRating:null;

  function handleFileAdd(e) { if (e.target.files[0]) processImage(e.target.files[0], setAvatarData); }
  function handleFileEdit(e) { if (e.target.files[0]) processImage(e.target.files[0], setEditAvatarData); }

  function add(){
    const tName=name.trim();
    if(!tName) return setErr(t("err_enter_name"));
    if(players.find(p=>p.name.toLowerCase()===tName.toLowerCase())) return setErr(t("err_exists"));
    if(startRating!==""&&!ratingValid) return setErr(t("rating_range_hint"));
    const base=previewRating??DEFAULT_RATING, now=new Date().toISOString();
    
    set(s=>({...s,players:[...(s.players||[]),{
      id:genId(), name:tName, baseRating:base, duprImported:previewRating!==null, joinedDate:now, avatar:avatarData
    }]}));
    setName(""); setStartRating(""); setErr(""); setAvatarData(null);
  }

  function remove(id){
    set(s=>({...s,players:(s.players||[]).filter(p=>p.id!==id), favoredPlayerIds: (s.favoredPlayerIds||[]).filter(fid=>fid!==id)}));
    setPendingRemove(null);
  }

  function startEdit(p){
    setEditingId(p.id); setEditName(p.name); setEditAvatarData(p.avatar || null); setEditErr("");
  }

  function saveEdit(id){
    const tName=editName.trim();
    if(!tName) return setEditErr(t("err_empty"));
    if(players.find(p=>p.id!==id&&p.name.toLowerCase()===tName.toLowerCase())) return setEditErr(t("err_taken"));
    set(s=>({...s,players:(s.players||[]).map(p=>p.id===id?{...p,name:tName,avatar:editAvatarData}:p)}));
    setEditingId(null); setEditErr("");
  }

  function toggleFavorited(id) {
     set(s => {
       const favs = s.favoredPlayerIds || [];
       const nextFavs = favs.includes(id) ? favs.filter(fId => fId !== id) : [...favs, id];
       return {...s, favoredPlayerIds: nextFavs};
     });
  }

  let displayedPlayers = [...players];
  if(searchQuery) {
    displayedPlayers = displayedPlayers.filter(p => (p.name||"").toLowerCase().includes(searchQuery.toLowerCase()));
  }
  displayedPlayers.sort((a,b) => {
    if(sortBy === 'starred') {
      const favA = favoredPlayerIds.includes(a.id) ? 1 : 0;
      const favB = favoredPlayerIds.includes(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return (a.name||"").localeCompare(b.name||"");
    }
    if(sortBy === 'rating') return Math.max(b.ratingDoubles||0, b.ratingSingles||0) - Math.max(a.ratingDoubles||0, a.ratingSingles||0);
    if(sortBy === 'games') return (b.gamesPlayed||0) - (a.gamesPlayed||0);
    if(sortBy === 'fn') return (a.name||"").localeCompare(b.name||"");
    if(sortBy === 'ln') {
      const lnA = (a.name||"").split(' ').pop();
      const lnB = (b.name||"").split(' ').pop();
      return lnA.localeCompare(lnB);
    }
    return 0;
  });

  return (
    <div style={S.view}>
      <Sec title={t("add_player_sec")} theme={theme}>
        <div style={{display:"flex", gap:12*z, marginBottom:10*z}}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6*z, width: 60*z}}>
             {avatarData ? (
               <img src={avatarData} style={{width:50*z, height:50*z, borderRadius:"50%", objectFit:"cover"}} />
             ) : (
               <div style={{width:50*z, height:50*z, borderRadius:"50%", background:theme.nav, border:`1px dashed ${theme.sub}`, display:"flex", alignItems:"center", justifyContent:"center", color:theme.sub}}>📷</div>
             )}
             <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => fileInputRef.current.click()}>{t("photo")}</button>
             <input type="file" accept="image/*" ref={fileInputRef} className="file-input-hidden" onChange={handleFileAdd} />
          </div>
          
          <div style={{flex:1}}>
            <label style={S.label}>{t("name_lbl")}</label>
            <input style={{...S.input,marginBottom:10*z}} placeholder="e.g. Alex Smith" value={name}
              onChange={e=>{setName(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&add()}/>
          </div>
        </div>

        <label style={S.label}>{t("starting_rating")} <span style={{color:theme.sub}}>{t("optional_dupr")}</span></label>
        <div style={{position:"relative"}}>
          <input style={{...S.input,paddingRight:previewRating?110*z:12*z,
            borderColor:!ratingValid?"#5a2020":startRating?theme.accent:theme.border}}
            placeholder={`Default: ${DEFAULT_RATING.toFixed(3)}`} value={startRating} type="number"
            min="1.5" max="6.5" step="0.001" onChange={e=>{setStartRating(e.target.value);setErr("");}}/>
          {previewRating&&(
            <div style={{position:"absolute",right:10*z,top:"50%",transform:"translateY(-50%)",display:"flex",alignItems:"center",gap:6*z,pointerEvents:"none"}}>
              <div style={{...S.badge,background:ratingColor(previewRating),fontSize:11*z,padding:"2px 8px"}}>{previewRating.toFixed(3)}</div>
              <span style={{fontSize:10*z,color:ratingColor(previewRating),fontWeight:700}}>{t(ratingLabel(previewRating))}</span>
            </div>
          )}
        </div>
        {!ratingValid&&<div style={{fontSize:11*z,color:"#e05050",marginTop:4}}>{t("rating_range_hint")}</div>}
        <div style={{fontSize:11*z,color:theme.sub,marginTop:8*z,marginBottom:12*z,lineHeight:1.5}}>{t("dupr_tiers_hint")}</div>
        {err&&<Err msg={err} theme={theme}/>}
        <button style={{...S.btnPrimary,width:"100%",marginTop:4}} onClick={add}>{t("add_player_btn")}</button>
      </Sec>

      <Sec title={`${t("roster_lbl")} (${players.length})`} theme={theme}>
        <div style={{display:"flex", gap:10*z, marginBottom: 16*z}}>
          <input style={{...S.input, flex:2}} placeholder={t("search_players_placeholder")} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
          <div style={{flex:1}}>
            <Sel opts={[{value:"starred", label:t("sort_starred")}, {value:"rating", label:t("sort_rating")}, {value:"fn", label:t("sort_fn")}, {value:"ln", label:t("sort_ln")}, {value:"games", label:t("sort_games")}]} 
                 value={sortBy} onChange={setSortBy} placeholder={t("sort_by")} theme={theme} />
          </div>
        </div>

        {displayedPlayers.length===0
          ? <Empty text={t("no_players")} theme={theme}/>
          : displayedPlayers.map(p=>(
            <div key={p.id}>
              {editingId===p.id ? (
                <div style={{padding:"10px 0",borderBottom:`1px solid ${theme.border}`}}>
                  <div style={{fontSize:12*z,color:theme.sub,marginBottom:6*z}}>{t("edit_details")}</div>
                  
                  <div style={{display:"flex", gap:10*z, marginBottom: 10*z}}>
                    <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:6*z}}>
                       {editAvatarData ? (
                         <img src={editAvatarData} style={{width:40*z, height:40*z, borderRadius:"50%", objectFit:"cover"}} />
                       ) : (
                         <Avatar name={editName || p.name} size={40} />
                       )}
                       <button style={{...S.btnSecondary, padding:"2px 6px", fontSize:10*z, marginTop:0}} onClick={() => editFileInputRef.current.click()}>{t("change_photo")}</button>
                       <input type="file" accept="image/*" ref={editFileInputRef} className="file-input-hidden" onChange={handleFileEdit} />
                    </div>
                    
                    <div style={{flex:1, display:"flex", alignItems:"center", gap:8*z}}>
                      <input style={{...S.input,flex:1}} value={editName} autoFocus
                        onChange={e=>{setEditName(e.target.value);setEditErr("");}}
                        onKeyDown={e=>{if(e.key==="Enter")saveEdit(p.id);if(e.key==="Escape")setEditingId(null);}}/>
                    </div>
                  </div>

                  <div style={{display:"flex", gap:8*z, justifyContent:"flex-end"}}>
                    <button style={{...S.btnSecondary,marginTop:0,padding:"8px 12px"} } onClick={()=>setEditingId(null)}>{t("cancel")}</button>
                    <button style={{...S.btnPrimary,padding:"8px 14px"}} onClick={()=>saveEdit(p.id)}>{t("save")}</button>
                  </div>
                  {editErr&&<Err msg={editErr} theme={theme}/>}
                </div>
              ) : (
                <div style={{...S.lbRow,cursor:"pointer"}} onClick={()=>nav("profile",{profileId:p.id})}>
                  <button className="star-btn" onClick={(e) => { e.stopPropagation(); toggleFavorited(p.id); }} style={{marginRight: 2*z}}>
                     {favoredPlayerIds.includes(p.id) ? "⭐" : "☆"}
                  </button>
                  <Avatar name={p.name} url={p.avatar} size={38}/>
                  <div style={S.lbInfo}>
                    <div style={{display:"flex",alignItems:"center",gap:6*z}}>
                      <span style={S.lbName}>{p.name}</span>
                      {p.duprImported&&<span style={{fontSize:9*z,background:"rgba(80,144,192,0.15)",color:"#5090c0",borderRadius:4,padding:"1px 5px",fontWeight:700}}>D</span>}
                    </div>
                    <div style={{fontSize:11*z,color:theme.sub}}>{p.gamesPlayed||0}G · {p.wins||0}W {p.losses||0}L</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8*z}}>
                    <div style={{display:"flex",flexDirection:"column",gap:4*z,alignItems:"flex-end"}}>
                      <span style={{fontSize:10*z, fontWeight:800, color:"#111", background:ratingColor(p.ratingDoubles), borderRadius:4*z, padding:"2px 6px"}}>D: {(p.ratingDoubles||3).toFixed(2)}</span>
                      <span style={{fontSize:10*z, fontWeight:800, color:"#111", background:ratingColor(p.ratingSingles), borderRadius:4*z, padding:"2px 6px"}}>S: {(p.ratingSingles||3).toFixed(2)}</span>
                    </div>
                    <button style={{...S.btnSecondary,marginTop:0,padding:"5px 9px",fontSize:12*z}} title={t("rename")}
                      onClick={e=>{e.stopPropagation();startEdit(p);}}>✏️</button>
                    {isAdmin && <button style={S.btnDanger} onClick={e=>{e.stopPropagation();setPendingRemove(p.id);}}>✕</button>}
                  </div>
                </div>
              )}
              {pendingRemove===p.id&&(
                <ConfirmInline msg={t("remove_player_q")} note={t("match_history_stays")}
                  onConfirm={()=>remove(p.id)} onCancel={()=>setPendingRemove(null)} theme={theme}/>
              )}
            </div>
          ))}
      </Sec>
    </div>
  );
}