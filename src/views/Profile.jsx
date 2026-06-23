import React, { useMemo, useState } from 'react';
import { t, fmtDate, ratingColor, ratingLabel, fmtDelta, ratingConfidence, computeVolatility, getPlayerGoal, setPlayerGoal, DEFAULT_RATING } from '../engine.js';
import { makeS } from '../styles.js';
import { 
  Avatar, Sec, RadarChart, MatchCard, ConfirmInline, 
  EditBaseRating, SynergyRow, Sparkline, MatchEditModal, Empty 
} from '../components/Shared.jsx';

// ── Personal Goal sub-component ───────────────────────────────────────────────
// Must be a proper named component (not an IIFE) so React hook rules are satisfied.
function GoalSection({ player: p, user, setUser, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const goal = getPlayerGoal(user, p.id);

  const [showForm, setShowForm] = useState(false);
  const [goalFormat, setGoalFormat] = useState(goal?.format || "doubles");
  const [goalTarget, setGoalTarget] = useState(goal?.targetRating || "");

  const currentRating = goalFormat === "singles" ? (p.ratingSingles || DEFAULT_RATING) : (p.ratingDoubles || DEFAULT_RATING);
  const target = parseFloat(goalTarget);
  const startRating = goal?.startRating || DEFAULT_RATING;
  const progress = goal
    ? Math.min(100, Math.max(0, ((currentRating - startRating) / ((goal.targetRating - startRating) || 1)) * 100))
    : 0;
  const reached = goal && currentRating >= goal.targetRating;
  const away = goal ? Math.max(0, goal.targetRating - currentRating).toFixed(3) : null;

  return (
    <Sec title={t("goal_sec")} theme={theme}>
      {goal && (
        <div style={{marginBottom:12*z}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11*z,marginBottom:4*z}}>
            <span style={{color:theme.sub}}>{t("goal_progress")} ({goal.format}): <strong style={{color:theme.accent}}>{goal.targetRating.toFixed(3)}</strong></span>
            {reached
              ? <span style={{color:"#f0c040",fontWeight:700}}>{t("goal_reached")}</span>
              : <span style={{color:theme.sub}}>{away} {t("goal_away")}</span>}
          </div>
          <div style={{height:8*z,background:theme.border,borderRadius:4*z,overflow:"hidden"}}>
            <div style={{width:`${progress}%`,height:"100%",background:reached?"#f0c040":theme.accent,borderRadius:4*z,transition:"width 0.6s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9*z,color:theme.sub,marginTop:2*z}}>
            <span>{startRating.toFixed(3)}</span>
            <span>{Math.round(progress)}%</span>
            <span>{goal.targetRating.toFixed(3)}</span>
          </div>
        </div>
      )}
      {!showForm && (
        <div style={{display:"flex",gap:8*z}}>
          <button style={{...S.btnSecondary,marginTop:0,flex:1,fontSize:11*z}} onClick={()=>setShowForm(true)}>
            {goal ? t("goal_set_target") : `+ ${t("goal_set_target")}`}
          </button>
          {goal && <button style={{...S.btnDanger,marginTop:0,fontSize:11*z}} onClick={()=>setPlayerGoal(setUser,p.id,null)}>{t("goal_clear")}</button>}
        </div>
      )}
      {showForm && (
        <div style={{display:"flex",flexDirection:"column",gap:8*z}}>
          <div style={{display:"flex",gap:8*z}}>
            <div style={{flex:1}}>
              <label style={S.label}>{t("goal_format_lbl")}</label>
              <select style={S.input} value={goalFormat} onChange={e=>setGoalFormat(e.target.value)}>
                <option value="doubles">{t("overview_doubles")}</option>
                <option value="singles">{t("overview_singles")}</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={S.label}>{t("goal_target_lbl")} (1.5–6.5)</label>
              <input style={S.input} type="number" step="0.1" min="1.5" max="6.5"
                value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}
                placeholder="e.g. 4.000"/>
            </div>
          </div>
          <div style={{display:"flex",gap:8*z}}>
            <button style={{...S.btnSecondary,marginTop:0}} onClick={()=>setShowForm(false)}>{t("cancel")}</button>
            <button style={{...S.btnPrimary,marginTop:0,flex:1}} onClick={()=>{
              if (!isNaN(target) && target >= 1.5 && target <= 6.5) {
                setPlayerGoal(setUser, p.id, { targetRating: target, format: goalFormat, startRating: currentRating });
                setShowForm(false);
              }
            }}>{t("goal_save")}</button>
          </div>
        </div>
      )}
    </Sec>
  );
}

export default function Profile({player:p,matches,players,nav,set,theme,isAdmin,user,setUser}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const myMatches=useMemo(()=>[...matches].filter(m=>m.teams?.flat().includes(p.id)).reverse(),[matches,p.id]);
  const getName=id=>players.find(x=>x.id===id)?.name??"?";
  const [editingMatch,setEditingMatch]=useState(null);
  const [pendingDeleteMatch,setPendingDeleteMatch]=useState(null);

  function delMatch(match){
    // Move to trash (same pattern as History) — never hard-delete directly
    set(s => ({
      ...s,
      trash: [...(s.trash||[]), { id: match.id, type:'match', data: match, deletedAt: Date.now() }],
      matches: (s.matches||[]).filter(m => m.id !== match.id)
    }));
    setTimeout(()=>setPendingDeleteMatch(null),0);
  }

  function saveEditMatch(updated){
    set(s=>({...s, matches:(s.matches||[]).map(m=>m.id===updated.id?updated:m)}));
    setEditingMatch(null);
  }

  function share(m){
    const t1=m.teamNames?.t1||m.teams?.[0]?.map(getName).join(" & ")||"TBD";
    const t2=m.teamNames?.t2||m.teams?.[1]?.map(getName).join(" & ")||"TBD";
    const winner=m.winnerTeam===0?t1:t2;
    let txt=`🥒 PickleRank Match\n📅 ${fmtDate(m.date)} · ${m.type}\n📍 ${m.venue||""}\n${t1} vs ${t2}\n`+(m.games||[]).map((g,i)=>`G${i+1}: ${g.a}–${g.b}`).join(" | ");
    txt+=`\n🏆 Winner: ${winner} (${m.team1Wins}–${m.team2Wins} games)`;
    if(navigator.share) navigator.share({title:"PickleRank Match",text:txt});
    else { navigator.clipboard.writeText(txt); alert("Copied!"); }
  }
  
  const gamesPlayed = p.gamesPlayed || 0;
  const winPct = p.winPct || 0;
  const longestWinStreak = p.longestWinStreak || 0;
  const bestWinDelta = p.bestWinDelta || 0;
  const singlesConf = p.singlesConfidence ?? 0;
  const doublesConf = p.doublesConfidence ?? 0;

  // ─── Confidence colour helper ──────────────────────────────────────────────
  const confColor = c => c >= 75 ? "#50c878" : c >= 45 ? "#f0a830" : "#e05050";
  const confLabel = c => c >= 75 ? (t("conf_high") || "High") : c >= 45 ? (t("conf_medium") || "Medium") : (t("conf_low") || "Low");

  const ALL_BADGES = [
    { id: 'centurion', icon:"🎖️", label:t("badge_centurion") || "Centurion", earned: gamesPlayed >= 100, progress: `${gamesPlayed}/100` },
    { id: 'ironman', icon:"🛡️", label:t("badge_ironman") || "Ironman", earned: gamesPlayed >= 50, progress: `${gamesPlayed}/50` },
    { id: 'streaker', icon:"🌋", label:t("badge_streaker") || "On Fire", earned: longestWinStreak >= 5, progress: `${longestWinStreak}/5` },
    { id: 'sharp', icon:"🎯", label:t("badge_sharp") || "Sharpshooter", earned: winPct >= 60 && gamesPlayed >= 10, progress: gamesPlayed < 10 ? `${gamesPlayed}/10` : `${winPct}%` },
    { id: 'slayer', icon:"🗡️", label:t("badge_slayer") || "Giant Slayer", earned: bestWinDelta >= 0.3, progress: `+${bestWinDelta.toFixed(2)}/0.30` }
  ];

  const provS = ((p.ratingHistorySingles?.length || 1) - 1) < 5;
  const provD = ((p.ratingHistoryDoubles?.length || 1) - 1) < 5;

  // ─── Fun Stats Calculator ───────────────────────────────────────────────────
  const funStats = useMemo(() => {
    const partners = {};
    const opponents = {};

    myMatches.forEach(m => {
      const myTeamIdx = m.teams?.[0]?.includes(p.id) ? 0 : (m.teams?.[1]?.includes(p.id) ? 1 : -1);
      if (myTeamIdx === -1) return;
      const oppTeamIdx = myTeamIdx === 0 ? 1 : 0;
      const won = m.winnerTeam === myTeamIdx;

      // Partners
      m.teams[myTeamIdx].forEach(pid => {
        if (pid !== p.id) {
          if (!partners[pid]) partners[pid] = { w: 0, l: 0 };
          if (won) partners[pid].w++; else partners[pid].l++;
        }
      });

      // Opponents
      m.teams[oppTeamIdx].forEach(pid => {
        if (!opponents[pid]) opponents[pid] = { w: 0, l: 0 };
        if (won) opponents[pid].w++; else opponents[pid].l++;
      });
    });

    let bestPartner = null, maxP = -1;
    Object.entries(partners).forEach(([pid, s]) => {
      const t = s.w + s.l;
      if (t >= 2) { // Min 2 matches to be considered a Best Partner
        const wr = s.w / t;
        if (wr > maxP || (wr === maxP && s.w > (partners[bestPartner?.pid]?.w || 0))) {
          maxP = wr; bestPartner = { pid, pct: wr, record: `${s.w}W - ${s.l}L` };
        }
      }
    });

    let nemesis = null, maxL = 0;
    Object.entries(opponents).forEach(([pid, s]) => {
      if (s.l > maxL) { maxL = s.l; nemesis = { pid, pct: s.l / (s.w + s.l), record: `${s.w}W - ${s.l}L` }; }
    });

    let pigeon = null, maxW = 0;
    Object.entries(opponents).forEach(([pid, s]) => {
      if (s.w > maxW) { maxW = s.w; pigeon = { pid, pct: s.w / (s.w + s.l), record: `${s.w}W - ${s.l}L` }; }
    });

    return { bestPartner, nemesis, pigeon };
  }, [myMatches, p.id]);

  return (
    <div style={S.view}>
      {editingMatch&&(
        <MatchEditModal match={editingMatch} players={players} onSave={saveEditMatch} onClose={()=>setEditingMatch(null)} theme={theme}/>
      )}

      <Sec title="" theme={theme}>
        <div style={{display:"flex",alignItems:"center",gap:14*z,marginBottom:16*z}}>
          <Avatar name={p.name} url={p.avatar} size={60}/>
          <div style={{flex:1}}>
            <div style={{fontSize:22*z,fontWeight:800}}>{p.name}</div>

            {/* Doubles rating + confidence */}
            <div style={{display:"flex", gap:6*z, marginTop:6*z, alignItems:"center"}}>
              <span style={{fontSize:11*z, padding:"2px 6px", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6*z, fontWeight:600}}>
                {t("overview_doubles")}: <strong style={{color:theme.accent}}>{(p.ratingDoubles||3).toFixed(3)}</strong>
                <span style={{fontSize:9*z, color:theme.sub}}> ({provD ? t("provisional_status") : t("verified_status")})</span>
              </span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:6*z, marginTop:3*z, marginLeft:2*z}}>
              <div style={{flex:1, maxWidth:140*z, height:5*z, background:theme.border, borderRadius:3*z, overflow:"hidden"}}>
                <div style={{width:`${doublesConf}%`, height:"100%", background:confColor(doublesConf), borderRadius:3*z, transition:"width 0.4s"}}/>
              </div>
              <span style={{fontSize:10*z, color:confColor(doublesConf), fontWeight:700}}>{doublesConf}%</span>
              <span title="Rating Confidence" style={{fontSize:9*z, color:theme.sub}}>📊 · {confLabel(doublesConf)}</span>
            </div>

            {/* Singles rating + confidence */}
            <div style={{display:"flex", gap:6*z, marginTop:6*z, alignItems:"center"}}>
              <span style={{fontSize:11*z, padding:"2px 6px", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6*z, fontWeight:600}}>
                {t("overview_singles")}: <strong style={{color:theme.accent}}>{(p.ratingSingles||3).toFixed(3)}</strong>
                <span style={{fontSize:9*z, color:theme.sub}}> ({provS ? t("provisional_status") : t("verified_status")})</span>
              </span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:6*z, marginTop:3*z, marginLeft:2*z}}>
              <div style={{flex:1, maxWidth:140*z, height:5*z, background:theme.border, borderRadius:3*z, overflow:"hidden"}}>
                <div style={{width:`${singlesConf}%`, height:"100%", background:confColor(singlesConf), borderRadius:3*z, transition:"width 0.4s"}}/>
              </div>
              <span style={{fontSize:10*z, color:confColor(singlesConf), fontWeight:700}}>{singlesConf}%</span>
              <span title="Rating Confidence" style={{fontSize:9*z, color:theme.sub}}>📊 · {confLabel(singlesConf)}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8*z,flexWrap:"wrap"}}>
          {[[t("stat_matches"),gamesPlayed],[t("stat_wins"),p.wins||0],[t("stat_losses"),p.losses||0],
            [t("stat_win_pct"),p.winPct!==null?`${p.winPct}%`:"—"],
            [t("stat_pt_win_pct") || "🎯 Pt Win%", p.ptWinPct !== null ? `${p.ptWinPct}%` : "—"],
            [p.streakType==="W"?t("stat_w_streak"):t("stat_l_streak"),p.streak||0]].map(([label,val])=>(
            <div key={label} style={S.statPill}>
              <div style={{fontSize:10*z,color:theme.sub}}>{label}</div>
              <div style={{fontSize:16*z,fontWeight:800}}>{val}</div>
            </div>
          ))}
        </div>
      </Sec>

      <Sec title={t("performance_profile")} theme={theme}>
         <RadarChart player={p} theme={theme} />
      </Sec>

      {/* POINT WIN % BREAKDOWN */}
      {(p.ptWinPct !== null) && (
      <Sec title={t("pt_win_pct_sec") || "🎯 Point Win %"} theme={theme}>
        <div style={{fontSize:11*z, color:theme.sub, marginBottom:10*z}}>{t("pt_win_pct_desc") || "Points won vs total points played. 50% = perfectly even; elite players typically hold 54–58%."}</div>
        {[
          { label: t("overview_total_matches") || "Overall", pct: p.ptWinPct, played: gamesPlayed },
          { label: t("overview_doubles"), pct: p.doublesPtWinPct, played: p.doublesPlayed },
          { label: t("overview_singles"), pct: p.singlesPtWinPct, played: p.singlesPlayed },
        ].map(({ label, pct, played }) => pct === null ? null : (
          <div key={label} style={{marginBottom:10*z}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:11*z, marginBottom:3*z}}>
              <span style={{color:theme.text, fontWeight:600}}>{label}</span>
              <span style={{color: pct >= 50 ? "#50c878" : "#e05050", fontWeight:700}}>{pct}% <span style={{color:theme.sub, fontWeight:400}}>({played} {t("stat_matches") || "matches"})</span></span>
            </div>
            <div style={{height:7*z, background:theme.border, borderRadius:4*z, overflow:"hidden", position:"relative"}}>
              {/* 50% marker */}
              <div style={{position:"absolute", left:"50%", top:0, width:1, height:"100%", background:theme.sub, opacity:0.5, zIndex:1}}/>
              <div style={{width:`${Math.min(100,pct)}%`, height:"100%", background: pct >= 50 ? "#50c878" : "#e05050", borderRadius:4*z, transition:"width 0.4s"}}/>
            </div>
          </div>
        ))}
      </Sec>
      )}

      {/* FUN STATS SECTION */}
      <Sec title={t("fun_stats_sec")} theme={theme}>
        {!funStats.bestPartner && !funStats.nemesis && !funStats.pigeon ? (
           <div style={{fontSize:12*z, color:theme.sub, textAlign:"center", padding:"10px 0"}}>
             {t("unlock_fun_stats")} <br/><span style={{fontSize: 10*z}}>{t("requires_min_games")}</span>
           </div>
        ) : (
           <div style={{display:"flex", flexDirection:"column", gap: 0}}>
             {funStats.bestPartner && <SynergyRow icon="👯" title={t("best_partner") || "Best Partner"} pid={funStats.bestPartner.pid} pct={funStats.bestPartner.pct} color="#50c878" theme={theme} getName={getName} record={funStats.bestPartner.record} />}
             {funStats.nemesis && <SynergyRow icon="👹" title={t("nemesis") || "Nemesis"} pid={funStats.nemesis.pid} pct={funStats.nemesis.pct} subText="Loss Rate" color="#e05050" theme={theme} getName={getName} record={funStats.nemesis.record} />}
             {funStats.pigeon && <SynergyRow icon="🐦" title={t("pigeon") || "Pigeon"} pid={funStats.pigeon.pid} pct={funStats.pigeon.pct} color="#40a0e0" theme={theme} getName={getName} record={funStats.pigeon.record} />}
           </div>
        )}
      </Sec>

      <Sec title={t("badges_sec")} theme={theme}>
        <div style={{display:"flex", gap:8*z, flexWrap:"wrap"}}>
          {ALL_BADGES.map(b => (
            <div key={b.label} className={b.earned ? "badge-earned" : "badge-locked"} style={{display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2*z, background:theme.bg, border:`1px solid ${theme.border}`, padding:`${6*z}px ${8*z}px`, borderRadius:8*z, flex:"1 1 45%"}}>
              <div style={{display:"flex", alignItems:"center", gap:6*z}}>
                <span style={{fontSize:16*z}}>{b.icon}</span>
                <span style={{fontSize:11*z, fontWeight:600, color:theme.text}}>{b.label}</span>
              </div>
              {!b.earned && <div style={{fontSize:9*z, color:theme.sub, marginLeft:22*z}}>{b.progress}</div>}
            </div>
          ))}
        </div>
      </Sec>

      <Sec title={`${t("rating_history_sec")} (${t("overview_doubles")})`} theme={theme}>
        <Sparkline history={p.ratingHistoryDoubles} width={320} height={60} theme={theme}/>
      </Sec>
      <Sec title={`${t("rating_history_sec")} (${t("overview_singles")})`} theme={theme}>
        <Sparkline history={p.ratingHistorySingles} width={320} height={60} theme={theme}/>
      </Sec>

      {/* ── RATING VOLATILITY ──────────────────────────────────────────── */}
      {(() => {
        const dVol = computeVolatility(p.ratingHistoryDoubles);
        const sVol = computeVolatility(p.ratingHistorySingles);
        if (dVol === null && sVol === null) return null;
        const volLabel = v => v < 0.02 ? t("volatility_low") : v < 0.05 ? t("volatility_med") : t("volatility_high");
        const volColor = v => v < 0.02 ? "#50c878" : v < 0.05 ? "#f0a830" : "#e05050";
        const VolBar = ({ vol, label }) => vol === null ? null : (
          <div style={{marginBottom:8*z}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11*z,marginBottom:3*z}}>
              <span style={{color:theme.sub}}>{label}</span>
              <span style={{color:volColor(vol),fontWeight:700}}>{volLabel(vol)} ({vol.toFixed(3)})</span>
            </div>
            <div style={{height:6*z,background:theme.border,borderRadius:3*z,overflow:"hidden"}}>
              <div style={{width:`${Math.min(100, vol / 0.08 * 100)}%`,height:"100%",background:volColor(vol),borderRadius:3*z,transition:"width 0.4s"}}/>
            </div>
          </div>
        );
        return (
          <Sec title={t("volatility_sec")} theme={theme}>
            <div style={{fontSize:11*z,color:theme.sub,marginBottom:10*z}}>{t("volatility_desc")}</div>
            <VolBar vol={dVol} label={t("overview_doubles")} />
            <VolBar vol={sVol} label={t("overview_singles")} />
          </Sec>
        );
      })()}

      {/* ── PERSONAL GOAL ──────────────────────────────────────────────── */}
      {(isAdmin || user?.myPlayerId === p.id) && (
        <GoalSection player={p} user={user} setUser={setUser} theme={theme} />
      )}

      {/* Starting ratings — admin only. Regular users cannot alter their own ratings
          as that would allow gaming the system. Admin sets initial DUPR import values. */}
      {isAdmin && (
        <EditBaseRating player={p} set={set} theme={theme}/>
      )}

      <Sec title={`${t("recent_matches")} (${Math.min(myMatches.length, 5)})`} theme={theme}>
        {myMatches.slice(0,5).map(m => {
          // Regular users can edit matches they played in, but ONLY admin can delete
          const isParticipant = user?.myPlayerId && m.teams?.flat()?.includes(user?.myPlayerId);
          const canEditMatch = isAdmin || isParticipant;
          const canDeleteMatch = isAdmin;

          return (
            <React.Fragment key={m.id}>
              <MatchCard match={m} players={players} theme={theme} isAdmin={canEditMatch} highlightPlayerId={p.id}
                onEdit={canEditMatch ? setEditingMatch : undefined} onShare={share} onDelete={canDeleteMatch ? () => setPendingDeleteMatch(m.id) : undefined} />
              {pendingDeleteMatch===m.id&&(
                <ConfirmInline msg={t("delete_match_q")} note={t("ratings_recalculated")}
                  onConfirm={()=>delMatch(m)} onCancel={()=>setPendingDeleteMatch(null)} theme={theme}/>
              )}
            </React.Fragment>
          );
        })}
        {myMatches.length===0&&<Empty text={t("no_matches")} theme={theme}/>}
      </Sec>
    </div>
  );
}