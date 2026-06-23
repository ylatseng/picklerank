import React, { useState, useEffect, useMemo } from 'react';
import { t, ratingColor, fmtDelta, patchPlayerRatings, computeMatchOfDay, computePlayerOfMonth } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Avatar } from '../components/Shared.jsx';
import Players from './Players.jsx'; // Bring in the heavy lifting!

function LeaderboardRow({player:p,rank,onClick,theme,format}) {
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

  // Confidence for the active format
  const conf = format === "singles" ? (p.singlesConfidence ?? 0) : (p.doublesConfidence ?? 0);
  const confColor = conf >= 75 ? "#50c878" : conf >= 45 ? "#f0a830" : "#e05050";

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
        <div style={{display:"flex", alignItems:"center", gap:6*z, marginTop:2*z}}>
          <span style={{fontSize:11*z,color:theme.sub}}>{gP||0}G · {w||0}W {l||0}L</span>
          {gP > 0 && (
            <span title="Rating Confidence" style={{
              fontSize:10*z, fontWeight:700, color:confColor,
              background: confColor + "18", borderRadius:10*z,
              padding:`1px ${5*z}px`, cursor:"default"
            }}>
              📊 {conf}%
            </span>
          )}
        </div>
      </div>
      <div style={{textAlign:"right", opacity: (gP||0) === 0 ? 0.4 : 1}}>
        <div style={{...S.badge,background:ratingColor(activeRating)}}>{activeRating.toFixed(3)}</div>
        {delta!==0&&<div style={{fontSize:10*z,color:d.color,marginTop:2}}>{d.text}</div>}
      </div>
    </div>
  );
}

