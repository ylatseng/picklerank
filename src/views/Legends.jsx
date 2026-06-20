import React from 'react';
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
      <Sec title="Visual Icons & Badges" theme={theme}>
        <ItemRow 
          icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontWeight:800}}>P</span>} 
          title="Provisional Rating" 
          desc="Player has fewer than 5 matches recorded. Their rating will fluctuate more wildly until it solidifies." 
        />
        <ItemRow 
          icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(80,200,120,0.12)", color: "#50c878", fontWeight:800}}>C</span>} 
          title="Confirmed Rating" 
          desc="Player has played 5 or more matches. Their rating is now stabilized." 
        />
        <ItemRow 
          icon={<span style={{fontSize:9*z, padding:"2px 5px", borderRadius:4, background: "rgba(64,160,224,0.12)", color: "#40a0e0", fontWeight:800}}>D</span>} 
          title="DUPR Linked" 
          desc="Player's starting base rating was imported directly from DUPR." 
        />
        <ItemRow icon="🔥" title="Hot Streak" desc="Player has won 3 or more games in a row." />
        <ItemRow icon="🧊" title="Cold Streak" desc="Player has lost 3 or more games in a row." />
        <ItemRow icon="⭐" title="Favorited" desc="Player is pinned to the top of your Roster and Selection screens." />
      </Sec>

      <Sec title="Radar Chart Metrics" theme={theme}>
        <ItemRow icon="📈" title="Win %" desc="Overall percentage of matches won across all formats." />
        <ItemRow icon="⚔️" title="Power (S)" desc="Based on the player's Singles ELO rating. Higher rating expands this axis." />
        <ItemRow icon="🤝" title="Synergy (D)" desc="Based on the player's Doubles ELO rating. Higher rating expands this axis." />
        <ItemRow icon="🧗" title="Upset Factor" desc="Measures the ability to defeat opponents with significantly higher ratings." />
        <ItemRow icon="🌊" title="Form" desc="Momentum indicator based on recent active win/loss streaks." />
      </Sec>

      <Sec title="Fun Stats (Match History)" theme={theme}>
        <ItemRow icon="👯" title="Best Partner" desc="The teammate with whom you have the highest win percentage (minimum 2 games)." />
        <ItemRow icon="👹" title="Nemesis" desc="The specific opponent who has defeated you the most times." />
        <ItemRow icon="🐦" title="Pigeon" desc="The specific opponent you have defeated the most times." />
      </Sec>

      <Sec title="Milestone Achievements" theme={theme}>
        <ItemRow icon="🎖️" title="Centurion" desc="Played 100 or more total matches." />
        <ItemRow icon="🛡️" title="Ironman" desc="Played 50 or more total matches." />
        <ItemRow icon="🌋" title="On Fire" desc="Achieved a dominant win streak of 5 or more matches." />
        <ItemRow icon="🎯" title="Sharpshooter" desc="Maintained an overall win rate of 60%+ (minimum 10 matches required)." />
        <ItemRow icon="🗡️" title="Giant Slayer" desc="Defeated an opponent with a significantly higher ELO rating to earn a massive point boost (+0.30 or higher in a single match)." />
      </Sec>
    </div>
  );
}