import React, { useState } from 'react';
import { t, genId, validatePickleballScore, isoToDatetimeLocal, sortOptionsAlpha, replayAllMatches } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Err, Sel, MatchEloBreakdown, ConfirmInline, MatchEditModal, MatchCard } from '../components/Shared.jsx';
import { MatchesSubNav } from '../components/Navigation.jsx';

export function LogMatch({state,players,set,nav,theme}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [type,setType]=useState("singles"), [winTo,setWinTo]=useState(11), [winBy,setWinBy]=useState(2);
  const [sp,setSp]=useState({s1:"",s2:"",d1a:"",d1b:"",d2a:"",d2b:""});
  const [games,setGames]=useState([{a:"",b:""}]);
  const [tnames,setTnames]=useState({t1:"",t2:""});
  const [venue,setVenue]=useState(""), [err,setErr]=useState(""), [result,setResult]=useState(null);
  const [matchDate,setMatchDate]=useState(()=>isoToDatetimeLocal(new Date().toISOString()));
  
  function upSp(k,v){setSp(p=>({...p,[k]:v}));}
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
    const teams=getTeams(), allIds=teams.flat().filter(Boolean);
    if(type==="singles"&&(!sp.s1||!sp.s2)) return setErr(t("err_select_players"));
    if(type==="doubles"&&allIds.length<4) return setErr(t("err_select_4"));
    if(new Set(allIds).size<allIds.length) return setErr(t("err_duplicate"));
    
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
      team1Wins:t1w,team2Wins:t2w,venue:venue.trim()||null};

    const newMatchArray = [...(state.matches||[]), match];
    const { derivedPlayers, derivedMatches } = replayAllMatches(state.players, newMatchArray);
    setResult({ match: derivedMatches.find(m => m.id === match.id), players: derivedPlayers });
    set(s => ({...s, matches: newMatchArray}));
    setGames([{a:"",b:""}]); 
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
            <input style={S.input} type="number" min="1" value={winTo} onChange={e=>setWinTo(parseInt(e.target.value)||1)} />
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
          <label style={{...S.label,marginTop:10*z}}>{t("player_2")}</label>
          <Sel opts={opts} value={sp.s2} onChange={v=>upSp("s2",v)} placeholder={t("select_prompt")} theme={theme}/>
        </Sec>
      ):(
        <Sec title={t("teams")} theme={theme}>
          <label style={S.label}>{t("team_name_opt")}</label>
          <input style={S.input} value={tnames.t1} onChange={e=>upTn("t1",e.target.value)} placeholder="e.g. The Bangers"/>
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <div style={{flex:1}}><label style={S.label}>{t("player_a")}</label><Sel opts={opts} value={sp.d1a} onChange={v=>upSp("d1a",v)} placeholder={t("select_prompt")} theme={theme}/></div>
            <div style={{flex:1}}><label style={S.label}>{t("player_b")}</label><Sel opts={opts} value={sp.d1b} onChange={v=>upSp("d1b",v)} placeholder={t("select_prompt")} theme={theme}/></div>
          </div>
          <div style={{borderTop:`1px solid ${theme.border}`,margin:"14px 0"}}/>
          <label style={S.label}>{t("team_name_opt")}</label>
          <input style={S.input} value={tnames.t2} onChange={e=>upTn("t2",e.target.value)} placeholder="e.g. The Dinkers"/>
          <div style={{display:"flex",gap:8*z,marginTop:8*z}}>
            <div style={{flex:1}}><label style={S.label}>{t("player_a")}</label><Sel opts={opts} value={sp.d2a} onChange={v=>upSp("d2a",v)} placeholder={t("select_prompt")} theme={theme}/></div>
            <div style={{flex:1}}><label style={S.label}>{t("player_b")}</label><Sel opts={opts} value={sp.d2b} onChange={v=>upSp("d2b",v)} placeholder={t("select_prompt")} theme={theme}/></div>
          </div>
        </Sec>
      )}
      <Sec title={t("game_scores_sec")} theme={theme}>
        <div style={{fontSize:12*z,color:theme.sub,marginBottom:10*z}}>{t("score_win_by_2").replace("{winTo}", winTo).replace("{winBy}", winBy)}</div>
        {games.map((g,i)=>(
          <div key={i} style={S.gameRow}>
            <span style={{color:theme.sub,fontSize:12*z,minWidth:50*z}}>Game {i+1}</span>
            <input style={S.scoreInput} type="number" min="0" max="30" placeholder="T1" value={g.a} onChange={e=>updGame(i,"a",e.target.value)}/>
            <span style={{color:theme.sub}}>–</span>
            <input style={S.scoreInput} type="number" min="0" max="30" placeholder="T2" value={g.b} onChange={e=>updGame(i,"b",e.target.value)}/>
            {games.length>1&&<button style={S.btnDanger} onClick={()=>rmGame(i)}>✕</button>}
          </div>
        ))}
        <button style={S.btnSecondary} onClick={addGame}>{t("add_game_btn")}</button>
      </Sec>
      <Sec title={t("date_venue_sec")} theme={theme}>
        <label style={S.label}>{t("date_time_lbl")}</label>
        <input style={{...S.input,marginBottom:12*z}} type="datetime-local" value={matchDate} onChange={e=>setMatchDate(e.target.value)}/>
        <label style={S.label}>{t("venue_opt")}</label>
        <input style={S.input} placeholder="e.g. Riverside Courts, Court 3" value={venue} onChange={e=>setVenue(e.target.value)}/>
      </Sec>
      {err&&<Err msg={err} theme={theme}/>}
      <button style={S.btnBig} onClick={submit}>{t("log_match_btn")}</button>
    </div>
  );
}