export default function Dashboard({players, rawStats, state, matches, nav, theme, set, format, user, setUser}) {
  const [view, setView] = useState("rank");
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  // Migration hook to split old baseRating into singles/doubles ratings
  useEffect(() => {
    if (players.length > 0 && players[0].ratingSingles === undefined) {
      const updatedPlayers = patchPlayerRatings(players);
      set(s => ({ ...s, players: updatedPlayers }));
    }
  }, [players]);

  const motd = useMemo(() => computeMatchOfDay(matches, rawStats || players), [matches, players]);
  const potm = useMemo(() => computePlayerOfMonth(rawStats || players, matches), [players, matches]);

  // Fall back to English plural if the translation key returns raw
  const potmTitle = t("potm_sec") === "potm_sec" ? "Players of the Month" : t("potm_sec");

  return (
    <div style={S.view}>

      {/* ── MATCH OF THE DAY ──────────────────────────────────────────── */}
      {motd && (
        <div style={{
          background: motd.upsetFactor > 0.2
            ? "rgba(240,192,64,0.08)" : "rgba(64,160,224,0.08)",
          border: `1px solid ${motd.upsetFactor > 0.2 ? "#f0c04044" : "#40a0e044"}`,
          borderRadius: 12*z, padding: 12*z, marginBottom: 16*z, cursor:"pointer"
        }} onClick={() => nav("history")}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6*z}}>
            <span style={{fontSize:12*z, fontWeight:700, color: motd.upsetFactor > 0.2 ? "#f0c040" : "#40a0e0"}}>
              {t("motd_sec")} {motd.upsetFactor > 0.2 ? `🎉 ${t("motd_upset")}` : motd.tightness > 0.9 ? `😤 ${t("motd_tight")}` : ""}
            </span>
            <span style={{fontSize:10*z, color:theme.sub}}>
              {new Date(motd.match.date).toLocaleDateString()}
            </span>
          </div>
          <div style={{fontSize:13*z, fontWeight:700, color:theme.text}}>
            {motd.winTeam.join(" & ")}
            <span style={{color:theme.sub, fontWeight:400}}> {t("motd_beat")} </span>
            {motd.loseTeam.join(" & ")}
          </div>
          {motd.match.games?.length > 0 && (
            <div style={{fontSize:11*z, color:theme.sub, marginTop:3*z}}>
              {t("motd_score")}: {motd.match.games.map(g => `${g.a}–${g.b}`).join(", ")}
              {motd.upsetFactor > 0.1 && (
                <span style={{marginLeft:8*z, color:"#f0a830", fontWeight:600}}>
                  🎯 +{motd.upsetFactor.toFixed(2)} upset
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PLAYERS OF THE MONTH (MODERN PODIUM) ──────────────────────── */}
      {potm.length > 0 && (
        <div style={{marginBottom:16*z}}>
          <div style={{display:"flex", alignItems:"center", gap: 8*z, marginBottom:12*z}}>
            <span style={{fontSize:18*z}}>📈</span>
            <div>
              <div style={{fontSize:14*z, fontWeight:800, color:theme.text}}>
                {potmTitle}
              </div>
              <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>
                {t("potm_desc")}
              </div>
            </div>
          </div>
          
          <div style={{ display:"flex", gap:8*z }}>
            {potm.slice(0, 3).map((p, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const bgColors = [
                "rgba(255, 215, 0, 0.15)",   // Brighter Gold
                "rgba(200, 200, 200, 0.15)", // Brighter Silver
                "rgba(205, 127, 50, 0.15)"   // Brighter Bronze
              ];
              const borderColors = [
                "rgba(255, 215, 0, 0.5)",
                "rgba(200, 200, 200, 0.5)",
                "rgba(205, 127, 50, 0.5)"
              ];
              const shadowColors = [
                "rgba(255, 215, 0, 0.1)",
                "rgba(200, 200, 200, 0.1)",
                "rgba(205, 127, 50, 0.1)"
              ];

              return (
                <div key={p.id} onClick={() => nav("profile", {profileId: p.id})} style={{
                  flex: 1, 
                  background: bgColors[i] || theme.card, 
                  border: `1px solid ${borderColors[i] || theme.border}`,
                  borderRadius: 12*z, 
                  padding: `${12*z}px ${8*z}px`, 
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: `0 4px 12px ${shadowColors[i] || "transparent"}`
                }}>
                  <div style={{fontSize:16*z, marginBottom:4*z}}>{medals[i]}</div>
                  <div style={{fontWeight:800, fontSize:13*z, color:theme.text, width:"100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                    {p.name}
                  </div>
                  <div style={{fontSize:14*z, fontWeight:800, color: p.gain >= 0 ? "#50c878" : "#e05050", marginTop:6*z}}>
                    {p.gain >= 0 ? "+" : ""}{p.gain.toFixed(3)}
                  </div>
                  <div style={{fontSize:10*z, color:theme.sub, marginTop:4*z, fontWeight:600}}>
                    {p.played}G · {p.wins}W
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unified Hub Toggle */}
      <div style={{display:"flex", gap:8*z, marginBottom:16*z}}>
        <button style={{...S.btnSecondary, flex:1, marginTop:0, ...(view==="rank"?S.toggleOn:{})}} onClick={() => setView("rank")}>🏆 {t("rankings")}</button>
        <button style={{...S.btnSecondary, flex:1, marginTop:0, ...(view==="roster"?S.toggleOn:{})}} onClick={() => setView("roster")}>
          <span style={{ filter: theme.invert ? "drop-shadow(0px 0px 2px rgba(255,255,255,0.4)) brightness(1.3)" : "none", marginRight: 4*z }}>👥</span> 
          {t("roster")}
        </button>
      </div>

      {view === "rank" ? (
        <>
          <div style={{display:"flex", gap:8*z, marginBottom:12*z}}>
            <button style={{...S.btnSecondary, flex:1, marginTop:0, ...(format==="doubles"?S.toggleOn:{})}} onClick={() => set({leaderboardFormat:"doubles"})}>{t("overview_doubles")}</button>
            <button style={{...S.btnSecondary, flex:1, marginTop:0, ...(format==="singles"?S.toggleOn:{})}} onClick={() => set({leaderboardFormat:"singles"})}>{t("overview_singles")}</button>
          </div>
          
          <Sec title={format === "singles" ? t("singles_title") : t("doubles_title")} theme={theme}>
            {players.length===0
              ? <Empty text={t("no_players")} onAction={()=>setView("roster")} label={t("add_players_btn")} theme={theme}/>
              : players.map((p,i)=><LeaderboardRow key={p.id} player={p} rank={i+1} onClick={()=>nav("profile",{profileId:p.id})} theme={theme} format={format}/>)}
          </Sec>
        </>
      ) : (
        // Embed the fully functional Players view directly. The negative margin offsets the double-padding.
        <div style={{margin: `-${16*z}px`}}>
           <Players players={rawStats || players} state={state || {}} set={set} nav={nav} theme={theme} isAdmin={user?.isAdmin} user={user} setUser={setUser} />
        </div>
      )}
    </div>
  );
}