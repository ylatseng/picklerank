import React, { useState, useMemo } from 'react';
import { t, calcExpected, ratingColor, ratingLabel, fmtDate, fmtDelta, sortOptionsAlpha, initials } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Sel, Avatar, MatchEloBreakdown } from '../components/Shared.jsx';
import { MatchesSubNav } from '../components/Navigation.jsx';

export default function Compare({players,matches,compareIds,set,nav,theme,state}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [format, setFormat] = useState("doubles");
  const [p1id,setP1]=useState(compareIds?.[0]||""), [p2id,setP2]=useState(compareIds?.[1]||"");
  const p1=players.find(p=>p.id===p1id), p2=players.find(p=>p.id===p2id);
  
  const h2h=useMemo(()=>{
    if(!p1id||!p2id) return null;
    const shared=matches.filter(m=>m.teams?.flat().includes(p1id)&&m.teams?.flat().includes(p2id));
    let p1w=0,p2w=0;
    const results=shared.map(m=>{
      const p1team=m.teams[0].includes(p1id)?0:1, won=m.winnerTeam===p1team;
      if(won)p1w++;else p2w++;
      return {...m,p1won:won};
    });
    return {matches:results.reverse(),p1w,p2w,total:shared.length};
  },[p1id,p2id,matches]);
  const opts=sortOptionsAlpha(players.map(p=>({value:p.id,label:p.name})), state.favoredPlayerIds);
  const getName=id=>players.find(p=>p.id===id)?.name??"?";
  
  const p1Exp = p1 && p2 ? calcExpected(format === "singles" ? (p1.ratingSingles||3) : (p1.ratingDoubles||3), format === "singles" ? (p2.ratingSingles||3) : (p2.ratingDoubles||3)) : 0;
  
  return (
    <div style={S.view}>
      <MatchesSubNav active="compare" nav={nav} theme={theme} />
      <Sec title="Select Players" theme={theme}>
        <div style={S.toggle}>
          {["singles","doubles"].map(tType=>(
            <button key={tType} style={{...S.toggleBtn,...(format===tType?{...S.toggleOn,background:theme.card,borderColor:theme.accent,color:theme.accent}:{})}} onClick={()=>setFormat(tType)}>
              {tType.charAt(0).toUpperCase()+tType.slice(1)}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:12*z,alignItems:"center", marginTop: 12*z}}>
          <div style={{flex:1}}><label style={S.label}>Player 1</label><Sel opts={opts} value={p1id} onChange={v=>setP1(v)} placeholder={t("select_prompt")} theme={theme}/></div>
          <div style={{fontSize:18*z,color:theme.sub,marginTop:16*z}}>⚔️</div>
          <div style={{flex:1}}><label style={S.label}>Player 2</label><Sel opts={opts} value={p2id} onChange={v=>setP2(v)} placeholder={t("select_prompt")} theme={theme}/></div>
        </div>
      </Sec>
      {p1&&p2&&h2h&&(
        <>
          <Sec title={t("rating_comp_sec")} theme={theme}>
            <div style={{display:"flex",gap:12*z}}>
              {[p1,p2].map(p=>(
                <div key={p.id} style={{flex:1,background:theme.bg,borderRadius:12*z,padding:12*z,textAlign:"center",cursor:"pointer"}} onClick={()=>nav("profile",{profileId:p.id})}>
                  <Avatar name={p.name} url={p.avatar} size={44}/>
                  <div style={{marginTop:8*z,fontWeight:700}}>{p.name}</div>
                  <div style={{...S.badge,background:ratingColor(format==="singles"?p.ratingSingles:p.ratingDoubles),marginTop:8*z,display:"inline-block"}}>{(format==="singles"?(p.ratingSingles||3):(p.ratingDoubles||3)).toFixed(3)}</div>
                  <div style={{fontSize:11*z,color:theme.sub,marginTop:4*z}}>{t(ratingLabel(format==="singles"?p.ratingSingles:p.ratingDoubles))}</div>
                  <div style={{fontSize:11*z,color:theme.sub,marginTop:4*z}}>{p.wins||0}W {p.losses||0}L</div>
                </div>
              ))}
            </div>
          </Sec>
          
          <Sec title={t("match_predictor")} theme={theme}>
            <div style={{display:"flex", gap:12*z, textAlign:"center"}}>
              <div style={{flex:1, background:theme.bg, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`}}>
                <div style={{fontSize:12*z, fontWeight:600}}>{p1.name}</div>
                <div style={{fontSize:18*z, color:"#50c878", fontWeight:800, marginTop:4*z}}>{(p1Exp*100).toFixed(1)}%</div>
                <div style={{fontSize:10*z, color:theme.sub}}>{t("prob_win")}</div>
                <div style={{marginTop:12*z, fontSize:11*z, color:theme.sub}}>
                   {t("if_wins").replace("{name}", initials(p1.name))} <br/><span style={{color:"#50c878", fontWeight:700}}>+{(K_FACTOR * (1 - p1Exp)).toFixed(3)}</span>
                </div>
              </div>
              <div style={{flex:1, background:theme.bg, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`}}>
                <div style={{fontSize:12*z, fontWeight:600}}>{p2.name}</div>
                <div style={{fontSize:18*z, color:"#40a0e0", fontWeight:800, marginTop:4*z}}>{((1-p1Exp)*100).toFixed(1)}%</div>
                <div style={{fontSize:10*z, color:theme.sub}}>{t("prob_win")}</div>
                <div style={{marginTop:12*z, fontSize:11*z, color:theme.sub}}>
                   {t("if_wins").replace("{name}", initials(p2.name))} <br/><span style={{color:"#40a0e0", fontWeight:700}}>+{(K_FACTOR * (1 - (1-p1Exp))).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </Sec>

          <Sec title={`${t("compare")} (${h2h.total})`} theme={theme}>
            {h2h.total===0?<div style={{color:theme.sub,fontSize:13*z,textAlign:"center",padding:"12px 0"}}>{t("no_matches")}</div>:(
              <>
                <div style={{marginBottom:14*z}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6*z}}>
                    <span style={{fontSize:18*z,fontWeight:800,color:"#50c878"}}>{h2h.p1w}</span>
                    <span style={{fontSize:13*z,color:theme.sub}}>{t("win_rate")}</span>
                    <span style={{fontSize:18*z,fontWeight:800,color:"#40a0e0"}}>{h2h.p2w}</span>
                  </div>
                  <div style={{display:"flex",height:8*z,borderRadius:4*z,overflow:"hidden"}}>
                    <div style={{flex:h2h.p1w||0.01,background:"#50c878"}}/>
                    <div style={{flex:h2h.p2w||0.01,background:"#40a0e0"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4*z,fontSize:11*z,color:theme.sub}}>
                    <span>{p1.name}</span><span>{p2.name}</span>
                  </div>
                </div>
                {h2h.matches.slice(0,8).map(m=>{
                  const t1n=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD";
                  const t2n=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD";
                  return (
                    <div key={m.id} style={{...S.lbRow,cursor:"default"}}>
                      <div style={{fontSize:20*z}}>{m.p1won?"✅":"❌"}</div>
                      <div style={S.lbInfo}>
                        <div style={{fontSize:12*z,fontWeight:600}}>{t1n} vs {t2n}</div>
                        <div style={{fontSize:11*z,color:theme.sub}}>{fmtDate(m.date)} · {(m.games||[]).map(g=>`${g.a}-${g.b}`).join(", ")}</div>
                      </div>
                      <div style={{fontSize:12*z,color:m.p1won?"#50c878":"#40a0e0",fontWeight:700}}>{m.p1won?p1.name:p2.name}</div>
                    </div>
                  );
                })}
              </>
            )}
          </Sec>
        </>
      )}
    </div>
  );
}