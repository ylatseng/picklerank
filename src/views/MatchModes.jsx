import React, { useState, useEffect } from 'react';
import { t, genId, validatePickleballScore, isoToDatetimeLocal, sortOptionsAlpha, replayAllMatches, WIN_TO_OPTIONS, suggestBalancedTeams, computeSessionSummary, getRecentForm } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, MatchEloBreakdown, ConfirmInline, MatchEditModal, MatchCard } from '../components/Shared.jsx';
import { MatchesSubNav } from '../components/Navigation.jsx';

// Tiny inline form indicator: shows last 3 results as W/L badges
function FormDots({ pid, matches, z = 1 }) {
  const form = getRecentForm(pid, matches, 3);
  if (!form.length) return null;
  return (
    <div style={{display:"flex", gap:3*z, marginTop:3*z, alignItems:"center"}}>
      <span style={{fontSize:9*z, color:"#888", marginRight:2*z}}>{t("form_lbl") || "Form"}:</span>
      {form.map((r, i) => (
        <span key={i} style={{
          fontSize:9*z, fontWeight:800, borderRadius:3*z, padding:`1px ${3*z}px`,
          color: r==="W" ? "#50c878" : "#e05050",
          background: r==="W" ? "rgba(80,200,120,0.15)" : "rgba(224,80,80,0.15)"
        }}>{r}</span>
      ))}
    </div>
  );
}

