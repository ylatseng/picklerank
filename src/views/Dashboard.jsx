import React, { useState, useEffect, useMemo } from 'react';
import { t, ratingColor, fmtDelta, patchPlayerRatings, computeMatchOfDay, computePlayerOfMonth, shortName, isLargeZoom } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Avatar, LeaderboardRow } from '../components/Shared.jsx';
import Players from './Players.jsx'; // Bring in the heavy lifting!

// Rating tier constants — defined outside component to avoid effect re-runs
const MILESTONE_TIERS = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5];
const MILESTONE_NAMES = {2.5:"Recreational",3.0:"Intermediate",3.5:"Mid-Intermediate",4.0:"Advanced",4.5:"Mid-Advanced",5.0:"Elite",5.5:"Pro"};

export default function Dashboard({players, rawStats, state, matches, nav, theme, set, format, user, setUser}) {
  const [view, setView] = useState("rank");
  const [motdExpanded, setMotdExpanded] = useState(false);
  const [potmExpanded, setPotmExpanded] = useState(false);
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  // Rating milestone detection — checks if the linked player just crossed a tier
  const [milestone, setMilestone] = useState(null);
  useEffect(() => {
    if (!user?.myPlayerId || !matches.length) return;
    const myPlayer = (rawStats||players).find(p => p.id === user.myPlayerId);
    if (!myPlayer) return;
    const history = myPlayer.ratingHistoryDoubles || myPlayer.ratingHistorySingles || [];
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    const crossed = MILESTONE_TIERS.find(t => prev < t && curr >= t);
    if (!crossed) return;
    const seenKey = `milestone_seen_${user.myPlayerId}_${crossed}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
    setMilestone({ tier: crossed, name: MILESTONE_NAMES[crossed], rating: curr.toFixed(3) });
  }, [matches.length, user?.myPlayerId]);

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

      {/* ── RATING MILESTONE CELEBRATION ──────────────────────────────── */}
      {milestone && (
        <div style={{
          background:"linear-gradient(135deg, rgba(240,192,64,0.2), rgba(80,200,120,0.15))",
          border:"2px solid rgba(240,192,64,0.5)", borderRadius:14*z,
          padding:`${14*z}px ${16*z}px`, marginBottom:8*z, textAlign:"center", position:"relative"
        }}>
          <button onClick={()=>setMilestone(null)} style={{
            position:"absolute", top:8*z, right:8*z, background:"transparent", border:"none",
            color:theme.sub, cursor:"pointer", fontSize:14*z, padding:4*z
          }}>✕</button>
          <div style={{fontSize:28*z}}>🎉</div>
          <div style={{fontSize:16*z, fontWeight:800, color:"#f0c040", marginTop:4*z}}>
            Rating Milestone!
          </div>
          <div style={{fontSize:13*z, color:theme.text, marginTop:4*z}}>
            You crossed <strong>{milestone.tier.toFixed(1)}</strong> — <em>{milestone.name}</em>!
          </div>
          <div style={{fontSize:11*z, color:theme.sub, marginTop:2*z}}>
            Current rating: {milestone.rating}
          </div>
        </div>
      )}

      {/* ── MATCH OF THE DAY — compact teaser, expandable ─────────────── */}
      {motd && (() => {
        const isUpset = motd.upsetFactor > 0.2;
        // Upsets get gold (universal); everything else uses the user's accent color
        // Card chrome always uses user's accent. Gold only for upset text label.
        const motdColor = theme.accent;
        const motdBg = theme.accent + "11";
        const motdBorder = theme.accent + "44";
        return (
          <div style={{
            background: motdBg,
            border: `1px solid ${motdBorder}`,
            borderRadius: 10*z, marginBottom: 8*z, overflow: "hidden"
          }}>
          {/* Compact one-line teaser — title only */}
          <div onClick={() => setMotdExpanded(e => !e)} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding: `${8*z}px ${12*z}px`, cursor:"pointer", gap: 8*z
          }}>
            <div style={{display:"flex", alignItems:"center", gap:8*z, flex:1, minWidth:0, overflow:"hidden"}}>
              <span style={{fontSize:14*z, flexShrink:0}}>
                {isUpset ? "🎉" : motd.tightness > 0.9 ? "😤" : "⚡"}
              </span>
              <span style={{fontSize:11*z, fontWeight:700, color: motdColor, flexShrink:0, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                {t("motd_sec")}{isUpset ? " 🎉" : motd.tightness > 0.9 ? " 😤" : ""}
              </span>
            </div>
            <span style={{fontSize:12*z, color:theme.sub, transform: motdExpanded ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0}}>▾</span>
          </div>
          {/* Expanded detail */}
          {motdExpanded && (
            <div style={{padding:`${10*z}px ${12*z}px`, borderTop:`1px solid ${theme.border}`}}>
              <div style={{fontSize:13*z, fontWeight:700, color:theme.text, marginBottom:6*z}}>
                {motd.winTeam.join(" & ")}
                <span style={{color:theme.sub, fontWeight:400}}> {t("motd_beat")} </span>
                {motd.loseTeam.join(" & ")}
              </div>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:4*z}}>
                <span style={{fontSize:10*z, color:theme.sub}}>
                  {isUpset ? `🎉 ${t("motd_upset")}` : motd.tightness > 0.9 ? `😤 ${t("motd_tight")}` : ""}
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
        );
      })()}

      {/* ── PLAYERS OF THE MONTH — compact teaser, expandable podium ── */}
      {potm.length > 0 && (
        <div style={{
          background: theme.card, border:`1px solid ${theme.border}`,
          borderRadius: 10*z, marginBottom: 8*z, overflow: "hidden"
        }}>
          {/* Compact one-line teaser — title only */}
          <div onClick={() => setPotmExpanded(e => !e)} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding: `${8*z}px ${12*z}px`, cursor:"pointer", gap: 8*z
          }}>
            <div style={{display:"flex", alignItems:"center", gap:8*z, flex:1, minWidth:0, overflow:"hidden"}}>
              <span style={{fontSize:14*z, flexShrink:0}}>📈</span>
              <span style={{fontSize:11*z, fontWeight:700, color:theme.accent, flexShrink:0, textTransform:"uppercase", letterSpacing:"0.5px"}}>
                {potmTitle}
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
                      <div style={{fontWeight:800, fontSize:12*z, color:theme.text, width:"100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}} title={p.name}>
                        {shortName(p.name, isLargeZoom(z) ? "always" : "auto")}
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