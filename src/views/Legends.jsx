import React, { useState } from 'react';
import { t, K_FACTOR, PROVISIONAL_MATCH_THRESHOLD, CONFIDENCE_FULL_MATCHES, CONFIDENCE_RECENCY_WINDOW_DAYS, WIN_TO_OPTIONS } from '../engine.js';
import { makeS } from '../styles.js';

export default function Legends({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;
  const [activeTab, setActiveTab] = useState(0);
  const [openSections, setOpenSections] = useState({ 0: true }); // first section open by default

  const toggle = (id) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  // Collapsible accordion section
  const Accordion = ({ id, title, children }) => {
    const open = !!openSections[id];
    return (
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14*z, marginBottom: 10*z, overflow: "hidden" }}>
        <button onClick={() => toggle(id)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "transparent", border: "none", cursor: "pointer",
          padding: `${14*z}px ${14*z}px`, textAlign: "left"
        }}>
          <span style={{ fontSize: 13*z, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</span>
          <span style={{ fontSize: 14*z, color: theme.sub, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </button>
        {open && <div style={{ padding: `0 ${14*z}px ${14*z}px` }}>{children}</div>}
      </div>
    );
  };

  const ItemRow = ({ icon, title, desc }) => (
    <div style={{ display:"flex", gap:12*z, padding:"10px 0", borderBottom:`1px solid ${theme.border}` }}>
      <div style={{ width:32*z, textAlign:"center", fontSize:18*z, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:13*z, fontWeight:700, color:theme.text, marginBottom:2*z }}>{title}</div>
        <div style={{ fontSize:11*z, color:theme.sub, lineHeight:1.5 }}>{desc}</div>
      </div>
    </div>
  );

  const tabs = [
    { title: t("legend_tab_ratings", "Ratings"), icon: "🧮" },
    { title: t("legend_tab_stats", "Features"), icon: "📊" },
    { title: t("legend_tab_icons", "Icons"), icon: "🎖️" },
  ];

  // H2H Match Mode Data
  const h2hModes = [
    { 
      icon: "🏓", 
      title: t("legend_h2h_singles_title", "H2H Singles"),
      desc: t("legend_h2h_singles_desc", "Head-to-head singles matches between two players. Rating changes reflect direct one-on-one competition. Perfect for tracking individual skill progression against specific rivals.")
    },
    { 
      icon: "🤝", 
      title: t("legend_h2h_partners_title", "H2H Doubles Partners"),
      desc: t("legend_h2h_partners_desc", "Track your win/loss record and chemistry with specific doubles partners. Includes partner pairing frequency, combined rating, and avg win margin.")
    },
    { 
      icon: "⚔️", 
      title: t("legend_h2h_oppositions_title", "H2H Team Oppositions"),
      desc: t("legend_h2h_oppositions_desc", "Head-to-head record against specific opposing teams/pairs in doubles. See which team combinations you play best against and which are your toughest matchups.")
    },
    { 
      icon: "📊", 
      title: t("legend_h2h_differential_title", "H2H Rating Differential"),
      desc: t("legend_h2h_differential_desc", "Historical rating gap between you and each opponent at time of match. Tracks upsets (beating higher-rated players) and learning curve against tougher competition.")
    }
  ];

  const tiers = [
    { range:"5.5 – 6.5", label:t("rating_elite"), color:"#f0c040", bg:"rgba(240,192,64,0.12)", desc:t("tier_elite_desc") },
    { range:"4.5 – 5.5", label:t("rating_advanced"), color:"#e06030", bg:"rgba(224,96,48,0.12)", desc:t("tier_advanced_desc") },
    { range:"3.5 – 4.5", label:t("rating_intermediate"), color:"#40a0e0", bg:"rgba(64,160,224,0.12)", desc:t("tier_intermediate_desc") },
    { range:"2.5 – 3.5", label:t("rating_recreational"), color:"#50c878", bg:"rgba(80,200,120,0.12)", desc:t("tier_recreational_desc") },
    { range:"1.5 – 2.5", label:t("rating_beginner"), color:"#888", bg:"rgba(136,136,136,0.12)", desc:t("tier_beginner_desc") },
  ];

  const kRows = [0,1,2,3,4,5,10,20,30].map(n => ({ n, kF: n >= PROVISIONAL_MATCH_THRESHOLD ? K_FACTOR : K_FACTOR * (2 - (n / PROVISIONAL_MATCH_THRESHOLD)) }));

  // When switching tabs, reset to first section open
  const switchTab = (i) => { setActiveTab(i); setOpenSections({ [`${i}-0`]: true }); };

  return (
    // Flows inside <main> (the scroll container). Sticky tabs pin to main's top.
    <div>

      {/* STICKY TAB BAR — pinned to top of the main scroll area */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: theme.bg,
        display: "flex", gap: 6*z,
        padding: `${12*z}px ${12*z}px`,
        borderBottom: `1px solid ${theme.border}`
      }}>
        {tabs.map((tab, i) => (
          <button key={tab.title} onClick={() => switchTab(i)} style={{
            flex: 1, padding: "10px 4px",
            border: activeTab === i ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
            borderRadius: 8*z, fontSize: 11*z, cursor: "pointer",
            background: activeTab === i ? theme.accent+"15" : theme.card,
            color: activeTab === i ? theme.accent : theme.sub,
            fontWeight: 700
          }}>
            {tab.icon} {tab.title}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 14*z, paddingBottom: 24*z, paddingLeft: 12*z, paddingRight: 12*z }}>

        {/* ═══ TAB 0: RATINGS ═══ */}
        {activeTab === 0 && (
          <>
            <Accordion id="0-0" title={t("legend_rating_tiers_sec")}>
              {tiers.map(tier => (
                <div key={tier.range} style={{display:"flex", alignItems:"flex-start", gap:10*z, padding:`${8*z}px ${10*z}px`, marginBottom:6*z, background:tier.bg, borderRadius:8*z, border:`1px solid ${tier.color}44`}}>
                  <div style={{background:tier.color, color:"#111", fontWeight:800, fontSize:10*z, padding:"3px 7px", borderRadius:5*z, minWidth:40*z, textAlign:"center", flexShrink:0}}>{tier.range}</div>
                  <div><div style={{fontWeight:700, color:tier.color, fontSize:12*z}}>{tier.label}</div><div style={{fontSize:11*z, color:theme.sub, lineHeight:1.4}}>{tier.desc}</div></div>
                </div>
              ))}
            </Accordion>

            <Accordion id="0-1" title={t("legend_how_calc_sec")}>
              <div style={{fontWeight:700, color:theme.text, fontSize:12*z, marginBottom:4*z}}>{t("legend_step1_title")}</div>
              <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z, padding:10*z, marginBottom:10*z, fontFamily:"monospace", fontSize:11*z, color:theme.accent}}>P(win) = 1 / (1 + 10 ^ ((oppRating − myRating) / 0.4))</div>
              <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.6, marginBottom:10*z}}>{t("legend_step1_desc")}</div>
              <div style={{fontWeight:700, color:theme.text, fontSize:12*z, marginBottom:4*z}}>{t("legend_step2_title")}</div>
              <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.6, marginBottom:10*z}}>{t("legend_step2_desc")}</div>
              <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z, padding:10*z, marginBottom:10*z, fontFamily:"monospace", fontSize:11*z, color:theme.accent}}>margin = myTeamPoints / (myTeamPoints + oppTeamPoints)<br/>K_adjusted = K × (1 + (margin − 0.5))</div>
              <div style={{fontWeight:700, color:theme.text, fontSize:12*z, marginBottom:4*z}}>{t("legend_step3_title")}</div>
              <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z, padding:10*z, marginBottom:10*z, fontFamily:"monospace", fontSize:11*z, color:theme.accent}}>newRating = oldRating + K_adjusted × (actual − expected)</div>
              <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.6, marginBottom:10*z}}>{t("legend_step3_actual")}<br/>{t("legend_step3_expected")}<br/>{(t("legend_step3_k") || "Base K = {k}").replace("{k}", K_FACTOR)}</div>
              <div style={{fontWeight:700, color:theme.text, fontSize:12*z, marginBottom:4*z}}>{t("legend_step4_title")}</div>
              <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.6, marginBottom:6*z}}>{(t("legend_step4_desc") || "").replace("{n}", PROVISIONAL_MATCH_THRESHOLD)}</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:6*z}}>
                {kRows.map(({n, kF}) => (
                  <div key={n} style={{padding:`3px 7px`, borderRadius:6*z, fontSize:10*z, background: n < PROVISIONAL_MATCH_THRESHOLD ? "rgba(245,158,11,0.12)" : "rgba(80,200,120,0.10)", color: n < PROVISIONAL_MATCH_THRESHOLD ? "#f59e0b" : "#50c878", fontWeight:600}}>{"Match #" + n + ": K=" + kF.toFixed(2)}</div>
                ))}
              </div>
            </Accordion>

            <Accordion id="0-2" title={t("legend_match_vs_game_sec")}>
              {[ { label: t("legend_match_def"), color: theme.accent, desc: t("legend_match_def_desc") }, { label: t("legend_game_def"), color: "#f0a830", desc: t("legend_game_def_desc") } ].map(({label, color, desc}) => (
                <div key={label} style={{padding:10*z, borderRadius:8*z, background:theme.bg, border:`1px solid ${theme.border}`, marginBottom:8*z}}>
                  <div style={{fontWeight:700, color, fontSize:12*z}}>{label}</div><div style={{fontSize:11*z, color:theme.sub}}>{desc}</div>
                </div>
              ))}
              <div style={{display:"flex", flexDirection:"column", gap:6*z, marginBottom:12*z}}>
                {[t("legend_stat_table_wl"),t("legend_stat_table_winpct"),t("legend_stat_table_streak"),t("legend_stat_table_rating"),t("legend_stat_table_ptpct"),t("legend_stat_table_partner")].map((row, i) => {
                  const [stat, ...rest] = row.split(" — ");
                  return (
                    <div key={i} style={{display:"flex", gap:8*z, fontSize:11*z, padding:`${4*z}px 0`, borderBottom:`1px solid ${theme.border}`}}>
                      <span style={{fontWeight:700, color:theme.text, minWidth:120*z}}>{stat}</span>
                      <span style={{color:theme.sub}}>{rest.join(" — ")}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{fontWeight:700, color:theme.text, fontSize:12*z, marginBottom:4*z}}>{t("legend_margin_example_title")}</div>
              <div style={{background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:8*z, padding:10*z, fontSize:11*z, color:theme.sub, lineHeight:1.6}}>{t("legend_margin_example")}</div>
            </Accordion>
          </>
        )}

        {/* ═══ TAB 1: FEATURES ═══ */}
        {activeTab === 1 && (
          <>
            <Accordion id="1-0" title={t("legend_sec_features", "Features & Stats")}>
              <ItemRow icon="⚡" title={t("legend_motd_title")} desc={t("legend_motd_desc")} />
              <ItemRow icon="📅" title={t("legend_potm_title")} desc={t("legend_potm_desc")} />
              <ItemRow icon="🤝" title={t("legend_team_suggest_title")} desc={t("legend_team_suggest_desc")} />
              <ItemRow icon="🏆" title={t("legend_session_summary_title")} desc={t("legend_session_summary_desc")} />
              <ItemRow icon="📈" title={t("legend_form_dots_title")} desc={t("legend_form_dots_desc")} />
              <ItemRow icon="🎯" title={t("legend_goal_title")} desc={t("legend_goal_desc")} />
              <ItemRow icon="📉" title={t("legend_volatility_title")} desc={t("legend_volatility_desc")} />
              <ItemRow icon="🎯" title={t("legend_pt_win_pct_title")} desc={t("legend_pt_win_pct_desc2")} />
              <ItemRow icon="📊" title={t("legends_radar")} desc={t("legend_radar_desc")} />
              <ItemRow icon="👯" title={t("legends_fun_stats")} desc={t("legend_fun_stats_desc")} />
            </Accordion>

            <Accordion id="1-1" title={t("legend_sec_match_modes", "Match Modes")}>
              <ItemRow icon="🏓" title={t("legend_mode_custom_title")} desc={t("legend_mode_custom_desc")} />
              <ItemRow icon="🔄" title={t("legend_mode_session_title")} desc={t("legend_mode_session_desc")} />
              <ItemRow icon="👑" title={t("legend_mode_kotc_title")} desc={t("legend_mode_kotc_desc")} />
              <ItemRow icon="🏆" title={t("legend_mode_tourney_title")} desc={t("legend_mode_tourney_desc")} />
            </Accordion>

            <Accordion id="1-4" title={t("legend_sec_h2h", "Head-to-Head (H2H) Statistics")}>
              {h2hModes.map(mode => (
                <ItemRow key={mode.title} icon={mode.icon} title={mode.title} desc={mode.desc} />
              ))}
            </Accordion>

            <Accordion id="1-2" title={t("legend_sec_confidence", "Rating Confidence %")}>
              <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.6, marginBottom:10*z}}>{t("legend_conf_intro")}</div>
              <div style={{display:"flex", flexDirection:"column", gap:8*z, marginBottom:10*z}}>
                {[
                  { label: t("conf_sample_lbl"), color:"#40a0e0", desc: (t("conf_sample_desc") || "").replace("{n}", CONFIDENCE_FULL_MATCHES) },
                  { label: t("conf_recency_lbl"), color:"#50c878", desc: (t("conf_recency_desc") || "").replace("{d}", CONFIDENCE_RECENCY_WINDOW_DAYS) },
                ].map(({label, color, desc}) => (
                  <div key={label} style={{padding:10*z, borderRadius:8*z, background:theme.bg, border:`1px solid ${theme.border}`}}>
                    <div style={{fontWeight:700, color, fontSize:12*z, marginBottom:3*z}}>{label}</div>
                    <div style={{fontSize:11*z, color:theme.sub}}>{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex", gap:8*z, flexWrap:"wrap"}}>
                {[["≥ 75%","#50c878",t("conf_high_desc")],["45–74%","#f0a830",t("conf_medium_desc")],["< 45%","#e05050",t("conf_low_desc")]].map(([range,color,desc]) => (
                  <div key={range} style={{padding:`${5*z}px ${9*z}px`, borderRadius:20*z, border:`1.5px solid ${color}`, background:color+"18", fontSize:11*z}}>
                    <span style={{fontWeight:700, color}}>{range}</span>
                    <span style={{color:theme.sub}}> {desc}</span>
                  </div>
                ))}
              </div>
            </Accordion>

            <Accordion id="1-3" title={t("legend_sec_dupr", "PickleRank vs DUPR")}>
              <div style={{fontSize:11*z, color:theme.sub, lineHeight:1.6, marginBottom:10*z}}>{t("legend_vs_dupr_intro")}</div>
              <div style={{borderRadius:8*z, overflow:"hidden", border:`1px solid ${theme.border}`, marginBottom:12*z}}>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", background:theme.bg, borderBottom:`1px solid ${theme.border}`}}>
                  <div style={{padding:`${6*z}px ${8*z}px`}}></div>
                  <div style={{padding:`${6*z}px ${8*z}px`, fontSize:11*z, fontWeight:700, color:"#40a0e0", textAlign:"center"}}>{t("legend_dupr_col", "DUPR")}</div>
                  <div style={{padding:`${6*z}px ${8*z}px`, fontSize:11*z, fontWeight:700, color:theme.accent, textAlign:"center"}}>{t("legend_pr_col", "PickleRank")}</div>
                </div>
                {[
                  [t("legend_vs_model"),      t("legend_vs_model_dupr"),      t("legend_vs_model_pr")],
                  [t("legend_vs_margin"),     t("legend_vs_margin_dupr"),     t("legend_vs_margin_pr")],
                  [t("legend_vs_scale"),      t("legend_vs_scale_dupr"),      t("legend_vs_scale_pr")],
                  [t("legend_vs_matches"),    t("legend_vs_matches_dupr"),    t("legend_vs_matches_pr")],
                  [t("legend_vs_confidence"), t("legend_vs_confidence_dupr"), t("legend_vs_confidence_pr")],
                  [t("legend_vs_formula"),    t("legend_vs_formula_dupr"),    t("legend_vs_formula_pr")],
                ].map(([label, dupr, pr], i) => (
                  <div key={label} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderBottom: i < 5 ? `1px solid ${theme.border}` : "none", background: i % 2 === 0 ? "transparent" : theme.bg+"44"}}>
                    <div style={{padding:`${6*z}px ${8*z}px`, fontSize:10*z, fontWeight:700, color:theme.text}}>{label}</div>
                    <div style={{padding:`${6*z}px ${8*z}px`, fontSize:10*z, color:theme.sub, textAlign:"center"}}>{dupr}</div>
                    <div style={{padding:`${6*z}px ${8*z}px`, fontSize:10*z, color:theme.sub, textAlign:"center"}}>{pr}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:10*z, borderRadius:8*z, background:"rgba(64,160,224,0.08)", border:"1px solid rgba(64,160,224,0.25)", fontSize:11*z, color:theme.sub}}>{t("legend_vs_note")}</div>
            </Accordion>
          </>
        )}

        {/* ═══ TAB 2: ICONS ═══ */}
        {activeTab === 2 && (
          <Accordion id="2-0" title={t("legends_icons_badges")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10*z }}>
              <ItemRow icon="🎖️" title={t("badge_centurion")} desc={t("legend_centurion_desc")} />
              <ItemRow icon="🛡️" title={t("badge_ironman")} desc={t("legend_ironman_desc")} />
              <ItemRow icon="🌋" title={t("badge_streaker")} desc={t("legend_on_fire_desc")} />
              <ItemRow icon="🎯" title={t("badge_sharp")} desc={t("legend_sharp_desc")} />
              <ItemRow icon="🗡️" title={t("badge_slayer")} desc={t("legend_giant_slayer_desc")} />
              <ItemRow icon="⭐" title={t("legend_fav_title")} desc={t("legend_fav_desc")} />
              <ItemRow icon="🔒" title={t("legend_pin_title")} desc={t("legend_pin_desc")} />
              <ItemRow icon="🔁" title={t("legend_rematch_title")} desc={t("legend_rematch_desc")} />
              <ItemRow icon="🔥" title={t("legend_hot_title")} desc={t("legend_hot_desc")} />
              <ItemRow icon="🧊" title={t("legend_cold_title")} desc={t("legend_cold_desc")} />
              <ItemRow icon={<span style={{width:10*z,height:10*z,borderRadius:"50%",background:"#50c878",display:"inline-block",boxShadow:"0 0 5px #50c878"}}/>} title={t("legend_online_title")} desc={t("legend_online_desc")} />
              <ItemRow icon="📊" title={t("legend_conf_icon_title")} desc={t("legend_conf_icon_desc")} />
              <ItemRow icon={<span style={{fontSize:9*z,padding:"2px 5px",borderRadius:4,background:"rgba(245,158,11,0.12)",color:"#f59e0b",fontWeight:800}}>P</span>} title={t("legend_prov_title")} desc={t("legend_prov_desc")} />
              <ItemRow icon={<span style={{fontSize:9*z,padding:"2px 5px",borderRadius:4,background:"rgba(80,200,120,0.12)",color:"#50c878",fontWeight:800}}>C</span>} title={t("legend_conf_title")} desc={t("legend_conf_desc")} />
              <ItemRow icon={<span style={{fontSize:9*z,padding:"2px 5px",borderRadius:4,background:"rgba(64,160,224,0.12)",color:"#40a0e0",fontWeight:800}}>D</span>} title={t("legend_dupr_title")} desc={t("legend_dupr_desc")} />
              <ItemRow icon={<span style={{display:"flex",gap:2*z}}><span style={{fontSize:8*z,fontWeight:800,color:"#50c878",background:"rgba(80,200,120,0.15)",borderRadius:2*z,padding:"1px 2px"}}>W</span><span style={{fontSize:8*z,fontWeight:800,color:"#e05050",background:"rgba(224,80,80,0.15)",borderRadius:2*z,padding:"1px 2px"}}>L</span></span>} title={t("legend_form_title")} desc={t("legend_form_desc")} />
            </div>
          </Accordion>
        )}

      </div>
    </div>
  );
}