export function LogMatch({state,players,set,nav,theme,user}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [type,setType]=useState("singles"), [winTo,setWinTo]=useState(11), [winBy,setWinBy]=useState(2);
  const [sp,setSp]=useState({s1:"",s2:"",d1a:"",d1b:"",d2a:"",d2b:""});
  const [games,setGames]=useState([{a:"",b:""}]);
  const [tnames,setTnames]=useState({t1:"",t2:""});
  const [venue,setVenue]=useState("");
  const [notes,setNotes]=useState(""); 
  const [err,setErr]=useState(""), [result,setResult]=useState(null);
  const [matchDate,setMatchDate]=useState(()=>isoToDatetimeLocal(new Date().toISOString()));

  useEffect(() => {
    if (user?.myPlayerId) {
       setSp(prev => ({...prev, s1: prev.s1 || user.myPlayerId, d1a: prev.d1a || user.myPlayerId}));
    }
  }, [user?.myPlayerId]);
  
  const activeIds = type === "singles" ? [sp.s1, sp.s2] : [sp.d1a, sp.d1b, sp.d2a, sp.d2b];
  const filledActive = activeIds.filter(Boolean);
  const hasDupes = new Set(filledActive).size < filledActive.length;

  function upSp(k,v){setSp(p=>({...p,[k]:v})); setErr("");}
  function upTn(k,v){setTnames(t=>({...t,[k]:v}));}
  function addGame(){setGames(g=>[...g,{a:"",b:""}]);}
  function rmGame(i){setGames(g=>g.filter((_,idx)=>idx!==i));}
  function updGame(i,side,val){
    const cleanVal = val.replace(/-/g, '');
    setGames(g=>g.map((gm,idx)=>idx===i?{...gm,[side]:cleanVal}:gm));
  }
  function getTeams(){return type==="singles"?[[sp.s1],[sp.s2]]:[[sp.d1a,sp.d1b],[sp.d2a,sp.d2b]];}
  
  function submit(){
    setErr(""); setResult(null);
    if(hasDupes) return setErr(t("err_duplicate"));
    const teams=getTeams(), allIds=teams.flat().filter(Boolean);
    if(type==="singles"&&(!sp.s1||!sp.s2)) return setErr(t("err_select_players"));
    if(type==="doubles"&&allIds.length<4) return setErr(t("err_select_4"));
    
    let t1w=0,t2w=0; const parsedGames=[];
    for(let i=0;i<games.length;i++){
      const a=parseInt(games[i].a),b=parseInt(games[i].b);
      if(isNaN(a)||isNaN(b)) return setErr(t("err_valid_scores"));
      const r=validatePickleballScore(a,b,winTo,winBy);
      if(!r) return setErr(t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy));
      parsedGames.push({a,b,winner:r.winner});
      if(r.winner===0)t1w++;else t2w++;
    }
    if(!parsedGames.length) return setErr(t("err_add_game"));
    if(t1w===t2w) return setErr(t("err_clear_winner"));
    
    const winnerTeam=t1w>t2w?0:1;
    const isoDate = matchDate ? new Date(matchDate).toISOString() : new Date().toISOString();
    
    const match={id:genId(),type,date:isoDate,teams:[teams[0].filter(Boolean),teams[1].filter(Boolean)],winnerTeam,
      games:parsedGames,teamNames:{t1:null,t2:null},winTo,winBy,
      team1Wins:t1w,team2Wins:t2w,venue:venue.trim()||null, notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest"};

    const newMatchArray = [...(state.matches||[]), match];
    const { derivedPlayers, derivedMatches } = replayAllMatches(state.players, newMatchArray);
    setResult({ match: derivedMatches.find(m => m.id === match.id), players: derivedPlayers });
    set(s => ({...s, matches: newMatchArray}));
    setGames([{a:"",b:""}]); 
    setNotes(""); 
  }
  
  const rawOpts=players.map(p=>({value:p.id,label:p.name}));
  const opts = sortOptionsAlpha(rawOpts, state.favoredPlayerIds);

  return (
    <div style={S.view}>
      <MatchesSubNav active="log" nav={nav} theme={theme} />
      {result&&(
        <div style={S.successBox}>
          <div style={{fontWeight:800,fontSize:15*z,marginBottom:8*z}}>{t("match_logged_ok")}</div>
          <MatchEloBreakdown match={result.match} players={result.players} theme={theme} />
          <button style={{...S.btnSecondary,marginTop:10*z}} onClick={()=>nav("history")}>{t("see_history_btn")}</button>
        </div>
      )}
      <Sec title={t("match_type_sec")} theme={theme}>
        <div style={S.toggle}>
          {["singles","doubles"].map(tType=>(
            <button key={tType} style={{...S.toggleBtn,...(type===tType?{...S.toggleOn,background:theme.card,borderColor:theme.accent,color:theme.accent}:{})}} onClick={()=>setType(tType)}>
              {tType.charAt(0).toUpperCase()+tType.slice(1)}
            </button>
          ))}
        </div>
        <div style={{display:"flex", gap:12*z, marginTop:12*z}}>
          <div style={{flex:1}}>
            <label style={S.label}>{t("win_to_lbl")}</label>
            <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>{t("win_by_lbl")}</label>
            <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
          </div>
        </div>
      </Sec>
      
      {type==="singles"?(
        <Sec title={t("players")} theme={theme}>
          <label style={S.label}>{t("player_1")}</label>
          <Sel opts={opts} value={sp.s1} onChange={v=>upSp("s1",v)} placeholder={t("select_prompt")} theme={theme}/>
          {sp.s1 && <FormDots pid={sp.s1} matches={state.matches} z={z}/>}
          <label style={{...S.label,marginTop:10*z}}>{t("player_2")}</label>
          <Sel opts={opts} value={sp.s2} onChange={v=>upSp("s2",v)} placeholder={t("select_prompt")} theme={theme}/>
          {sp.s2 && <FormDots pid={sp.s2} matches={state.matches} z={z}/>}
          {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
        </Sec>
      ):(
        <Sec title={t("teams")} theme={theme}>
          <label style={S.label}>{t("team_name_opt")}</label>
          <input style={S.input} value={tnames.t1} onChange={e=>upTn("t1",e.target.value)} placeholder="e.g. The Bangers"/>
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <div style={{flex:1}}><label style={S.label}>{t("player_a")}</label><Sel opts={opts} value={sp.d1a} onChange={v=>upSp("d1a",v)} placeholder={t("select_prompt")} theme={theme}/>{sp.d1a&&<FormDots pid={sp.d1a} matches={state.matches} z={z}/>}</div>
            <div style={{flex:1}}><label style={S.label}>{t("player_b")}</label><Sel opts={opts} value={sp.d1b} onChange={v=>upSp("d1b",v)} placeholder={t("select_prompt")} theme={theme}/>{sp.d1b&&<FormDots pid={sp.d1b} matches={state.matches} z={z}/>}</div>
          </div>
          <div style={{borderTop:`1px solid ${theme.border}`,margin:"14px 0"}}/>
          <label style={S.label}>{t("team_name_opt")}</label>
          <input style={S.input} value={tnames.t2} onChange={e=>upTn("t2",e.target.value)} placeholder="e.g. The Dinkers"/>
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <div style={{flex:1}}><label style={S.label}>{t("player_a")}</label><Sel opts={opts} value={sp.d2a} onChange={v=>upSp("d2a",v)} placeholder={t("select_prompt")} theme={theme}/>{sp.d2a&&<FormDots pid={sp.d2a} matches={state.matches} z={z}/>}</div>
            <div style={{flex:1}}><label style={S.label}>{t("player_b")}</label><Sel opts={opts} value={sp.d2b} onChange={v=>upSp("d2b",v)} placeholder={t("select_prompt")} theme={theme}/>{sp.d2b&&<FormDots pid={sp.d2b} matches={state.matches} z={z}/>}</div>
          </div>
          {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
        </Sec>
      )}

      <Sec title={t("game_scores_sec")} theme={theme}>
        <div style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("score_win_by_2").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>
        {games.map((g,i)=>{
          const ga=parseInt(g.a), gb=parseInt(g.b);
          const bothFilled = g.a!=="" && g.b!=="" && !isNaN(ga) && !isNaN(gb);
          const isIllegal = bothFilled && !validatePickleballScore(ga,gb,winTo,winBy);
          return (
          <div key={i}>
            <div style={S.gameRow}>
              <span style={{color:theme.sub,fontSize:12*z,minWidth:50*z}}>Game {i+1}</span>
              <input style={{...S.scoreInput, ...(isIllegal?{borderColor:"#e05050"}:{})}} type="number" min="0" max="99" placeholder="T1" value={g.a} onChange={e=>updGame(i,"a",e.target.value)}/>
              <span style={{color:theme.sub}}>–</span>
              <input style={{...S.scoreInput, ...(isIllegal?{borderColor:"#e05050"}:{})}} type="number" min="0" max="99" placeholder="T2" value={g.b} onChange={e=>updGame(i,"b",e.target.value)}/>
              {games.length>1&&<button style={S.btnDanger} onClick={()=>rmGame(i)}>✕</button>}
            </div>
            {isIllegal && <div style={{fontSize:11*z,color:"#e05050",marginTop:-4*z,marginBottom:8*z}}>{t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>}
          </div>
          );
        })}
        <button style={S.btnSecondary} onClick={addGame}>{t("add_game_btn")}</button>
      </Sec>
      
      <Sec title={t("date_venue_sec")} theme={theme}>
        <label style={S.label}>{t("date_time_lbl")}</label>
        <input style={{...S.input,marginBottom:12*z}} type="datetime-local" value={matchDate} onChange={e=>setMatchDate(e.target.value)}/>
        <label style={S.label}>{t("venue_opt")}</label>
        <input style={{...S.input,marginBottom:12*z}} placeholder="e.g. Riverside Courts, Court 3" value={venue} onChange={e=>setVenue(e.target.value)}/>
        
        <label style={S.label}>Match Notes (Optional)</label>
        <input style={S.input} placeholder="e.g. Crazy wind, paddle testing..." value={notes} onChange={e=>setNotes(e.target.value)}/>
      </Sec>
      
      {err && !hasDupes && <Err msg={err} theme={theme}/>}
      
      <button style={{...S.btnBig, opacity: hasDupes ? 0.5 : 1, cursor: hasDupes ? "not-allowed" : "pointer"}} disabled={hasDupes} onClick={submit}>
        {t("log_match_btn")}
      </button>
    </div>
  );
}

export function SessionMode({ players, state, set, nav, theme, isAdmin, user }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [sessionIds, setSessionIds] = useState(["","","",""]);
  const [winTo,setWinTo]=useState(11);
  const [winBy,setWinBy]=useState(2);
  const [roundScores, setRoundScores] = useState([{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
  const [notes, setNotes] = useState(""); 
  const [err, setErr] = useState(""), [success, setSuccess] = useState("");
  const [groupName, setGroupName] = useState("");
  const [sessionSummary, setSessionSummary] = useState(null);
  const [chosenSplit, setChosenSplit] = useState(null); // team suggester selection
  const savedGroups = state.savedGroups || [];
  
  useEffect(() => {
    if (user?.myPlayerId && !sessionIds[0]) {
       setSessionIds(ids => [user.myPlayerId, ids[1], ids[2], ids[3]]);
    }
  }, [user?.myPlayerId]);

  const filledIds = sessionIds.filter(Boolean);
  const hasDupes = new Set(filledIds).size < filledIds.length;
  const isReady = filledIds.length === 4 && !hasDupes;

  const rawOpts = players.map(p=>({value:p.id,label:p.name}));
  const opts = sortOptionsAlpha(rawOpts, state.favoredPlayerIds);
  const getName = id => players.find(p=>p.id===id)?.name??"?";
  
  const matchups = [{ id: 1, t1: [0, 1], t2: [2, 3] }, { id: 2, t1: [0, 2], t2: [1, 3] }, { id: 3, t1: [0, 3], t2: [1, 2] }];
  
  function upP(idx,val){const n=[...sessionIds];n[idx]=val;setSessionIds(n);}
  function updScore(rIdx, team, val){
     const cleanVal = val.replace(/-/g, '');
     setRoundScores(rs => rs.map((r, i) => i === rIdx ? {...r, [team]: cleanVal} : r));
  }
  
  function saveCurrentGroup() {
    if(!isReady || !groupName.trim()) return;
    set(s => ({...s, savedGroups: [...(s.savedGroups||[]), { id: genId(), name: groupName.trim(), ids: sessionIds }]} ));
    setGroupName(""); setSuccess(t("save") + " OK");
  }
  function loadGroup(g) { setSessionIds(g.ids); }
  function deleteGroup(id) { set(s => ({...s, savedGroups: (s.savedGroups||[]).filter(g=>g.id!==id)})); }
  
  function submitSession(){
    setErr(""); setSuccess("");
    if(sessionIds.some(id => !id)) return setErr(t("err_select_players"));
    if(new Set(sessionIds).size !== 4) return setErr(t("err_duplicate"));

    const matchesToLog = [];
    for(let i=0; i<3; i++) {
        const s1 = parseInt(roundScores[i].t1);
        const s2 = parseInt(roundScores[i].t2);
        if (isNaN(s1) || isNaN(s2)) return setErr(`Round ${i+1}: ${t("err_valid_scores")}`);
        const r = validatePickleballScore(s1, s2, winTo, winBy);
        if(!r) return setErr(`Round ${i+1}: ${t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}`);
        const winnerTeam = r.winner;
        const t1w = winnerTeam === 0 ? 1 : 0;
        const t2w = winnerTeam === 1 ? 1 : 0;
        const t1Ids = [sessionIds[matchups[i].t1[0]], sessionIds[matchups[i].t1[1]]];
        const t2Ids = [sessionIds[matchups[i].t2[0]], sessionIds[matchups[i].t2[1]]];
        matchesToLog.push({id:genId(),type:"doubles",date:new Date().toISOString(),teams:[t1Ids, t2Ids],winnerTeam,games:[{a:s1, b:s2, winner: winnerTeam}],teamNames:{t1:null,t2:null},winTo,winBy,team1Wins:t1w,team2Wins:t2w,venue:"Session Play", notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest"});
    }

    // Compute rich summary before and after
    const allMatchesAfter = [...(state.matches||[]), ...matchesToLog];
    const { derivedPlayers: postPlayers } = replayAllMatches(state.players, allMatchesAfter);
    const summary = computeSessionSummary(matchesToLog, players, postPlayers);
    setSessionSummary(summary);

    set(s => ({...s, matches: allMatchesAfter}));
    setRoundScores([{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
    setSessionIds(["","","",""]);
    setChosenSplit(null);
    setNotes(""); 
  }

  // Team Suggester: compute balanced pairings when 4 players are selected
  const ratingMap = Object.fromEntries(players.map(p => [p.id, p.ratingDoubles || 3]));
  const suggestions = isReady ? suggestBalancedTeams(sessionIds, ratingMap) : [];

  // Share recap text
  const shareRecap = (summary) => {
    if (!summary) return;
    const lines = [`🏓 ${t("session_summary_title")}`, ''];
    summary.matchSummaries.forEach((m, i) => {
      lines.push(`Game ${i+1}: ${m.t1} vs ${m.t2} → ${m.score} (${m.winnerLabel} wins)`);
    });
    lines.push('');
    lines.push(`🏆 MVP: ${summary.mvp?.name} (${summary.mvp?.wins}W ${summary.mvp?.losses}L, ${summary.mvp?.delta >= 0 ? '+' : ''}${summary.mvp?.delta.toFixed(3)})`);
    lines.push(`📈 Most Improved: ${summary.mostImproved?.name} (${summary.mostImproved?.delta >= 0 ? '+' : ''}${summary.mostImproved?.delta.toFixed(3)})`);
    lines.push(`🎯 Total points: ${summary.totalPts}`);
    const text = lines.join('\n');
    if (navigator.share) navigator.share({ title: 'PickleRank Session', text });
    else { navigator.clipboard.writeText(text); }
  };

  return (
    <div style={S.view}>
      <MatchesSubNav active="session" nav={nav} theme={theme} />

      {/* ── SESSION SUMMARY MODAL ─────────────────────────────────────── */}
      {sessionSummary && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16*z}}>
          <div style={{background:theme.card,borderRadius:16*z,padding:20*z,width:"100%",maxWidth:420*z,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
            <div style={{textAlign:"center",fontSize:20*z,fontWeight:800,marginBottom:16*z,color:theme.accent}}>{t("session_summary_title")}</div>

            {/* Player stats */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8*z,marginBottom:16*z}}>
              {sessionSummary.playerStats.map(ps => (
                <div key={ps.id} style={{flex:"1 1 45%",background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10*z,padding:10*z}}>
                  <div style={{fontWeight:700,fontSize:12*z,color:theme.text,marginBottom:3*z}}>{ps.name}</div>
                  <div style={{fontSize:11*z,color:theme.sub}}>{ps.wins}W {ps.losses}L</div>
                  <div style={{fontSize:12*z,fontWeight:700,color:ps.delta>=0?"#50c878":"#e05050",marginTop:2*z}}>
                    {ps.delta>=0?"+":""}{ps.delta.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>

            {/* Highlights */}
            <div style={{display:"flex",flexDirection:"column",gap:8*z,marginBottom:16*z}}>
              <div style={{background:"rgba(80,200,120,0.1)",border:"1px solid #50c87844",borderRadius:10*z,padding:10*z}}>
                <div style={{fontSize:10*z,color:theme.sub,marginBottom:2*z}}>🏆 {t("session_summary_mvp")}</div>
                <div style={{fontWeight:700,color:"#50c878"}}>{sessionSummary.mvp?.name} — {sessionSummary.mvp?.wins}W {sessionSummary.mvp?.losses}L</div>
              </div>
              <div style={{background:"rgba(64,160,224,0.1)",border:"1px solid #40a0e044",borderRadius:10*z,padding:10*z}}>
                <div style={{fontSize:10*z,color:theme.sub,marginBottom:2*z}}>📈 {t("session_summary_improved")}</div>
                <div style={{fontWeight:700,color:"#40a0e0"}}>{sessionSummary.mostImproved?.name} {sessionSummary.mostImproved?.delta>=0?"+":""}{sessionSummary.mostImproved?.delta.toFixed(3)}</div>
              </div>
              <div style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10*z,padding:10*z}}>
                <div style={{fontSize:10*z,color:theme.sub,marginBottom:2*z}}>🎯 {t("session_summary_total_pts")}</div>
                <div style={{fontWeight:700,color:theme.text}}>{sessionSummary.totalPts}</div>
              </div>
            </div>

            {/* Match results */}
            <div style={{fontSize:11*z,fontWeight:700,color:theme.sub,marginBottom:6*z}}>{t("session_summary_results")}</div>
            {sessionSummary.matchSummaries.map((m, i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11*z,padding:`${5*z}px 0`,borderBottom:`1px solid ${theme.border}`}}>
                <span style={{color:theme.sub}}>Game {i+1}</span>
                <span style={{color:theme.text}}>{m.t1} vs {m.t2}</span>
                <span style={{fontWeight:700,color:"#50c878"}}>{m.score}</span>
              </div>
            ))}

            <div style={{display:"flex",gap:8*z,marginTop:16*z}}>
              <button style={{...S.btnSecondary,flex:1,marginTop:0}} onClick={() => shareRecap(sessionSummary)}>{t("session_summary_share")}</button>
              <button style={{...S.btnPrimary,flex:1,marginTop:0}} onClick={() => setSessionSummary(null)}>{t("session_summary_close")}</button>
            </div>
          </div>
        </div>
      )}

      <Sec title={t("select_foursome")} theme={theme}>
        {savedGroups.length > 0 && (
          <div style={{marginBottom: 16*z}}>
            <label style={S.label}>{t("load_saved_group")}</label>
            <div style={{display:"flex", gap:8*z, flexWrap:"wrap"}}>
              {savedGroups.map(g => (
                <div key={g.id} style={{display:"flex", alignItems:"center", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z}}>
                  <button style={{...S.btnSecondary, marginTop:0, border:"none", background:"none", padding:"6px 10px"}} onClick={()=>loadGroup(g)}>{g.name}</button>
                  {isAdmin && <button style={{...S.iconBtn, fontSize:12*z, padding:"0 8px", color:theme.sub}} onClick={()=>deleteGroup(g.id)}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10*z}}>
          {[0,1,2,3].map(i => {
            const pid = sessionIds[i];
            const form = pid ? getRecentForm(pid, state.matches) : [];
            return (
              <div key={i}>
                <Sel opts={opts} value={pid} onChange={v=>upP(i,v)} placeholder={`Player ${i+1}`} theme={theme}/>
                {form.length > 0 && (
                  <div style={{display:"flex",gap:3*z,marginTop:3*z,justifyContent:"center"}}>
                    {form.map((r,j) => (
                      <span key={j} style={{fontSize:9*z,fontWeight:800,color:r==="W"?"#50c878":"#e05050",
                        background:r==="W"?"rgba(80,200,120,0.15)":"rgba(224,80,80,0.15)",
                        borderRadius:3*z,padding:`1px ${3*z}px`}}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}

        {/* ── BALANCED TEAM SUGGESTER ─────────────────────────────────── */}
        {isReady && suggestions.length > 0 && (
          <div style={{marginTop:12*z, padding:12*z, background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:10*z}}>
            <div style={{fontSize:12*z, fontWeight:700, color:theme.accent, marginBottom:4*z}}>{t("team_suggester_sec")}</div>
            <div style={{fontSize:10*z, color:theme.sub, marginBottom:10*z}}>{t("team_suggester_desc")}</div>
            {suggestions.map((s, i) => {
              const isChosen = chosenSplit === i;
              const isBest = i === 0;
              return (
                <div key={i} onClick={() => setChosenSplit(i)} style={{
                  padding:`${8*z}px ${10*z}px`, marginBottom:6*z, borderRadius:8*z, cursor:"pointer",
                  border:`2px solid ${isChosen ? theme.accent : isBest ? "#50c87844" : theme.border}`,
                  background: isChosen ? theme.accent+"18" : isBest ? "rgba(80,200,120,0.05)" : "transparent",
                  transition:"all 0.15s"
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11*z, fontWeight:700, color: isBest ? "#50c878" : theme.sub}}>
                      {isBest ? `✅ ${t("team_fairest")}` : `Option ${i+1}`}
                    </span>
                    <span style={{fontSize:10*z, color:theme.sub}}>{t("team_balance_label")} {s.gap.toFixed(3)}</span>
                  </div>
                  <div style={{fontSize:12*z, marginTop:4*z, color:theme.text}}>
                    <strong>{getName(s.t1[0])} & {getName(s.t1[1])}</strong>
                    <span style={{color:theme.sub}}> ({s.avg1.toFixed(2)}) </span>
                    vs
                    <strong> {getName(s.t2[0])} & {getName(s.t2[1])}</strong>
                    <span style={{color:theme.sub}}> ({s.avg2.toFixed(2)})</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isReady && (
          <div style={{marginTop: 12*z}}>
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
            <div style={{display:"flex", gap:8*z}}>
              <input style={{...S.input, flex:1}} placeholder="e.g. The Usuals" value={groupName} onChange={e=>setGroupName(e.target.value)} />
              <button style={{...S.btnPrimary}} onClick={saveCurrentGroup}>{t("save_group_btn")}</button>
            </div>
          </div>
        )}
      </Sec>

      {isReady&&(
        <Sec title={t("rr_matchups")} theme={theme}>
          <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
            {matchups.map((m, i) => (
              <div key={i} style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:12*z, padding:12*z}}>
                <div style={{fontSize:12*z, fontWeight:700, color:theme.accent, marginBottom:8*z}}>{t("round")} {i+1}</div>
                <div style={S.gameRow}>
                  <span style={{flex:1, fontSize:13*z, color:theme.text}}>{getName(sessionIds[m.t1[0]])}/{getName(sessionIds[m.t1[1]])}</span>
                  <input style={S.scoreInput} type="number" placeholder="T1" value={roundScores[i].t1} onChange={e=>updScore(i, "t1", e.target.value)}/>
                  <span style={{color:theme.sub}}>–</span>
                  <input style={S.scoreInput} type="number" placeholder="T2" value={roundScores[i].t2} onChange={e=>updScore(i, "t2", e.target.value)}/>
                  <span style={{flex:1, fontSize:13*z, color:theme.text, textAlign:"right"}}>{getName(sessionIds[m.t2[0]])}/{getName(sessionIds[m.t2[1]])}</span>
                </div>
              </div>
            ))}
            
            <div>
              <label style={S.label}>Session Notes (Optional)</label>
              <input style={S.input} placeholder="e.g. Really hot day, great rallies..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>

            {err && <Err msg={err} theme={theme}/>}
            <button style={S.btnBig} onClick={submitSession}>{t("log_match_btn")}</button>
          </div>
        </Sec>
      )}
    </div>
  );
}

export function KingOfCourt({ players, state, set, nav, theme, isAdmin, user }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [sessionIds, setSessionIds] = useState(["","","",""]);
  const [winTo,setWinTo]=useState(11);
  const [winBy,setWinBy]=useState(1);
  const [roundScores, setRoundScores] = useState([{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
  const [notes, setNotes] = useState(""); 
  const [err, setErr] = useState(""), [success, setSuccess] = useState("");
  
  useEffect(() => {
    if (user?.myPlayerId && !sessionIds[0]) {
       setSessionIds(ids => [user.myPlayerId, ids[1], ids[2], ids[3]]);
    }
  }, [user?.myPlayerId]);

  const filledIds = sessionIds.filter(Boolean);
  const hasDupes = new Set(filledIds).size < filledIds.length;
  const isReady = filledIds.length === 4 && !hasDupes;

  const rawOpts = players.map(p=>({value:p.id,label:p.name}));
  const opts = sortOptionsAlpha(rawOpts, state.favoredPlayerIds);
  const getName = id => players.find(p=>p.id===id)?.name??"?";
  const matchups = [{ id: 1, t1: [0, 1], t2: [2, 3] }, { id: 2, t1: [0, 2], t2: [1, 3] }, { id: 3, t1: [0, 3], t2: [1, 2] }];
  
  function upP(idx,val){const n=[...sessionIds];n[idx]=val;setSessionIds(n);}
  function updScore(rIdx, team, val){
     const cleanVal = val.replace(/-/g, '');
     setRoundScores(rs => rs.map((r, i) => i === rIdx ? {...r, [team]: cleanVal} : r));
  }
  
  const kotcLeaderboard = sessionIds.map((id, pIdx) => {
      let wins = 0; let pointsFor = 0; let pointsAgainst = 0;
      if (id) {
          matchups.forEach((matchup, rIdx) => {
              const s1 = parseInt(roundScores[rIdx].t1);
              const s2 = parseInt(roundScores[rIdx].t2);
              if (!isNaN(s1) && !isNaN(s2)) {
                  const isT1 = matchup.t1.includes(pIdx);
                  const isT2 = matchup.t2.includes(pIdx);
                  if (isT1) { pointsFor += s1; pointsAgainst += s2; if (s1 > s2) wins++; } 
                  else if (isT2) { pointsFor += s2; pointsAgainst += s1; if (s2 > s1) wins++; }
              }
          });
      }
      return { id, pIdx, wins, diff: pointsFor - pointsAgainst };
  }).sort((a,b) => b.wins - a.wins || b.diff - a.diff);

  function submitTournament(){
    setErr(""); setSuccess("");
    if(sessionIds.some(id => !id)) return setErr(t("err_select_players"));
    if(new Set(sessionIds).size !== 4) return setErr(t("err_duplicate"));

    const matchesToLog = [];
    for(let i=0; i<3; i++) {
        const s1 = parseInt(roundScores[i].t1);
        const s2 = parseInt(roundScores[i].t2);
        if (isNaN(s1) || isNaN(s2)) return setErr(`Round ${i+1}: ${t("err_valid_scores")}`);
        const r = validatePickleballScore(s1, s2, winTo, winBy);
        if(!r) return setErr(`Round ${i+1}: ${t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy)}`);
        const winnerTeam = r.winner;
        const t1w = winnerTeam === 0 ? 1 : 0;
        const t2w = winnerTeam === 1 ? 0 : 1;
        const t1Ids = [sessionIds[matchups[i].t1[0]], sessionIds[matchups[i].t1[1]]];
        const t2Ids = [sessionIds[matchups[i].t2[0]], sessionIds[matchups[i].t2[1]]];
        matchesToLog.push({id:genId(),type:"doubles",date:new Date().toISOString(),teams:[t1Ids, t2Ids],winnerTeam,games:[{a:s1, b:s2, winner: winnerTeam}],teamNames:{t1:null,t2:null},winTo,winBy,team1Wins:t1w,team2Wins:t2w,venue:"King of the Court", notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest"});
    }
    set(s => ({...s, matches: [...(s.matches||[]), ...matchesToLog]}));
    setSuccess(`✅ 3 Matches Logged. King Crowned: ${getName(kotcLeaderboard[0].id)}!`); 
    setRoundScores([{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
    setSessionIds(["","","",""]);
    setNotes(""); 
  }

  return (
    <div style={S.view}>
      <MatchesSubNav active="kotc" nav={nav} theme={theme} />
      {success && <div style={{background:"rgba(80,200,120,0.15)", color:"#50c878", padding:10*z, borderRadius:8*z, marginBottom:12*z, fontSize:13*z, fontWeight:"bold"}}>{success}</div>}
      
      <Sec title={t("kotc")} theme={theme}>
        <div style={{fontSize:12*z, color:theme.sub, marginBottom:12*z}}>{t("kotc_desc")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10*z, marginBottom:16*z}}>
          {[0,1,2,3].map(i=><Sel key={i} opts={opts} value={sessionIds[i]} onChange={v=>upP(i,v)} placeholder={`Player ${i+1}`} theme={theme}/>)}
        </div>

        {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}

        {isReady && (
          <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
            <div style={{display:"flex", gap:12*z}}>
              <div style={{flex:1}}>
                <label style={S.label}>{t("win_to_lbl")}</label>
                <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
              </div>
              <div style={{flex:1}}>
                <label style={S.label}>{t("win_by_lbl")}</label>
                <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
              </div>
            </div>

            {matchups.map((m, i) => (
              <div key={i} style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:12*z, padding:12*z}}>
                <div style={{fontSize:12*z, fontWeight:700, color:theme.accent, marginBottom:8*z}}>{t("round")} {i+1}</div>
                <div style={S.gameRow}>
                  <span style={{flex:1, fontSize:13*z, color:theme.text}}>{getName(sessionIds[m.t1[0]])}/{getName(sessionIds[m.t1[1]])}</span>
                  <input style={S.scoreInput} type="number" placeholder="T1" value={roundScores[i].t1} onChange={e=>updScore(i, "t1", e.target.value)}/>
                  <span style={{color:theme.sub}}>–</span>
                  <input style={S.scoreInput} type="number" placeholder="T2" value={roundScores[i].t2} onChange={e=>updScore(i, "t2", e.target.value)}/>
                  <span style={{flex:1, fontSize:13*z, color:theme.text, textAlign:"right"}}>{getName(sessionIds[m.t2[0]])}/{getName(sessionIds[m.t2[1]])}</span>
                </div>
              </div>
            ))}
            
            <div>
              <label style={S.label}>Event Notes (Optional)</label>
              <input style={S.input} placeholder="e.g. Epic comebacks..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>

            {err && <Err msg={err} theme={theme}/>}
            <button style={S.btnBig} onClick={submitTournament}>{t("log_match_btn")}</button>
          </div>
        )}
      </Sec>
    </div>
  );
}

export function TournamentMode({ players, state, set, nav, theme, user }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  
  const [step, setStep] = useState(0); 
  const [teams, setTeams] = useState([["",""], ["",""], ["",""], ["",""]]);
  const [winTo, setWinTo] = useState(11);
  const [winBy, setWinBy] = useState(2);
  const [scores, setScores] = useState({ sf1a:"", sf1b:"", sf2a:"", sf2b:"", fina:"", finb:"" });
  const [notes, setNotes] = useState(""); 
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const filledTeams = teams.flat().filter(Boolean);
  const hasDupes = new Set(filledTeams).size < filledTeams.length;

  const rawOpts = players.map(p => ({ value: p.id, label: p.name }));
  const opts = sortOptionsAlpha(rawOpts, state.favoredPlayerIds);
  const getName = id => players.find(p => p.id === id)?.name ?? "TBD";

  function upT(tIdx, pIdx, val) {
    const n = [...teams];
    n[tIdx] = [...n[tIdx]];
    n[tIdx][pIdx] = val;
    setTeams(n);
    setErr(""); 
  }

  function upS(key, val) {
    setScores(s => ({...s, [key]: val.replace(/-/g, '')}));
  }

  function start() {
    setErr("");
    if(hasDupes) return setErr(t("err_duplicate"));
    const ids = teams.flat();
    if(ids.some(id => !id)) return setErr(t("err_select_players"));
    setStep(1);
  }

  function logTournament() {
    setErr(""); setSuccess("");
    
    const s_sf1a = parseInt(scores.sf1a), s_sf1b = parseInt(scores.sf1b);
    const s_sf2a = parseInt(scores.sf2a), s_sf2b = parseInt(scores.sf2b);
    const s_fina = parseInt(scores.fina), s_finb = parseInt(scores.finb);

    if ([s_sf1a, s_sf1b, s_sf2a, s_sf2b, s_fina, s_finb].some(isNaN)) return setErr(t("err_valid_scores"));

    const r_sf1 = validatePickleballScore(s_sf1a, s_sf1b, winTo, winBy);
    const r_sf2 = validatePickleballScore(s_sf2a, s_sf2b, winTo, winBy);
    const r_fin = validatePickleballScore(s_fina, s_finb, winTo, winBy);

    if(!r_sf1 || !r_sf2 || !r_fin) return setErr(t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy));

    const t1 = teams[0], t2 = teams[1], t3 = teams[2], t4 = teams[3];
    const win_sf1 = r_sf1.winner === 0 ? t1 : t2;
    const win_sf2 = r_sf2.winner === 0 ? t3 : t4;

    const dateStr = new Date().toISOString();
    
    const m1 = { id: genId(), type: "doubles", date: dateStr, teams: [t1, t2], winnerTeam: r_sf1.winner, games: [{a:s_sf1a, b:s_sf1b, winner: r_sf1.winner}], teamNames: {t1:null, t2:null}, winTo, winBy, team1Wins: r_sf1.winner===0?1:0, team2Wins: r_sf1.winner===1?1:0, venue: "Tournament SF1", notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest" };
    const m2 = { id: genId(), type: "doubles", date: dateStr, teams: [t3, t4], winnerTeam: r_sf2.winner, games: [{a:s_sf2a, b:s_sf2b, winner: r_sf2.winner}], teamNames: {t1:null, t2:null}, winTo, winBy, team1Wins: r_sf2.winner===0?1:0, team2Wins: r_sf2.winner===1?1:0, venue: "Tournament SF2", notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest" };
    const m3 = { id: genId(), type: "doubles", date: dateStr, teams: [win_sf1, win_sf2], winnerTeam: r_fin.winner, games: [{a:s_fina, b:s_finb, winner: r_fin.winner}], teamNames: {t1:null, t2:null}, winTo, winBy, team1Wins: r_fin.winner===0?1:0, team2Wins: r_fin.winner===1?1:0, venue: "Tournament Final", notes:notes.trim()||null, loggedBy: user?.myPlayerId || "guest" };

    set(s => ({...s, matches: [...(s.matches||[]), m1, m2, m3]}));
    
    setSuccess("✅ Tournament Logged! Champions: " + getName(win_sf1 === r_fin.winner ? win_sf1[0] : win_sf2[0]) + " & " + getName(win_sf1 === r_fin.winner ? win_sf1[1] : win_sf2[1]));
    setStep(0);
    setTeams([["",""],["",""],["",""],["",""]]);
    setScores({ sf1a:"", sf1b:"", sf2a:"", sf2b:"", fina:"", finb:"" });
    setNotes(""); 
  }

  return (
    <div style={S.view}>
      <MatchesSubNav active="tourney" nav={nav} theme={theme} />
      
      {success && <div style={{background:"rgba(80,200,120,0.15)", color:"#50c878", padding:10*z, borderRadius:8*z, marginBottom:12*z, fontSize:13*z, fontWeight:"bold"}}>{success}</div>}
      
      {step === 0 && (
        <Sec title={t("tourney_setup")} theme={theme}>
          <div style={{display:"flex", gap:12*z, marginBottom:16*z}}>
            <div style={{flex:1}}>
              <label style={S.label}>{t("win_to_lbl")}</label>
              <Sel opts={WIN_TO_OPTIONS.map(v=>({value:v, label:String(v)}))} value={winTo} onChange={v=>setWinTo(parseInt(v))} placeholder="" theme={theme} />
            </div>
            <div style={{flex:1}}>
              <label style={S.label}>{t("win_by_lbl")}</label>
              <Sel opts={[{value:1, label:"1 "+t("point")}, {value:2, label:"2 "+t("points")}]} value={winBy} onChange={v=>setWinBy(parseInt(v))} placeholder="" theme={theme} />
            </div>
          </div>
          
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12*z}}>
            {teams.map((tArr, i) => (
              <div key={i} style={{background:theme.card, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`}}>
                <div style={{fontSize:12*z, fontWeight:700, color:theme.sub, marginBottom:8*z}}>{t("team")} {i+1}</div>
                <Sel opts={opts} value={tArr[0]} onChange={v=>upT(i, 0, v)} placeholder={t("player_1")} theme={theme}/>
                <div style={{height:8*z}}/>
                <Sel opts={opts} value={tArr[1]} onChange={v=>upT(i, 1, v)} placeholder={t("player_2")} theme={theme}/>
              </div>
            ))}
          </div>
          
          {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
          {err && !hasDupes && <Err msg={err} theme={theme}/>}
          
          <button 
            style={{...S.btnPrimary, marginTop:16*z, width:"100%", opacity: hasDupes ? 0.5 : 1, cursor: hasDupes ? "not-allowed" : "pointer"}} 
            disabled={hasDupes} 
            onClick={start}>
            {t("start_tournament")}
          </button>
        </Sec>
      )}

      {step === 1 && (
        <Sec title={t("tournament")} theme={theme}>
          <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
            <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:12*z, padding:12*z}}>
              <div style={{fontSize:12*z, fontWeight:700, color:theme.accent, marginBottom:8*z}}>{t("sf")} 1</div>
              <div style={S.gameRow}>
                <span style={{flex:1, fontSize:13*z, color:theme.text}}>{getName(teams[0][0])}/{getName(teams[0][1])}</span>
                <input style={S.scoreInput} type="number" placeholder="T1" value={scores.sf1a} onChange={e=>upS("sf1a", e.target.value)}/>
                <span style={{color:theme.sub}}>–</span>
                <input style={S.scoreInput} type="number" placeholder="T2" value={scores.sf1b} onChange={e=>upS("sf1b", e.target.value)}/>
                <span style={{flex:1, fontSize:13*z, color:theme.text, textAlign:"right"}}>{getName(teams[1][0])}/{getName(teams[1][1])}</span>
              </div>
            </div>
            <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:12*z, padding:12*z}}>
              <div style={{fontSize:12*z, fontWeight:700, color:theme.accent, marginBottom:8*z}}>{t("sf")} 2</div>
              <div style={S.gameRow}>
                <span style={{flex:1, fontSize:13*z, color:theme.text}}>{getName(teams[2][0])}/{getName(teams[2][1])}</span>
                <input style={S.scoreInput} type="number" placeholder="T3" value={scores.sf2a} onChange={e=>upS("sf2a", e.target.value)}/>
                <span style={{color:theme.sub}}>–</span>
                <input style={S.scoreInput} type="number" placeholder="T4" value={scores.sf2b} onChange={e=>upS("sf2b", e.target.value)}/>
                <span style={{flex:1, fontSize:13*z, color:theme.text, textAlign:"right"}}>{getName(teams[3][0])}/{getName(teams[3][1])}</span>
              </div>
            </div>
            <div style={{background:theme.card, border:`2px solid ${theme.accent}`, borderRadius:12*z, padding:12*z}}>
              <div style={{fontSize:14*z, fontWeight:800, color:theme.accent, marginBottom:8*z}}>🏆 {t("final")}</div>
              <div style={S.gameRow}>
                <span style={{flex:1, fontSize:13*z, color:theme.text}}>{t("winner")} SF1</span>
                <input style={S.scoreInput} type="number" placeholder="W1" value={scores.fina} onChange={e=>upS("fina", e.target.value)}/>
                <span style={{color:theme.sub}}>–</span>
                <input style={S.scoreInput} type="number" placeholder="W2" value={scores.finb} onChange={e=>upS("finb", e.target.value)}/>
                <span style={{flex:1, fontSize:13*z, color:theme.text, textAlign:"right"}}>{t("winner")} SF2</span>
              </div>
            </div>
            
            <div>
              <label style={S.label}>Tournament Notes (Optional)</label>
              <input style={S.input} placeholder="e.g. Injury in SF2, great finals..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>

          </div>
          {err && <Err msg={err} theme={theme}/>}
          <div style={{display:"flex", gap:10*z, marginTop:16*z}}>
            <button style={{...S.btnBig, flex:1}} onClick={logTournament}>{t("log_match_btn")}</button>
            <button style={{...S.btnSecondary, marginTop:0}} onClick={() => setStep(0)}>{t("cancel")}</button>
          </div>
        </Sec>
      )}
    </div>
  );
}