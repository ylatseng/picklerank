import React, { useState } from 'react';
import { t, DEFAULT_RATING, computePartnerMatrix } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec, StatRow, Avatar } from '../components/Shared.jsx';

// Collapsible section wrapper — same visual style as Sec but with toggle
function CollapseSec({ title, theme, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const z = theme.zoom || 1.0;
  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 12 * z,
      marginBottom: 12 * z,
      overflow: "hidden"
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "transparent", border: "none",
          cursor: "pointer", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: `${12 * z}px ${14 * z}px`, textAlign: "left", gap: 8 * z
        }}>
        <span style={{ fontSize: 13 * z, fontWeight: 700, color: theme.accent }}>{title}</span>
        <span style={{
          fontSize: 12 * z, color: theme.sub, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s"
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: `0 ${14 * z}px ${14 * z}px`, borderTop: `1px solid ${theme.border}`, paddingTop: 12 * z }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function StatsView({ players, matches, nav, theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  const totalGames = matches.reduce((s, m) => s + (m.games?.length || 0), 0);
  const singlesCount = matches.filter(m => m.type === "singles").length;
  const doublesCount = matches.filter(m => m.type === "doubles").length;
  const venues = [...new Set(matches.map(m => m.venue).filter(Boolean))];
  const activity = [...players].sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0));
  const mostActive = activity[0];

  let biggestUpset = null, biggestUpsetDelta = 0;
  matches.forEach(m => {
    if (!m.teams || !m.teams[0] || !m.teams[1]) return;
    const winTeam = m.teams[m.winnerTeam], loseTeam = m.teams[m.winnerTeam === 0 ? 1 : 0];
    if (!m.ratingSnaps) return;
    const winAvg = winTeam.reduce((s, id) => s + (m.ratingSnaps[id] || DEFAULT_RATING), 0) / Math.max(1, winTeam.length);
    const loseAvg = loseTeam.reduce((s, id) => s + (m.ratingSnaps[id] || DEFAULT_RATING), 0) / Math.max(1, loseTeam.length);
    const delta = loseAvg - winAvg;
    if (delta > biggestUpsetDelta) { biggestUpsetDelta = delta; biggestUpset = m; }
  });

  const topRated = [...players].sort((a, b) => (b.ratingDoubles || 0) - (a.ratingDoubles || 0))[0];
  const topStreak = [...players].filter(p => p.streakType === "W").sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
  const getName = id => players.find(p => p.id === id)?.name ?? "?";

  return (
    <div style={S.view}>

      {/* ── Overview ──────────────────────────────────────────────────── */}
      <CollapseSec title={t("overview_sec")} theme={theme} defaultOpen={true}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 * z }}>
          {[[t("overview_total_matches"), matches.length, "🎮"], [t("overview_singles"), singlesCount, "👤"],
            [t("overview_doubles"), doublesCount, "👥"], [t("overview_games_played"), totalGames, "🏓"],
            [t("overview_players"), players.length, "🙋"], [t("overview_venues"), venues.length, "📍"]
          ].map(([label, val, icon]) => (
            <div key={label} style={{ ...S.statPill, flex: "1 1 28%" }}>
              <div style={{ fontSize: 18 * z }}>{icon}</div>
              <div style={{ fontSize: 20 * z, fontWeight: 800 }}>{val}</div>
              <div style={{ fontSize: 10 * z, color: theme.sub, textAlign: "center" }}>{label}</div>
            </div>
          ))}
        </div>
      </CollapseSec>

      {/* ── Records ───────────────────────────────────────────────────── */}
      <CollapseSec title={t("records_sec")} theme={theme} defaultOpen={true}>
        {mostActive && <StatRow icon="🎮" label={t("record_most_matches")} value={`${mostActive.name} (${mostActive.gamesPlayed || 0})`} theme={theme} />}
        {topRated && <StatRow icon="🏆" label={t("record_top_rated")} value={`${topRated.name} (${(topRated.ratingDoubles || 3).toFixed(3)})`} theme={theme} />}
        {topStreak && topStreak.streak >= 2 && <StatRow icon="🔥" label={t("record_hot_streak")} value={`${topStreak.name} (${topStreak.streak}W)`} theme={theme} />}
        {biggestUpset && biggestUpsetDelta > 0 && (
          <div style={{ ...S.lbRow, cursor: "default" }}>
            <div style={{ fontSize: 20 * z }}>😮</div>
            <div style={S.lbInfo}>
              <div style={{ fontSize: 13 * z, fontWeight: 600 }}>{t("record_biggest_upset")}</div>
              <div style={{ fontSize: 11 * z, color: theme.sub }}>
                {biggestUpset.teams[biggestUpset.winnerTeam].map(getName).join(" & ")} {t("record_beat_higher")} <span style={{ color: "#50c878" }}>+{biggestUpsetDelta.toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}
      </CollapseSec>

      {/* ── Venues ────────────────────────────────────────────────────── */}
      {venues.length > 0 && (
        <CollapseSec title={t("venues_lbl")} theme={theme} defaultOpen={false}>
          {venues.map(v => {
            const count = matches.filter(m => m.venue === v).length;
            return (
              <div key={v} style={{ ...S.lbRow, cursor: "default" }}>
                <div style={{ fontSize: 18 * z }}>📍</div>
                <div style={S.lbInfo}><div style={{ fontSize: 13 * z }}>{v}</div></div>
                <div style={{ fontSize: 12 * z, color: theme.sub }}>{count} {t("matches_tab").toLowerCase()}{count !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </CollapseSec>
      )}

      {/* ── Partner Matrix ────────────────────────────────────────────── */}
      {(() => {
        const matrix = computePartnerMatrix(matches);
        const activePlayers = players.filter(p => (p.doublesPlayed || 0) > 0);

        if (activePlayers.length < 2 || Object.keys(matrix).length === 0) return (
          <CollapseSec title={t("partner_matrix_sec")} theme={theme} defaultOpen={false}>
            <div style={{ color: theme.sub, fontSize: 12 * z, textAlign: "center", padding: 16 * z }}>{t("partner_matrix_no_data")}</div>
          </CollapseSec>
        );

        const key = (a, b) => [a, b].sort().join('|');
        const pctColor = pct => pct >= 60 ? "#50c878" : pct >= 45 ? "#f0a830" : "#e05050";
        const getNameLocal = id => activePlayers.find(p => p.id === id)?.name || '?';

        const selectedPlayer = activePlayers.find(p => p.id === selectedPartnerId) || activePlayers[0];
        const partnerStats = activePlayers
          .filter(p => p.id !== selectedPlayer.id)
          .map(p => {
            const k = key(selectedPlayer.id, p.id);
            const stat = matrix[k];
            return stat ? { partner: p, wins: stat.wins, total: stat.total, pct: stat.pct, gamesWon: stat.gamesWon, gamesLost: stat.gamesLost, gamePct: stat.gamePct } : null;
          })
          .filter(Boolean)
          .sort((a, b) => b.pct - a.pct);

        const allPairings = Object.entries(matrix)
          .filter(([, s]) => s.total >= 2)
          .map(([k, s]) => {
            const [idA, idB] = k.split('|');
            return { idA, idB, nameA: getNameLocal(idA), nameB: getNameLocal(idB), ...s };
          })
          .sort((a, b) => b.pct - a.pct);

        return (
          <CollapseSec title={t("partner_matrix_sec")} theme={theme} defaultOpen={true}>
            <div style={{ fontSize: 11 * z, color: theme.sub, marginBottom: 12 * z }}>{t("partner_matrix_desc")}</div>

            {/* Player picker */}
            <div style={{ display: "flex", gap: 6 * z, flexWrap: "wrap", marginBottom: 16 * z }}>
              {activePlayers.map(p => {
                const isSelected = p.id === selectedPlayer.id;
                return (
                  <button key={p.id} onClick={() => setSelectedPartnerId(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 6 * z,
                    padding: `${5 * z}px ${10 * z}px`, borderRadius: 20 * z,
                    border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                    background: isSelected ? theme.accent + "22" : "transparent",
                    color: isSelected ? theme.accent : theme.sub,
                    fontWeight: isSelected ? 700 : 400, fontSize: 12 * z, cursor: "pointer"
                  }}>
                    <Avatar name={p.name} size={20} />
                    {p.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {partnerStats.length === 0 ? (
              <div style={{ color: theme.sub, fontSize: 12 * z, textAlign: "center", padding: 12 * z }}>{t("partner_matrix_no_data")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 * z, marginBottom: 16 * z }}>
                {partnerStats.map(({ partner, wins, total, pct, gamesWon, gamesLost, gamePct }, i) => (
                  <div key={partner.id} style={{
                    background: theme.bg, border: `1px solid ${theme.border}`,
                    borderRadius: 10 * z, padding: `${10 * z}px ${12 * z}px`,
                    display: "flex", alignItems: "center", gap: 10 * z
                  }}>
                    <div style={{ fontSize: 13 * z, color: theme.sub, fontWeight: 700, minWidth: 20 * z, textAlign: "center" }}>#{i + 1}</div>
                    <Avatar name={partner.name} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 * z, color: theme.text }}>{partner.name}</div>
                      <div style={{ fontSize: 10 * z, color: theme.sub }}>
                        {wins}W {total - wins}L · {total} {t("partner_matrix_games")}
                      </div>
                      {gamesWon + gamesLost > 0 && (
                        <div style={{ fontSize: 10 * z, color: theme.sub }}>
                          {gamesWon}–{gamesLost} {t("partner_matrix_in_games") || "in games"}
                          {gamePct !== null && (
                            <span style={{ marginLeft: 4 * z, color: gamePct >= 50 ? "#50c878" : "#e05050", fontWeight: 600 }}>
                              ({gamePct}%)
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ height: 5 * z, background: theme.border, borderRadius: 3 * z, overflow: "hidden", marginTop: 4 * z }}>
                        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: pctColor(pct), borderRadius: 3 * z, transition: "width 0.4s" }} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15 * z, fontWeight: 800, color: pctColor(pct),
                      background: pctColor(pct) + "18", borderRadius: 8 * z,
                      padding: `${4 * z}px ${8 * z}px`, minWidth: 44 * z, textAlign: "center"
                    }}>{pct}%</div>
                  </div>
                ))}
              </div>
            )}

            {allPairings.length > 0 && (
              <>
                <div style={{ fontSize: 11 * z, fontWeight: 700, color: theme.sub, marginBottom: 8 * z, marginTop: 4 * z }}>
                  🏆 {t("partner_matrix_top") || "Top Partnerships (2+ matches)"}
                </div>
                {allPairings.slice(0, 5).map(({ idA, nameA, nameB, wins, total, pct, gamesWon, gamesLost }) => (
                  <div key={idA + nameB} style={{ padding: `${6 * z}px 0`, borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 * z }}>
                      <div style={{ flex: 1, fontSize: 12 * z, color: theme.text, fontWeight: 600 }}>
                        {nameA.split(' ')[0]} & {nameB.split(' ')[0]}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11 * z, color: theme.sub }}>{wins}W {total - wins}L · {total} {t("partner_matrix_games")}</div>
                        {gamesWon + gamesLost > 0 && (
                          <div style={{ fontSize: 10 * z, color: theme.sub }}>{gamesWon}–{gamesLost} {t("partner_matrix_in_games") || "in games"}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 12 * z, fontWeight: 800, color: pctColor(pct), minWidth: 40 * z, textAlign: "right" }}>{pct}%</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ display: "flex", gap: 10 * z, marginTop: 12 * z, fontSize: 10 * z, color: theme.sub }}>
              {[["#50c878", "≥60%"], ["#f0a830", "45–59%"], ["#e05050", "<45%"]].map(([c, l]) => (
                <span key={l}><span style={{ color: c, fontWeight: 700 }}>■</span> {l}</span>
              ))}
            </div>
          </CollapseSec>
        );
      })()}
    </div>
  );
}
