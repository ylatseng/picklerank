import React, { useState, useEffect, useMemo } from 'react';
import { t, fmtDate, sortOptionsAlpha } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, ConfirmInline, Sel, MatchCard, MatchEditModal } from '../components/Shared.jsx';

export default function History({matches,players,nav,set,theme,isAdmin,initialPlayerId,state}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [playerFilter, setPlayerFilter] = useState(initialPlayerId || "");
  const [pendingDelete,setPendingDelete]=useState(null);
  const [editingMatch,setEditingMatch]=useState(null);

  useEffect(() => {
    setPlayerFilter(initialPlayerId || "");
  }, [initialPlayerId]);

  const getName=id=>players.find(p=>p.id===id)?.name??"Unknown";
  const sorted=useMemo(()=>[...matches].reverse(),[matches]);
  const filtered=useMemo(()=>sorted.filter(m=>{
    if(filter!=="all"&&m.type!==filter) return false;
    if(playerFilter && !m.teams?.flat().includes(playerFilter)) return false;
    if(!search) return true;
    const q=search.toLowerCase();
    const names=m.teams?.flat().map(getName).join(" ").toLowerCase() || "";
    const venue=(m.venue||"").toLowerCase();
    const teams=[m.teamNames?.t1||"",m.teamNames?.t2||""].join(" ").toLowerCase();
    return names.includes(q)||venue.includes(q)||teams.includes(q);
  }),[sorted,search,filter,playerFilter,players]);

  // Unified "Trash" move logic
  function moveToTrash(match) {
    set(s => ({
      ...s,
      trash: [...(s.trash || []), { id: match.id, type: 'match', data: match, deletedAt: Date.now() }],
      matches: s.matches.filter(m => m.id !== match.id)
    }));
    setPendingDelete(null);
  }

  function saveEdit(updated){
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

  const selectOpts = sortOptionsAlpha(players.map(p=>({value:p.id, label:p.name})), state.favoredPlayerIds);

  return (
    <div style={S.view}>
      {editingMatch&&(
        <MatchEditModal match={editingMatch} players={players} onSave={saveEdit} onClose={()=>setEditingMatch(null)} theme={theme}/>
      )}

      <Sec title={t("filter_search_sec")} theme={theme}>
        <input style={{...S.input,marginBottom:10*z}} placeholder={t("search_placeholder")} value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:"flex", gap:10*z, marginBottom:10*z}}>
          <Sel opts={selectOpts} value={playerFilter} onChange={setPlayerFilter} placeholder={t("all_players")} theme={theme}/>
        </div>
        <div style={S.toggle}>
          {["all","singles","doubles"].map(f=>(
            <button key={f} style={{...S.toggleBtn,...(filter===f?{...S.toggleOn,background:theme.card,borderColor:theme.accent,color:theme.accent}:{})}} onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </Sec>

      <Sec title={`${t("results_lbl")} (${filtered.length})`} theme={theme}>
        {filtered.length===0?<Empty text={t("no_matches")} theme={theme}/>
          :filtered.map(m=>(
            <React.Fragment key={m.id}>
              <MatchCard match={m} players={players} theme={theme} isAdmin={isAdmin} 
                onEdit={setEditingMatch} onShare={share} onDelete={()=>setPendingDelete(m.id)} />
              {pendingDelete===m.id&&(
                <ConfirmInline msg={t("delete_match_q")} note={t("ratings_recalculated")}
                  onConfirm={()=>moveToTrash(m)} onCancel={()=>setPendingDelete(null)} theme={theme}/>
              )}
            </React.Fragment>
          ))}
      </Sec>
    </div>
  );
}