import React, { useMemo, useState } from 'react';
import { t, fmtDate, ratingColor, ratingLabel, fmtDelta } from '../engine.js';
import { makeS } from '../styles.js';
import { 
  Avatar, Sec, RadarChart, MatchCard, ConfirmInline, 
  EditBaseRating, SynergyRow, Sparkline, MatchEditModal, Empty 
} from '../components/Shared.jsx';

export default function Profile({player:p,matches,players,nav,set,theme,isAdmin}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const myMatches=useMemo(()=>[...matches].filter(m=>m.teams?.flat().includes(p.id)).reverse(),[matches,p.id]);
  const getName=id=>players.find(x=>x.id===id)?.name??"?";
  const [editingMatch,setEditingMatch]=useState(null);
  const [pendingDeleteMatch,setPendingDeleteMatch]=useState(null);

  function delMatch(id){
    set(s=>({...s, matches:(s.matches||[]).filter(m=>m.id!==id)}));
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
            <div style={{display:"flex", gap:6*z, marginTop:4*z}}>
              <span style={{fontSize:11*z, padding:"2px 6px", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6*z, fontWeight:600}}>
                {t("overview_doubles")}: <strong style={{color:theme.accent}}>{(p.ratingDoubles||3).toFixed(3)}</strong> <span style={{fontSize:9*z, color:theme.sub}}>({provD ? t("provisional_status") : t("verified_status")})</span>
              </span>
            </div>
            <div style={{display:"flex", gap:6*z, marginTop:4*z}}>
              <span style={{fontSize:11*z, padding:"2px 6px", background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6*z, fontWeight:600}}>
                {t("overview_singles")}: <strong style={{color:theme.accent}}>{(p.ratingSingles||3).toFixed(3)}</strong> <span style={{fontSize:9*z, color:theme.sub}}>({provS ? t("provisional_status") : t("verified_status")})</span>
              </span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8*z,flexWrap:"wrap"}}>
          {[[t("stat_matches"),gamesPlayed],[t("stat_wins"),p.wins||0],[t("stat_losses"),p.losses||0],
            [t("stat_win_pct"),p.winPct!==null?`${p.winPct}%`:"—"],
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

      {/* FUN STATS SECTION */}
      <Sec title={t("fun_stats_sec") || "Fun Stats"} theme={theme}>
        {!funStats.bestPartner && !funStats.nemesis && !funStats.pigeon ? (
           <div style={{fontSize:12*z, color:theme.sub, textAlign:"center", padding:"10px 0"}}>
             Play more matches to unlock Fun Stats! <br/><span style={{fontSize: 10*z}}>(Requires min. 2 games with a partner)</span>
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

      <EditBaseRating player={p} set={set} theme={theme}/>

      <Sec title={`${t("recent_matches")} (${Math.min(myMatches.length, 5)})`} theme={theme}>
        {myMatches.slice(0,5).map(m=>(
          <React.Fragment key={m.id}>
            <MatchCard match={m} players={players} theme={theme} isAdmin={isAdmin} highlightPlayerId={p.id}
              onEdit={setEditingMatch} onShare={share} onDelete={delMatch} />
            {pendingDeleteMatch===m.id&&(
              <ConfirmInline msg={t("delete_match_q")} note={t("ratings_recalculated")}
                onConfirm={()=>delMatch(m.id)} onCancel={()=>setPendingDeleteMatch(null)} theme={theme}/>
            )}
          </React.Fragment>
        ))}
        {myMatches.length===0&&<Empty text={t("no_matches")} theme={theme}/>}
      </Sec>
    </div>
  );
}