import React, { useState } from 'react';
import { t, K_FACTOR, PROVISIONAL_MATCH_THRESHOLD, CONFIDENCE_FULL_MATCHES, CONFIDENCE_RECENCY_WINDOW_DAYS, WIN_TO_OPTIONS } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';

export default function Legends({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [openSection, setOpenSection] = useState(null);

  const toggle = (key) => setOpenSection(prev => prev === key ? null : key);

  const ItemRow = ({ icon, title, desc }) => (
    <div style={{ display: "flex", gap: 12*z, padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ width: 32*z, textAlign: "center", fontSize: 18*z, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13*z, fontWeight: 700, color: theme.text, marginBottom: 2*z }}>{title}</div>
        <div style={{ fontSize: 11*z, color: theme.sub, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );

  const AccordionSec = ({ id, title, children }) => {
    const open = openSection === id;
    return (
      <div style={{ borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => toggle(id)} style={{
          width: "100%", textAlign: "left", background: "transparent", border: "none",
          padding: `${12*z}px ${4*z}px`, cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: 13*z, fontWeight: 700, color: theme.accent }}>{title}</span>
          <span style={{ fontSize: 12*z, color: theme.sub }}>{open ? "▲" : "▼"}</span>
        </button>
        {open && <div style={{ paddingBottom: 12*z }}>{children}</div>}
      </div>
    );
  };

  // ── Rating tier table ──────────────────────────────────────────────────────
  const tiers = [
    { range: "5.5 – 6.5", label: t("rating_elite"),        color: "#f0c040", bg: "rgba(240,192,64,0.12)",  desc: t("tier_elite_desc") },
    { range: "4.5 – 5.5", label: t("rating_advanced"),     color: "#e06030", bg: "rgba(224,96,48,0.12)",   desc: t("tier_advanced_desc") },
    { range: "3.5 – 4.5", label: t("rating_intermediate"), color: "#40a0e0", bg: "rgba(64,160,224,0.12)",  desc: t("tier_intermediate_desc") },
    { range: "2.5 – 3.5", label: t("rating_recreational"), color: "#50c878", bg: "rgba(80,200,120,0.12)",  desc: t("tier_recreational_desc") },
    { range: "1.5 – 2.5", label: t("rating_beginner"),     color: "#888",    bg: "rgba(136,136,136,0.12)", desc: t("tier_beginner_desc") },
  ];

  // ── K-factor taper table ───────────────────────────────────────────────────
  const kRows = [0, 1, 2, 3, 4, 5, 10, 20, 30].map(n => {
    const t2 = Math.max(0, n);
    const kF = t2 >= PROVISIONAL_MATCH_THRESHOLD
      ? K_FACTOR
      : K_FACTOR * (2 - (t2 / PROVISIONAL_MATCH_THRESHOLD));
    return { n, kF };
  });

  return (
    <div style={S.view}>

      {/* ── 1. RATING TIERS & COLOURS ─────────────────────────────────────── */}
      <Sec title={t("legend_rating_tiers_sec") || "🎨 Rating Tiers & Colors"} theme={theme}>
        <div style={{ fontSize: 11*z, color: theme.sub, marginBottom: 10*z, lineHeight: 1.5 }}>
          {t("legend_rating_intro")}
        </div>
        {tiers.map(tier => (
          <div key={tier.range} style={{
            display: "flex", alignItems: "flex-start", gap: 10*z,
            padding: `${8*z}px ${10*z}px`, marginBottom: 6*z,
            background: tier.bg, borderRadius: 8*z,
            border: `1px solid ${tier.color}44`
          }}>
            <div style={{
              background: tier.color, color: "#111", fontWeight: 800,
              fontSize: 10*z, padding: "3px 7px", borderRadius: 5*z,
              minWidth: 40*z, textAlign: "center", flexShrink: 0
            }}>{tier.range}</div>
            <div>
              <div style={{ fontWeight: 700, color: tier.color, fontSize: 12*z }}>{tier.label}</div>
              <div style={{ fontSize: 11*z, color: theme.sub, lineHeight: 1.4 }}>{tier.desc}</div>
            </div>
          </div>
        ))}
      </Sec>

      {/* ── 2. HOW RATINGS ARE CALCULATED ─────────────────────────────────── */}
      <Sec title={t("legend_how_calc_sec") || "🧮 How Ratings Are Calculated"} theme={theme}>
        <div style={{ fontSize: 11*z, color: theme.sub, lineHeight: 1.6 }}>

          <div style={{ fontWeight: 700, color: theme.text, fontSize: 12*z, marginBottom: 4*z }}>{t("legend_step1_title")}</div>
          <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8*z, padding: 10*z, marginBottom: 10*z, fontFamily: "monospace", fontSize: 11*z, color: theme.accent }}>
            P(win) = 1 / (1 + 10 ^ ((oppRating − myRating) / 0.4))
          </div>
          <div style={{ marginBottom: 10*z }}>
            {t("legend_step1_desc")}
          </div>

          <div style={{ fontWeight: 700, color: theme.text, fontSize: 12*z, marginBottom: 4*z }}>{t("legend_step2_title")}</div>
          <div style={{ marginBottom: 10*z }}>
            {t("legend_step2_desc")}
          </div>
          <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8*z, padding: 10*z, marginBottom: 10*z, fontFamily: "monospace", fontSize: 11*z, color: theme.accent }}>
            margin = myTeamPoints / (myTeamPoints + oppTeamPoints)
            {"\n"}K_adjusted = K × (1 + (margin − 0.5))
          </div>

          <div style={{ fontWeight: 700, color: theme.text, fontSize: 12*z, marginBottom: 4*z }}>{t("legend_step3_title")}</div>
          <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8*z, padding: 10*z, marginBottom: 10*z, fontFamily: "monospace", fontSize: 11*z, color: theme.accent }}>
            newRating = oldRating + K_adjusted × (actual − expected){"\n"}
            (clamped to 1.500 – 6.500)
          </div>
          <div style={{ marginBottom: 10*z }}>
            {t("legend_step3_actual")}<br/>
            {t("legend_step3_expected")}<br/>
            {(t("legend_step3_k") || "Base K = {k} — controls how fast ratings move per match.").replace("{k}", K_FACTOR)}
          </div>

          <div style={{ fontWeight: 700, color: theme.text, fontSize: 12*z, marginBottom: 4*z }}>{t("legend_step4_title")}</div>
          <div style={{ marginBottom: 6*z }}>
            {(t("legend_step4_desc") || "").replace("{n}", PROVISIONAL_MATCH_THRESHOLD)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6*z, marginBottom: 10*z }}>
            {kRows.map(({ n, kF }) => (
              <div key={n} style={{
                padding: `${3*z}px ${7*z}px`, borderRadius: 6*z, fontSize: 10*z,
                background: n < PROVISIONAL_MATCH_THRESHOLD ? "rgba(245,158,11,0.12)" : "rgba(80,200,120,0.10)",
                border: `1px solid ${n < PROVISIONAL_MATCH_THRESHOLD ? "#f59e0b44" : "#50c87844"}`,
                color: n < PROVISIONAL_MATCH_THRESHOLD ? "#f59e0b" : "#50c878",
                fontWeight: 600
              }}>
                {(t("match_num_k") || "Match #{n}: K={k}").replace("{n}", n).replace("{k}", kF.toFixed(4))}
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 700, color: theme.text, fontSize: 12*z, marginBottom: 4*z }}>{t("legend_replay_title")}</div>
          <div>
            {t("legend_replay_desc")}
          </div>
        </div>
      </Sec>

      {/* ── 3. RATING CONFIDENCE ──────────────────────────────────────────── */}
      <Sec title={t("legend_confidence_sec") || "📊 Rating Confidence %"} theme={theme}>
        <div style={{ fontSize: 11*z, color: theme.sub, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 8*z }}>
            {t("legend_conf_intro")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8*z, marginBottom: 10*z }}>
            {[
              { label: t("conf_sample_lbl"), color: "#40a0e0", desc: `(t("conf_sample_desc") || "").replace("{n}", CONFIDENCE_FULL_MATCHES)` },
              { label: t("conf_recency_lbl"), color: "#50c878", desc: `(t("conf_recency_desc") || "").replace("{d}", CONFIDENCE_RECENCY_WINDOW_DAYS)` },
            ].map(({ label, color, desc }) => (
              <div key={label} style={{ padding: 10*z, borderRadius: 8*z, background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div style={{ fontWeight: 700, color, fontSize: 12*z, marginBottom: 3*z }}>{label}</div>
                <div style={{ fontSize: 11*z, color: theme.sub }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8*z, flexWrap: "wrap" }}>
            {[["≥ 75%", "#50c878", t("conf_high_desc")], ["45–74%", "#f0a830", t("conf_medium_desc")], ["< 45%", "#e05050", t("conf_low_desc")]].map(([range, color, desc]) => (
              <div key={range} style={{ padding: `${5*z}px ${9*z}px`, borderRadius: 20*z, border: `1.5px solid ${color}`, background: color+"18", fontSize: 11*z }}>
                <span style={{ fontWeight: 700, color }}>{range}</span>
                <span style={{ color: theme.sub }}> {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── 4. ICONS & BADGES ─────────────────────────────────────────────── */}
      <Sec title={t("legends_icons_badges")} theme={theme}>
        <ItemRow icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontWeight:800}}>P</span>} title={t("legend_prov_title")} desc={t("legend_prov_desc")} />
        <ItemRow icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(80,200,120,0.12)", color: "#50c878", fontWeight:800}}>C</span>} title={t("legend_conf_title")} desc={t("legend_conf_desc")} />
        <ItemRow icon="📊" title={t("legend_conf_icon_title") || "Rating Confidence %"} desc={t("legend_conf_icon_desc") || "How much to trust the rating. Green ≥75% (reliable), amber 45–74% (developing), red <45% (needs more matches). Drops if inactive for 90+ days."} />
        <ItemRow icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(64,160,224,0.12)", color: "#40a0e0", fontWeight:800}}>D</span>} title={t("legend_dupr_title")} desc={t("legend_dupr_desc")} />
        <ItemRow icon="🔥" title={t("legend_hot_title")} desc={t("legend_hot_desc")} />
        <ItemRow icon="🧊" title={t("legend_cold_title")} desc={t("legend_cold_desc")} />
        <ItemRow icon="⭐" title={t("legend_fav_title")} desc={t("legend_fav_desc")} />
      </Sec>

      {/* ── 5. SCORE RULES ────────────────────────────────────────────────── */}
      <Sec title={t("legend_score_rules_sec") || "🏓 Valid Score Rules"} theme={theme}>
        <div style={{ fontSize: 11*z, color: theme.sub, lineHeight: 1.6, marginBottom: 10*z }}>
          {t("legend_score_intro")}
        </div>
        <div style={{ display: "flex", gap: 8*z, flexWrap: "wrap", marginBottom: 10*z }}>
          {WIN_TO_OPTIONS.map(n => (
            <div key={n} style={{ padding: `${5*z}px ${12*z}px`, borderRadius: 20*z, background: theme.bg, border: `1px solid ${theme.border}`, fontSize: 12*z, fontWeight: 700, color: theme.accent }}>
              {(t("first_to_lbl") || "First to {n}").replace("{n}", n)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6*z }}>
          {[
            ["11 – 2",  t("score_legal"),   "#50c878", t("score_rule_1")],
            ["11 – 9",  t("score_legal"),   "#50c878", t("score_rule_1")],
            ["12 – 10", t("score_legal"),   "#50c878", t("score_rule_2")],
            ["15 – 13", t("score_legal"),   "#50c878", t("score_rule_2")],
            ["11 – 10", t("score_illegal"), "#e05050", t("score_rule_3")],
            ["25 – 2",  t("score_illegal"), "#e05050", t("score_rule_4")],
          ].map(([score, verdict, color, note]) => (
            <div key={score} style={{ display:"flex", gap: 8*z, alignItems:"center", fontSize: 11*z, padding: `${5*z}px 0`, borderBottom: `1px solid ${theme.border}` }}>
              <code style={{ fontWeight: 700, color: theme.text, minWidth: 52*z }}>{score}</code>
              <span style={{ fontWeight: 700, color, minWidth: 70*z }}>{verdict}</span>
              <span style={{ color: theme.sub }}>{note}</span>
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 6. RADAR CHART ────────────────────────────────────────────────── */}
      <Sec title={t("legends_radar")} theme={theme}>
        <ItemRow icon="📈" title={t("legend_win_pct")} desc={t("legend_win_pct_desc")} />
        <ItemRow icon="⚔️" title={t("legend_power")} desc={t("legend_power_desc")} />
        <ItemRow icon="🤝" title={t("legend_synergy")} desc={t("legend_synergy_desc")} />
        <ItemRow icon="🧗" title={t("legend_upset")} desc={t("legend_upset_desc")} />
        <ItemRow icon="🌊" title={t("legend_form")} desc={t("legend_form_desc")} />
      </Sec>

      {/* ── 7. FUN STATS ──────────────────────────────────────────────────── */}
      <Sec title={t("legends_fun_stats")} theme={theme}>
        <ItemRow icon="👯" title={t("best_partner")} desc={t("legend_partner_desc")} />
        <ItemRow icon="👹" title={t("nemesis")} desc={t("legend_nemesis_desc")} />
        <ItemRow icon="🐦" title={t("pigeon")} desc={t("legend_pigeon_desc")} />
        <ItemRow icon="🎯" title="Point Win %" desc="Points scored by your team divided by all points played across every match. 50% = perfectly even. Elite rec players typically hold 54–58%." />
      </Sec>

      {/* ── 8. ACHIEVEMENTS ───────────────────────────────────────────────── */}
      <Sec title={t("legends_achievements")} theme={theme}>
        <ItemRow icon="🎖️" title={t("badge_centurion")} desc={t("legend_centurion_desc")} />
        <ItemRow icon="🛡️" title={t("badge_ironman")} desc={t("legend_ironman_desc")} />
        <ItemRow icon="🌋" title={t("badge_streaker")} desc={t("legend_on_fire_desc")} />
        <ItemRow icon="🎯" title={t("badge_sharp")} desc={t("legend_sharp_desc")} />
        <ItemRow icon="🗡️" title={t("badge_slayer")} desc={t("legend_giant_slayer_desc")} />
      </Sec>

    </div>
  );
}
