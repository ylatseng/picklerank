import React, { useEffect } from 'react';
import { t, ratingColor, fmtDelta, patchPlayerRatings } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, MiniMatchCard, Avatar } from '../components/Shared.jsx';

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

export default function Dashboard({players,matches,nav,theme,set,format}) {
  // Migration hook to split old baseRating into singles/doubles ratings
  useEffect(() => {
    if (players.length > 0 && players[0].ratingSingles === undefined) {
      const updatedPlayers = patchPlayerRatings(players);
      set(s => ({ ...s, players: updatedPlayers }));
    }
  }, [players]);

  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const recent=[...matches].reverse().slice(0,5);

  function copyAIPrompt() {
    if (!recent.length) return alert(t("no_matches"));
    let prompt = `Act as a hilarious, slightly snarky sports commentator. Write a short recap of our latest pickleball session based on these recent matches. Call out big upsets, winning streaks, and point differentials. Here is the raw data:\n\n`;
    recent.forEach(m => {
       const t1 = m.teamNames?.t1 || m.teams?.[0]?.map(id => players.find(p=>p.id===id)?.name || "Unknown").join(" & ") || "TBD";
       const t2 = m.teamNames?.t2 || m.teams?.[1]?.map(id => players.find(p=>p.id===id)?.name || "Unknown").join(" & ") || "TBD";
       const winner = m.winnerTeam === 0 ? t1 : t2;
       const score = (m.games||[]).map(g => `${g.a}-${g.b}`).join(', ');
       prompt += `- Date: ${new Date(m.date).toLocaleDateString()}\n  Format: ${m.type}\n  Matchup: ${t1} vs ${t2}\n  Winner: ${winner}\n  Score: ${score}\n\n`;
    });
    prompt += `Give me a 2-paragraph summary I can drop into our group chat!`;
    navigator.clipboard.writeText(prompt);
    alert(t("ai_prompt_copied"));
  }

  return (
    <div style={S.view}>
      <div style={{display:"flex", gap:8*z, marginBottom:12*z}}>
        <button style={{...S.btnSecondary, flex:1, marginTop:0, ...(format==="doubles"?S.toggleOn:{})}} onClick={() => set({leaderboardFormat:"doubles"})}>{t("overview_doubles")}</button>
        <button style={{...S.btnSecondary, flex:1, marginTop:0, ...(format==="singles"?S.toggleOn:{})}} onClick={() => set({leaderboardFormat:"singles"})}>{t("overview_singles")}</button>
      </div>
      <Sec title={format === "singles" ? t("singles_title") : t("doubles_title")} theme={theme}>
        {players.length===0
          ? <Empty text={t("no_players")} onAction={()=>nav("players")} label={t("add_players_btn")} theme={theme}/>
          : players.map((p,i)=><LeaderboardRow key={p.id} player={p} rank={i+1} onClick={()=>nav("profile",{profileId:p.id})} theme={theme} format={format}/>)}
      </Sec>
      <Sec title={t("recent_matches")} theme={theme}>
        {recent.length===0
          ? <Empty text={t("no_matches")} onAction={()=>nav("log")} label={t("log_first_match")} theme={theme}/>
          : (
            <>
              {recent.map(m=><MiniMatchCard key={m.id} match={m} players={players} theme={theme}/>)}
              
              <div style={{display:"flex", gap:8*z, marginTop:12*z}}>
                <button style={{...S.btnSecondary, flex:1, marginTop:0}} onClick={()=>nav("history", {historyPlayerId: null})}>
                  {t("view_all_matches")} ({matches.length}) →
                </button>
                <button style={{...S.btnSecondary, flex:1, marginTop:0, borderColor:theme.accent, color:theme.accent}} onClick={copyAIPrompt}>
                  {t("copy_ai_prompt")}
                </button>
              </div>
            </>
          )}
      </Sec>
    </div>
  );
}