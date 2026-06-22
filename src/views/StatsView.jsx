import React from 'react';
import { t, DEFAULT_RATING, computePartnerMatrix } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, StatRow } from '../components/Shared.jsx';

export default function StatsView({players,matches,nav,theme}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const totalGames=matches.reduce((s,m)=>s+(m.games?.length||0),0);
  const singlesCount=matches.filter(m=>m.type==="singles").length;
  const doublesCount=matches.filter(m=>m.type==="doubles").length;
  const venues=[...new Set(matches.map(m=>m.venue).filter(Boolean))];
  const activity=[...players].sort((a,b)=>(b.gamesPlayed||0)-(a.gamesPlayed||0));
  const mostActive=activity[0];
  let biggestUpset=null,biggestUpsetDelta=0;
  matches.forEach(m=>{
    if(!m.teams || !m.teams[0] || !m.teams[1]) return;
    const winTeam=m.teams[m.winnerTeam],loseTeam=m.teams[m.winnerTeam===0?1:0];
    if(!m.ratingSnaps)return;
    const winAvg=winTeam.reduce((s,id)=>s+(m.ratingSnaps[id]||DEFAULT_RATING),0)/Math.max(1,winTeam.length);
    const loseAvg=loseTeam.reduce((s,id)=>s+(m.ratingSnaps[id]||DEFAULT_RATING),0)/Math.max(1,loseTeam.length);
    const delta=loseAvg-winAvg;
    if(delta>biggestUpsetDelta){biggestUpsetDelta=delta;biggestUpset=m;}
  });
  const topRated=[...players].sort((a,b)=>(b.ratingDoubles||0)-(a.ratingDoubles||0))[0];
  const topStreak=[...players].filter(p=>p.streakType==="W").sort((a,b)=>(b.streak||0)-(a.streak||0))[0];
  const getName=id=>players.find(p=>p.id===id)?.name??"?";
  return (
    <div style={S.view}>
      <Sec title={t("overview_sec")} theme={theme}>
        <div style={{display:"flex",flexWrap:"wrap",gap:10*z}}>
          {[[t("overview_total_matches"),matches.length,"🎮"],[t("overview_singles"),singlesCount,"👤"],[t("overview_doubles"),doublesCount,"👥"],
            [t("overview_games_played"),totalGames,"🏓"],[t("overview_players"),players.length,"🙋"],[t("overview_venues"),venues.length,"📍"]].map(([label,val,icon])=>(
            <div key={label} style={{...S.statPill,flex:"1 1 28%"}}>
              <div style={{fontSize:18*z}}>{icon}</div>
              <div style={{fontSize:20*z,fontWeight:800}}>{val}</div>
              <div style={{fontSize:10*z,color:theme.sub, textAlign:"center"}}>{label}</div>
            </div>
          ))}
        </div>
      </Sec>
      <Sec title={t("records_sec")} theme={theme}>
        {mostActive&&<StatRow icon="🎮" label={t("record_most_matches")} value={`${mostActive.name} (${mostActive.gamesPlayed||0})`} theme={theme}/>}
        {topRated&&<StatRow icon="🏆" label={t("record_top_rated")} value={`${topRated.name} (${(topRated.ratingDoubles||3).toFixed(3)})`} theme={theme}/>}
        {topStreak&&topStreak.streak>=2&&<StatRow icon="🔥" label={t("record_hot_streak")} value={`${topStreak.name} (${topStreak.streak}W)`} theme={theme}/>}
        {biggestUpset&&biggestUpsetDelta>0&&(
          <div style={{...S.lbRow,cursor:"default"}}>
            <div style={{fontSize:20*z}}>😮</div>
            <div style={S.lbInfo}>
              <div style={{fontSize:13*z,fontWeight:600}}>{t("record_biggest_upset")}</div>
              <div style={{fontSize:11*z,color:theme.sub}}>
                {biggestUpset.teams[biggestUpset.winnerTeam].map(getName).join(" & ")} {t("record_beat_higher")} <span style={{color:"#50c878"}}>+{biggestUpsetDelta.toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}
      </Sec>
      {venues.length>0&&(
        <Sec title={t("venues_lbl")} theme={theme}>
          {venues.map(v=>{
            const count=matches.filter(m=>m.venue===v).length;
            return (
              <div key={v} style={{...S.lbRow,cursor:"default"}}>
                <div style={{fontSize:18*z}}>📍</div>
                <div style={S.lbInfo}><div style={{fontSize:13*z}}>{v}</div></div>
                <div style={{fontSize:12*z,color:theme.sub}}>{count} {t("matches_tab").toLowerCase()}{count!==1?"s":""}</div>
              </div>
            );
          })}
        </Sec>
      )}

      {/* ── DOUBLES PARTNER MATRIX ──────────────────────────────────────── */}
      {(() => {
        const matrix = computePartnerMatrix(matches);
        const activePlayers = players.filter(p => (p.doublesPlayed || 0) > 0);
        if (activePlayers.length < 2 || Object.keys(matrix).length === 0) return (
          <Sec title={t("partner_matrix_sec")} theme={theme}>
            <div style={{color:theme.sub, fontSize:12*z, textAlign:"center", padding:16*z}}>{t("partner_matrix_no_data")}</div>
          </Sec>
        );
        const key = (a, b) => [a, b].sort().join('|');
        const pctColor = pct => pct >= 60 ? "#50c878" : pct >= 45 ? "#f0a830" : "#e05050";
        const cellSize = Math.min(52, Math.floor(300 / activePlayers.length));
        return (
          <Sec title={t("partner_matrix_sec")} theme={theme}>
            <div style={{fontSize:10*z, color:theme.sub, marginBottom:10*z}}>{t("partner_matrix_desc")}</div>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"separate", borderSpacing:0, fontSize:10*z, width:"100%"}}>
                <thead>
                  <tr>
                    <th style={{
                      position:"sticky", left:0, zIndex:2,
                      background:theme.card, width:cellSize*z, padding:`${3*z}px`,
                      boxShadow:`2px 0 4px ${theme.border}`
                    }}></th>
                    {activePlayers.map(p => (
                      <th key={p.id} style={{width:cellSize*z, textAlign:"center", padding:`${3*z}px`, color:theme.sub, fontWeight:600, fontSize:9*z}}>
                        {p.name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map(rowP => (
                    <tr key={rowP.id}>
                      <td style={{
                        position:"sticky", left:0, zIndex:1,
                        background:theme.card,
                        padding:`${3*z}px`, color:theme.sub, fontSize:9*z, fontWeight:600, whiteSpace:"nowrap",
                        boxShadow:`2px 0 4px ${theme.border}`
                      }}>
                        {rowP.name.split(' ')[0]}
                      </td>
                      {activePlayers.map(colP => {
                        if (rowP.id === colP.id) return (
                          <td key={colP.id} style={{background:theme.border, borderRadius:4*z, textAlign:"center", padding:`${4*z}px`}}>
                            <span style={{color:theme.sub, fontSize:10*z}}>—</span>
                          </td>
                        );
                        const k = key(rowP.id, colP.id);
                        const stat = matrix[k];
                        return (
                          <td key={colP.id} style={{textAlign:"center", padding:`${2*z}px`}}>
                            {stat ? (
                              <div style={{
                                background: pctColor(stat.pct) + "22",
                                border: `1px solid ${pctColor(stat.pct)}44`,
                                borderRadius:6*z, padding:`${3*z}px ${2*z}px`,
                              }}>
                                <div style={{fontWeight:800, color:pctColor(stat.pct), fontSize:11*z}}>{stat.pct}%</div>
                                <div style={{color:theme.sub, fontSize:8*z}}>{stat.total}{t("partner_matrix_games")}</div>
                              </div>
                            ) : (
                              <div style={{color:theme.border, fontSize:10*z}}>·</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex", gap:10*z, marginTop:10*z, fontSize:10*z, color:theme.sub}}>
              {[["#50c878","≥60% Win rate"],["#f0a830","45–59%"],["#e05050","<45%"]].map(([c,l])=>(
                <span key={l}><span style={{color:c,fontWeight:700}}>■</span> {l}</span>
              ))}
            </div>
          </Sec>
        );
      })()}
    </div>
  );
}