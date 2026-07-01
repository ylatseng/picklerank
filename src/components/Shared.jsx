import React, { useState, useEffect, useContext } from 'react';
import { 
  t, ratingColor, ratingLabel, avatarColor, initials, fmtDate, fmtDelta,
  isoToDatetimeLocal, K_FACTOR, calcExpected, 
  validatePickleballScore, DEFAULT_RATING, WIN_TO_OPTIONS,
  smartName, isLargeZoom
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
    { label: t("legend_win_pct"), val: player.winPct ? player.winPct / 100 : 0 },
    { label: t("legend_power"), val: Math.min(1, Math.max(0, ((player.ratingSingles||3) - 1.5) / 5)) || 0 },
    { label: t("legend_synergy"), val: Math.min(1, Math.max(0, ((player.ratingDoubles||3) - 1.5) / 5)) || 0 },
    { label: t("legend_upset"), val: Math.min(1, (player.bestWinDelta||0) / 0.6) || 0 },
    { label: t("legend_form"), val: player.streakType === "W" ? Math.min(1, (player.streak||0) / 6) : 0.1 }
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
     const margin = match.marginUsed ?? 0.5; // real point-based margin computed at replay time

     return teamIds.map(pid => {
       const myRating = match.ratingSnaps[pid];
       if(myRating == null) return null;
       const delta = match.ratingDeltas[pid] || 0;
       const exp = calcExpected(myRating, oppAvg);
       const kF = match.kFactors?.[pid] ?? K_FACTOR; // each player can carry their own (provisional) K
       const kAdj = kF * (1 + (margin - 0.5));
       return (
         <div key={pid} style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z, padding:8*z, marginBottom:6*z, fontSize:10*z}}>
           <div style={{display:"flex", justifyContent:"space-between", fontWeight:700, marginBottom:4*z, fontSize:11*z}}>
             <span style={{color:theme.text}}>{initials(getName(pid))}</span>
             <span style={{color: delta>=0 ? "#50c878" : "#e05050"}}>{delta>=0?"+":""}{delta.toFixed(3)}</span>
           </div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>{t("base_lbl")}</span> <span>{myRating.toFixed(3)}</span></div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>{t("opp_avg_lbl")}</span> <span>{oppAvg.toFixed(3)}</span></div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>{t("prob_lbl")}</span> <span style={{color: exp > 0.5 ? "#50c878" : "#e05050"}}>{(exp*100).toFixed(0)}%</span></div>
           <div style={{display:"flex", justifyContent:"space-between", color:theme.sub}}><span>{t("k_adj_lbl")}</span> <span>x{kAdj.toFixed(2)}</span></div>
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
export function MatchCard({match:m, players, theme, isAdmin, onEdit, onDelete, highlightPlayerId, lang, myPlayerId, onSaveNote}) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(() => m.playerNotes?.[myPlayerId] || "");
  
  const isParticipant = myPlayerId && m.teams?.flat()?.includes(myPlayerId);
  
  const getName=id=>players.find(p=>p.id===id)?.name??"?";
  // Per-player name arrays (DUPR-style stacking) — falls back to a single
  // custom team name if one was set (no per-player breakdown to stack then).
  const team1Names = m.teamNames?.t1 ? [m.teamNames.t1] : (m.teams?.[0]?.map(getName)?.length ? m.teams[0].map(getName) : ["TBD"]);
  const team2Names = m.teamNames?.t2 ? [m.teamNames.t2] : (m.teams?.[1]?.map(getName)?.length ? m.teams[1].map(getName) : ["TBD"]);
  const pSnap = highlightPlayerId ? m.ratingDeltas?.[highlightPlayerId] : null;

  // Render translations for the "singles" or "doubles" match type tags
  const typeTag = m.type === "singles" ? t("match_type_singles") : m.type === "doubles" ? t("match_type_doubles") : m.type;

  // Responsive score-pill sizing: shrink width/gap as game count grows so the
  // scoreboard fits without pushing past the card edge (covers legacy matches
  // logged before the 5-game cap, which could have more games).
  const gameCount = (m.games||[]).length;
  const gamePillW = gameCount <= 4 ? 20*z : gameCount === 5 ? 17*z : 14*z;
  const gamePillGap = gameCount <= 4 ? 14*z : gameCount === 5 ? 10*z : 7*z;

  return (
    <div style={S.matchCard}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12*z}}>
        <div style={{display:"flex",gap:6*z,alignItems:"center"}}>
          <span style={S.typePill}>{typeTag}</span>
          {(m.loggedBy === "quick" || m.loggedBy === "quick-session") && (
            <span style={{fontSize:10*z, background:theme.accent+"22", color:theme.accent,
              border:`1px solid ${theme.accent}66`, borderRadius:4*z,
              padding:`${1*z}px ${5*z}px`, fontWeight:700}}>⚡</span>
          )}
          {m.venue&&<span style={{fontSize:11*z,color:theme.sub}}>📍{m.venue}</span>}
        </div>
        <span style={{fontSize:12*z,color:theme.sub}}>{fmtDate(m.date, lang)}</span>
      </div>

      {/* DUPR-style Stacked Scoreboard Layout */}
      <div style={{display: "flex", flexDirection: "column", marginBottom: 12*z, background: theme.bg, padding: 12*z, borderRadius: 8*z, border: `1px solid ${theme.border}`}}>

        {/* Team 1 Block */}
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8*z, paddingBottom: 8*z}}>
          <div style={{flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2*z}}>
            {team1Names.map((name, i) => (
              <div key={`t1n-${i}`} style={{fontSize: 14*z, fontWeight: m.winnerTeam===0 ? 800 : 600, color: m.winnerTeam===0 ? "#50c878" : theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                {name}
              </div>
            ))}
          </div>
          <div style={{display: "flex", gap: gamePillGap, flexShrink: 0, overflowX: "auto", maxWidth: "60%"}}>
            {(m.games||[]).map((g, i) => (
              <div key={`t1-g${i}`} style={{width: gamePillW, flexShrink: 0, textAlign: "right", fontSize: 15*z, fontWeight: g.winner===0 ? 800 : 500, color: g.winner===0 ? "#50c878" : theme.sub}}>
                {g.a}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{borderTop: `1px solid ${theme.border}`, margin: `${2*z}px 0 ${8*z}px`}}/>

        {/* Team 2 Block */}
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8*z}}>
          <div style={{flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2*z}}>
            {team2Names.map((name, i) => (
              <div key={`t2n-${i}`} style={{fontSize: 14*z, fontWeight: m.winnerTeam===1 ? 800 : 600, color: m.winnerTeam===1 ? "#50c878" : theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                {name}
              </div>
            ))}
          </div>
          <div style={{display: "flex", gap: gamePillGap, flexShrink: 0, overflowX: "auto", maxWidth: "60%"}}>
            {(m.games||[]).map((g, i) => (
              <div key={`t2-g${i}`} style={{width: gamePillW, flexShrink: 0, textAlign: "right", fontSize: 15*z, fontWeight: g.winner===1 ? 800 : 500, color: g.winner===1 ? "#50c878" : theme.sub}}>
                {g.b}
              </div>
            ))}
          </div>
        </div>

      </div>

      {m.notes && (
        <div style={{fontSize: 12*z, color: theme.sub, marginBottom: 12*z, display: 'flex', alignItems: 'flex-start', gap: 6*z, background: theme.bg, padding: "8px 10px", borderRadius: 6*z, border: `1px solid ${theme.border}`}}>
          <span>📝</span> <span style={{fontStyle: 'italic', lineHeight: 1.4}}>{m.notes}</span>
        </div>
      )}

      <div style={{display:"flex", alignItems:"center", gap:4*z}}>
        {/* Rating delta pill — left, doesn't grow */}
        {pSnap != null && (
          <span style={{fontSize:11*z, fontWeight:700, color: pSnap >= 0 ? "#50c878" : "#e05050",
            background:theme.bg, padding:"2px 6px", borderRadius:4*z,
            border:`1px solid ${theme.border}`, flexShrink:0, whiteSpace:"nowrap"}}>
            {pSnap >= 0 ? "+" : ""}{pSnap.toFixed(3)}
          </span>
        )}
        {/* Icons — evenly fill remaining space, centered */}
        <div style={{flex:1, display:"flex", justifyContent:"space-evenly", alignItems:"center"}}>
          {m.ratingDeltas && (
            <button style={{...S.iconBtn, background: expanded ? theme.bg : "transparent", borderRadius: 6*z}} onClick={()=>setExpanded(!expanded)} title="ELO Stats">📊</button>
          )}
          {onEdit && <button style={S.iconBtn} onClick={()=>onEdit(m)} title="Edit">✏️</button>}
          {(isParticipant || isAdmin) && onSaveNote && (
            <button style={{...S.iconBtn, color: noteText ? theme.accent : theme.sub}} onClick={()=>setShowNote(v=>!v)} title="My Note">✍️</button>
          )}
          {isAdmin && onDelete && <button style={S.iconBtn} onClick={()=>onDelete(m.id)}>🗑️</button>}
        </div>
      </div>
      {/* Personal note */}
      {showNote && (
        <div style={{marginTop:8*z, display:"flex", gap:6*z, alignItems:"flex-start"}}>
          <textarea
            value={noteText}
            onChange={e=>setNoteText(e.target.value)}
            placeholder={t("personal_note_placeholder")||"Add your personal note..."}
            style={{flex:1, fontSize:11*z, padding:`${6*z}px`, borderRadius:6*z,
              border:`1px solid ${theme.accent}66`, background:theme.bg, color:theme.text,
              resize:"none", height:52*z, outline:"none"}}
          />
          <button onClick={()=>{ onSaveNote(m.id, myPlayerId, noteText); setShowNote(false); }}
            style={{...S.btnPrimary, padding:`${6*z}px ${10*z}px`, marginTop:0, fontSize:11*z}}>
            {t("save")||"Save"}
          </button>
        </div>
      )}
      {/* Display saved note if not editing */}
      {!showNote && noteText && (
        <div style={{fontSize:11*z, color:theme.accent, marginTop:6*z, fontStyle:"italic", display:"flex", gap:4*z}}>
          <span>✍️</span><span>{noteText}</span>
        </div>
      )}
      {expanded && <MatchEloBreakdown match={m} players={players} theme={theme} />}
    </div>
  );
}

export function MiniMatchCard({match:m,players,theme}){ 
  const S=makeS(theme); const z = theme.zoom || 1.0; 
  const getName=id=>players.find(p=>p.id===id)?.name??"?"; 
  const t1=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD"; 
  const t2=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD"; 
  
  const typeTag = m.type === "singles" ? t("match_type_singles") : m.type === "doubles" ? t("match_type_doubles") : m.type;

  return (
    <div style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10*z,padding:"10px 12px",marginBottom:8*z}}>
      <div style={{fontSize:11*z,color:theme.sub,marginBottom:10*z}}>{fmtDate(m.date)} · {typeTag}{m.venue?` · 📍${m.venue}`:""}</div>
      
      {/* Modern Bracket-Style Vertical Layout with Fixed Width Columns */}
      <div style={{display:"flex", flexDirection:"column", gap:8*z}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{flex:1, fontSize:13*z,fontWeight:m.winnerTeam===0?700:500,color:m.winnerTeam===0?"#50c878":theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8*z}}>
            {t1}
          </span>
          <div style={{display: "flex", gap: 12*z}}>
            {(m.games||[]).map((g, i) => (
              <span key={`mini-t1-${i}`} style={{width: 16*z, textAlign: "right", fontSize:13*z,fontWeight:g.winner===0?800:500,color:g.winner===0?"#50c878":theme.sub}}>
                {g.a}
              </span>
            ))}
          </div>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{flex:1, fontSize:13*z,fontWeight:m.winnerTeam===1?700:500,color:m.winnerTeam===1?"#50c878":theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8*z}}>
            {t2}
          </span>
          <div style={{display: "flex", gap: 12*z}}>
            {(m.games||[]).map((g, i) => (
              <span key={`mini-t2-${i}`} style={{width: 16*z, textAlign: "right", fontSize:13*z,fontWeight:g.winner===1?800:500,color:g.winner===1?"#50c878":theme.sub}}>
                {g.b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {m.notes && (
        <div style={{fontSize: 10*z, color: theme.sub, marginTop: 8*z, borderTop: `1px dashed ${theme.border}`, paddingTop: 6*z, display: "flex", gap: 4*z}}>
          <span>📝</span> <span style={{fontStyle: 'italic', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{m.notes}</span>
        </div>
      )}

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
  const [notes,setNotes]=useState(m.notes||""); 
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
    
    onSave({...m,date:newDate,venue:venue.trim()||null,notes:notes.trim()||null,games:parsedGames,winnerTeam,team1Wins:t1w,team2Wins:t2w,winTo,winBy});
  }

  const t1=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD";
  const t2=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:`${20*(theme?.zoom||z||1)}px ${20*(theme?.zoom||z||1)}px 0 0`,padding:"20px 16px 32px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
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

        <label style={S.label}>{t("notes_lbl")}</label>
        <input style={{...S.input,marginBottom:12*z}} placeholder="e.g. Crazy wind, paddle testing..." value={notes} onChange={e=>setNotes(e.target.value)}/>

        <div style={{display:"flex", gap:12*z, marginBottom:12*z}}>
          <div style={{flex:1}}>
            <label style={S.label}>{t("win_to_lbl")}</label>
            <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>{t("win_by_lbl")}</label>
            <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
          </div>
        </div>

        <label style={S.label}>{t("game_scores_sec")}</label>
        <div style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("score_win_by_2").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>
        {games.map((g,i)=>{
          const ga=parseInt(g.a), gb=parseInt(g.b);
          const bothFilled = g.a!=="" && g.b!=="" && !isNaN(ga) && !isNaN(gb);
          const isIllegal = bothFilled && !validatePickleballScore(ga,gb,winTo,winBy);
          return (
          <div key={i}>
            <div style={{...S.gameRow,marginBottom: isIllegal ? 2*z : 10*z}}>
              <span style={{color:theme.sub,fontSize:12*z,minWidth:50*z}}>Game {i+1}</span>
              <input style={{...S.scoreInput, ...(isIllegal?{borderColor:"#e05050"}:{})}} type="number" min="0" max="99" value={g.a} onChange={e=>updGame(i,"a",e.target.value)}/>
              <span style={{color:theme.sub}}>–</span>
              <input style={{...S.scoreInput, ...(isIllegal?{borderColor:"#e05050"}:{})}} type="number" min="0" max="99" value={g.b} onChange={e=>updGame(i,"b",e.target.value)}/>
            </div>
            {isIllegal && <div style={{fontSize:11*z,color:"#e05050",marginBottom:10*z}}>{t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>}
          </div>
          );
        })}
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
      <div style={{...S.lbInfo, minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6*z, minWidth:0}}>
          <span style={{...S.lbName, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, minWidth:0}}>{smartName(p.name, theme.zoom)}</span>
          {streakIcon && <span style={{fontSize:11*z, flexShrink:0}} title={`${p.streak} Game Streak`}>{streakIcon}</span>}
          {p.isAdminPlayer && <span title="Admin" style={{fontSize:10*z, flexShrink:0}}>🔑</span>}
        </div>
        <div style={{fontSize:10*z,color:theme.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{gP||0}G · {w||0}W {l||0}L</div>
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
  const [editing,setEditing]=useState(false);
  const [valS,setValS]=useState(""), [valD,setValD]=useState(""), [err,setErr]=useState("");

  const parsedS=parseFloat(valS), parsedD=parseFloat(valD);
  const validS=!isNaN(parsedS)&&parsedS>=1.5&&parsedS<=6.5;
  const validD=!isNaN(parsedD)&&parsedD>=1.5&&parsedD<=6.5;

  function save(){
    if(!validS || !validD) return setErr(t("rating_range_hint"));
    set(s => ({...s, players:(s.players||[]).map(pl=>pl.id!==p.id?pl:{
      ...pl,
      ratingSingles: parsedS,
      ratingDoubles: parsedD,
      baseRating: (parsedS + parsedD) / 2,
      duprImported: true
    })}));
    setEditing(false); setValS(""); setValD(""); setErr("");
  }

  function startEdit(){
    setValS((p.ratingSingles||DEFAULT_RATING).toFixed(3));
    setValD((p.ratingDoubles||DEFAULT_RATING).toFixed(3));
    setEditing(true);
  }

  return (
    <Sec title={t("base_rating_sec")} theme={theme}>
      <div style={{fontSize:13*z,color:theme.sub,marginBottom:10*z,lineHeight:1.5}}>{t("base_rating_desc")}</div>
      <div style={{display:"flex",gap:10*z,marginBottom:10*z}}>
        {[
          {label:t("overview_singles"), rating:p.ratingSingles||DEFAULT_RATING},
          {label:t("overview_doubles"), rating:p.ratingDoubles||DEFAULT_RATING}
        ].map(({label,rating})=>(
          <div key={label} style={{flex:1,display:"flex",alignItems:"center",gap:8*z}}>
            <div style={{...S.badge,background:ratingColor(rating),fontSize:14*z,padding:"4px 10px"}}>{rating.toFixed(3)}</div>
            <div>
              <div style={{fontSize:11*z,fontWeight:700}}>{label}</div>
              <div style={{fontSize:10*z,color:theme.sub}}>{t(ratingLabel(rating))}</div>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <div>
          <div style={{display:"flex",gap:10*z,marginBottom:8*z}}>
            <div style={{flex:1}}>
              <label style={S.label}>{t("singles_rating")} (1.5–6.5)</label>
              <input style={{...S.input,borderColor:valS&&!validS?"#5a2020":valS&&validS?theme.accent:theme.border}}
                type="text" inputMode="decimal" placeholder={t("overview_singles")} value={valS} autoFocus
                onChange={e=>{setValS(e.target.value);setErr("");}}/>
              {validS&&<div style={{fontSize:10*z,color:ratingColor(parsedS),marginTop:3*z,fontWeight:600}}>{parsedS.toFixed(3)} — {t(ratingLabel(parsedS))}</div>}
            </div>
            <div style={{flex:1}}>
              <label style={S.label}>{t("doubles_rating")} (1.5–6.5)</label>
              <input style={{...S.input,borderColor:valD&&!validD?"#5a2020":valD&&validD?theme.accent:theme.border}}
                type="text" inputMode="decimal" placeholder={t("overview_doubles")} value={valD}
                onChange={e=>{setValD(e.target.value);setErr("");}}/>
              {validD&&<div style={{fontSize:10*z,color:ratingColor(parsedD),marginTop:3*z,fontWeight:600}}>{parsedD.toFixed(3)} — {t(ratingLabel(parsedD))}</div>}
            </div>
          </div>
          {err&&<Err msg={err} theme={theme}/>}
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <button style={{...S.btnPrimary,flex:1}} onClick={save}>{t("save_recalc")}</button>
            <button style={{...S.btnSecondary,flex:1,marginTop:0}} onClick={()=>{setEditing(false);setValS("");setValD("");setErr("");}}>{t("cancel")}</button>
          </div>
        </div>
      ):(
        <button style={S.btnSecondary} onClick={startEdit}>{t("edit_starting_rating")}</button>
      )}
    </Sec>
  );
}

export function SynergyRow({icon, title, pid, pct, color, theme, getName, subText, record}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  return (
    <div style={{...S.lbRow, cursor:"default"}}>
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
          {t("confirm")}
        </button>
        <button style={{flex:1,background:theme.card,border:`1px solid ${theme.border}`,borderRadius:8*z,
          color:theme.sub,cursor:"pointer",fontSize:13*z,fontWeight:600,padding:8*z}} onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

export function Sec({title,children,theme}) { const S=makeS(theme); return <div style={S.sec}>{title?<div style={S.secTitle}>{title}</div>:null}{children}</div>; }
export function Empty({text,onAction,label,theme}) { const S=makeS(theme); const z = theme.zoom || 1.0; return <div style={{color:theme.sub,fontSize:13*z,textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:10*z}}><div>{text}</div>{onAction&&<button style={S.btnSecondary} onClick={onAction}>{label}</button>}</div>; }
export function Err({msg, theme}){ const z = theme.zoom || 1.0; return <div style={{color:"#e05050",fontSize:13*z,padding:"8px 12px",background:"rgba(224,80,80,0.1)",border:"1px solid rgba(224,80,80,0.3)",borderRadius:10*z,marginTop:8*z}}>{msg}</div>; }

// ── Player Picker — Inline Chip Selector ─────────────────────────────────────
// No modal, no scrolling. All players shown as tappable chips in 3-4 columns.
// Already-selected players are highlighted/disabled. Search filters chips.
// Much faster than a dropdown for groups of 10-30 players.
export function PlayerPicker({ opts, value, onChange, placeholder, theme, disabled }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  const [vp, setVp] = React.useState(null); // visible viewport {height, top}, tracks keyboard

  // Read Today's Players from sessionStorage (set via MatchesSubNav or QuickLog)
  const todayIds = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("ql_today_players") || "[]"); } catch { return []; }
  }, [open]); // re-read each time the sheet opens

  // When the on-screen keyboard opens (e.g. user taps search), visualViewport
  // shrinks/shifts. Track it so the sheet can resize to stay fully visible
  // above the keyboard instead of being covered by it.
  React.useEffect(() => {
    if (!open) { setVp(null); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVp({ height: vv.height, top: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [open]);

  const selected = opts?.find(o => o.value === value);
  const hasTodayFilter = todayIds.length > 0 && !search;
  const allOpts = (opts || []).filter(o => o.value !== "");
  const todayOpts = hasTodayFilter ? allOpts.filter(o => todayIds.includes(o.value)) : [];
  const restOpts  = hasTodayFilter ? allOpts.filter(o => !todayIds.includes(o.value)) : allOpts;
  const filtered = search
    ? allOpts.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : null; // null = use split view

  if (disabled) {
    return (
      <div style={{...S.select, opacity:0.5, cursor:"not-allowed", display:"flex", alignItems:"center", minWidth:0}}>
        <span style={{flex:1, color:value?theme.text:theme.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
          {selected?.label || placeholder || "—"}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Trigger */}
      <button onClick={() => { setSearch(""); setOpen(true); setShowAll(false); }}
        style={{...S.select, display:"flex", alignItems:"center",
          justifyContent:"space-between", textAlign:"left", cursor:"pointer", minWidth:0}}>
        <span style={{flex:1, color: value ? theme.text : theme.sub,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
          {selected?.label || placeholder || "—"}
        </span>
        <span style={{fontSize:10*z, color:theme.sub, flexShrink:0, marginLeft:6*z}}>▾</span>
      </button>

      {/* Bottom sheet — sized to visualViewport so the keyboard never covers it */}
      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{position:"fixed", left:0, right:0,
            top: vp ? vp.top : 0,
            height: vp ? vp.height : "100%",
            background:"rgba(0,0,0,0.5)",
            zIndex:4000, display:"flex", alignItems:"flex-end"}}>
          <div style={{background:theme.card, borderRadius:`${14*z}px ${14*z}px 0 0`,
            width:"100%", maxHeight: vp ? Math.max(vp.height - 16, 120) : "70vh",
            display:"flex", flexDirection:"column",
            boxShadow:"0 -4px 24px rgba(0,0,0,0.25)"}}>

            {/* Handle + header */}
            <div style={{padding:`${8*z}px ${16*z}px ${6*z}px`, textAlign:"center"}}>
              <div style={{width:36*z, height:4*z, borderRadius:2*z,
                background:theme.border, margin:"0 auto 8px"}}/>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <span style={{fontSize:13*z, fontWeight:700, color:theme.text}}>
                  {placeholder || t("select_prompt") || "Select player"}
                </span>
                <button onClick={() => setOpen(false)}
                  style={{background:"transparent", border:`1px solid ${theme.border}`,
                    borderRadius:16*z, fontSize:12*z, color:theme.sub,
                    cursor:"pointer", padding:`${3*z}px ${10*z}px`}}>
                  {t("cancel")||"Cancel"}
                </button>
              </div>
            </div>

            {/* Search bar — not auto-focused, so opening the sheet never pops the keyboard */}
            <div style={{padding:`${4*z}px ${12*z}px ${8*z}px`}}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={"🔍 " + (t("search_players_placeholder") || "Search players...")}
                style={{...S.input, margin:0, fontSize:14*z, padding:`${8*z}px ${12*z}px`}}
              />
            </div>

            {/* Chip grid — Today's Players first, then rest */}
            <div style={{overflowY:"auto", flex:1, padding:`${4*z}px ${10*z}px ${24*z}px`}}>
              {(() => {
                const renderChip = (o) => {
                  const isSelected = o.value === value;
                  const isDisabled = o.disabled;
                  return (
                    <button key={o.value} disabled={isDisabled}
                      onClick={() => { onChange(o.value); setOpen(false); setSearch(""); setShowAll(false); }}
                      style={{
                        padding:`${9*z}px ${4*z}px`,
                        borderRadius:8*z, boxSizing:"border-box",
                        fontSize:Math.min(12*z, 14), fontWeight: isSelected ? 700 : 400,
                        border:`1.5px solid ${isSelected ? theme.accent : theme.border}`,
                        background: isSelected ? theme.accent+"22" : theme.bg,
                        color: isDisabled ? theme.sub : isSelected ? theme.accent : theme.text,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.35 : 1,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        gap:3*z, minHeight:36*z,
                      }}>
                      {isSelected && <span style={{fontSize:10*z}}>✓</span>}
                      <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%"}}>
                        {o.label}
                      </span>
                    </button>
                  );
                };

                // Search mode — flat filtered list
                if (filtered !== null) {
                  if (filtered.length === 0) return (
                    <div style={{textAlign:"center", color:theme.sub, fontSize:12*z, padding:`${20*z}px`}}>
                      {t("no_data")||"No players found"}
                    </div>
                  );
                  return <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6*z}}>{filtered.map(renderChip)}</div>;
                }

                // Split mode — Today's Players on top, rest below
                return (
                  <>
                    {/* Today's Players section */}
                    {todayOpts.length > 0 && (
                      <>
                        <div style={{fontSize:10*z, fontWeight:700, color:theme.accent, textTransform:"uppercase",
                          letterSpacing:"0.5px", marginBottom:6*z}}>
                          👥 {t("todays_players")||"Today's Players"}
                        </div>
                        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6*z, marginBottom:12*z}}>
                          {todayOpts.map(renderChip)}
                        </div>
                      </>
                    )}

                    {/* Divider + show/hide rest */}
                    {todayOpts.length > 0 && restOpts.length > 0 && (
                      <button onClick={() => setShowAll(v => !v)}
                        style={{width:"100%", background:"transparent", border:"none",
                          borderTop:`1px solid ${theme.border}`, color:theme.sub,
                          fontSize:10*z, padding:`${8*z}px 0`, cursor:"pointer", marginBottom:showAll ? 8*z : 0}}>
                        {showAll ? "▲ " : "▼ "}{showAll ? (t("clear")||"Hide") : `${t("all_players")||"All players"} (${restOpts.length} more)`}
                      </button>
                    )}

                    {/* Rest of roster */}
                    {(todayOpts.length === 0 || showAll) && restOpts.length > 0 && (
                      <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6*z}}>
                        {restOpts.map(renderChip)}
                      </div>
                    )}

                    {/* Empty state */}
                    {todayOpts.length === 0 && restOpts.length === 0 && (
                      <div style={{textAlign:"center", color:theme.sub, fontSize:12*z, padding:`${20*z}px`}}>
                        {t("no_data")||"No players found"}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Clear selection */}
            {value && !search && (
              <div style={{padding:`${6*z}px ${12*z}px ${Math.max(16*z,16)}px`}}>
                <button onClick={() => { onChange(""); setOpen(false); }}
                  style={{...S.btnSecondary, width:"100%", marginTop:0, fontSize:12*z}}>
                  {t("clear")||"Clear"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function Sel({opts,value,onChange,placeholder,theme}){ const S=makeS(theme); return <select style={S.select} value={value} onChange={e=>onChange(e.target.value)}>{placeholder !== undefined && <option value="">{placeholder}</option>}{(opts||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>; }

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
// ── PinManager component ──────────────────────────────────────────────────────
// Lets a logged-in player set, change, or remove their PIN from Settings.
export function PinManager({ player, hasPIN, theme, onSave }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [mode, setMode] = useState(null); // null | "set" | "change" | "remove"
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  function reset() { setMode(null); setCurrentPin(""); setNewPin(""); setConfirmPin(""); setErr(""); }

  function submit() {
    // If player already has a PIN, verify current first
    if (hasPIN && mode !== "set") {
      if (currentPin !== player?.pin) { setErr(t("incorrect_pin")); return; }
    }
    if (mode === "remove") {
      onSave(null);
      setSuccess(t("pin_removed") || "PIN removed.");
      reset(); return;
    }
    if (newPin.length !== 4) { setErr(t("pin_must_be_4") || "PIN must be 4 digits."); return; }
    if (newPin !== confirmPin) { setErr(t("pin_mismatch") || "PINs don't match."); return; }
    onSave(newPin);
    setSuccess(hasPIN ? (t("pin_updated") || "PIN updated.") : (t("pin_set") || "PIN set successfully."));
    reset();
  }

  return (
    <div style={{marginTop:14*z, padding:12*z, background:theme.bg, borderRadius:10*z, border:`1px solid ${theme.border}`}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: mode ? 10*z : 0}}>
        <div>
          <div style={{fontSize:12*z, fontWeight:700, color:theme.text}}>
            🔒 {t("pin_sec") || "Account PIN"}
          </div>
          <div style={{fontSize:10*z, color:theme.sub, marginTop:2*z}}>
            {hasPIN ? (t("pin_is_set") || "PIN is set — protects your account") : (t("pin_not_set") || "No PIN — anyone can log in as you")}
          </div>
        </div>
        {!mode && (
          <div style={{display:"flex", gap:6*z}}>
            <button style={{...S.btnPrimary, marginTop:0, padding:`${4*z}px ${10*z}px`, fontSize:11*z}}
              onClick={() => { setMode(hasPIN ? "change" : "set"); setErr(""); setSuccess(""); }}>
              {hasPIN ? (t("change_pin") || "Change") : (t("set_pin") || "Set PIN")}
            </button>
            {hasPIN && (
              <button style={{...S.btnDanger, marginTop:0, padding:`${4*z}px ${10*z}px`, fontSize:11*z}}
                onClick={() => { setMode("remove"); setErr(""); setSuccess(""); }}>
                {t("remove_pin") || "Remove"}
              </button>
            )}
          </div>
        )}
      </div>

      {success && <div style={{fontSize:11*z, color:"#50c878", marginBottom:8*z}}>✓ {success}</div>}

      {mode && (
        <div style={{display:"flex", flexDirection:"column", gap:8*z}}>
          {hasPIN && (
            <>
              <label style={S.label}>{t("current_pin") || "Current PIN"}</label>
              <input style={{...S.input, textAlign:"center", letterSpacing:"6px"}}
                type="password" maxLength="4" placeholder="••••" value={currentPin}
                onChange={e => { setCurrentPin(e.target.value.replace(/\D/g,'')); setErr(""); }} />
            </>
          )}
          {mode !== "remove" && (
            <>
              <label style={S.label}>{t("new_pin") || "New PIN (4 digits)"}</label>
              <input style={{...S.input, textAlign:"center", letterSpacing:"6px"}}
                type="password" maxLength="4" placeholder="••••" value={newPin}
                onChange={e => { setNewPin(e.target.value.replace(/\D/g,'')); setErr(""); }} />
              <label style={S.label}>{t("confirm_pin") || "Confirm PIN"}</label>
              <input style={{...S.input, textAlign:"center", letterSpacing:"6px"}}
                type="password" maxLength="4" placeholder="••••" value={confirmPin}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g,'')); setErr(""); }} />
            </>
          )}
          {mode === "remove" && (
            <div style={{fontSize:11*z, color:"#e05050", textAlign:"center"}}>
              {t("pin_remove_warning") || "This will remove your PIN. Anyone can log in as you."}
            </div>
          )}
          {err && <Err msg={err} theme={theme} />}
          <div style={{display:"flex", gap:8*z}}>
            <button style={{...S.btnSecondary, flex:1, marginTop:0}} onClick={reset}>{t("cancel")}</button>
            <button style={{...(mode === "remove" ? S.btnDanger : S.btnPrimary), flex:1, marginTop:0}} onClick={submit}>
              {mode === "remove" ? (t("remove_pin") || "Remove PIN") : t("save_changes")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// usePersistentFormState has been moved to src/hooks.js
// Import it from there: import { usePersistentFormState } from '../hooks.js';
