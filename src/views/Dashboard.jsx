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
    <div style={{...S.lbRow, minWidth: 0}} onClick={onClick}>
      <div style={{...S.lbRank, flexShrink: 0}}>{medal||<span style={{fontSize:13*z,color:theme.sub}}>#{rank}</span>}</div>
      <div style={{flexShrink: 0}}><Avatar name={p.name} url={p.avatar} size={36}/></div>
      <div style={{...S.lbInfo, minWidth: 0, overflow: "hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:6*z, flexWrap:"wrap"}}>
          <span style={{...S.lbName, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%"}}>{p.name}</span>
          {streakIcon && <span style={{fontSize:12*z, flexShrink:0}} title={`${p.streak} Game Streak`}>{streakIcon}{p.streak}</span>}
          <span style={{fontSize:9*z, padding:"1px 4px", borderRadius:4, background: isProv ? "rgba(245,158,11,0.12)" : "rgba(80,200,120,0.12)", color: isProv ? "#f59e0b" : "#50c878", fontWeight:700, flexShrink:0}}>
             {isProv ? "P" : "C"}
          </span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:6*z, marginTop:2*z, flexWrap:"wrap"}}>
          <span style={{fontSize:11*z,color:theme.sub}}>{gP||0}G · {w||0}W {l||0}L</span>
          {gP > 0 && (
            <span title="Rating Confidence" style={{
              fontSize:10*z, fontWeight:700, color:confColor,
              background: confColor + "18", borderRadius:10*z,
              padding:`1px ${5*z}px`, cursor:"default", flexShrink:0
            }}>
              📊 {conf}%
            </span>
          )}
        </div>
      </div>
      <div style={{textAlign:"right", opacity: (gP||0) === 0 ? 0.4 : 1, flexShrink: 0, marginLeft: 8*z}}>
        <div style={{...S.badge,background:ratingColor(activeRating)}}>{activeRating.toFixed(3)}</div>
        {delta!==0&&<div style={{fontSize:10*z,color:d.color,marginTop:2}}>{d.text}</div>}
      </div>
    </div>
  );
}

export default function Dashboard({players, rawStats, state, matches, nav, theme, set, format, user, setUser}) {
  const [view, setView] = useState("rank");
  const [motdExpanded, setMotdExpanded] = useState(false);
  const [potmExpanded, setPotmExpanded] = useState(false);
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

      {/* ── MATCH OF THE DAY — compact teaser, expandable ─────────────── */}
      {motd && (
        <div style={{
          background: motd.upsetFactor > 0.2 ? "rgba(240,192,64,0.08)" : "rgba(64,160,224,0.08)",
          border: `1px solid ${motd.upsetFactor > 0.2 ? "#f0c04044" : "#40a0e044"}`,
          borderRadius: 10*z, marginBottom: 8*z, overflow: "hidden"
        }}>
          {/* Compact one-line teaser */}
          <div onClick={() => setMotdExpanded(e => !e)} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding: `${8*z}px ${12*z}px`, cursor:"pointer", gap: 8*z
          }}>
            <div style={{display:"flex", alignItems:"center", gap:8*z, flex:1, minWidth:0, overflow:"hidden"}}>
              <span style={{fontSize:14*z, flexShrink:0}}>
                {motd.upsetFactor > 0.2 ? "🎉" : motd.tightness > 0.9 ? "😤" : "⚡"}
              </span>
              <span style={{fontSize:11*z, fontWeight:700, color: motd.upsetFactor > 0.2 ? "#f0c040" : "#40a0e0", flexShrink:0, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                {t("motd_sec")}
              </span>
              <span style={{fontSize:12*z, color:theme.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                {motd.winTeam.join(" & ")} {t("motd_beat")} {motd.loseTeam.join(" & ")}
              </span>
            </div>
            <span style={{fontSize:12*z, color:theme.sub, transform: motdExpanded ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0}}>▾</span>
          </div>
          {/* Expanded detail */}
          {motdExpanded && (
            <div style={{padding:`0 ${12*z}px ${10*z}px`, borderTop:`1px solid ${theme.border}`, paddingTop:10*z}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:4*z}}>
                <span style={{fontSize:10*z, color:theme.sub}}>
                  {motd.upsetFactor > 0.2 ? `🎉 ${t("motd_upset")}` : motd.tightness > 0.9 ? `😤 ${t("motd_tight")}` : ""}
                </span>
                <span style={{fontSize:10*z, color:theme.sub}}>{new Date(motd.match.date).toLocaleDateString()}</span>
              </div>
              {motd.match.games?.length > 0 && (
                <div style={{fontSize:11*z, color:theme.sub}}>
                  {t("motd_score")}: {motd.match.games.map(g => `${g.a}–${g.b}`).join(", ")}
                  {motd.upsetFactor > 0.1 && (
                    <span style={{marginLeft:8*z, color:"#f0a830", fontWeight:600}}>
                      🎯 +{motd.upsetFactor.toFixed(2)} upset
                    </span>
                  )}
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); nav("history"); }} style={{
                marginTop: 8*z, background: "transparent", border: `1px solid ${theme.border}`,
                borderRadius: 6*z, padding: "4px 10px", fontSize: 10*z, color: theme.sub, cursor: "pointer"
              }}>{t("view_in_history") || "View in History →"}</button>
            </div>
          )}
        </div>
      )}

      {/* ── PLAYERS OF THE MONTH — compact teaser, expandable podium ── */}
      {potm.length > 0 && (
        <div style={{
          background: theme.card, border:`1px solid ${theme.border}`,
          borderRadius: 10*z, marginBottom: 16*z, overflow: "hidden"
        }}>
          {/* Compact one-line teaser */}
          <div onClick={() => setPotmExpanded(e => !e)} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding: `${8*z}px ${12*z}px`, cursor:"pointer", gap: 8*z
          }}>
            <div style={{display:"flex", alignItems:"center", gap:8*z, flex:1, minWidth:0, overflow:"hidden"}}>
              <span style={{fontSize:14*z, flexShrink:0}}>📈</span>
              <span style={{fontSize:11*z, fontWeight:700, color:theme.accent, flexShrink:0, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                {potmTitle}
              </span>
              <span style={{fontSize:12*z, color:theme.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                {potm.slice(0,3).map((p,i) => ["🥇","🥈","🥉"][i] + " " + p.name.split(" ")[0]).join("  ")}
              </span>
            </div>
            <span style={{fontSize:12*z, color:theme.sub, transform: potmExpanded ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0}}>▾</span>
          </div>

          {/* Expanded podium detail */}
          {potmExpanded && (
            <div style={{padding:`0 ${12*z}px ${12*z}px`, borderTop:`1px solid ${theme.border}`, paddingTop:12*z}}>
              <div style={{fontSize:10*z, color:theme.sub, marginBottom:10*z}}>{t("potm_desc")}</div>
              <div style={{display:"flex", gap:8*z}}>
                {potm.slice(0, 3).map((p, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const bgColors = [
                    "rgba(255, 215, 0, 0.15)",
                    "rgba(200, 200, 200, 0.15)",
                    "rgba(205, 127, 50, 0.15)"
                  ];
                  const borderColors = [
                    "rgba(255, 215, 0, 0.5)",
                    "rgba(200, 200, 200, 0.5)",
                    "rgba(205, 127, 50, 0.5)"
                  ];
                  return (
                    <div key={p.id} onClick={(e) => { e.stopPropagation(); nav("profile", {profileId: p.id}); }} style={{
                      flex: 1,
                      background: bgColors[i] || theme.card,
                      border: `1px solid ${borderColors[i] || theme.border}`,
                      borderRadius: 10*z,
                      padding: `${10*z}px ${6*z}px`,
                      cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", textAlign: "center"
                    }}>
                      <div style={{fontSize:14*z, marginBottom:3*z}}>{medals[i]}</div>
                      <div style={{fontWeight:800, fontSize:12*z, color:theme.text, width:"100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                        {p.name}
                      </div>
                      <div style={{fontSize:13*z, fontWeight:800, color: p.gain >= 0 ? "#50c878" : "#e05050", marginTop:4*z}}>
                        {p.gain >= 0 ? "+" : ""}{p.gain.toFixed(3)}
                      </div>
                      <div style={{fontSize:10*z, color:theme.sub, marginTop:3*z, fontWeight:600}}>
                        {p.played}G · {p.wins}W
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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