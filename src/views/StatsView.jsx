import React from 'react';
import { t, DEFAULT_RATING } from '../engine.js';
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
    </div>
  );
}