export function SessionMode({ players, state, set, nav, theme, isAdmin }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [sessionIds, setSessionIds] = useState(["","","",""]);
  const [winTo,setWinTo]=useState(11);
  const [winBy,setWinBy]=useState(2);
  const [activeRound, setActiveRound] = useState(null);
  const [scores, setScores] = useState({t1:11,t2:9});
  const [err, setErr] = useState(""), [success, setSuccess] = useState("");
  const [groupName, setGroupName] = useState("");
  const savedGroups = state.savedGroups || [];
  const isReady = sessionIds.every(id=>id!=="") && new Set(sessionIds).size===4;
  const rawOpts = players.map(p=>({value:p.id,label:p.name}));
  const opts = sortOptionsAlpha(rawOpts, state.favoredPlayerIds);
  const getName = id => players.find(p=>p.id===id)?.name??"?";
  const rounds = [{id:1,t1:[sessionIds[0],sessionIds[1]],t2:[sessionIds[2],sessionIds[3]]},{id:2,t1:[sessionIds[0],sessionIds[2]],t2:[sessionIds[1],sessionIds[3]]},{id:3,t1:[sessionIds[0],sessionIds[3]],t2:[sessionIds[1],sessionIds[2]]}];
  function upP(idx,val){const n=[...sessionIds];n[idx]=val;setSessionIds(n);}
  function adjustScore(team,delta){setScores(s=>({...s,[team]:Math.max(0,s[team]+delta)}));}
  function saveCurrentGroup() {
    if(!isReady || !groupName.trim()) return;
    set(s => ({...s, savedGroups: [...(s.savedGroups||[]), { id: genId(), name: groupName.trim(), ids: sessionIds }]}));
    setGroupName(""); setSuccess(t("save") + " OK");
  }
  function loadGroup(g) { setSessionIds(g.ids); }
  function deleteGroup(id) { set(s => ({...s, savedGroups: (s.savedGroups||[]).filter(g=>g.id!==id)})); }
  function submitRound(round){
    setErr(""); setSuccess("");
    const r=validatePickleballScore(scores.t1,scores.t2,winTo,winBy);
    if(!r) return setErr(t("err_invalid_score_fmt").replace("{winTo}", winTo).replace("{winBy}", winBy));
    const winnerTeam=r.winner, t1w=winnerTeam===0?1:0, t2w=winnerTeam===1?1:0;
    const match={id:genId(),type:"doubles",date:new Date().toISOString(),teams:[round.t1,round.t2],winnerTeam,games:[{a:scores.t1,b:scores.t2,winner:winnerTeam}],teamNames:{t1:null,t2:null},winTo,winBy,team1Wins:t1w,team2Wins:t2w,venue:"Session Play"};
    set(s => ({...s, matches: [...(s.matches||[]), match]}));
    setSuccess("Round " + round.id + " OK"); setActiveRound(null);
  }
  return (
    <div style={S.view}>
      <MatchesSubNav active="session" nav={nav} theme={theme} />
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
          {[0,1,2,3].map(i=><Sel key={i} opts={opts} value={sessionIds[i]} onChange={v=>upP(i,v)} placeholder={`Player ${i+1}`} theme={theme}/>)}
        </div>
        {isReady && (
          <div style={{marginTop: 12*z}}>
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
            <div style={{display:"flex", gap:8*z}}>
              <input style={{...S.input, flex:1}} placeholder="e.g. The Usuals" value={groupName} onChange={e=>setGroupName(e.target.value)} />
              <button style={{...S.btnPrimary}} onClick={saveCurrentGroup}>{t("save_group_btn")}</button>
            </div>
          </div>
        )}
      </Sec>
      {isReady&&(
        <Sec title={t("rr_matchups")} theme={theme}>
          {success&&<div style={{background:"rgba(80,200,120,0.15)",color:"#50c878",padding:10*z,borderRadius:8*z,marginBottom:12*z,fontSize:13*z,fontWeight:"bold"}}>✅ {success}</div>}
          {rounds.map(r=>(
            <div key={r.id} style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:12*z,padding:12*z,marginBottom:10*z}}>
              <div style={{fontSize:13*z,fontWeight:700,marginBottom:8*z,color:theme.accent}}>Round {r.id}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:14*z}}>
                <div style={{flex:1}}>{getName(r.t1[0])} & {getName(r.t1[1])}</div>
                <div style={{margin:"0 10px",fontSize:11*z,color:theme.sub,fontWeight:"bold"}}>VS</div>
                <div style={{flex:1,textAlign:"right"}}>{getName(r.t2[0])} & {getName(r.t2[1])}</div>
              </div>
              {activeRound===r.id?(
                <div style={{marginTop:16*z,borderTop:`1px solid ${theme.border}`,paddingTop:12*z}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:20*z}}>
                    {["t1","t2"].map(team=>(
                      <div key={team} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8*z}}>
                        <button style={{...S.btnSecondary,fontSize:24*z,padding:"10px 20px"}} onClick={()=>adjustScore(team,1)}>+</button>
                        <div style={{fontSize:28*z,fontWeight:800}}>{scores[team]}</div>
                        <button style={{...S.btnSecondary,fontSize:24*z,padding:"10px 20px"}} onClick={()=>adjustScore(team,-1)}>-</button>
                      </div>
                    ))}
                  </div>
                  {err&&<Err msg={err} theme={theme}/>}
                  <div style={{display:"flex",gap:10*z,marginTop:16*z}}>
                    <button style={{...S.btnPrimary,flex:1}} onClick={()=>submitRound(r)}>{t("save_score_btn")}</button>
                    <button style={{...S.btnSecondary,marginTop:0}} onClick={()=>setActiveRound(null)}>{t("cancel")}</button>
                  </div>
                </div>
              ):(
                <button style={{...S.btnSecondary,width:"100%",marginTop:10*z}} onClick={()=>{setActiveRound(r.id);setScores({t1:winTo,t2:winTo-winBy});setErr("");}}>{t("log_score_btn")}</button>
              )}
            </div>
          ))}
        </Sec>
      )}
    </div>
  );
}

