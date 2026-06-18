import React, { useState, useContext } from 'react';
import { 
  t, ratingColor, ratingLabel, avatarColor, initials, fmtDate, fmtDelta,
  isoToDatetimeLocal, K_FACTOR, calcExpected, calcScoreMargin, 
  validatePickleballScore, DEFAULT_RATING
} from '../engine.js';
import { makeS } from '../styles.js';
import { ThemeCtx } from '../context.js';

// ─── Radar Chart ──────────────────────────────────────────────────────────────
export function RadarChart({player, theme}) {
  const z = theme.zoom || 1.0;
  const size = 200;
  const center = size / 2;
  const rMax = 70;
  
  const metrics = [
    { label: "Win %", val: player.winPct ? player.winPct / 100 : 0 },
    { label: "Power (S)", val: Math.min(1, Math.max(0, ((player.ratingSingles||3) - 1.5) / 5)) || 0 },
    { label: "Synergy (D)", val: Math.min(1, Math.max(0, ((player.ratingDoubles||3) - 1.5) / 5)) || 0 },
    { label: "Upset Factor", val: Math.min(1, (player.bestWinDelta||0) / 0.6) || 0 },
    { label: "Form", val: player.streakType === "W" ? Math.min(1, (player.streak||0) / 6) : 0.1 }
  ];

  const points = metrics.map((m, i) => {
     const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
     const r = (m.val || 0) * rMax;
     return {
       x: center + r * Math.cos(angle),
       y: center + r * Math.sin(angle),
       labelX: center + (rMax + 22) * Math.cos(angle),
       labelY: center + (rMax + 10) * Math.sin(angle)
     };
  });

  const polyPoints = points.map(p => `${p.x || center},${p.y || center}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{width: "100%", maxWidth: 260*z, margin: "0 auto", display: "block", overflow: "visible"}}>
      {[0.25, 0.5, 0.75, 1].map((scale, sIdx) => {
         const gridPts = metrics.map((_, i) => {
            const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
            const r = scale * rMax;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
         }).join(" ");
         return <polygon key={sIdx} points={gridPts} fill="none" stroke={theme.border} strokeWidth="1" strokeDasharray="3,3" />;
      })}
      
      {points.map((p, i) => {
         const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
         return <line key={i} x1={center} y1={center} x2={center + rMax * Math.cos(angle)} y2={center + rMax * Math.sin(angle)} stroke={theme.border} strokeWidth="1" />;
      })}

      <polygon points={polyPoints} fill={`${theme.accent}25`} stroke={theme.accent} strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={p.x || center} cy={p.y || center} r="3.5" fill={theme.accent} />)}

      {metrics.map((m, i) => (
         <text key={i} x={points[i].labelX || center} y={points[i].labelY || center} fill={theme.sub} fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle">
           {m.label}
         </text>
      ))}
    </svg>
  );
}

// ─── Inline ELO Breakdown ─────────────────────────────────────────────────────
export function MatchEloBreakdown({match, players, theme}) {
  const z = theme.zoom || 1.0;
  const getName = id => players.find(p=>p.id===id)?.name??"?";
  
  if (!match.ratingDeltas || !match.ratingSnaps) return null;

  const renderTeamElo = (teamIds, isT1) => {
     if (!teamIds) return null;
     const oppTeamIds = isT1 ? (match.teams?.[1] || []) : (match.teams?.[0] || []);
     const oppAvg = oppTeamIds.length ? oppTeamIds.reduce((s,id)=>s+(match.ratingSnaps[id]??3),0)/oppTeamIds.length : 3;
     const margin = calcScoreMargin(match.team1Wins, match.team2Wins);
     const kAdj = K_FACTOR * (1 + (margin - 0.5));

     return teamIds.map(pid => {
       const myRating = match.ratingSnaps[pid];
       if(myRating == null) return null;
       const delta = match.ratingDeltas[pid] || 0;
       const exp = calcExpected(myRating, oppAvg);
       return (
         <div key={pid} style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z, padding:8*z, marginBottom:6*z, fontSize:10*z}}>
           <div style={{display:"flex", justifyContent:"space-between", fontWeight:700, marginBottom:4*z, fontSize:11*z}}>
             <span style={{color:theme.text}}>{initials(getName(pid))}</span>
             <span style={{color: delta>=0 ? "#50c878" : "#e05050"}}>{delta>=0?"+":""}{delta.toFixed(3)}</span>
           </div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>Base:</span> <span>{myRating.toFixed(3)}</span></div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>Opp Avg:</span> <span>{oppAvg.toFixed(3)}</span></div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>Prob:</span> <span style={{color: exp > 0.5 ? "#50c878" : "#e05050"}}>{(exp*100).toFixed(0)}%</span></div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>K-Adj:</span> <span>x{kAdj.toFixed(2)}</span></div>
         </div>
       )
     });
  };

  return (
    <div style={{marginTop: 10*z, paddingTop: 10*z, borderTop: `1px dashed ${theme.border}`}}>
      <div style={{fontSize:11*z, fontWeight:700, marginBottom:8*z, color:theme.sub, textTransform:"uppercase", letterSpacing:"0.5px"}}>ELO Breakdown</div>
      <div style={{display:"flex", gap:8*z}}>
        <div style={{flex:1}}>{renderTeamElo(match.teams?.[0], true)}</div>
        <div style={{flex:1}}>{renderTeamElo(match.teams?.[1], false)}</div>
      </div>
    </div>
  );
}

// ─── Match Cards ──────────────────────────────────────────────────────────────
export function MatchCard({match:m, players, theme, isAdmin, onEdit, onShare, onDelete, highlightPlayerId}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [expanded, setExpanded] = useState(false);
  
  const getName=id=>players.find(p=>p.id===id)?.name??"?";
  const t1=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD";
  const t2=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD";
  const pSnap = highlightPlayerId ? m.ratingDeltas?.[highlightPlayerId] : null;

  return (
    <div style={S.matchCard}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6*z}}>
        <div style={{display:"flex",gap:6*z,alignItems:"center"}}>
          <span style={S.typePill}>{m.type}</span>
          {m.venue&&<span style={{fontSize:11*z,color:theme.sub}}>📍{m.venue}</span>}
        </div>
        <span style={{fontSize:12*z,color:theme.sub}}>{fmtDate(m.date)}</span>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:6*z,marginBottom:8*z}}>
        <div style={{flex:1,fontSize:13*z,fontWeight:m.winnerTeam===0?700:400,color:m.winnerTeam===0?"#50c878":theme.sub,textAlign:"center"}}>{t1}</div>
        <div style={{fontSize:11*z,color:theme.faint,fontWeight:700}}>vs</div>
        <div style={{flex:1,fontSize:13*z,fontWeight:m.winnerTeam===1?700:400,color:m.winnerTeam===1?"#50c878":theme.sub,textAlign:"center"}}>{t2}</div>
      </div>

      <div style={{display:"flex",gap:8*z,flexWrap:"wrap",marginBottom:8*z}}>
        {(m.games||[]).map((g,i)=>(
          <div key={i} style={S.gamePill}>
            <span style={{color:g.winner===0?"#50c878":theme.sub, fontWeight:g.winner===0?700:400}}>{g.a}</span>
            <span style={{color:theme.sub}}>–</span>
            <span style={{color:g.winner===1?"#50c878":theme.sub, fontWeight:g.winner===1?700:400}}>{g.b}</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex", alignItems:"center", gap: 8*z}}>
           <span style={{fontSize:12*z,color:"#50c878",fontWeight:600}}>🏆 {m.winnerTeam===0?t1:t2}</span>
           {pSnap != null && (
             <span style={{fontSize:11*z, fontWeight:700, color: pSnap >= 0 ? "#50c878" : "#e05050", background:theme.bg, padding:"2px 6px", borderRadius:4*z, border:`1px solid ${theme.border}`}}>
               {pSnap >= 0 ? "+" : ""}{pSnap.toFixed(3)}
             </span>
           )}
        </div>
        
        <div style={{display:"flex",gap:6*z}}>
          {m.ratingDeltas && (
            <button style={{...S.iconBtn, background: expanded ? theme.bg : "transparent", borderRadius: 6*z}} onClick={()=>setExpanded(!expanded)} title="ELO Stats">📊</button>
          )}
          {onEdit && <button style={S.iconBtn} onClick={()=>onEdit(m)} title="Edit">✏️</button>}
          {onShare && <button style={S.iconBtn} onClick={()=>onShare(m)}>📤</button>}
          {isAdmin && onDelete && <button style={S.iconBtn} onClick={()=>onDelete(m.id)}>🗑️</button>}
        </div>
      </div>
      {expanded && <MatchEloBreakdown match={m} players={players} theme={theme} />}
    </div>
  );
}

export function MiniMatchCard({match:m,players,theme}){ 
  const S=makeS(theme); const z = theme.zoom || 1.0; 
  const getName=id=>players.find(p=>p.id===id)?.name??"?"; 
  const t1=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD"; 
  const t2=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD"; 
  return (
    <div style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10*z,padding:"10px 12px",marginBottom:8*z}}>
      <div style={{fontSize:11*z,color:theme.sub,marginBottom:4*z}}>{fmtDate(m.date)} · {m.type}{m.venue?` · 📍${m.venue}`:""}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13*z,fontWeight:m.winnerTeam===0?700:400,color:m.winnerTeam===0?"#50c878":theme.sub}}>{t1}</span>
        <span style={{fontSize:11*z,color:theme.faint}}>{(m.games||[]).map(g=>`${g.a}-${g.b}`).join(", ")}</span>
        <span style={{fontSize:13*z,fontWeight:m.winnerTeam===1?700:400,color:m.winnerTeam===1?"#50c878":theme.sub}}>{t2}</span>
      </div>
    </div>
  ); 
}

// ─── Match Edit Modal ─────────────────────────────────────────────────────────
export function MatchEditModal({match:m,players,onSave,onClose,theme}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const getName=id=>players.find(p=>p.id===id)?.name??"?";
  const [date,setDate]=useState(isoToDatetimeLocal(m.date));
  const [venue,setVenue]=useState(m.venue||"");
  const [winTo,setWinTo]=useState(m.winTo||11);
  const [winBy,setWinBy]=useState(m.winBy||2);
  const [games,setGames]=useState((m.games||[]).map(g=>({a:String(g.a),b:String(g.b)})));
  const [err,setErr]=useState("");

  function updGame(i,side,val){
    const cleanVal = val.replace(/-/g, '');
    setGames(g=>g.map((gm,idx)=>idx===i?{...gm,[side]:cleanVal}:gm));
  }

  function save(){
    setErr("");
    let t1w=0,t2w=0; const parsedGames=[];
    for(let i=0;i<games.length;i++){
      const a=parseInt(games[i].a),b=parseInt(games[i].b);
      if(isNaN(a)||isNaN(b)) return setErr(t("err_error_scores"));
      const r=validatePickleballScore(a,b,winTo,winBy);
      if(!r) return setErr(t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy));
      parsedGames.push({a,b,winner:r.winner});
      if(r.winner===0)t1w++;else t2w++;
    }
    if(t1w===t2w) return setErr(t("err_clear_winner"));
    const winnerTeam=t1w>t2w?0:1;
    const newDate=date?new Date(date).toISOString():m.date;
    onSave({...m,date:newDate,venue:venue.trim()||null,games:parsedGames,winnerTeam,team1Wins:t1w,team2Wins:t2w,winTo,winBy});
  }

  const t1=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD";
  const t2=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:"20px 20px 0 0",padding:"20px 16px 32px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16*z}}>
          <div style={{fontWeight:800,fontSize:16*z, color:theme.text}}>{t("edit_match_title")}</div>
          <button style={{...S.iconBtn,fontSize:22*z}} onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:13*z,color:theme.sub,marginBottom:16*z,padding:"8px 12px",background:theme.bg,borderRadius:10*z}}>
          <span style={{color:theme.accent,fontWeight:700}}>{t1}</span> <span style={{color:theme.faint}}>vs</span> <span style={{fontWeight:700}}>{t2}</span>
        </div>

        <label style={S.label}>{t("date_time_lbl")}</label>
        <input style={{...S.input,marginBottom:12*z}} type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/>

        <label style={S.label}>{t("venue_opt")}</label>
        <input style={{...S.input,marginBottom:12*z}} placeholder="e.g. Riverside Courts" value={venue} onChange={e=>setVenue(e.target.value)}/>

        <div style={{display:"flex", gap:12*z, marginBottom:12*z}}>
          <div style={{flex:1}}>
            <label style={S.label}>{t("win_to_lbl")}</label>
            <input style={S.input} type="number" min="1" value={winTo} onChange={e=>setWinTo(parseInt(e.target.value)||1)} />
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>{t("win_by_lbl")}</label>
            <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
          </div>
        </div>

        <label style={S.label}>{t("game_scores_sec")}</label>
        <div style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("score_win_by_2").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>
        {games.map((g,i)=>(
          <div key={i} style={{...S.gameRow,marginBottom:10*z}}>
            <span style={{color:theme.sub,fontSize:12*z,minWidth:50*z}}>Game {i+1}</span>
            <input style={S.scoreInput} type="number" min="0" max="30" value={g.a} onChange={e=>updGame(i,"a",e.target.value)}/>
            <span style={{color:theme.sub}}>–</span>
            <input style={S.scoreInput} type="number" min="0" max="30" value={g.b} onChange={e=>updGame(i,"b",e.target.value)}/>
          </div>
        ))}
        {err&&<Err msg={err} theme={theme}/>}
        <div style={{display:"flex",gap:10*z,marginTop:16*z}}>
          <button style={{...S.btnPrimary,flex:1}} onClick={save}>{t("save")}</button>
          <button style={{...S.btnSecondary,marginTop:0,flex:1}} onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Helper Components ──────────────────────────────────────────────
export function LeaderboardRow({player:p,rank,onClick,theme,format}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const medal=rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":null;
  const activeRating = format === "singles" ? (p.ratingSingles||3) : (p.ratingDoubles||3);
  const activeHist = format === "singles" ? p.ratingHistorySingles : p.ratingHistoryDoubles;
  
  const gP = format === "singles" ? p.singlesPlayed : p.doublesPlayed;
  const w = format === "singles" ? p.singlesWins : p.doublesWins;
  const l = format === "singles" ? p.singlesLosses : p.doublesLosses;
  
  const delta=activeHist?.length >= 2 ? activeRating - (activeHist[activeHist.length-2]?.rating||3) : 0;
  const d=fmtDelta(delta);
  
  const isProv = ((activeHist?.length || 1) - 1) < 5;
  const streakIcon = (p.streak||0) >= 3 ? (p.streakType === "W" ? "🔥" : "🧊") : null;

  return (
    <div style={S.lbRow} onClick={onClick}>
      <div style={S.lbRank}>{medal||<span style={{fontSize:13*z,color:theme.sub}}>#{rank}</span>}</div>
      <Avatar name={p.name} url={p.avatar} size={36}/>
      <div style={S.lbInfo}>
        <div style={{display:"flex",alignItems:"center",gap:6*z}}>
          <span style={S.lbName}>{p.name}</span>
          {streakIcon && <span style={{fontSize:12*z}} title={`${p.streak} Game Streak`}>{streakIcon}{p.streak}</span>}
          <span style={{fontSize:9*z, padding:"1px 4px", borderRadius:4, background: isProv ? "rgba(245,158,11,0.12)" : "rgba(80,200,120,0.12)", color: isProv ? "#f59e0b" : "#50c878", fontWeight:700}}>
             {isProv ? "P" : "C"}
          </span>
        </div>
        <div style={{fontSize:11*z,color:theme.sub}}>{gP||0}G · {w||0}W {l||0}L</div>
      </div>
      <div style={{textAlign:"right", opacity: (gP||0) === 0 ? 0.4 : 1}}>
        <div style={{...S.badge,background:ratingColor(activeRating)}}>{activeRating.toFixed(3)}</div>
        {delta!==0&&<div style={{fontSize:10*z,color:d.color,marginTop:2}}>{d.text}</div>}
      </div>
    </div>
  );
}

// ─── Profile Helper Components ────────────────────────────────────────────────
export function EditBaseRating({player:p,set,theme}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [editing,setEditing]=useState(false), [val,setVal]=useState(""), [err,setErr]=useState("");
  const parsed=parseFloat(val), valid=!isNaN(parsed)&&parsed>=1.5&&parsed<=6.5;
  
  function save(){
    if(!valid) return setErr(t("rating_range_hint"));
    set(s => ({...s, players: (s.players||[]).map(pl=>pl.id!==p.id?pl:{...pl,baseRating:parsed,duprImported:true})}));
    setEditing(false); setVal(""); setErr("");
  }
  const currentBase=p.baseRating??DEFAULT_RATING;
  return (
    <Sec title={t("base_rating_sec")} theme={theme}>
      <div style={{fontSize:13*z,color:theme.sub,marginBottom:10*z,lineHeight:1.5}}>{t("base_rating_desc")}</div>
      <div style={{display:"flex",alignItems:"center",gap:10*z,marginBottom:10*z}}>
        <div style={{...S.badge,background:ratingColor(currentBase),fontSize:16*z,padding:"6px 14px"}}>{currentBase.toFixed(3)}</div>
        <div><div style={{fontSize:12*z,fontWeight:700}}>{t(ratingLabel(currentBase))}</div><div style={{fontSize:10*z,color:theme.sub}}>{t("base_rating_lbl")}</div></div>
      </div>
      {editing?(
        <div>
          <label style={S.label}>{t("new_starting_rating")}</label>
          <input style={{...S.input,borderColor:val&&!valid?"#5a2020":val&&valid?theme.accent:theme.border}}
            type="number" min="1.5" max="6.5" step="0.001" placeholder="e.g. 4.125" value={val} autoFocus
            onChange={e=>{setVal(e.target.value);setErr("");}}/>
          {valid&&<div style={{fontSize:11*z,color:ratingColor(parsed),marginTop:4,fontWeight:600}}>{parsed.toFixed(3)} — {t(ratingLabel(parsed))}</div>}
          {err&&<Err msg={err} theme={theme}/>}
          <div style={{display:"flex",gap:8*z, marginTop:8*z}}>
            <button style={{...S.btnPrimary,flex:1}} onClick={save}>{t("save_recalc")}</button>
            <button style={{...S.btnSecondary,flex:1,marginTop:0}} onClick={()=>{setEditing(false);setVal("");setErr("");}}>{t("cancel")}</button>
          </div>
        </div>
      ):(
        <button style={S.btnSecondary} onClick={()=>{setEditing(true);setVal(currentBase.toFixed(3));}}>{t("edit_starting_rating")}</button>
      )}
    </Sec>
  );
}

export function SynergyRow({icon, title, pid, pct, color, theme, getName, subText, record}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  return (
    <div style={{...S.lbRow, cursor:"default", padding:"12px 0"}}>
      <div style={{fontSize: 24*z, width:30*z, textAlign:"center"}}>{icon}</div>
      <div style={S.lbInfo}>
        <div style={{fontSize: 13*z, fontWeight:600}}>{title}</div>
        <div style={{fontSize: 11*z, color:theme.sub}}>{getName(pid)}</div>
      </div>
      <div style={{fontSize: 13*z, fontWeight:800, color:color, textAlign:"right"}}>
        {Math.round(pct*100)}% <span style={{fontSize:10*z, color:theme.sub, fontWeight:600}}>({record})</span>
        <div style={{fontSize:9*z, fontWeight:600}}>{subText || t("win_rate")}</div>
      </div>
    </div>
  );
}

export function StatRow({icon,label,value,theme}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  return (
    <div style={{...S.lbRow,cursor:"default"}}>
      <div style={{fontSize:20*z}}>{icon}</div>
      <div style={S.lbInfo}><div style={{fontSize:13*z,fontWeight:600}}>{label}</div></div>
      <div style={{fontSize:13*z,color:theme.text,fontWeight:600}}>{value}</div>
    </div>
  );
}

// ─── Small UI Wrappers ────────────────────────────────────────────────────────
export function ConfirmInline({msg,note,onConfirm,onCancel,danger=false,theme}) {
  const z = theme.zoom || 1.0;
  return (
    <div style={{background:danger?"rgba(224,80,80,0.1)":theme.bg,border:`1px solid ${danger?"#5a2020":theme.border}`,
      borderRadius:12*z,padding:"12px 14px",margin:"6px 0",display:"flex",flexDirection:"column",gap:8*z}}>
      <div>
        <div style={{fontSize:13*z,fontWeight:700,color:danger?"#e05050":theme.text}}>{msg}</div>
        {note&&<div style={{fontSize:11*z,color:theme.sub,marginTop:2}}>{note}</div>}
      </div>
      <div style={{display:"flex",gap:8*z}}>
        <button style={{flex:1,background:danger?"#5a2020":"#1e3d24",border:"none",borderRadius:8*z,
          color:danger?"#e05050":"#50c878",cursor:"pointer",fontSize:13*z,fontWeight:700,padding:8*z}} onClick={onConfirm}>
          Confirm
        </button>
        <button style={{flex:1,background:theme.card,border:`1px solid ${theme.border}`,borderRadius:8*z,
          color:theme.sub,cursor:"pointer",fontSize:13*z,fontWeight:600,padding:8*z}} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function Sec({title,children,theme}) { const S=makeS(theme); return <div style={S.sec}>{title?<div style={S.secTitle}>{title}</div>:null}{children}</div>; }
export function Empty({text,onAction,label,theme}) { const S=makeS(theme); const z = theme.zoom || 1.0; return <div style={{color:theme.sub,fontSize:13*z,textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:10*z}}><div>{text}</div>{onAction&&<button style={S.btnSecondary} onClick={onAction}>{label}</button>}</div>; }
export function Err({msg, theme}){ const z = theme.zoom || 1.0; return <div style={{color:"#e05050",fontSize:13*z,padding:"8px 12px",background:"rgba(224,80,80,0.1)",border:"1px solid rgba(224,80,80,0.3)",borderRadius:10*z,marginTop:8*z}}>{msg}</div>; }
export function Sel({opts,value,onChange,placeholder,theme}){ const S=makeS(theme); return <select style={S.select} value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder}</option>{(opts||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>; }

export function Avatar({name, url, size=36}) {
  const theme = useContext(ThemeCtx);
  const s = size * (theme.zoom || 1.0);
  
  if (url) {
    return (
      <img src={url} alt={name} style={{width:s, height:s, borderRadius:"50%", objectFit:"cover", flexShrink:0, border: "1px solid rgba(0,0,0,0.1)"}} />
    );
  }
  return (
    <div style={{width:s,height:s,borderRadius:"50%",background:avatarColor(name),
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:s*0.36,fontWeight:800,color:"#0d0d0f",flexShrink:0}}>
      {initials(name)}
    </div>
  );
}

export function Sparkline({history,width=320,height=60,theme}) {
  const z = theme.zoom || 1.0;
  const w = width; 
  const h = height;
  if(!history||history.length<2) return <div style={{width:w*z,height:h*z,color:theme.sub,fontSize:11*z,display:"flex",alignItems:"center"}}>{t("no_data")}</div>;
  const vals=history.map(x=>x.rating);
  const min=Math.min(...vals)-0.05, max=Math.max(...vals)+0.05, range=max-min||0.1;
  const pts=vals.map((v,i)=>{
    const x=(i/(vals.length-1))*w, y=h-((v-min)/range)*h;
    return `${x},${y}`;
  }).join(" ");
  const color=vals[vals.length-1]>=vals[0]?"#50c878":"#e05050";
  const lastPt=pts.split(" ").pop().split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", overflow: "visible", display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color}/>
    </svg>
  );
}