import React, { useState, useEffect, useMemo } from 'react';
import { t, fmtDate, sortOptionsAlpha } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, Empty, ConfirmInline, Sel, MatchCard, MatchEditModal } from '../components/Shared.jsx';

// Helper to safely format local dates for comparison
const toYYYYMMDD = (d) => {
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

export default function History({matches,players,nav,set,theme,isAdmin,initialPlayerId,state,user}) {
  const S=makeS(theme);
  const z = theme.zoom || 1.0;
  
  // Basic Filters
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [playerFilter, setPlayerFilter] = useState(initialPlayerId || "");
  
  // Action States
  const [pendingDelete,setPendingDelete]=useState(null);
  const [editingMatch,setEditingMatch]=useState(null);

  // Calendar States
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null); // 'YYYY-MM-DD'
  const [calendarMode, setCalendarMode] = useState("month"); // "month" | "year"

  useEffect(() => {
    setPlayerFilter(initialPlayerId || "");
  }, [initialPlayerId]);

  const getName=id=>players.find(p=>p.id===id)?.name??"Unknown";

  // 1. First, apply text, type, and player filters
  const baseFiltered = useMemo(() => {
    return (matches || []).filter(m => {
      if(filter!=="all"&&m.type!==filter) return false;
      if(playerFilter && !m.teams?.flat().includes(playerFilter)) return false;
      if(search) {
        const q=search.toLowerCase();
        const names=m.teams?.flat().map(getName).join(" ").toLowerCase() || "";
        const venue=(m.venue||"").toLowerCase();
        const teams=[m.teamNames?.t1||"",m.teamNames?.t2||""].join(" ").toLowerCase();
        const notes=(m.notes||"").toLowerCase();
        if(!(names.includes(q)||venue.includes(q)||teams.includes(q)||notes.includes(q))) return false;
      }
      return true;
    });
  }, [matches, filter, playerFilter, search, players]);

  // 2. Pre-calculate match counts per day for the calendar dots
  const matchCountsByDay = useMemo(() => {
    const counts = {};
    baseFiltered.forEach(m => {
      const dStr = toYYYYMMDD(new Date(m.date));
      counts[dStr] = (counts[dStr] || 0) + 1;
    });
    return counts;
  }, [baseFiltered]);

  // 3. Filter matches by Calendar Selection (Month or Specific Day)
  const cYear = cursorDate.getFullYear();
  const cMonth = cursorDate.getMonth();

  const finalViewMatches = useMemo(() => {
    const sorted = [...baseFiltered].sort((a,b) => new Date(b.date) - new Date(a.date));
    return sorted.filter(m => {
      const d = new Date(m.date);
      if (selectedDateStr) {
        return toYYYYMMDD(d) === selectedDateStr;
      }
      return d.getFullYear() === cYear && d.getMonth() === cMonth;
    });
  }, [baseFiltered, selectedDateStr, cYear, cMonth]);

  // Group final matches by Day for a clean list
  const groupedMatches = useMemo(() => {
    const groups = [];
    let current = null;
    finalViewMatches.forEach(m => {
      const d = new Date(m.date);
      const key = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      if (!current || current.key !== key) {
        current = { key, matches: [] };
        groups.push(current);
      }
      current.matches.push(m);
    });
    return groups;
  }, [finalViewMatches]);

  // Calendar Logic
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(cYear, cMonth, 1).getDay();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function prevCal() {
    if (calendarMode === "year") setCursorDate(new Date(cYear - 1, cMonth, 1));
    else setCursorDate(new Date(cYear, cMonth - 1, 1));
    setSelectedDateStr(null);
  }
  function nextCal() {
    if (calendarMode === "year") setCursorDate(new Date(cYear + 1, cMonth, 1));
    else setCursorDate(new Date(cYear, cMonth + 1, 1));
    setSelectedDateStr(null);
  }

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
    let txt=`🥒 PickleRank Match\n📅 ${fmtDate(m.date)} · ${m.type}\n📍 ${m.venue||t("local_court")}\n${m.notes ? `📝 ${m.notes}\n` : ""}${t1} vs ${t2}\n`+(m.games||[]).map((g,i)=>`G${i+1}: ${g.a}–${g.b}`).join(" | ");
    txt+=`\n🏆 Winner: ${winner} (${m.team1Wins}–${m.team2Wins} games)`;
    if(navigator.share) navigator.share({title:"PickleRank Match",text:txt});
    else { navigator.clipboard.writeText(txt); alert("Copied!"); }
  }

  const selectOpts = sortOptionsAlpha(players.map(p=>({value:p.id, label:p.name})), state.favoredPlayerIds);
  const todayStr = toYYYYMMDD(new Date());

  return (
    <div style={S.view}>
      {editingMatch&&(
        <MatchEditModal match={editingMatch} players={players} onSave={saveEdit} onClose={()=>setEditingMatch(null)} theme={theme}/>
      )}

      {/* --- FILTERS --- */}
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

      {/* --- CALENDAR WIDGET --- */}
      <Sec theme={theme}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16*z}}>
          <button style={{...S.iconBtn, fontSize:16*z}} onClick={prevCal}>&lt;</button>
          <button 
            style={{background:"transparent", border:"none", color:theme.text, fontSize:15*z, fontWeight:800, cursor:"pointer", textTransform:"uppercase", letterSpacing:"1px"}}
            onClick={() => setCalendarMode(m => m === "month" ? "year" : "month")}
          >
            {calendarMode === "month" ? `${monthNames[cMonth]} ${cYear}` : cYear} ▾
          </button>
          <button style={{...S.iconBtn, fontSize:16*z}} onClick={nextCal}>&gt;</button>
        </div>

        {calendarMode === "month" ? (
          <div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4*z, marginBottom:8*z}}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{textAlign:"center", fontSize:11*z, fontWeight:700, color:theme.sub}}>{d}</div>)}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4*z}}>
              {Array.from({length: firstDayOfWeek}).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const day = i + 1;
                const dStr = `${cYear}-${String(cMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isSelected = selectedDateStr === dStr;
                const isToday = todayStr === dStr;
                const matchesCount = matchCountsByDay[dStr] || 0;

                return (
                  <div key={day} style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
                    <button 
                      onClick={() => setSelectedDateStr(isSelected ? null : dStr)}
                      style={{
                        width: 32*z, height: 32*z, borderRadius: "50%", 
                        border: isToday && !isSelected ? `1px solid ${theme.accent}` : "none",
                        background: isSelected ? theme.accent : "transparent",
                        color: isSelected ? theme.bg : theme.text,
                        fontSize: 13*z, fontWeight: isSelected || isToday ? 800 : 500,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0
                      }}>
                      {day}
                    </button>
                    {/* Activity Dot */}
                    <div style={{height: 4*z, marginTop: 2*z}}>
                      {matchesCount > 0 && <div style={{width: 4*z, height: 4*z, borderRadius: "50%", background: isSelected ? theme.bg : theme.accent}} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12*z}}>
            {monthNames.map((mName, i) => (
              <button 
                key={i} 
                onClick={() => { setCursorDate(new Date(cYear, i, 1)); setCalendarMode("month"); }}
                style={{
                  background: cMonth === i ? theme.accent : theme.bg,
                  color: cMonth === i ? theme.bg : theme.text,
                  border: `1px solid ${cMonth === i ? theme.accent : theme.border}`,
                  borderRadius: 8*z, padding: "12px 0", fontSize: 13*z, fontWeight: 700, cursor: "pointer"
                }}>
                {mName}
              </button>
            ))}
          </div>
        )}
      </Sec>

      {/* --- MATCH RESULTS --- */}
      <Sec title={`${selectedDateStr ? t("results_lbl") + " (" + finalViewMatches.length + ")" : t("results_lbl") + " - " + monthNames[cMonth] + " (" + finalViewMatches.length + ")"}`} theme={theme}>
        {finalViewMatches.length === 0 ? <Empty text={t("no_matches")} theme={theme}/> : 
          groupedMatches.map(group => (
            <div key={group.key} style={{marginBottom: 16*z}}>
              <div style={{
                position: "sticky", top: 0, zIndex: 10,
                background: theme.bg, color: theme.sub, fontSize: 12*z, fontWeight: 800,
                padding: "8px 0", marginBottom: 12*z, borderBottom: `1px solid ${theme.border}`,
                textTransform: "uppercase", letterSpacing: "1px"
              }}>
                {group.key}
              </div>

              {group.matches.map(m => {
                // SECURITY FIX: User is Admin OR User actually played in this specific match
                const isParticipant = user?.myPlayerId && m.teams?.flat()?.includes(user?.myPlayerId);
                const canEditMatch = isAdmin || isParticipant;

                return (
                  <React.Fragment key={m.id}>
                    <MatchCard match={m} players={players} theme={theme} isAdmin={canEditMatch} 
                      onEdit={canEditMatch ? setEditingMatch : undefined} onShare={share} onDelete={canEditMatch ? () => setPendingDelete(m.id) : undefined} />
                    {pendingDelete===m.id&&(
                      <ConfirmInline msg={t("delete_match_q")} note={t("ratings_recalculated")}
                        onConfirm={()=>moveToTrash(m)} onCancel={()=>setPendingDelete(null)} theme={theme}/>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))
        }
      </Sec>
    </div>
  );
}