export function KingOfCourt({ players, state, set, nav, theme, isAdmin }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [sessionIds, setSessionIds] = useState(["","","",""]);
  const [winTo,setWinTo]=useState(11);
  const [winBy,setWinBy]=useState(1);
  const [roundScores, setRoundScores] = useState([{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
  const [err, setErr] = useState(""), [success, setSuccess] = useState("");
  const isReady = sessionIds.every(id=>id!=="") && new Set(sessionIds).size===4;
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
      let wins = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
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
        matchesToLog.push({id:genId(),type:"doubles",date:new Date().toISOString(),teams:[t1Ids, t2Ids],winnerTeam,games:[{a:s1, b:s2, winner: winnerTeam}],teamNames:{t1:null,t2:null},winTo,winBy,team1Wins:t1w,team2Wins:t2w,venue:"King of the Court"});
    }
    set(s => ({...s, matches: [...(s.matches||[]), ...matchesToLog]}));
    setSuccess(`✅ 3 Matches Logged. King Crowned: ${getName(kotcLeaderboard[0].id)}!`); 
    setRoundScores([{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}]);
    setSessionIds(["","","",""]);
  }

  return (
    <div style={S.view}>
      <MatchesSubNav active="kotc" nav={nav} theme={theme} />
      <Sec title={t("kotc")} theme={theme}>
        {/* Simplified display for brevity */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10*z}}>
          {[0,1,2,3].map(i=><Sel key={i} opts={opts} value={sessionIds[i]} onChange={v=>upP(i,v)} placeholder={`Player ${i+1}`} theme={theme}/>)}
        </div>
      </Sec>
    </div>
  );
}

