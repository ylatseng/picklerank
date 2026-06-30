import React, { useState, useMemo } from 'react';
import { t, calcExpected, ratingColor, ratingLabel, fmtDate, sortOptionsAlpha, initials } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Sel, PlayerPicker, Avatar, Err } from '../components/Shared.jsx';
import { MatchesSubNav } from '../components/Navigation.jsx';
import { dynamicKFactor } from '../engine.js';

export default function Compare({players,matches,compareIds,set,nav,theme,state,user}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [format, setFormat] = useState("doubles");
  
  const [t1p1, setT1p1] = useState(compareIds?.[0] || user?.myPlayerId || "");
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

  const _todayIds = (() => { try { return JSON.parse(sessionStorage.getItem("ql_today_players")||"[]"); } catch { return []; } })();
  const opts = sortOptionsAlpha(players.map(p=>({value:p.id,label:p.name})), [...new Set([..._todayIds, ...(state.favoredPlayerIds||[])].filter(Boolean))]);
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
    // Provisional (new) players move faster, so their predicted swing should reflect that too
    const k1 = format === "singles"
      ? dynamicKFactor(p1?.singlesPlayed || 0)
      : (dynamicKFactor(p1?.doublesPlayed || 0) + dynamicKFactor(p3?.doublesPlayed || 0)) / 2;
    const k2 = format === "singles"
      ? dynamicKFactor(p2?.singlesPlayed || 0)
      : (dynamicKFactor(p2?.doublesPlayed || 0) + dynamicKFactor(p4?.doublesPlayed || 0)) / 2;

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
            <div style={{flex:1, minWidth:0}}><label style={S.label}>{t("player_1")}</label><PlayerPicker opts={opts} value={t1p1} onChange={v=>setT1p1(v)} placeholder={t("select_prompt")} theme={theme}/></div>
            <div style={{fontSize:18*z,color:theme.sub,marginTop:16*z}}>⚔️</div>
            <div style={{flex:1, minWidth:0}}><label style={S.label}>{t("player_2")}</label><PlayerPicker opts={opts} value={t2p1} onChange={v=>setT2p1(v)} placeholder={t("select_prompt")} theme={theme}/></div>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:12*z, marginTop:16*z}}>
            <div style={{background:theme.bg, border:`1px solid ${theme.border}`, padding:10*z, borderRadius:10*z}}>
              <label style={{...S.label, color:"#50c878", fontWeight:700}}>{t("team")} 1</label>
              <div style={{display:"flex", gap:8*z}}>
                <div style={{flex:1, minWidth:0}}><PlayerPicker opts={opts} value={t1p1} onChange={v=>setT1p1(v)} placeholder={t("player_a")} theme={theme}/></div>
                <div style={{flex:1, minWidth:0}}><PlayerPicker opts={opts} value={t1p2} onChange={v=>setT1p2(v)} placeholder={t("player_b")} theme={theme}/></div>
              </div>
            </div>
            <div style={{textAlign:"center", fontSize:18*z, color:theme.sub}}>⚔️</div>
            <div style={{background:theme.bg, border:`1px solid ${theme.border}`, padding:10*z, borderRadius:10*z}}>
              <label style={{...S.label, color:"#40a0e0", fontWeight:700}}>{t("team")} 2</label>
              <div style={{display:"flex", gap:8*z}}>
                <div style={{flex:1, minWidth:0}}><PlayerPicker opts={opts} value={t2p1} onChange={v=>setT2p1(v)} placeholder={t("player_a")} theme={theme}/></div>
                <div style={{flex:1, minWidth:0}}><PlayerPicker opts={opts} value={t2p2} onChange={v=>setT2p2(v)} placeholder={t("player_b")} theme={theme}/></div>
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
                   {t("if_wins").replace("{name}", t1Name)} <br/><span style={{color:"#50c878", fontWeight:700}}>+{(k1 * (1 - exp)).toFixed(3)}</span>
                </div>
              </div>
              <div style={{flex:1, background:theme.bg, padding:10*z, borderRadius:8*z, border:`1px solid ${theme.border}`}}>
                <div style={{fontSize:12*z, fontWeight:600}}>{t2Name}</div>
                <div style={{fontSize:18*z, color:"#40a0e0", fontWeight:800, marginTop:4*z}}>{((1-exp)*100).toFixed(1)}%</div>
                <div style={{fontSize:10*z, color:theme.sub}}>{t("prob_win")}</div>
                <div style={{marginTop:12*z, fontSize:11*z, color:theme.sub}}>
                   {t("if_wins").replace("{name}", t2Name)} <br/><span style={{color:"#40a0e0", fontWeight:700}}>+{(k2 * (1 - (1-exp))).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </Sec>

          {/* ── Rating Trajectory Overlay ─────────────────────────────── */}
          {(() => {
            const histKey = format === "singles" ? "ratingHistorySingles" : "ratingHistoryDoubles";
            const h1 = p1?.[histKey] || [];
            const h2 = p2?.[histKey] || [];
            if (h1.length < 2 && h2.length < 2) return null;
            // Align both histories to the same scale
            const allVals = [...h1, ...h2];
            const minV = Math.min(...allVals) - 0.1;
            const maxV = Math.max(...allVals) + 0.1;
            const W = 300, H = 80;
            const toX = (i, len) => Math.round((i / Math.max(len - 1, 1)) * W);
            const toY = (v) => Math.round(H - ((v - minV) / (maxV - minV)) * H);
            const makePath = (hist, color) => {
              if (hist.length < 2) return null;
              const d = hist.map((v, i) => `${i===0?"M":"L"}${toX(i,hist.length)},${toY(v)}`).join(" ");
              return <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round"/>;
            };
            return (
              <Sec title={t("rating_trajectory_sec")||"Rating Trajectory"} theme={theme}>
                <div style={{fontSize:11*z,color:theme.sub,marginBottom:8*z}}>
                  {t("overview_doubles")||format} {t("rating_history_sec")||"trend overlay"}
                </div>
                <div style={{display:"flex",gap:12*z,marginBottom:8*z,fontSize:11*z}}>
                  <span style={{color:"#50c878",fontWeight:700}}>— {t1Name}</span>
                  <span style={{color:"#40a0e0",fontWeight:700}}>— {t2Name}</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
                  <rect width={W} height={H} fill={theme.bg} rx="4"/>
                  {makePath(h1, "#50c878")}
                  {makePath(h2, "#40a0e0")}
                  {/* current value dots */}
                  {h1.length > 0 && <circle cx={W} cy={toY(h1[h1.length-1])} r="4" fill="#50c878"/>}
                  {h2.length > 0 && <circle cx={W} cy={toY(h2[h2.length-1])} r="4" fill="#40a0e0"/>}
                </svg>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10*z,color:theme.sub,marginTop:4*z}}>
                  <span>{t("spark_start")||"Start"}</span>
                  <span>{t("spark_now")||"Now"}</span>
                </div>
              </Sec>
            );
          })()}

          <Sec title={`${t("compare")} (${h2h.total})`} theme={theme}>
            {h2h.total===0?<div style={{color:theme.sub,fontSize:13*z,textAlign:"center",padding:"12px 0"}}>{t("no_matches")}</div>:(
              <>
                {/* W/L Bar */}
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

                {/* Momentum strip — last 5 results as dots */}
                {h2h.total >= 2 && (() => {
                  const last5 = h2h.matches.slice(0, 5);
                  // Streak detection
                  let streak = 0, streakTeam = null;
                  for (const m of h2h.matches) {
                    const winner = m.t1won ? "t1" : "t2";
                    if (streakTeam === null) { streakTeam = winner; streak = 1; }
                    else if (winner === streakTeam) streak++;
                    else break;
                  }
                  return (
                    <div style={{marginBottom:14*z}}>
                      <div style={{fontSize:10*z,color:theme.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6*z}}>
                        Last {Math.min(5, h2h.total)} Meetings
                      </div>
                      <div style={{display:"flex",gap:6*z,alignItems:"center"}}>
                        {last5.map((m, i) => (
                          <div key={m.id} style={{
                            flex:1, height:28*z, borderRadius:6*z, display:"flex", alignItems:"center", justifyContent:"center",
                            background: m.t1won ? "#50c87833" : "#40a0e033",
                            border: `2px solid ${m.t1won ? "#50c878" : "#40a0e0"}`,
                            fontSize:10*z, fontWeight:800,
                            color: m.t1won ? "#50c878" : "#40a0e0"
                          }}>
                            {m.t1won ? "T1" : "T2"}
                          </div>
                        ))}
                        {h2h.total > 5 && <div style={{fontSize:10*z,color:theme.sub,flexShrink:0}}>+{h2h.total-5}</div>}
                      </div>
                      {streak >= 2 && (
                        <div style={{marginTop:6*z,fontSize:11*z,color:theme.sub}}>
                          🔥 <strong style={{color:streakTeam==="t1"?"#50c878":"#40a0e0"}}>{streakTeam==="t1"?t1Name:t2Name}</strong> on {streak}-match winning streak
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Match timeline */}
                <div style={{fontSize:10*z,color:theme.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6*z}}>
                  {t("match_history")||"Match History"}
                </div>
                {h2h.matches.slice(0,8).map((m, idx) => {
                  const m_t1n=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||t("tbd");
                  const m_t2n=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||t("tbd");
                  const scoreStr = (m.games||[]).map(g=>`${g.a}–${g.b}`).join("  ");
                  const winnerColor = m.t1won ? "#50c878" : "#40a0e0";
                  return (
                    <div key={m.id} style={{
                      display:"flex", alignItems:"center", gap:8*z,
                      padding:`${7*z}px 0`,
                      borderBottom: idx < Math.min(h2h.matches.length,8)-1 ? `1px solid ${theme.border}` : "none"
                    }}>
                      <div style={{
                        width:3*z, alignSelf:"stretch", borderRadius:2*z,
                        background: winnerColor, flexShrink:0
                      }}/>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:12*z, fontWeight:700, color:theme.text}}>
                          {m.t1won ? t1Name : t2Name} wins
                        </div>
                        <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>
                          {scoreStr} · {fmtDate(m.date)}
                        </div>
                      </div>
                      <div style={{
                        fontSize:11*z, fontWeight:800, color:winnerColor,
                        background:winnerColor+"22", borderRadius:6*z,
                        padding:`${2*z}px ${6*z}px`, flexShrink:0
                      }}>{m.t1won ? "W" : "L"}</div>
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