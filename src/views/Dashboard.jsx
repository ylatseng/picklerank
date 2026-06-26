import React, { useState, useEffect, useMemo } from 'react';
import { t, ratingColor, fmtDelta, patchPlayerRatings, computeMatchOfDay, computePlayerOfMonth, shortName, isLargeZoom } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, Avatar, LeaderboardRow } from '../components/Shared.jsx';
import Players from './Players.jsx'; // Bring in the heavy lifting!

// ── Group Insights — must be a real component so useState is valid ─────────
function GroupInsights({ matches, theme }) {
  const z = theme.zoom || 1.0;
  const [open, setOpen] = useState(false);
  const insights = useMemo(() => {
    const dayKeys = ["day_sun","day_mon","day_tue","day_wed","day_thu","day_fri","day_sat"];
    const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const dayCounts = [0,0,0,0,0,0,0];
    const venueCounts = {};
    matches.forEach(m => {
      if (m.date) dayCounts[new Date(m.date).getDay()]++;
      if (m.venue) venueCounts[m.venue] = (venueCounts[m.venue] || 0) + 1;
    });
    const favDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const favDay = t(dayKeys[favDayIdx]) || dayLabels[favDayIdx];
    const topVenueEntry = Object.entries(venueCounts).sort((a,b) => b[1] - a[1])[0];
    return {
      favDay,
      topVenue: topVenueEntry?.[0] || null,
      topVenueCount: topVenueEntry?.[1] || 0,
      estHours: Math.round(matches.length * 0.25),
    };
  }, [matches]);

  return (
    <div style={{background:"var(--card,#fff)", border:`1px solid ${theme.border}`, borderRadius:10*z, marginBottom:8*z, overflow:"hidden"}}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", background:"transparent", border:"none", cursor:"pointer",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:`${8*z}px ${12*z}px`, textAlign:"left"
      }}>
        <div style={{display:"flex", alignItems:"center", gap:8*z}}>
          <span style={{fontSize:14*z}}>📊</span>
          <span style={{fontSize:11*z, fontWeight:700, color:theme.accent, textTransform:"uppercase", letterSpacing:"0.5px"}}>
            {t("group_insights") || "Group Insights"}
          </span>
        </div>
        <span style={{fontSize:12*z, color:theme.sub, transform: open?"rotate(180deg)":"none", transition:"transform 0.2s"}}>▾</span>
      </button>
      {open && (
        <div style={{padding:`0 ${12*z}px ${10*z}px`, borderTop:`1px solid ${theme.border}`, paddingTop:10*z, background:theme.card}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8*z}}>
            {[
              {icon:"🎮", val:matches.length, label:t("insights_matches") || "Matches"},
              {icon:"📅", val:insights.favDay, label:t("insights_fav_day") || "Fav Day"},
              {icon:"⏱️", val:`~${insights.estHours}h`, label:t("insights_est_time") || "Est. Time"},
            ].map(({icon,val,label}) => (
              <div key={label} style={{background:theme.bg, borderRadius:8*z, padding:`${8*z}px ${6*z}px`, textAlign:"center"}}>
                <div style={{fontSize:18*z, marginBottom:3*z}}>{icon}</div>
                <div style={{fontSize:16*z, fontWeight:800, color:theme.text}}>{val}</div>
                <div style={{fontSize:10*z, color:theme.sub, marginTop:2*z}}>{label}</div>
              </div>
            ))}
          </div>
          {insights.topVenue && (
            <div style={{marginTop:8*z, fontSize:11*z, color:theme.sub, textAlign:"center"}}>
              📍 {t("insights_most_at") || "Most played at"} <strong style={{color:theme.text}}>{insights.topVenue}</strong> ({insights.topVenueCount} {t("insights_matches") || "matches"})
            </div>
          )}
        </div>
      )}
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

      {/* ── SESSION INSIGHTS — extracted to component so Hooks are valid ── */}
      {matches.length >= 5 && <GroupInsights matches={matches} theme={theme} />}

      {/* ── WEEKLY RECAP SHARE ──────────────────────────────────────────── */}
      {matches.length >= 3 && (() => {
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const weekMatches = matches.filter(m => new Date(m.date).getTime() >= weekAgo);
        if (weekMatches.length === 0) return null;
        // Top mover this week
        const ratingGains = {};
        players.forEach(p => { ratingGains[p.id] = 0; });
        weekMatches.forEach(m => {
          if (!m.ratingChanges) return;
          Object.entries(m.ratingChanges).forEach(([id, delta]) => {
            if (ratingGains[id] !== undefined) ratingGains[id] += delta;
          });
        });
        const topMover = players.reduce((best, p) => (!best || ratingGains[p.id] > ratingGains[best.id]) ? p : best, null);
        const shareWeekly = () => {
          const lines = [`🥒 PickleRank Weekly Recap`, `📅 Last 7 days: ${weekMatches.length} matches`];
          if (topMover && ratingGains[topMover.id] > 0) {
            lines.push(`📈 Top Mover: ${topMover.name} (+${ratingGains[topMover.id].toFixed(3)})`);
          }
          // Biggest upset
          let bestUpset = null, bestDelta = 0;
          weekMatches.forEach(m => {
            if (!m.ratingSnaps || !m.teams) return;
            const winT = m.teams[m.winnerTeam], loseT = m.teams[m.winnerTeam===0?1:0];
            if (!winT||!loseT) return;
            const winAvg = winT.reduce((s,id)=>s+(m.ratingSnaps[id]||3),0)/Math.max(1,winT.length);
            const loseAvg = loseT.reduce((s,id)=>s+(m.ratingSnaps[id]||3),0)/Math.max(1,loseT.length);
            const d = loseAvg - winAvg;
            if (d > bestDelta) { bestDelta = d; bestUpset = m; }
          });
          if (bestUpset && bestDelta > 0.1) {
            const getName = id => players.find(p=>p.id===id)?.name || "?";
            const winner = bestUpset.teams[bestUpset.winnerTeam].map(getName).join(" & ");
            lines.push(`🎉 Biggest Upset: ${winner} beat a higher-rated team`);
          }
          const text = lines.join("\n");
          if (navigator.share) navigator.share({ title: "PickleRank Recap", text });
          else { navigator.clipboard.writeText(text); alert("Recap copied!"); }
        };
        return (
          <button onClick={shareWeekly} style={{
            width:"100%", padding:`${10*z}px`, borderRadius:10*z, marginBottom:8*z,
            border:`1px solid ${theme.accent}55`, background:theme.accent+"0d",
            color:theme.accent, fontSize:12*z, fontWeight:700, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8*z
          }}>
            📤 Share This Week's Recap · {weekMatches.length} matches
          </button>
        );
      })()}

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