export function TournamentMode({ players, state, set, nav, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  
  // 0: Setup, 1: Playing
  const [step, setStep] = useState(0); 
  const [teams, setTeams] = useState([["",""], ["",""], ["",""], ["",""]]);
  const [winTo, setWinTo] = useState(11);
  const [winBy, setWinBy] = useState(2);
  const [scores, setScores] = useState({ sf1a:"", sf1b:"", sf2a:"", sf2b:"", fina:"", finb:"" });
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const rawOpts = players.map(p => ({ value: p.id, label: p.name }));
  const opts = sortOptionsAlpha(rawOpts, state.favoredPlayerIds);
  const getName = id => players.find(p => p.id === id)?.name ?? "TBD";

  function upT(tIdx, pIdx, val) {
    const n = [...teams];
    n[tIdx] = [...n[tIdx]];
    n[tIdx][pIdx] = val;
    setTeams(n);
  }

  function upS(key, val) {
    setScores(s => ({...s, [key]: val.replace(/-/g, '')}));
  }

  function start() {
    setErr("");
    const ids = teams.flat();
    if(ids.some(id => !id)) return setErr(t("err_select_players"));
    if(new Set(ids).size !== 8) return setErr(t("err_duplicate"));
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
    
    const m1 = { id: genId(), type: "doubles", date: dateStr, teams: [t1, t2], winnerTeam: r_sf1.winner, games: [{a:s_sf1a, b:s_sf1b, winner: r_sf1.winner}], teamNames: {t1:null, t2:null}, winTo, winBy, team1Wins: r_sf1.winner===0?1:0, team2Wins: r_sf1.winner===1?1:0, venue: "Tournament SF1" };
    const m2 = { id: genId(), type: "doubles", date: dateStr, teams: [t3, t4], winnerTeam: r_sf2.winner, games: [{a:s_sf2a, b:s_sf2b, winner: r_sf2.winner}], teamNames: {t1:null, t2:null}, winTo, winBy, team1Wins: r_sf2.winner===0?1:0, team2Wins: r_sf2.winner===1?1:0, venue: "Tournament SF2" };
    const m3 = { id: genId(), type: "doubles", date: dateStr, teams: [win_sf1, win_sf2], winnerTeam: r_fin.winner, games: [{a:s_fina, b:s_finb, winner: r_fin.winner}], teamNames: {t1:null, t2:null}, winTo, winBy, team1Wins: r_fin.winner===0?1:0, team2Wins: r_fin.winner===1?1:0, venue: "Tournament Final" };

    // Push standard match objects to state; engine.js will handle stringifying for Firebase!
    set(s => ({...s, matches: [...(s.matches||[]), m1, m2, m3]}));
    
    setSuccess("✅ Tournament Logged! Champions: " + getName(win_sf1 === r_fin.winner ? win_sf1[0] : win_sf2[0]) + " & " + getName(win_sf1 === r_fin.winner ? win_sf1[1] : win_sf2[1]));
    setStep(0);
    setTeams([["",""],["",""],["",""],["",""]]);
    setScores({ sf1a:"", sf1b:"", sf2a:"", sf2b:"", fina:"", finb:"" });
  }

  return (
    <div style={S.view}>
      <MatchesSubNav active="tournament" nav={nav} theme={theme} />
      
      {success && <div style={{background:"rgba(80,200,120,0.15)", color:"#50c878", padding:10*z, borderRadius:8*z, marginBottom:12*z, fontSize:13*z, fontWeight:"bold"}}>{success}</div>}
      
      {step === 0 && (
        <Sec title={t("tourney_setup")} theme={theme}>
          <div style={{display:"flex", gap:12*z, marginBottom:16*z}}>
            <div style={{flex:1}}>
              <label style={S.label}>{t("win_to_lbl")}</label>
              <input style={S.input} type="number" min="1" value={winTo} onChange={e=>setWinTo(parseInt(e.target.value)||1)} />
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
          {err && <Err msg={err} theme={theme}/>}
          <button style={{...S.btnPrimary, marginTop:16*z, width:"100%"}} onClick={start}>{t("start_tournament")}</button>
        </Sec>
      )}

      {step === 1 && (
        <Sec title={t("tournament")} theme={theme}>
          <div style={{display:"flex", flexDirection:"column", gap:16*z}}>
            
            {/* Semifinal 1 */}
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

            {/* Semifinal 2 */}
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

            {/* Final */}
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

          </div>
          {err && <Err msg={err} theme={theme}/>}
          <div style={{display:"flex", gap:10*z, marginTop:16*z}}>
            <button style={{...S.btnBig, flex:1}} onClick={logTournament}>{t("log_tournament")}</button>
            <button style={{...S.btnSecondary, marginTop:0}} onClick={() => setStep(0)}>{t("cancel")}</button>
          </div>
        </Sec>
      )}
    </div>
  );
}