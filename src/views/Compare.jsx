import React, { useState, useMemo } from 'react';
import { t, calcExpected, ratingColor, ratingLabel, fmtDate, sortOptionsAlpha, initials } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Sel, Avatar, Err } from '../components/Shared.jsx';
import { MatchesSubNav } from '../components/Navigation.jsx';
import { K_FACTOR } from '../engine.js';

export default function Compare({players,matches,compareIds,set,nav,theme,state}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [format, setFormat] = useState("doubles");
  
  const [t1p1, setT1p1] = useState(compareIds?.[0]||"");
  const [t2p1, setT2p1] = useState(compareIds?.[1]||"");
  const [t1p2, setT1p2] = useState("");
  const [t2p2, setT2p2] = useState("");

  // Dynamic Duplicate Check & Ready State
  const ids = format === "singles" ? [t1p1, t2p1] : [t1p1, t1p2, t2p1, t2p2];
  const filledIds = ids.filter(Boolean);
  const hasDupes = new Set(filledIds).size < filledIds.length;
  const isReady = (format === "singles" ? filledIds.length === 2 : filledIds.length === 4) && !hasDupes;

  const p1 = players.find(p=>p.id===t1p1);
  const p2 = players.find(p=>p.id===t2p1);
  const p3 = players.find(p=>p.id===t1p2);
  const p4 = players.find(p=>p.id===t2p2);

  const h2h = useMemo(() => {
    if (!isReady) return null;
    let shared = [];
    
    // Safely parse matches to completely prevent the "Blank Screen" array crash
    if (format === "singles") {
        shared = matches.filter(m => m.type === "singles" && m.teams?.length === 2 && Array.isArray(m.teams[0]) && Array.isArray(m.teams[1]) &&
            ((m.teams[0].includes(t1p1) && m.teams[1].includes(t2p1)) || (m.teams[1].includes(t1p1) && m.teams[0].includes(t2p1)))
        );
    } else {
        shared = matches.filter(m => m.type === "doubles" && m.teams?.length === 2 && Array.isArray(m.teams[0]) && Array.isArray(m.teams[1]) &&
            ((m.teams[0].includes(t1p1) && m.teams[0].includes(t1p2) && m.teams[1].includes(t2p1) && m.teams[1].includes(t2p2)) ||
             (m.teams[1].includes(t1p1) && m.teams[1].includes(t1p2) && m.teams[0].includes(t2p1) && m.teams[0].includes(t2p2)))
        );
    }

    let t1w = 0, t2w = 0;
    const results = shared.map(m => {
        const isT1Team0 = m.teams[0].includes(t1p1);
        const won = m.winnerTeam === (isT1Team0 ? 0 : 1);
        if (won) t1w++; else t2w++;
        return { ...m, t1won: won };
    });

    return { matches: results.reverse(), t1w, t2w, total: shared.length };
  }, [format, t1p1, t2p1, t1p2, t2p2, matches, isReady]);

  const opts = sortOptionsAlpha(players.map(p=>({value:p.id,label:p.name})), state.favoredPlayerIds);
  const getName = id => players.find(p=>p.id===id)?.name??"?";

  let r1 = 3, r2 = 3, t1Name = `${t("team")} 1`, t2Name = `${t("team")} 2`;
    if (isReady) {
        if (format === "singles") {
            // FIX: Explicitly check if they have played Singles. If not, steal their Doubles rating!
            r1 = (p1?.singlesPlayed > 0 ? p1?.ratingSingles : p1?.ratingDoubles) || p1?.baseRating || 3;
            r2 = (p2?.singlesPlayed > 0 ? p2?.ratingSingles : p2?.ratingDoubles) || p2?.baseRating || 3;
            t1Name = p1?.name || "?";
            t2Name = p2?.name || "?";
        } else {
            // Same logic for Doubles: if they've never played Doubles, steal their Singles rating!
            r1 = (((p1?.doublesPlayed > 0 ? p1?.ratingDoubles : p1?.ratingSingles) || p1?.baseRating || 3) + 
                  ((p3?.doublesPlayed > 0 ? p3?.ratingDoubles : p3?.ratingSingles) || p3?.baseRating || 3)) / 2;
            r2 = (((p2?.doublesPlayed > 0 ? p2?.ratingDoubles : p2?.ratingSingles) || p2?.baseRating || 3) + 
                  ((p4?.doublesPlayed > 0 ? p4?.ratingDoubles : p4?.ratingSingles) || p4?.baseRating || 3)) / 2;
            t1Name = `${initials(p1?.name)} & ${initials(p3?.name)}`;
            t2Name = `${initials(p2?.name)} & ${initials(p4?.name)}`;
        }
    }


  // Trust the Pure Elo Predictor (Drop the historical blend, trust the overall ratings)
    const exp = calcExpected(r1, r2);

  return (
    <div style={S.view}>
      <MatchesSubNav active="compare" nav={nav} theme={theme} />
      
      <Sec title={t("compare_sub")} theme={theme}>
        <div style={S.toggle}>
          {[
            { id: "singles", label: t("overview_singles") },
            { id: "doubles", label: t("overview_doubles") }
          ].map(tType=>(
            <button key={tType.id} style={{...S.toggleBtn,...(format===tType.id?{...S.toggleOn,background:theme.card,borderColor:theme.accent,color:theme.accent}:{})}} onClick={()=>{setFormat(tType.id);}}>
              {tType.label}
            </button>
          ))}
        </div>
        
        {format === "singles" ? (
          <div style={{display:"flex",gap:12*z,alignItems:"center", marginTop: 16*z}}>
            <div style={{flex:1}}><label style={S.label}>{t("player_1")}</label><Sel opts={opts} value={t1p1} onChange={v=>setT1p1(v)} placeholder={t("select_prompt")} theme={theme}/></div>
            <div style={{fontSize:18*z,color:theme.sub,marginTop:16*z}}>⚔️</div>
            <div style={{flex:1}}><label style={S.label}>{t("player_2")}</label><Sel opts={opts} value={t2p1} onChange={v=>setT2p1(v)} placeholder={t("select_prompt")} theme={theme}/></div>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:12*z, marginTop:16*z}}>
            <div style={{background:theme.bg, border:`1px solid ${theme.border}`, padding:10*z, borderRadius:10*z}}>
              <label style={{...S.label, color:"#50c878", fontWeight:700}}>{t("team")} 1</label>
              <div style={{display:"flex", gap:8*z}}>
                <div style={{flex:1}}><Sel opts={opts} value={t1p1} onChange={v=>setT1p1(v)} placeholder={t("player_a")} theme={theme}/></div>
                <div style={{flex:1}}><Sel opts={opts} value={t1p2} onChange={v=>setT1p2(v)} placeholder={t("player_b")} theme={theme}/></div>
              </div>
            </div>
            <div style={{textAlign:"center", fontSize:18*z, color:theme.sub}}>⚔️</div>
            <div style={{background:theme.bg, border:`1px solid ${theme.border}`, padding:10*z, borderRadius:10*z}}>
              <label style={{...S.label, color:"#40a0e0", fontWeight:700}}>{t("team")} 2</label>
              <div style={{display:"flex", gap:8*z}}>
                <div style={{flex:1}}><Sel opts={opts} value={t2p1} onChange={v=>setT2p1(v)} placeholder={t("player_a")} theme={theme}/></div>
                <div style={{flex:1}}><Sel opts={opts} value={t2p2} onChange={v=>setT2p2(v)} placeholder={t("player_b")} theme={theme}/></div>
              </div>
            </div>
          </div>
        )}
        
        {hasDupes && <div style={{marginTop:12*z}}><Err msg={t("err_duplicate")} theme={theme}/></div>}
      </Sec>

      {isReady && h2h && (
        <>
          <Sec title={t("match_predictor")} theme={theme}>
            <div style={{display:"flex", gap:12*z, textAlign:"center"}}>
              <div style={{flex:1, background:theme.bg, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`}}>
                <div style={{fontSize:12*z, fontWeight:600}}>{t1Name}</div>
                <div style={{fontSize:18*z, color:"#50c878", fontWeight:800, marginTop:4*z}}>{(exp*100).toFixed(1)}%</div>
                <div style={{fontSize:10*z, color:theme.sub}}>{t("prob_win")}</div>
                <div style={{marginTop:12*z, fontSize:11*z, color:theme.sub}}>
                   {t("if_wins").replace("{name}", t1Name)} <br/><span style={{color:"#50c878", fontWeight:700}}>+{(K_FACTOR * (1 - exp)).toFixed(3)}</span>
                </div>
              </div>
              <div style={{flex:1, background:theme.bg, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`}}>
                <div style={{fontSize:12*z, fontWeight:600}}>{t2Name}</div>
                <div style={{fontSize:18*z, color:"#40a0e0", fontWeight:800, marginTop:4*z}}>{((1-exp)*100).toFixed(1)}%</div>
                <div style={{fontSize:10*z, color:theme.sub}}>{t("prob_win")}</div>
                <div style={{marginTop:12*z, fontSize:11*z, color:theme.sub}}>
                   {t("if_wins").replace("{name}", t2Name)} <br/><span style={{color:"#40a0e0", fontWeight:700}}>+{(K_FACTOR * (1 - (1-exp))).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </Sec>

          <Sec title={`${t("compare")} (${h2h.total})`} theme={theme}>
            {h2h.total===0?<div style={{color:theme.sub,fontSize:13*z,textAlign:"center",padding:"12px 0"}}>{t("no_matches")}</div>:(
              <>
                <div style={{marginBottom:14*z}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6*z}}>
                    <span style={{fontSize:18*z,fontWeight:800,color:"#50c878"}}>{h2h.t1w}</span>
                    <span style={{fontSize:13*z,color:theme.sub}}>{t("win_rate")}</span>
                    <span style={{fontSize:18*z,fontWeight:800,color:"#40a0e0"}}>{h2h.t2w}</span>
                  </div>
                  <div style={{display:"flex",height:8*z,borderRadius:4*z,overflow:"hidden"}}>
                    <div style={{flex:h2h.t1w||0.01,background:"#50c878"}}/>
                    <div style={{flex:h2h.t2w||0.01,background:"#40a0e0"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4*z,fontSize:11*z,color:theme.sub}}>
                    <span>{t1Name}</span><span>{t2Name}</span>
                  </div>
                </div>
                {h2h.matches.slice(0,8).map(m=>{
                  const m_t1n=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||t("tbd");
                  const m_t2n=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||t("tbd");
                  return (
                    <div key={m.id} style={{...S.lbRow,cursor:"default"}}>
                      <div style={{fontSize:20*z}}>{m.t1won?"✅":"❌"}</div>
                      <div style={S.lbInfo}>
                        <div style={{fontSize:12*z,fontWeight:600}}>{m_t1n} <span style={{color:theme.sub, fontSize:10*z, fontWeight:400}}>vs</span> {m_t2n}</div>
                        <div style={{fontSize:11*z,color:theme.sub}}>{fmtDate(m.date)} · {(m.games||[]).map(g=>`${g.a}-${g.b}`).join(", ")}</div>
                      </div>
                      <div style={{fontSize:12*z,color:m.t1won?"#50c878":"#40a0e0",fontWeight:700}}>{m.t1won?t1Name:t2Name}</div>
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