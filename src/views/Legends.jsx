import React from 'react';
import { t } from '../engine.js';
import { makeS } from '../styles.js';
import { Sec } from '../components/Shared.jsx';

export default function Legends({ theme }) {
  const S = makeS(theme);
  const z = theme.zoom || 1.0;

  const ItemRow = ({ icon, title, desc }) => (
    <div style={{ display: "flex", gap: 12*z, padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ width: 32*z, textAlign: "center", fontSize: 18*z, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13*z, fontWeight: 700, color: theme.text, marginBottom: 2*z }}>{title}</div>
        <div style={{ fontSize: 11*z, color: theme.sub, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div style={S.view}>
      <Sec title={t("legends_icons_badges")} theme={theme}>
        <ItemRow 
          icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontWeight:800}}>P</span>} 
          title={t("legend_prov_title")} 
          desc={t("legend_prov_desc")} 
        />
        <ItemRow 
          icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(80,200,120,0.12)", color: "#50c878", fontWeight:800}}>C</span>} 
          title={t("legend_conf_title")} 
          desc={t("legend_conf_desc")} 
        />
        <ItemRow 
          icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(64,160,224,0.12)", color: "#40a0e0", fontWeight:800}}>D</span>} 
          title={t("legend_dupr_title")} 
          desc={t("legend_dupr_desc")} 
        />
        <ItemRow icon="🔥" title={t("legend_hot_title")} desc={t("legend_hot_desc")} />
        <ItemRow icon="🧊" title={t("legend_cold_title")} desc={t("legend_cold_desc")} />
        <ItemRow icon="⭐" title={t("legend_fav_title")} desc={t("legend_fav_desc")} />
      </Sec>

      <Sec title={t("legends_radar")} theme={theme}>
        <ItemRow icon="📈" title={t("legend_win_pct")} desc={t("legend_win_pct_desc")} />
        <ItemRow icon="⚔️" title={t("legend_power")} desc={t("legend_power_desc")} />
        <ItemRow icon="🤝" title={t("legend_synergy")} desc={t("legend_synergy_desc")} />
        <ItemRow icon="🧗" title={t("legend_upset")} desc={t("legend_upset_desc")} />
        <ItemRow icon="🌊" title={t("legend_form")} desc={t("legend_form_desc")} />
      </Sec>

      <Sec title={t("legends_fun_stats")} theme={theme}>
        <ItemRow icon="👯" title={t("best_partner")} desc={t("legend_partner_desc")} />
        <ItemRow icon="👹" title={t("nemesis")} desc={t("legend_nemesis_desc")} />
        <ItemRow icon="🐦" title={t("pigeon")} desc={t("legend_pigeon_desc")} />
      </Sec>

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