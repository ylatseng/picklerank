export function makeS(t) {
  const z = t.zoom || 1.0;
  const f = s => Math.round(s * z);
  return {
    // ── iOS PWA safe-area handling ─────────────────────────────────────────
    // env(safe-area-inset-*) covers the notch / Dynamic Island / home indicator
    // when the app is saved to the home screen and launched fullscreen on iOS.
    // Falls back to 0 on Android and desktop browsers (no inset reported).
    app:        { color:t.text, minHeight:"100dvh", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column",
                  overscrollBehavior:"none" }, // prevents pull-to-refresh browser reload in PWA
    header:     { background:t.card, borderBottom:`1px solid ${t.border}`,
                  padding:`calc(${f(12)}px + env(safe-area-inset-top, 0px)) calc(${f(16)}px + env(safe-area-inset-right, 0px)) ${f(12)}px calc(${f(16)}px + env(safe-area-inset-left, 0px))`,
                  position:"sticky", top:0, zIndex:100 },
    headerInner:{ display:"flex", alignItems:"center", gap:f(10) },
    appName:    { fontSize:f(19), fontWeight:800, letterSpacing:"-0.5px", color:t.text },
    appSub:     { fontSize:f(10), letterSpacing:"0.5px", textTransform:"uppercase", fontWeight:600 },
    backBtn:    { background:"none", border:"none", color:t.accent, fontSize:f(28), cursor:"pointer", padding:`0 ${f(6)}px 0 0`, lineHeight:1 },
    iconBtn:    { background:"none", border:"none", fontSize:f(20), cursor:"pointer", padding:f(4) },
    main:       { flex:1, overflowY:"auto",
                  paddingBottom:`calc(${f(80)}px + env(safe-area-inset-bottom, 0px))` },
    view:       { padding:`${f(14)}px ${f(12)}px` },
    sec:        { background:t.card, border:`1px solid ${t.border}`, borderRadius:f(16), padding:`${f(14)}px ${f(12)}px`, marginBottom:f(12) },
    secTitle:   { fontSize:f(12), fontWeight:700, color:t.accent, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:f(10) },
    bottomNav:  { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480,
                  display:"flex", background:t.nav, borderTop:`1px solid ${t.border}`, zIndex:200,
                  paddingBottom:"env(safe-area-inset-bottom, 0px)" },
    navBtn:     { flex:1, background:"none", border:"none", color:t.sub, cursor:"pointer", padding:`${f(8)}px ${f(2)}px`, display:"flex", flexDirection:"column", alignItems:"center", gap:f(2) },
    navLabel:   { fontSize:f(9), fontWeight:600, letterSpacing:"0.3px" },
    lbRow:      { display:"flex", alignItems:"center", gap:f(8), padding:`${f(8)}px 0`, borderBottom:`1px solid ${t.border}`, cursor:"pointer", overflow:"hidden", minWidth:0 },
    lbRank:     { fontSize:f(18), minWidth:f(28), textAlign:"center" },
    lbInfo:     { flex:1, minWidth:0, overflow:"hidden" },
    lbName:     { fontSize:f(14), fontWeight:600, color: t.text, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
    badge:      { borderRadius:f(6), padding:`${f(3)}px ${f(7)}px`, fontSize:f(12), fontWeight:800, color:"#0d0d0f", display:"inline-block", letterSpacing:"-0.3px", flexShrink:0 },
    statPill:   { background:t.bg, border:`1px solid ${t.border}`, borderRadius:f(12), padding:`${f(10)}px ${f(12)}px`, display:"flex", flexDirection:"column", alignItems:"center", gap:f(2), flex:"1 1 30%" },
    
    /* ADDED LINE HEIGHTS AND DYNAMIC PADDING BELOW */
    input:      { background:t.bg, border:`1px solid ${t.border}`, borderRadius:f(10), color:t.text, fontSize:f(16), padding:`${f(12)}px ${f(14)}px`, width:"100%", boxSizing:"border-box", outline:"none", lineHeight:1.5 },
    select:     { background:t.bg, border:`1px solid ${t.border}`, borderRadius:f(10), color:t.text, fontSize:f(16), padding:`${f(12)}px ${f(14)}px`, width:"100%", boxSizing:"border-box", outline:"none", appearance:"none", lineHeight:1.5 },
    label:      { display:"block", fontSize:f(11), color:t.sub, marginBottom:f(8), lineHeight:1.4 },
    toggle:     { display:"flex", gap:f(6), flexWrap:"wrap" },
    toggleBtn:  { background:t.bg, border:`1px solid ${t.border}`, color:t.sub, borderRadius:f(10), padding:`${f(10)}px ${f(16)}px`, cursor:"pointer", fontSize:f(13), fontWeight:600, lineHeight:1.5 },
    toggleOn:   { background:t.invert ? t.accent+"22" : t.card, border:`1px solid ${t.accent}`, color:t.accent },
    gameRow:    { display:"flex", alignItems:"center", gap:f(6), marginBottom:f(8), flexWrap:"nowrap" },
    scoreInput: { background:t.bg, border:`1px solid ${t.border}`, borderRadius:f(10), color:t.text, fontSize:f(18), padding:`${f(10)}px`, minWidth:f(60), maxWidth:f(80), flex:"0 0 auto", textAlign:"center", outline:"none", lineHeight:1.5 },
    btnPrimary: { background:t.accent, border:"none", borderRadius:f(10), color:t.invert ? "#fff" : "#0d1a10", cursor:"pointer", fontSize:f(14), fontWeight:800, padding:`${f(12)}px ${f(16)}px`, whiteSpace:"normal", textAlign:"center", lineHeight:1.4 },
    btnSecondary:{ background:t.card, border:`1px solid ${t.border}`, borderRadius:f(10), color:t.sub, cursor:"pointer", fontSize:f(13), fontWeight:600, padding:`${f(10)}px ${f(16)}px`, marginTop:f(6), lineHeight:1.5 },
    btnDanger:  { background:"rgba(224,80,80,0.1)", border:"1px solid rgba(224,80,80,0.3)", borderRadius:f(8), color:"#e05050", cursor:"pointer", fontSize:f(12), padding:`${f(8)}px ${f(12)}px`, lineHeight:1.5 },
    btnBig:     { background:`linear-gradient(135deg,${t.accent},${t.accent}bb)`, border:"none", borderRadius:f(14), color:t.invert ? "#fff" : "#0d1a10", cursor:"pointer", fontSize:f(16), fontWeight:800, padding:f(16), width:"100%", marginTop:f(6), lineHeight:1.5 },
    
    successBox: { background:t.card, border:`1px solid ${t.accent}44`, borderRadius:f(14), padding:f(16), marginBottom:f(12) },
    matchCard:  { background:t.bg, border:`1px solid ${t.border}`, borderRadius:f(14), padding:f(12), marginBottom:f(10) },
    typePill:   { fontSize:f(10), background:"rgba(80,144,192,0.15)", color:"#5090c0", borderRadius:f(6), padding:`${f(2)}px ${f(7)}px`, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" },
    gamePill:   { background:t.card, borderRadius:f(8), padding:`${f(4)}px ${f(9)}px`, fontSize:f(13), display:"flex", gap:f(5), alignItems:"center", border:`1px solid ${t.border}`,color: t.text, fontWeight: 700 }
  };
}