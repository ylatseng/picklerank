import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; 
import { db } from "./firebase.js";
export { db };

// ─── Constants ────────────────────────────────────────────────────────────────
export const DEFAULT_RATING = 3.0;
export const K_FACTOR = 0.08;
// Matches below this threshold (per discipline) are "provisional" — same cutoff
// already shown to users in Profile/Legends. Their ratings move faster so they
// converge toward their true skill level quickly, then taper to the normal K_FACTOR.
export const PROVISIONAL_MATCH_THRESHOLD = 5;
export const PROVISIONAL_K_MULTIPLIER = 2; // provisional players move up to 2x faster
export const STORAGE_KEY = "pkl_tracker_v4"; 

// ─── Version & Changelog ──────────────────────────────────────────────────────
export const APP_VERSION = "2.1.0";
export const APP_UPDATED = "2026-06-22";

export const RELEASES = [
  {
    version: "2.1.0",
    date: "2026-06-22",
    title: "The Clarity Update",
    changes: [
      // ── Match vs Game terminology ─────────────────────────────────────
      "📖 CLARITY: Added 'Match vs Game' section to Legends explaining that all W/L records, streaks, and ratings are based on match outcomes, not individual game sets.",
      "🤝 PARTNER MATRIX: Fixed incorrect 'games' label — partner count now correctly displays 'matches'. Added separate game-level W/L record (e.g. '5–3 in games') alongside match record on each partner card.",
      "🤝 PARTNER MATRIX: computePartnerMatrix engine function now tracks gamesWon / gamesLost / gamePct per partnership using per-game scores (g.a / g.b) relative to team index.",
      "🤝 PARTNER MATRIX: Top Partnerships section also shows game record alongside match record.",
      // ── PickleRank vs DUPR ────────────────────────────────────────────
      "🆚 LEGENDS: Added 'PickleRank vs DUPR' comparison section — 6-row table covering core model, score margin method, rating scale, match types, uncertainty handling, and formula transparency. Fully trilingual.",
      // ── Starting ratings ─────────────────────────────────────────────
      "🎯 STARTING RATINGS: Edit Starting Rating now has separate Singles and Doubles inputs instead of a single base rating. Both ratingSingles and ratingDoubles are saved independently. Pre-fills with current values.",
      // ── Partner matrix UI revamp ──────────────────────────────────────
      "🤝 PARTNER MATRIX UI: Replaced the N×N scrolling grid with a player-picker chip row + ranked partner cards. Tap any player to see their partnerships ranked by win rate. No more horizontal scrolling confusion.",
      "🤝 PARTNER MATRIX UI: Added 'Top Partnerships' leaderboard at the bottom showing the top 5 pairings by win rate across the entire group (min 2 matches together).",
      // ── Security / permissions ────────────────────────────────────────
      "🔒 SECURITY: Regular users can no longer see the 🗑️ delete button on match cards in Player Profiles — delete is now admin-only everywhere in the app.",
      "🔒 SECURITY: Profile.jsx delMatch now moves to Trash instead of permanently hard-deleting.",
      "🔒 SECURITY: Full audit confirmed delete actions are admin-gated across all 6 surfaces: Profile, History, Players, Events, Settings (clear all), Trash (empty).",
      // ── Legends expansion ─────────────────────────────────────────────
      "📖 LEGENDS: Added full audit of missing features — now covers 14 sections including Dashboard Features, Session Mode Features, Profile Features, Match Modes, Partner Matrix, and all new icons (🟢 Online dot, 🔒 PIN, 🔁 Rematch, W/L form dots).",
      "📖 LEGENDS: Fixed Rating Confidence section — desc values were rendering as raw template string literals instead of evaluated expressions.",
      // ── Changelog & versioning ────────────────────────────────────────
      "📋 CHANGELOG: v2.0.0 entry marked as MAJOR release with gold border treatment in the Changelog view.",
      "📋 CHANGELOG: Changelog viewer now visually distinguishes major versions (x.0.0) with green card styling and 🎉 MAJOR badge.",
      "⚙️ SETTINGS: Version number now displayed in accent colour for visibility.",
    ]
  },
  {
    version: "2.0.0",
    date: "2026-06-22",
    title: "The Intelligence Update",
    changes: [
      // ── Rating Engine ────────────────────────────────────────────────
      "🧮 RATING ENGINE: Fixed critical score-margin bug — ratings now correctly reflect point differential (11–2 vs 11–9 move differently), not just win/loss.",
      "🧮 RATING ENGINE: Added provisional player K-factor boost — new players' ratings converge 2× faster for their first 5 matches, then taper to normal.",
      "🧮 RATING ENGINE: Fixed score validation logic — only legally possible scores are accepted (e.g. 25–2 now correctly rejected when playing to 11).",
      "🧮 RATING ENGINE: Win-To dropdown now enforces real pickleball formats (11, 15, 21) instead of a free-text field. Live red-border feedback on illegal scores.",
      // ── Rating Confidence ────────────────────────────────────────────
      "📊 CONFIDENCE: Added DUPR-style Rating Confidence % — a two-factor reliability score based on matches played and recency. Shown as 📊 badge on leaderboard rows.",
      "📊 CONFIDENCE: Confidence decays automatically if a player is inactive for 90+ days, reflecting that older results become stale.",
      // ── Point Win % ──────────────────────────────────────────────────
      "🎯 STATS: Added Point Win % — percentage of total points scored across all games. Tracked per-discipline (Overall, Doubles, Singles) with bar charts on Profile.",
      // ── Privacy & Access Control ─────────────────────────────────────
      "🔒 PRIVACY: Starred players are now private per-user, keyed by player ID. Allen's stars are invisible to Lily and vice versa, even on the same device.",
      "🔒 PRIVACY: Trash can icon in History and Events tabs is now admin-only.",
      "🔒 PRIVACY: Match deletion (History tab) is now admin-only. Regular users can still edit matches they participated in.",
      "🔒 PRIVACY: Event creation and deletion restricted to admin users. Trash can for Events only visible to admin.",
      "🔒 PRIVACY: Trash can 'Empty' button is admin-only. Regular users can view trash but cannot permanently delete records.",
      // ── Online Presence ──────────────────────────────────────────────
      "🟢 PRESENCE: Fixed online status — switching player accounts now immediately clears the previous player's green dot. No more 90-second ghost sessions.",
      "🟢 PRESENCE: Presence now updates local state immediately on login (no page refresh needed for the dot to appear).",
      // ── Trash System ─────────────────────────────────────────────────
      "🗑️ TRASH: Fixed critical bug where deleted matches and players restored themselves on page refresh — caused by Firestore rejecting nested arrays silently.",
      "🗑️ TRASH: Player deletion now moves to Trash (restoring reconnects all match history via the original player ID automatically).",
      "🗑️ TRASH: Event deletion now moves to Trash (admin-only restore).",
      "🗑️ TRASH: Trash items now show rich detail cards: player avatar + ratings, match scores, event dates.",
      "🗑️ TRASH: Trash serialised to JSON string before Firebase save — consistent with matches, avoids all nested-array serialisation errors.",
      // ── Events ───────────────────────────────────────────────────────
      "📅 EVENTS: Date/Time field now has a visible label. Invite Players replaced with a clean native multi-select dropdown.",
      // ── Legends ──────────────────────────────────────────────────────
      "📖 LEGENDS: Completely expanded — added Rating Tiers & Colors with tier descriptions, full 4-step ELO formula walkthrough, Confidence %, Valid Score Rules, and icon glossary. Fully trilingual (EN / 繁中 / 简中).",
      // ── Dashboard Features ───────────────────────────────────────────
      "⚡ MATCH OF THE DAY: Dashboard now highlights the most interesting recent match — biggest upset, closest score, or largest rating swing.",
      "📅 PLAYER OF THE MONTH: Dashboard shows top-5 rating gainers over the rolling 30-day window.",
      // ── Session Mode ─────────────────────────────────────────────────
      "🤝 TEAM SUGGESTER: Session mode now shows all 3 possible team pairings ranked by fairness, with average ratings and gap score. Tap to select.",
      "🏆 SESSION SUMMARY: After logging a session, a rich recap card shows each player's W/L and rating delta, MVP, Most Improved, total points, and a shareable text recap.",
      // ── Match Log ────────────────────────────────────────────────────
      "📈 FORM INDICATOR: When picking players in any match mode, each player's last 3 results appear as W/L badges below their name.",
      // ── Player Profiles ──────────────────────────────────────────────
      "📉 VOLATILITY: Player profiles now show a Rating Volatility section — how much the rating swings per match (Consistent / Variable / Unpredictable).",
      "🎯 PERSONAL GOAL: Players (and admin) can set a target rating per format. A progress bar tracks the journey from start rating to goal, turning gold when reached.",
      // ── History Tab ──────────────────────────────────────────────────
      "🔁 REMATCH DETECTOR: History automatically flags when the same 4 players played more than once on the same day with an amber 🔁 Rematch label.",
      // ── Roster & Ranking ─────────────────────────────────────────────
      "👥 ROSTER: Games played and W/L record now shown on each Roster player card (previously leaderboard-only).",
      "🏅 RANKING: Rating Confidence % now displayed as a colour-coded 📊 badge on every leaderboard row, scoped to the active format.",
      // ── Partner Matrix ───────────────────────────────────────────────
      "🤝 PARTNER MATRIX: New section in Group Stats showing doubles win % with every possible partner in a colour-coded grid. First column sticky when scrolling.",
      // ── Stability ────────────────────────────────────────────────────
      "🐛 FIX: Resolved blank screen when admin clicks any player profile (setUser prop missing from Profile component).",
      "🐛 FIX: Resolved blank screen when admin opens History tab (rematch detector hook declared inside useMemo scope).",
      "🐛 FIX: Restored missing handleFileAdd / handleEditFileAdd functions in Player edit form.",
      "🐛 FIX: Personal Goal section refactored from JSX IIFE into a proper React component to comply with Rules of Hooks.",
    ]
  },
  {
    version: "1.2.1",
    date: "2026-06-21",
    title: "Unified Hub & UI Localization",
    changes: [
      "Created the Unified Hub: Dashboard and Roster are now seamlessly integrated.",
      "Implemented a collapsible 'Add Player' form to maximize screen real estate.",
      "Secured History tab: Regular users can no longer edit matches they did not participate in.",
      "Expanded Chinese language support to include Legends, Fun Stats, Trash, and Welcome screens.",
      "Added dynamic language toggling on the Welcome portal for immediate user onboarding."
    ]
  },
  {
    version: "1.2.0",
    date: "2026-06-21",
    title: "Security & Privacy Update",
    changes: [
      "Secured profiles with mandatory 4-digit PINs.",
      "Added dedicated Admin portal and role-based access control.",
      "Restricted profile and match editing to authorized users only.",
      "Improved onboarding security and session management."
    ]
  },
  {
    version: "1.1.5",
    date: "2026-06-20",
    title: "Event Invitations",
    changes: [
      "Added invitee selection using compact selection tags.",
      "Event cards now display the list of invited players for quick reference."
    ]
  },
  {
    version: "1.1.4",
    date: "2026-06-20",
    title: "Event Security & Editing",
    changes: [
      "Added edit functionality for existing events.",
      "Restricted event deletion to Admin users only.",
      "Implemented a mandatory confirmation prompt before deleting events."
    ]
  },
  {
    version: "1.1.3",
    date: "2026-06-20",
    title: "Event Scheduling",
    changes: [
      "Added the 'Events' tab to plan upcoming pickleball sessions.",
      "Enabled event creation, date/time scheduling, and session management."
    ]
  },
  {
    version: "1.1.2",
    date: "2026-06-20",
    title: "Settings Minimization",
    changes: [
      "Streamlined 'Branding' into a single compact row (tap logo to upload).",
      "Collapsed 'Backup & Restore' into a quick-action button grid, removing wasted text space.",
      "Consolidated all design and language options into a sleek 'Appearance' menu with dropdowns.",
      "Added the official Changelog tracking system."
    ]
  },
  {
    version: "1.1.1",
    date: "2026-06-20",
    title: "UI & Settings Polish",
    changes: [
      "Streamlined the Settings page into a sleek, compact 'Appearance' menu with dropdowns.",
      "Added the official Changelog tracking system."
    ]
  },
  {
    version: "1.1.0",
    date: "2026-06-20",
    title: "The Competitive Update",
    changes: [
      "Separated Singles and Doubles ELO ratings for highly accurate tracking.",
      "Redesigned match cards with a sleek, side-by-side vertical scoreboard layout.",
      "Introduced the visual 'Legends' glossary for icons and stats.",
      "Brought back Fun Stats: Best Partner, Nemesis, and Pigeon directly in Profiles.",
      "Added milestone badges (Centurion, Ironman, On Fire, Sharpshooter, Giant Slayer).",
      "Added the Trash system to safely delete and selectively restore players and matches.",
      "Players can now edit their profile pictures.",
      "Added auto-refresh so the app updates instantly when reopened from the background.",
      "App now automatically opens to the Rank tab on a fresh start."
    ]
  },
  {
    version: "1.0.5",
    date: "2026-06-18",
    title: "The Modes Update",
    changes: [
      "Added structured match modes: Session Tracker, King of the Court, and Tournament.",
      "Introduced dynamic Radar Charts to visualize player performance profiles.",
      "Cloud syncing and cross-device functionality fully implemented via Firebase.",
      "Added CSV and JSON data export capabilities."
    ]
  },
  {
    version: "1.0.0",
    date: "2026-06-01",
    title: "Initial Launch",
    changes: [
      "Core ELO tracking math and engine built.",
      "Dashboard, Roster, Match History, and Settings foundations established.",
      "Customizable theme engine added (Dark/Light modes, Accents, Fonts, Display Sizes)."
    ]
  }
];

// ─── Themes, Styles & Fonts ───────────────────────────────────────────────────
export const APP_MODES = [
  { id: "dark", label: "Midnight Dark", bg: "#0d0d0f", card: "#141418", nav: "#0f0f14", border: "#22222c", text: "#e8e8e8", sub: "#888888", faint: "#444444", invert: false },
  { id: "light", label: "Pure Light", bg: "#ffffff", card: "#f3f4f6", nav: "#ffffff", border: "#e5e7eb", text: "#111827", sub: "#6b7280", faint: "#d1d5db", invert: true },
  { id: "navy", label: "Deep Navy", bg: "#080e1a", card: "#0e1828", nav: "#080e18", border: "#1a2840", text: "#e8e8e8", sub: "#8a9bb3", faint: "#3a4b63", invert: false },
  { id: "gray", label: "Slate Gray", bg: "#1f2937", card: "#374151", nav: "#111827", border: "#4b5563", text: "#f9fafb", sub: "#d1d5db", faint: "#6b7280", invert: false },
  { id: "lightblue", label: "Sky Blue", bg: "#e0f2fe", card: "#ffffff", nav: "#ffffff", border: "#bae6fd", text: "#0369a1", sub: "#0284c7", faint: "#bae6fd", invert: true }
];

export const APP_ACCENTS = [
  { id: "green", label: "Emerald", hex: "#50c878" },
  { id: "blue", label: "Azure", hex: "#3b82f6" },
  { id: "purple", label: "Plum", hex: "#c084fc" },
  { id: "red", label: "Crimson", hex: "#f87171" },
  { id: "orange", label: "Amber", hex: "#f59e0b" }
];

export const APP_FONTS = [
  { id: "sans", label: "Heiti (黑體)", css: "'Noto Sans TC', 'Microsoft JhengHei', 'Taipei Sans TC', sans-serif" },
  { id: "serif", label: "Mingti (明體)", css: "'Noto Serif TC', 'PMingLiU', 'MingLiU', serif" },
  { id: "kai", label: "Kaiti (楷體)", css: "'TW-Kai', 'BiauKai', 'Kaiti', serif" },
  { id: "creative", label: "Creative (圆體)", css: "'jf-openhuninn-2.0', 'cwTeXHei', 'Noto Sans TC', sans-serif" }
];

export const TRANSLATIONS = {
  en: {
    rank: "Rank", roster: "Roster", session: "Session", custom: "Custom", history: "History", 
    h2h: "H2H", matches_tab: "Matches", dashboard: "PickleRank", dashboard_sub: "Private Rating Tracker", 
    players: "Players", players_sub: "Manage roster", session_title: "Session", session_sub: "Round Robin Auto-Match", 
    log: "Custom Match", log_sub: "Record a result", history_title: "Match History", history_sub: "All results", 
    compare: "H2H Compare", compare_sub: "Head to head", stats: "Group Stats", stats_sub: "Insights & records", 
    settings: "Settings", settings_sub: "Data & appearance", leaderboard: "🏆 Leaderboard", recent_matches: "⚡ Recent Matches", 
    no_players: "No players yet.", add_players_btn: "Add Players", no_matches: "No matches yet.", log_first_match: "Log First Match", 
    add_player_sec: "Add Player", name_lbl: "Player Name", starting_rating: "Starting Rating", optional_dupr: "(optional — real DUPR rating)", 
    rating_range_hint: "Must be 1.500 – 6.500", dupr_tiers_hint: "DUPR tiers: 2.0–2.5 Beginner · 2.5–3.5 Recreational · 3.5–4.5 Intermediate · 4.5–5.5 Advanced · 5.5+ Elite", add_player_btn: "Add Player", roster_lbl: "Roster", edit_details: "Edit player details", cancel: "Cancel", confirm: "Confirm", save: "Save", rename: "Rename", remove_player_q: "Remove this player?", match_history_stays: "Match history stays.", base_rating_sec: "🎯 Starting / Base Rating", base_rating_desc: "Rating all match calculations start from.", base_rating_lbl: "Base rating", edit_starting_rating: "✏️ Edit Starting Rating", new_starting_rating: "New starting rating (1.500 – 6.500)", save_recalc: "Save & Recalculate", rating_trend_desc: "Play more matches to see rating trend.", reset_rating_btn: "Reset Rating", reset_rating_q: "Reset rating to 3.000?", rating_history_cleared: "Rating history will be cleared.", best_win_sec: "🏅 Best Win", match_type_sec: "Match Type", win_to_lbl: "Win to:", win_by_lbl: "Win by:", point: "Point", points: "Points", select_prompt: "Select…", team_name_opt: "Team Name (optional)", player_a: "Player A", player_b: "Player B", player_1: "Player 1", player_2: "Player 2", game_scores_sec: "Game Scores", score_win_by_2: "First to {winTo}, win by {winBy}.", add_game_btn: "+ Add Game", date_venue_sec: "Date & Venue", date_time_lbl: "Date & Time", venue_opt: "Venue (optional)", log_match_btn: "Log Match & Update Ratings", filter_search_sec: "Filter & Search", search_placeholder: "Search matches...", results_lbl: "Results", delete_match_q: "Delete this match?", ratings_recalculated: "Ratings will be recalculated.", rating_comp_sec: "Rating Comparison", overview_sec: "📊 Overview", records_sec: "🏅 Records", venues_lbl: "Venues", bg_mode_sec: "🌗 Background Mode", accent_style_sec: "🎨 Accent Style", typography_sec: "Aa Typography / 字體", backup_restore_sec: "💾 Backup & Restore", backup_desc: "Export your data for backup or spreadsheet analysis.", json_backup_btn: "📤 JSON Backup", csv_export_btn: "📊 CSV Export", import_json_btn: "📥 Import JSON Data", summary_sec: "📋 Summary", danger_zone_sec: "⚠️ Danger Zone", danger_desc: "Permanently deletes all data. Export first if needed.", clear_all_btn: "🗑️ Clear All Data", about_sec: "ℹ️ About", about_desc: "DUPR-style rating tracker for private pickleball groups. ELO-based algorithm with score-margin weighting. Ratings 1.5–6.5. Data stored locally.", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. Select Foursome", load_saved_group: "Load Saved Group", save_group_btn: "Save Group", select_4_unique: "Select 4 unique players.", rr_matchups: "2. Round Robin Matchups", log_score_btn: "Log Score", save_score_btn: "Save Score", match_logged_ok: "✅ Match Logged!", see_history_btn: "See History →", edit_match_title: "✏️ Edit Match", branding_sec: "✨ App Branding", logo_text: "Logo Text / Emoji", upload_logo: "Upload Image Logo", display_size_sec: "🔍 Display Size", size_compact: "Compact", size_standard: "Standard", size_large: "Large", synergy_rivalry_sec: "🤝 Synergy & Rivalry", best_partner: "Best Partner", nemesis: "Nemesis", win_rate: "Win", vs_them: "vs them", worst_partner: "⚠️ Chemistry Test", easy_target: "🎯 Easy Target", admin_sec: "🔒 Security & Admin", admin_status: "Status", user_mode: "User Mode (Read/Add/Edit)", admin_mode: "Admin Mode (Full Access)", passcode_lbl: "Passcode", login_btn: "Admin Login", logout_btn: "Logout", change_pass_btn: "Change Passcode", wrong_pass: "Incorrect passcode.", pass_updated: "Passcode updated.", badges_sec: "🎖️ Achievements", badge_centurion: "Centurion (100+ Games)", badge_ironman: "Ironman (50+ Games)", badge_slayer: "Giant Slayer (Major Upset)", badge_streaker: "Unstoppable (5+ Win Streak)", badge_sharp: "Sharpshooter (60%+ Win Rate)", no_badges: "Play more matches to earn achievements!", all_players: "All Players", view_all_matches: "View All Matches", singles_wr: "Singles Win%", doubles_wr: "Doubles Win%", photo: "Photo", change_photo: "Change", search_players_placeholder: "Search players...", sort_by: "Sort by:", sort_rating: "Rating (High to Low)", sort_fn: "First Name (A-Z)", sort_ln: "Last Name (A-Z)", sort_games: "Games Played", err_enter_name: "Enter a name.", err_exists: "Player already exists.", err_empty: "Name cannot be empty.", err_taken: "Name already taken.", err_select_players: "Select players.", err_select_4: "Select 4 players.", err_duplicate: "Select unique players.", err_valid_scores: "Valid scores needed.", err_invalid_score_fmt: "Invalid score. First to {winTo}, win by {winBy}.", err_add_game: "Add at least one game.", err_clear_winner: "Need clear winner.", err_error_scores: "Error scores.", h2h_btn: "⚔️ Compare Players (H2H)", log_custom_btn: "➕ Log Custom Match", rating_elite: "Elite", rating_advanced: "Advanced", rating_intermediate: "Intermediate", rating_recreational: "Recreational", rating_beginner: "Beginner", stat_matches: "🎮 Matches", stat_wins: "✅ Wins", stat_losses: "❌ Losses", stat_win_pct: "📈 Win%", stat_w_streak: "🔥 W-Streak", stat_l_streak: "🧊 L-Streak", rating_history_sec: "📈 Performance Trend", spark_start: "Start", spark_peak: "Peak", spark_now: "Now", beat_opp: "Beat {name}", upset_of: "upset of", overview_total_matches: "Total Matches", overview_singles: "Singles", overview_doubles: "Doubles", overview_games_played: "Games Played", overview_players: "Players", overview_venues: "Venues", record_most_matches: "Most Matches", record_top_rated: "Top Rated", record_hot_streak: "Hot Streak", record_biggest_upset: "Biggest Upset", record_beat_higher: "beat higher-rated opponent by", recent_form: "Recent Form", no_data: "No data", match_predictor: "🔮 Match Predictor", prob_win: "Win Probability", if_wins: "If {name} wins:", expected_delta: "Expected Delta", singles_title: "Singles Rank", doubles_title: "Doubles Rank", verified_status: "Certified", provisional_status: "Provisional", teams: "Teams", performance_profile: "👤 Performance Profile", copy_ai_prompt: "🤖 Copy AI Recap Prompt", ai_prompt_copied: "Prompt copied! Paste it into Gemini.", kotc: "King of Court", kotc_desc: "Play 3 games, rotating partners. The player with the most wins (and point differential) is the King!", round: "Round", diff: "Diff", log_kotc: "Log Tournament", tournament: "Tournament", tourney_setup: "Bracket Setup", bracket_size: "Bracket Size", team: "Team", generate_bracket: "Generate Bracket", qf: "Quarterfinals", sf: "Semifinals", final: "Final", winner: "Winner", log_tournament: "Log Tournament", sort_starred: "Starred First (A-Z)", select_teams: "Select Teams", start_tournament: "Start Tournament", singles_rating: "Singles Rating", doubles_rating: "Doubles Rating", appearance_sec: "Appearance", fun_stats_sec: "Fun Stats", my_profile_sec: "My Profile", link_device_desc: "Link this device to your player profile to show your 'Online' status to the group.", guest_not_linked: "Guest / Not Linked", exit_admin_btn: "Exit Admin Mode (Logout)", new_passcode_placeholder: "New Passcode", app_initials_placeholder: "App Initials (e.g. PR)", click_to_change_logo: "Click to change logo", version_lbl: "Version", view_changelog_btn: "View Changelog", unlock_fun_stats: "Play more matches to unlock Fun Stats!", requires_min_games: "(Requires min. 2 games with a partner)", events: "Events", events_sub: "Upcoming sessions", trash: "Trash Can", trash_sub: "Restore deleted items", legends: "Legends", legends_sub: "Glossary & Achievements", changelog: "Changelog", changelog_sub: "App Updates & History", rankings: "Rankings", edit_session: "EDIT SESSION", new_session: "NEW SESSION", event_name: "Event Name", venue: "Venue", invite_players: "INVITE PLAYERS", select_players_invite: "Select players to invite...", selected: "Selected:", save_changes: "Save Changes", create_session: "Create Session", upcoming_sessions: "UPCOMING SESSIONS", no_scheduled_sessions: "No scheduled sessions.", invited: "Invited:", tbd: "TBD", local_court: "Local Court", add_new_player_btn: "➕ Add New Player", welcome_setup_desc: "👋 Welcome! Fill out the form below to add yourself to the roster. You MUST create a 4-Digit PIN (hint: use your birth date, MMDD) to secure your account.", notes_optional: "Notes (Optional)", paddle_playstyle_hint: "Paddle type, playstyle, etc.", security_pin_lbl: "Security PIN (e.g., MMDD)", pin_placeholder: "4-Digit PIN (e.g., MMDD)", notes_lbl: "Notes", player_notes_placeholder: "Player notes...", pigeon: "Pigeon", match_type_singles: "Singles", match_type_doubles: "Doubles", legends_icons_badges: "Visual Icons & Badges", legend_prov_title: "Provisional Rating", legend_prov_desc: "Player has fewer than 5 matches recorded. Their rating will fluctuate more wildly until it solidifies.", legend_conf_title: "Confirmed Rating", legend_conf_desc: "Player has played 5 or more matches. Their rating is now stabilized.", legend_dupr_title: "DUPR Linked", legend_dupr_desc: "Player's starting base rating was imported directly from DUPR.", legend_hot_title: "Hot Streak", legend_hot_desc: "Player has won 3 or more games in a row.", legend_cold_title: "Cold Streak", legend_cold_desc: "Player has lost 3 or more games in a row.", legend_fav_title: "Favorited", legend_fav_desc: "Player is pinned to the top of your Roster and Selection screens.", legends_radar: "Radar Chart Metrics", legend_win_pct: "Win %", legend_win_pct_desc: "Overall percentage of matches won across all formats.", legend_power: "Power (S)", legend_power_desc: "Based on the player's Singles ELO rating. Higher rating expands this axis.", legend_synergy: "Synergy (D)", legend_synergy_desc: "Based on the player's Doubles ELO rating. Higher rating expands this axis.", legend_upset: "Upset Factor", legend_upset_desc: "Measures the ability to defeat opponents with significantly higher ratings.", legend_form: "Form", legend_form_desc: "Momentum indicator based on recent active win/loss streaks.", legends_fun_stats: "Fun Stats (Match History)", legend_partner_desc: "The teammate with whom you have the highest win percentage (minimum 2 games).", legend_nemesis_desc: "The specific opponent who has defeated you the most times.", legend_pigeon_desc: "The specific opponent you have defeated the most times.", legends_achievements: "Milestone Achievements", legend_centurion_desc: "Played 100 or more total matches.", legend_ironman_desc: "Played 50 or more total matches.", legend_on_fire_desc: "Achieved a dominant win streak of 5 or more matches.", legend_sharp_desc: "Maintained an overall win rate of 60%+ (minimum 10 matches required).", legend_giant_slayer_desc: "Defeated an opponent with a significantly higher ELO rating to earn a massive point boost (+0.30 or higher in a single match).", base_lbl: "Base:", opp_avg_lbl: "Opp Avg:", prob_lbl: "Prob:", k_adj_lbl: "K-Adj:", trash_empty: "Trash is empty.", match_label: "Match", deleted_lbl: "Deleted:", restore_btn: "Restore", empty_trash_btn: "Empty Trash Can", empty_trash_confirm: "Permanently empty the trash? This cannot be undone.", welcome_title: "Welcome to PickleRank!", welcome_desc_admin: "Enter the global administrator passcode.", welcome_desc_user: "Who is holding this device? This helps us track stats and pre-fill your match logs.", on_roster_btn: "I'm on the Roster", new_player_btn: "New Player", select_name_placeholder: "Select your name...", admin_pass_placeholder: "Admin Passcode", invalid_pin_msg: "Invalid PIN or no PIN set by Admin.", incorrect_pass_msg: "Incorrect Passcode.", setup_awesome_msg: "Awesome! We'll take you to the Add Player screen so you can enter your name, DUPR ratings, and set up your secure PIN.", save_enter_app: "Save & Enter App", enter_as_admin: "Enter as Admin", go_to_setup: "Go to Setup", return_player_login: "Return to Player Login", verify_identity: "Verify Identity", verify_desc: "Welcome back, {name}. Enter your 4-digit PIN (hint: your birth date, MMDD) to continue.", unlock: "Unlock", incorrect_pin: "Incorrect PIN", create_profile: "Create Profile", admin_login: "Admin Login", no_pin_required: "No PIN required — tap to continue", pin_sec: "Account PIN", pin_is_set: "PIN is set — your account is protected", pin_not_set: "No PIN — anyone can log in as you", set_pin: "Set PIN", change_pin: "Change PIN", remove_pin: "Remove PIN", current_pin: "Current PIN", new_pin: "New PIN (4 digits)", confirm_pin: "Confirm PIN", pin_mismatch: "PINs don't match — please try again", pin_must_be_4: "PIN must be exactly 4 digits", pin_set: "PIN set successfully", pin_updated: "PIN updated successfully", pin_removed: "PIN removed", pin_remove_warning: "This will remove your PIN. Anyone can log in as you.", back: "Back", admin_pin_prompt: "Enter Admin PIN to continue", legend_match_vs_game_sec: "🎮 Match vs Game — What Counts?", legend_match_def: "Match", legend_match_def_desc: "One contest between two teams (e.g. Allen & Terry vs Steve & Lily). A match contains 1 or more games. The team that wins more games wins the match. This is the primary unit — all W/L records, streaks, and ratings are based on match outcomes.", legend_game_def: "Game", legend_game_def_desc: "One scoring set within a match (e.g. Game 1: 11–9, Game 2: 8–11). A game is played to 11, 15, or 21 points, win by 2. Multiple games make up a match.", legend_wl_based_on: "All W/L stats are based on matches, not games.", legend_stat_table_wl: "W/L Record — Match wins and losses", legend_stat_table_winpct: "Win % — Match win percentage", legend_stat_table_streak: "🔥/🧊 Streak — Consecutive match wins or losses", legend_stat_table_rating: "Rating — Calculated once per match", legend_stat_table_ptpct: "🎯 Point Win % — Points scored across all games in all matches", legend_stat_table_partner: "Partner Matrix — Match W/L + Game W/L as separate rows", legend_margin_example_title: "How score margin is calculated (example)", legend_margin_example: "Allen & Terry win 11–9 and 11–7 (two games): Their points = 22, Opp = 16. Margin = 22÷38 = 57.9%. A blowout like 11–2 would give margin = 84.6% → bigger rating change.", legend_vs_dupr_sec: "🆚 PickleRank vs DUPR", legend_vs_dupr_intro: "DUPR and PickleRank are both ELO-style rating systems, but they differ in important ways:", legend_dupr_col: "DUPR", legend_pr_col: "PickleRank", legend_vs_model: "Core model", legend_vs_model_dupr: "Glicko-2 (uncertainty bands)", legend_vs_model_pr: "ELO with margin weighting", legend_vs_margin: "Score margin", legend_vs_margin_dupr: "Each game scored separately", legend_vs_margin_pr: "Point totals across all games", legend_vs_scale: "Rating scale", legend_vs_scale_dupr: "2.0 – 8.0", legend_vs_scale_pr: "1.5 – 6.5", legend_vs_matches: "Match types", legend_vs_matches_dupr: "Only verified / sanctioned", legend_vs_matches_pr: "All logged matches", legend_vs_confidence: "Uncertainty", legend_vs_confidence_dupr: "Rating deviation (±)", legend_vs_confidence_pr: "📊 Confidence % (our version)", legend_vs_formula: "Formula", legend_vs_formula_dupr: "Proprietary — never published", legend_vs_formula_pr: "Open — fully shown in this Legends page", legend_vs_note: "Our 📊 Confidence % approximates the Glicko-2 uncertainty concept: it rises with matches played and decays if you haven't played recently. It's not the same math, but it answers the same question: how much should you trust this rating?", partner_matrix_top: "Top Partnerships (2+ matches)", legend_online_title: "🟢 Online Now", legend_online_desc: "Green dot next to a player's name means they have the app open right now (last seen within 90 seconds).", legend_pin_title: "🔒 Secured Account", legend_pin_desc: "This player has set a 4-digit PIN. Only they (or an Admin) can edit their profile or log matches in their name.", legend_rematch_title: "🔁 Rematch", legend_rematch_desc: "Shown in History when the exact same group of players played more than once on the same day. Amber label above the second (and later) match cards.", legend_form_title: "W / L Form Dots", legend_form_desc: "Shown below each player name when picking teams. Displays their last 3 match results — green W for win, red L for loss. Lets you spot hot streaks before choosing sides.", legend_dashboard_sec: "📊 Dashboard Features", legend_motd_title: "⚡ Match of the Day", legend_motd_desc: "Automatically highlights the most interesting recent match — calculated from upset factor (underdog won), score tightness, and max rating swing. Gold = big upset, blue = nail-biter.", legend_potm_title: "📅 Player of the Month", legend_potm_desc: "Shows the top 5 players by rating gain over the last 30 days. The #1 gainer earns a gold border. Resets automatically as the rolling window moves.", legend_session_sec: "🏓 Session Mode Features", legend_team_suggest_title: "🤝 Balanced Team Suggester", legend_team_suggest_desc: "Appears automatically in Session mode once 4 players are selected. Ranks all 3 possible pairings by fairness — smallest average-rating gap = most balanced. Tap a pairing to select it.", legend_session_summary_title: "🏆 Session Summary Card", legend_session_summary_desc: "Appears after logging a session. Shows each player's W/L and rating delta, MVP (most wins), Most Improved (biggest rating gain), total points played, and all match scores. Tap Share to copy a text recap.", legend_form_dots_title: "📈 Form Indicator", legend_form_dots_desc: "When picking players in any match mode, their last 3 results appear as W/L badges (green/red) below the dropdown. Lets you see who's hot and who's on a cold streak before you start.", legend_profile_sec: "👤 Profile Features", legend_goal_title: "🎯 Personal Goal", legend_goal_desc: "Set a target rating (e.g. 4.000) per format on your own profile. A progress bar tracks the journey from your starting rating to the target, turning gold when you reach it. Private — only visible to you and Admin.", legend_volatility_title: "📉 Rating Volatility", legend_volatility_desc: "Measures how much your rating swings per match (standard deviation of per-match deltas). Consistent <0.02, Variable 0.02–0.05, Unpredictable >0.05. A lower number means more predictable results.", legend_pt_win_pct_title: "🎯 Point Win %", legend_pt_win_pct_desc2: "Points scored by your team divided by total points played across all matches. Tracked Overall, Doubles, and Singles separately. 50% = perfectly even; elite rec players typically hold 54–58%.", legend_partner_matrix_title: "🤝 Partner Matrix", legend_partner_matrix_desc: "Found in Group Stats. A colour-coded grid showing your doubles win % with every possible partner (min 1 match together). 🟢 ≥60%, 🟡 45–59%, 🔴 <45%.", legend_match_modes_sec: "🎮 Match Modes", legend_mode_custom_title: "Custom Match", legend_mode_custom_desc: "Log any singles or doubles match manually. Choose players, enter scores game by game, add venue and notes.", legend_mode_session_title: "Session (Round Robin)", legend_mode_session_desc: "4-player round robin: every pair of partners plays every other pair once (3 games total). Ratings update after all 3 are logged together.", legend_mode_kotc_title: "King of the Court", legend_mode_kotc_desc: "Winners stay on court, losers rotate. Tracks cumulative wins per player across the session.", legend_mode_tourney_title: "Tournament", legend_mode_tourney_desc: "Single-elimination bracket for larger groups. Seeded by current doubles rating.", goal_sec: "🎯 Personal Goal", goal_set_target: "Set a target rating", goal_format_lbl: "Format", goal_target_lbl: "Target Rating", goal_save: "Set Goal", goal_clear: "Clear Goal", goal_progress: "Progress to goal", goal_reached: "🏆 Goal reached!", goal_away: "away", volatility_sec: "📉 Rating Volatility", volatility_low: "Consistent", volatility_med: "Variable", volatility_high: "Unpredictable", volatility_desc: "How much your rating swings each match. Lower = more consistent results.", rematch_badge: "🔁 Rematch", rematch_count: "{n} rematches today", legend_conf_icon_title: "📊 Rating Confidence", legend_conf_icon_desc: "How much to trust the rating. 🟢 ≥75% reliable, 🟡 45–74% developing, 🔴 <45% needs more matches. Drops if inactive 90+ days.", motd_sec: "⚡ Match of the Day", motd_upset: "Upset Alert", motd_tight: "Nail-biter", motd_no_recent: "No recent matches.", motd_beat: "beat", motd_score: "Score", potm_sec: "📅 Player of the Month", potm_desc: "Biggest rating gains in the last 30 days", potm_no_data: "Not enough recent activity.", potm_gain: "gain", form_lbl: "Form", team_suggester_sec: "🤝 Balanced Team Suggester", team_suggester_desc: "Fairest split based on current doubles ratings.", team_balance_label: "Balance gap:", team_fairest: "Most Fair", team_use_this: "Use This Split", session_summary_title: "🏆 Session Complete!", session_summary_mvp: "MVP", session_summary_improved: "Most Improved", session_summary_total_pts: "Total Points Played", session_summary_results: "Match Results", session_summary_share: "📤 Share Recap", session_summary_close: "Start New Session", session_summary_rating_change: "Rating Change", partner_matrix_sec: "🤝 Doubles Partner Matrix", partner_matrix_desc: "Win % with each partner (doubles only, min 1 match together).", partner_matrix_no_data: "Not enough doubles matches yet.", partner_matrix_games: "matches", partner_matrix_in_games: "in games", legend_rating_intro: "Every player's rating lives on a 1.500–6.500 scale, mirroring DUPR. The colour of the badge shows their tier at a glance.", legend_step1_title: "Step 1 — Win Probability", legend_step1_desc: "Before each match, we compute the probability that your team wins based on the average ratings on each side. Beating a higher-rated opponent yields a big rating gain; losing to a lower-rated one costs more.", legend_step2_title: "Step 2 — Score Margin", legend_step2_desc: "The actual point differential within the match (not just who won) adjusts how large the rating change is. An 11–2 blowout moves ratings more than an 11–9 nail-biter, even between the same two players.", legend_step3_title: "Step 3 — Rating Update", legend_step3_actual: "actual = 1 if you won, 0 if you lost.", legend_step3_expected: "expected = the win probability from Step 1.", legend_step3_k: "Base K = {k} — controls how fast ratings move per match.", legend_step4_title: "Step 4 — Provisional Boost", legend_step4_desc: "New players' ratings move up to 2× faster for their first {n} matches, then taper back to the normal K. This helps new players converge to their true skill level quickly.", legend_replay_title: "Full Replay Architecture", legend_replay_desc: "Every time a match is edited or deleted, all matches are replayed in chronological order from scratch. This means there's no rating drift — an edit to an old match correctly cascades forward through every subsequent match.", legend_conf_intro: "Confidence reflects how much to trust a player's current rating. It has two components:", conf_sample_desc: "Rises as more matches are played (saturates near {n} matches). 1 match ≈ 10%, 10 matches ≈ 63%, 30 matches ≈ 95%.", conf_recency_desc: "If a player hasn't played in more than {d} days, confidence starts to decay — old results become stale. Floors at 70% of the sample-based value.", legend_score_intro: "Scores are validated against real pickleball rules. A game is only legal if it ends at the exact point play would stop.", match_num_k: "Match #{n}: K={k}", tier_elite_desc: "Tournament-level competitor. Dominant serve, consistent 3rd-shot drop, disciplined dinking.", tier_advanced_desc: "Strong fundamentals, executes most shots under pressure, reads play well.", tier_intermediate_desc: "Consistent rally ability, developing strategy, occasional unforced errors.", tier_recreational_desc: "Learning shot selection, improving footwork and placement.", tier_beginner_desc: "Getting started. Focus on serve and return consistency.", conf_sample_lbl: "Sample Size", conf_recency_lbl: "Recency", conf_high_desc: "High — rating is reliable", conf_medium_desc: "Medium — developing", conf_low_desc: "Low — needs more matches", score_legal: "✅ Legal", score_illegal: "❌ Illegal", score_rule_1: "Won outright at 11, lead ≥ 2", score_rule_2: "Deuce: won by exactly 2 past 11", score_rule_3: "Lead is only 1 — must continue to deuce", score_rule_4: "Game would have ended at 11–2; you can't keep playing", first_to_lbl: "First to {n}", legend_rating_tiers_sec: "Rating Tiers & Colors", legend_how_calc_sec: "How Ratings Are Calculated", legend_confidence_sec: "Rating Confidence %", legend_score_rules_sec: "Valid Score Rules", legend_pt_win_pct_desc2: "Points scored by your team divided by all points played. 50% = even; elite rec players hold 54–58%.", legend_provisional_boost: "Provisional Boost", legend_full_replay: "Full Replay Architecture", multi_select_hint: "Hold Ctrl / tap to select multiple", event_restore_admin_only: "Admin only", trash_admin_only: "Only an Admin can permanently empty the trash.", stat_pt_win_pct: "🎯 Pt Win%", pt_win_pct_sec: "🎯 Point Win %", pt_win_pct_desc: "Points won vs total points played. 50% = perfectly even; elite players typically hold 54–58%.", conf_lbl: "Confidence", conf_high: "High", conf_medium: "Medium", conf_low: "Low"
  },
  zh_tw: {
    rank: "排名", roster: "名冊", session: "球局", custom: "自訂", history: "歷史", h2h: "對戰", matches_tab: "比賽", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 積分追蹤器", players: "球員", players_sub: "管理球員名冊", session_title: "循環賽球局", session_sub: "四人循環賽自動對戰", log: "記錄比賽", log_sub: "登錄一場比賽結果", history_title: "比賽歷史", history_sub: "所有比賽紀錄", compare: "雙人對戰比較", compare_sub: "頭對頭數據分析", stats: "團隊統計", stats_sub: "數據洞察與紀錄", settings: "設定", settings_sub: "資料管理與外觀", leaderboard: "🏆 積分排行榜", recent_matches: "⚡ 近期對戰", no_players: "目前尚無球員。", add_players_btn: "新增球員", no_matches: "目前尚無比賽紀錄。", log_first_match: "記錄第一場比賽", add_player_sec: "新增球員", name_lbl: "球員姓名", starting_rating: "初始積分", optional_dupr: "(選填 — 真實 DUPR 積分)", rating_range_hint: "必須介於 1.500 – 6.500 之間", dupr_tiers_hint: "DUPR 級別: 2.0–2.5 初學 · 2.5–3.5 娛樂 · 3.5–4.5 中階 · 4.5–5.5 進階 · 5.5+ 精英", add_player_btn: "加入球員", roster_lbl: "球員名冊", edit_details: "修改球員資料", cancel: "取消", confirm: "確認", save: "儲存", rename: "重命名", remove_player_q: "確定要移除此球員嗎？", match_history_stays: "該球員的歷史對戰紀錄仍會保留。", base_rating_sec: "🎯 初始 / 基礎積分", base_rating_desc: "所有比賽計算的基準起點點數。", base_rating_lbl: "基礎積分", edit_starting_rating: "✏️ 修改初始積分", new_starting_rating: "新初始積分 (1.500 – 6.500)", save_recalc: "儲存並重新計算所有比賽", rating_trend_desc: "多打幾場比賽即可看到積分走勢圖。", reset_rating_btn: "重置積分", reset_rating_q: "重置積分為 3.000？", rating_history_cleared: "積分歷史紀錄將會被清空。", best_win_sec: "🏅 生涯最佳勝場", match_type_sec: "比賽類型", win_to_lbl: "勝出分數:", win_by_lbl: "勝出分差:", point: "分", points: "分", select_prompt: "選擇…", team_name_opt: "隊伍名稱 (選填)", player_a: "球員 A", player_b: "球員 B", player_1: "球員 1", player_2: "球員 2", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者勝，須贏 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期與地點", date_time_lbl: "比賽時間", venue_opt: "球場/地點 (選填)", log_match_btn: "登錄比賽並更新積分", filter_search_sec: "篩選與搜尋", search_placeholder: "搜尋比賽紀錄…", results_lbl: "對戰結果", delete_match_q: "確定要刪除這場比賽嗎？", ratings_recalculated: "所有球員積分將重新計算。", rating_comp_sec: "積分對比", overview_sec: "📊 數據總覽", records_sec: "🏅 紀錄保持人", venues_lbl: "比賽球場", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主題色調", typography_sec: "Aa 字體設定", backup_restore_sec: "💾 備份與還原", backup_desc: "匯出您的資料以利備份或匯入試算表進行精細分析。", json_backup_btn: "📤 JSON 備份", csv_export_btn: "📊 CSV 匯出", import_json_btn: "📥 匯入 JSON 資料", summary_sec: "📋 數據統計", danger_zone_sec: "⚠️ 危險區域", danger_desc: "永久刪除所有資料。如有需要，請先匯出備份。", clear_all_btn: "🗑️ 清空所有本地資料", about_sec: "ℹ️ 關於系統", about_desc: "專為私有 pickleball 社群設計的 DUPR 導向積分追蹤器。採用 ELO 權重演算法，結合勝分差加權修正。積分範圍 1.5–6.5。所有資料皆儲存於本地瀏覽器。", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. 選擇今日四人組合", load_saved_group: "載入常用組合", save_group_btn: "儲存此組合", select_4_unique: "請選擇 4 位不同的球員。", rr_matchups: "2. 循環賽對戰組合", log_score_btn: "登錄比分", save_score_btn: "儲存比分", match_logged_ok: "✅ 比賽登錄成功！", see_history_btn: "前往歷史紀錄 →", edit_match_title: "✏️ 修改比賽資料", branding_sec: "✨ App 品牌設定", logo_text: "圖示文字 / 表情符號", upload_logo: "上傳自訂圖示", display_size_sec: "🔍 顯示大小", size_compact: "緊湊", size_standard: "標準", size_large: "放大", synergy_rivalry_sec: "🤝 最佳拍檔與宿敵", best_partner: "最佳拍檔", nemesis: "宿敵", win_rate: "勝率", vs_them: "對戰勝率", worst_partner: "⚠️ 默契考驗", easy_target: "🎯 最佳提款機", admin_sec: "🔒 權限與安全", admin_status: "目前狀態", user_mode: "一般用戶 (檢視/新增/編輯)", admin_mode: "管理員 (完整權限)", passcode_lbl: "管理員密碼", login_btn: "登入", logout_btn: "登出", change_pass_btn: "更改密碼", wrong_pass: "密碼錯誤。", pass_updated: "密碼已更新。", badges_sec: "🎖️ 個人成就", badge_centurion: "百戰老將 (100+ 場)", badge_ironman: "鐵人 (50+ 場)", badge_slayer: "巨人殺手 (大爆冷門)", badge_streaker: "無人能擋 (5+ 連勝)", badge_sharp: "神射手 (60%+ 勝率)", no_badges: "多打幾場比賽來解鎖成就！", all_players: "所有球員", view_all_matches: "查看所有比賽", singles_wr: "單打勝率", doubles_wr: "雙打勝率", photo: "照片", change_photo: "更換", search_players_placeholder: "搜尋球員...", sort_by: "排序方式:", sort_rating: "積分 (高到低)", sort_fn: "名字 (A-Z)", sort_ln: "姓氏 (A-Z)", sort_games: "比賽場數", err_enter_name: "請輸入姓名。", err_exists: "球員已存在。", err_empty: "名稱不能為空。", err_taken: "名稱已被使用。", err_select_players: "請選擇球員。", err_select_4: "請選擇 4 位球員。", err_duplicate: "球員重複。", err_valid_scores: "請輸入有效的比分。", err_invalid_score_fmt: "比分無效。先得 {winTo} 分，須贏 {winBy} 分。", err_add_game: "請至少新增一局。", err_clear_winner: "比賽必須有明確勝負。", err_error_scores: "比分錯誤。", h2h_btn: "⚔️ 對戰比較 (H2H)", log_custom_btn: "➕ 記錄自訂比賽", rating_elite: "精英", rating_advanced: "進階", rating_intermediate: "中階", rating_recreational: "休閒", rating_beginner: "新手", stat_matches: "🎮 場次", stat_wins: "✅ 勝場", stat_losses: "❌ 敗场", stat_win_pct: "📈 勝率", stat_w_streak: "🔥 連勝", stat_l_streak: "🧊 連敗", rating_history_sec: "📈 積分走勢", spark_start: "起始", spark_peak: "最高", spark_now: "目前", beat_opp: "擊敗 {name}", upset_of: "爆冷門賺取", overview_total_matches: "總場次", overview_singles: "單打", overview_doubles: "雙打", overview_games_played: "總局數", overview_players: "球員總數", overview_venues: "場地數", record_most_matches: "最多出賽", record_top_rated: "最高積分", record_hot_streak: "最長連勝", record_biggest_upset: "最大爆冷門", record_beat_higher: "擊敗高分對手，贏得", recent_form: "近期狀態", no_data: "尚無數據", match_predictor: "🔮 賽前預測", prob_win: "獲勝機率", if_wins: "若 {name} 獲勝:", expected_delta: "預期積分變動", singles_title: "單打積分榜", doubles_title: "雙打積分榜", verified_status: "認證完成", provisional_status: "暫定評估", teams: "隊伍", performance_profile: "👤 五維雷達圖", copy_ai_prompt: "🤖 複製 AI 戰報提示詞", ai_prompt_copied: "提示詞已複製！請貼上至 Gemini 產生戰報。", kotc: "稱王賽", kotc_desc: "與不同搭檔進行 3 場比賽。勝場最多（及淨勝分最高）的球員將成為王者！", round: "回合", diff: "淨勝分", log_kotc: "登錄賽事", tournament: "錦標賽", tourney_setup: "賽程設定", bracket_size: "賽程規模", team: "隊伍", generate_bracket: "產生賽程表", qf: "八強賽", sf: "四強賽", final: "決賽", winner: "勝者", log_tournament: "登錄錦標賽", sort_starred: "星號優先 (A-Z)", select_teams: "選擇隊伍", start_tournament: "開始錦標賽", singles_rating: "單打積分", doubles_rating: "雙打積分", appearance_sec: "外觀設定", fun_stats_sec: "趣味數據", my_profile_sec: "我的個人檔案", link_device_desc: "將此裝置與您的球員檔案連結，以向群組顯示您的「上線」狀態。", guest_not_linked: "訪客 / 未連結", exit_admin_btn: "退出管理員模式 (登出)", new_passcode_placeholder: "新密碼", app_initials_placeholder: "App 縮寫 (例如 PR)", click_to_change_logo: "點擊更換圖示", version_lbl: "版本", view_changelog_btn: "查看更新日誌", unlock_fun_stats: "多打幾場比賽來解鎖趣味數據！", requires_min_games: "(至少需要與搭檔進行2場比賽)", events: "賽事", events_sub: "即將到來的球局", trash: "垃圾桶", trash_sub: "還原刪除的項目", legends: "圖鑑", legends_sub: "術語與成就", changelog: "更新日誌", changelog_sub: "應用程式更新歷史", rankings: "排行榜", edit_session: "編輯球局", new_session: "新增球局", event_name: "活動名稱", venue: "地點", invite_players: "邀請球員", select_players_invite: "選擇要邀請的球員...", selected: "已選:", save_changes: "儲存變更", create_session: "建立球局", upcoming_sessions: "即將到來的球局", no_scheduled_sessions: "沒有已排定的球局。", invited: "已邀請:", tbd: "待定", local_court: "當地場地", add_new_player_btn: "➕ 新增球員", welcome_setup_desc: "👋 歡迎！請填寫下方表單以加入名冊。您必須建立 4 位數 PIN 碼 (提示：可使用生日 MMDD) 來保護您的帳號。", notes_optional: "備註 (選填)", paddle_playstyle_hint: "球拍型號、打法等...", security_pin_lbl: "安全 PIN 碼 (例如: MMDD)", pin_placeholder: "4位數 PIN 碼", notes_lbl: "備註", player_notes_placeholder: "球員備註...", pigeon: "手下敗將", match_type_singles: "單打", match_type_doubles: "雙打", legends_icons_badges: "視覺圖示與徽章", legend_prov_title: "暫定積分", legend_prov_desc: "球員出賽少於 5 場。積分波動將會較大，直到數據穩定。", legend_conf_title: "確認積分", legend_conf_desc: "球員已完成 5 場以上比賽，積分狀態趨於穩定。", legend_dupr_title: "DUPR 連結", legend_dupr_desc: "該球員的初始積分是直接從 DUPR 匯入的。", legend_hot_title: "連勝狀態", legend_hot_desc: "球員目前連續贏得 3 場以上的比賽。", legend_cold_title: "連敗狀態", legend_cold_desc: "球員目前連續輸掉 3 場以上的比賽。", legend_fav_title: "已收藏", legend_fav_desc: "球員將被固定在名冊與選擇畫面的頂部。", legends_radar: "雷達圖指標", legend_win_pct: "勝率", legend_win_pct_desc: "所有賽制中贏得比賽的整體百分比。", legend_power: "力量 (S)", legend_power_desc: "基於球員的單打 ELO 積分。積分越高，此軸的範圍越大。", legend_synergy: "默契 (D)", legend_synergy_desc: "基於球員的雙打 ELO 積分。積分越高，此軸的範圍越大。", legend_upset: "爆冷指數", legend_upset_desc: "衡量擊敗積分明顯高於自己的對手的能力。", legend_form: "近期狀態", legend_form_desc: "基於近期連勝/連敗紀錄的氣勢指標。", legends_fun_stats: "趣味數據 (對戰歷史)", legend_partner_desc: "與您搭檔勝率最高的隊友（至少需共同出賽 2 場）。", legend_nemesis_desc: "擊敗過您最多次的特定對手。", legend_pigeon_desc: "您擊敗過最多次的特定對手。", legends_achievements: "里程碑成就", legend_centurion_desc: "總出賽場次達到或超過 100 場。", legend_ironman_desc: "總出賽場次達到或超過 50 場。", legend_on_fire_desc: "取得 5 場或以上的壓倒性連勝。", legend_sharp_desc: "維持 60% 以上的整體勝率（至少需出賽 10 場）。", legend_giant_slayer_desc: "擊敗 ELO 積分明顯較高的對手，並在單場比賽中獲得大量積分（+0.30 或以上）。", base_lbl: "基礎:", opp_avg_lbl: "對手平均:", prob_lbl: "勝率:", k_adj_lbl: "K值調整:", trash_empty: "垃圾桶是空的。", match_label: "比賽", deleted_lbl: "刪除於:", restore_btn: "還原", empty_trash_btn: "清空垃圾桶", empty_trash_confirm: "確定要永久清空垃圾桶嗎？此操作無法還原。", welcome_title: "歡迎使用 PickleRank！", welcome_desc_admin: "請輸入全域管理員密碼。", welcome_desc_user: "請問目前是誰在使用此裝置？這有助於我們追蹤數據並預先填寫您的比賽紀錄。", on_roster_btn: "我已在名冊中", new_player_btn: "新球員", select_name_placeholder: "請選擇您的名字...", admin_pass_placeholder: "管理員密碼", invalid_pin_msg: "PIN 碼無效，或管理員尚未設定 PIN 碼。", incorrect_pass_msg: "密碼錯誤。", setup_awesome_msg: "太棒了！我們將帶您前往「新增球員」畫面，您可以輸入姓名、DUPR 積分，並設定專屬的安全 PIN 碼。", save_enter_app: "儲存並進入系統", enter_as_admin: "以管理員身分進入", go_to_setup: "前往設定", return_player_login: "返回球員登入", verify_identity: "驗證身分", verify_desc: "歡迎回來，{name}。請輸入您的 4 位數 PIN 碼 (提示：您的生日 MMDD) 以繼續。", unlock: "解鎖", incorrect_pin: "PIN 碼錯誤", create_profile: "建立個人檔案", admin_login: "管理員登入", no_pin_required: "無需 PIN 碼 — 點擊繼續", pin_sec: "帳號 PIN 碼", pin_is_set: "已設置 PIN 碼 — 帳號受到保護", pin_not_set: "未設置 PIN 碼 — 任何人都可以以你的身份登入", set_pin: "設置 PIN", change_pin: "更改 PIN", remove_pin: "移除 PIN", current_pin: "目前 PIN 碼", new_pin: "新 PIN 碼（4 位數）", confirm_pin: "確認 PIN 碼", pin_mismatch: "兩次輸入的 PIN 碼不一致，請重試", pin_must_be_4: "PIN 碼必須為 4 位數字", pin_set: "PIN 碼設置成功", pin_updated: "PIN 碼更新成功", pin_removed: "PIN 碼已移除", pin_remove_warning: "移除後，任何人都可以以你的身份登入。", back: "返回", admin_pin_prompt: "請輸入管理員 PIN 碼以繼續", legend_match_vs_game_sec: "🎮 一場比賽 vs 一局比賽——哪個才算數？", legend_match_def: "比賽（Match）", legend_match_def_desc: "兩隊之間的一次對決（例如 Allen 和 Terry vs Steve 和 Lily）。一場比賽包含一局或多局。贏得較多局數的隊伍獲勝。這是最基本的統計單位——所有勝負紀錄、連勝/連敗與積分均以比賽（Match）為基礎。", legend_game_def: "局（Game）", legend_game_def_desc: "比賽中的一個計分單元（例如 第1局：11–9，第2局：8–11）。每局先到 11、15 或 21 分者勝，需贏 2 分。多局合為一場比賽。", legend_wl_based_on: "所有勝負統計均以比賽（Match）為基礎，而非以局（Game）為基礎。", legend_stat_table_wl: "勝負紀錄 — 比賽勝場與敗場", legend_stat_table_winpct: "勝率 — 比賽勝率百分比", legend_stat_table_streak: "🔥/🧊 連勝/連敗 — 連續贏得或輸掉的比賽場數", legend_stat_table_rating: "積分 — 每場比賽結束後計算一次", legend_stat_table_ptpct: "🎯 得分率 — 所有比賽中各局得分的加總", legend_stat_table_partner: "搭檔矩陣 — 分別顯示比賽勝負與局數勝負", legend_margin_example_title: "得分差加權計算範例", legend_margin_example: "Allen 和 Terry 以 11–9 及 11–7 獲勝（兩局）：本隊得分 = 22，對手 = 16。加權值 = 22÷38 = 57.9%。若以 11–2 大勝，加權值 = 84.6% → 積分變動更大。", legend_vs_dupr_sec: "🆚 PickleRank vs DUPR", legend_vs_dupr_intro: "DUPR 與 PickleRank 都是基於 ELO 概念的積分系統，但有以下幾點重要差異：", legend_dupr_col: "DUPR", legend_pr_col: "PickleRank", legend_vs_model: "核心模型", legend_vs_model_dupr: "Glicko-2（含不確定性區間）", legend_vs_model_pr: "ELO 加得分差加權", legend_vs_margin: "分差加權", legend_vs_margin_dupr: "每局獨立計算", legend_vs_margin_pr: "加總所有局的得分", legend_vs_scale: "積分範圍", legend_vs_scale_dupr: "2.0 – 8.0", legend_vs_scale_pr: "1.5 – 6.5", legend_vs_matches: "比賽類型", legend_vs_matches_dupr: "僅限認證／官方賽事", legend_vs_matches_pr: "所有已記錄的比賽", legend_vs_confidence: "不確定性", legend_vs_confidence_dupr: "積分偏差（±）", legend_vs_confidence_pr: "📊 可信度 %（我們的版本）", legend_vs_formula: "公式", legend_vs_formula_dupr: "專有算法——從未公開", legend_vs_formula_pr: "完全公開——本頁已完整呈現", legend_vs_note: "我們的 📊 可信度 % 近似於 Glicko-2 的不確定性概念：隨出賽場次增加而提升，若長期未出賽則下降。數學原理不同，但回答的是同一個問題：這個積分有多可信？", partner_matrix_top: "最佳搭檔組合（2場以上）", legend_online_title: "🟢 目前上線", legend_online_desc: "球員名旁的綠色圓點表示他們正在使用應用程式（最近 90 秒內有活動）。", legend_pin_title: "🔒 帳號已加密", legend_pin_desc: "此球員已設置 4 位數 PIN 碼，只有本人（或管理員）才能編輯個人資料或以其名義記錄比賽。", legend_rematch_title: "🔁 重賽", legend_rematch_desc: "當同一組球員在同一天進行超過一場比賽時，歷史記錄中會顯示此橘色標籤。", legend_form_title: "W / L 近況點", legend_form_desc: "選擇球員時，名字下方顯示最近 3 場比賽結果——綠色 W 表示勝利，紅色 L 表示落敗，讓你在選邊前了解近況。", legend_dashboard_sec: "📊 主頁功能", legend_motd_title: "⚡ 今日最佳比賽", legend_motd_desc: "自動從近期比賽中找出最精彩的一場——綜合爆冷指數、比分緊張程度與最大積分波動計算。金色 = 爆冷門，藍色 = 激烈角逐。", legend_potm_title: "📅 本月最佳球員", legend_potm_desc: "顯示過去 30 天積分漲幅最大的前 5 名球員。第 1 名獲得金色邊框標示，隨滾動時間窗自動更新。", legend_session_sec: "🏓 球局模式功能", legend_team_suggest_title: "🤝 最佳隊伍分配建議", legend_team_suggest_desc: "選定 4 名球員後自動出現。依公平性排列 3 種分組方式——積分差距最小的最均衡。點選任一方案即可選用。", legend_session_summary_title: "🏆 球局總結卡", legend_session_summary_desc: "記錄完球局後出現，顯示每位球員的勝負與積分變動、最佳球員、進步最多者、本場總得分及所有比賽比分。點擊分享可複製文字戰報。", legend_form_dots_title: "📈 近況指示", legend_form_dots_desc: "在任何比賽模式選擇球員時，下拉選單下方顯示最近 3 場比賽的 W/L 標記（綠/紅），讓你在開始前看出誰狀態火熱、誰處於低潮。", legend_profile_sec: "👤 個人資料功能", legend_goal_title: "🎯 個人目標", legend_goal_desc: "在自己的個人資料頁面按賽制設定目標積分（例如 4.000），進度條追蹤從起始積分到目標的進展，達成時變為金色。僅本人與管理員可見。", legend_volatility_title: "📉 積分波動率", legend_volatility_desc: "衡量每場比賽後積分的波動幅度（每場變動的標準差）。穩定 <0.02，有起伏 0.02–0.05，波動大 >0.05。數值越低表示表現越穩定。", legend_pt_win_pct_title: "🎯 得分勝率", legend_pt_win_pct_desc2: "本隊得分佔所有比賽總得分的比例，分別追蹤整體、雙打、單打。50% 代表勢均力敵；精英休閒球員通常介於 54–58%。", legend_partner_matrix_title: "🤝 搭檔勝率矩陣", legend_partner_matrix_desc: "位於群組統計頁面。以顏色標示的表格顯示你與每位潛在搭檔的雙打勝率（至少合作 1 場）。🟢 ≥60%、🟡 45–59%、🔴 <45%。", legend_match_modes_sec: "🎮 比賽模式", legend_mode_custom_title: "自訂比賽", legend_mode_custom_desc: "手動記錄任何單打或雙打比賽，選擇球員、逐局輸入比分，並可新增場地與備註。", legend_mode_session_title: "球局（循環賽）", legend_mode_session_desc: "四人循環賽：每對搭檔組合與其他組合各賽一場（共 3 場）。三場全部記錄後一起更新積分。", legend_mode_kotc_title: "球場之王", legend_mode_kotc_desc: "勝者留場，敗者換場輪替。追蹤每位球員在整個球局中的累計勝場數。", legend_mode_tourney_title: "錦標賽", legend_mode_tourney_desc: "適合較大規模群組的單淘汰制賽事，依當前雙打積分設定種子序位。", goal_sec: "🎯 個人目標", goal_set_target: "設定目標積分", goal_format_lbl: "賽制", goal_target_lbl: "目標積分", goal_save: "設定目標", goal_clear: "清除目標", goal_progress: "目標達成進度", goal_reached: "🏆 目標達成！", goal_away: "差距", volatility_sec: "📉 積分波動率", volatility_low: "穩定", volatility_med: "有起伏", volatility_high: "波動較大", volatility_desc: "每場比賽後積分的波動幅度。數值越低代表表現越穩定。", rematch_badge: "🔁 重賽", rematch_count: "今日 {n} 場重賽", legend_conf_icon_title: "📊 積分可信度", legend_conf_icon_desc: "反映積分的可信程度。🟢 ≥75% 可信、🟡 45–74% 發展中、🔴 <45% 需要更多比賽。若超過 90 天未出賽，可信度將自動下降。", motd_sec: "⚡ 今日最佳比賽", motd_upset: "爆冷門警報", motd_tight: "激烈角逐", motd_no_recent: "近期無比賽紀錄。", motd_beat: "擊敗", motd_score: "比分", potm_sec: "📅 本月最佳球員", potm_desc: "近 30 天內積分漲幅最大的球員", potm_no_data: "近期活躍度不足。", potm_gain: "積分增益", form_lbl: "近況", team_suggester_sec: "🤝 最佳隊伍分配建議", team_suggester_desc: "根據目前雙打積分計算最均衡的分組方式。", team_balance_label: "積分差距：", team_fairest: "最均衡", team_use_this: "使用此分組", session_summary_title: "🏆 球局結束！", session_summary_mvp: "最佳球員", session_summary_improved: "進步最多", session_summary_total_pts: "本場總得分", session_summary_results: "比賽結果", session_summary_share: "📤 分享戰報", session_summary_close: "開始新球局", session_summary_rating_change: "積分變動", partner_matrix_sec: "🤝 雙打搭檔勝率矩陣", partner_matrix_desc: "與每位搭檔的雙打勝率（最少1場合作）。", partner_matrix_no_data: "雙打比賽場次不足。", partner_matrix_games: "場次", partner_matrix_in_games: "局數", legend_rating_intro: "每位球員的積分介於 1.500 至 6.500 之間，與 DUPR 制度一致。積分徽章顏色代表球員所屬等級，一目了然。", legend_step1_title: "步驟一 — 勝率預測", legend_step1_desc: "每場比賽前，系統會根據雙方平均積分計算本隊的預期勝率。擊敗積分較高的對手將獲得大量積分；輸給積分較低的對手則會損失較多。", legend_step2_title: "步驟二 — 得分差加權", legend_step2_desc: "比賽中的實際得分差（而非單純勝負）會影響積分變動幅度。11-2 的大勝比 11-9 的險勝帶來更大的積分變動，即使對陣的是同一組球員。", legend_step3_title: "步驟三 — 積分更新", legend_step3_actual: "actual（實際結果）= 勝利得 1，落敗得 0。", legend_step3_expected: "expected（預期勝率）= 步驟一計算所得的勝率。", legend_step3_k: "基礎 K 值 = {k}，控制每場比賽積分的移動速度。", legend_step4_title: "步驟四 — 新手加速期", legend_step4_desc: "新球員在前 {n} 場比賽的積分移動速度可達正常的 2 倍，之後逐漸回歸正常 K 值。此設計幫助新球員快速收斂至真實技術水準。", legend_replay_title: "完整回放架構", legend_replay_desc: "每當比賽被修改或刪除時，系統會從頭依時間順序重新計算所有比賽積分。這確保積分不會產生漂移——對舊比賽的修改會正確地影響後續所有比賽的積分。", legend_conf_intro: "可信度反映對球員當前積分的信賴程度，由兩個因素決定：", conf_sample_desc: "隨出賽場次增加而提升（趨近 {n} 場後逐漸飽和）。1 場 ≈ 10%，10 場 ≈ 63%，30 場 ≈ 95%。", conf_recency_desc: "若球員超過 {d} 天未出賽，可信度將開始下降——舊結果逐漸失去參考價值。最低不低於樣本可信度的 70%。", legend_score_intro: "比分將依據真實匹克球規則進行驗證。只有在比賽應當正式結束的那一刻，比分才算合法。", match_num_k: "第 {n} 場：K={k}", tier_elite_desc: "錦標賽級別選手。強力發球、穩定第三拍放短球、嚴守廚房區域。", tier_advanced_desc: "基本功紮實，在壓力下仍能執行大多數球路，場上閱讀能力佳。", tier_intermediate_desc: "穩定的對打能力，戰術發展中，偶有非受迫性失誤。", tier_recreational_desc: "學習選球時機，改善步法與落點控制。", tier_beginner_desc: "剛起步。專注於發球與接球的穩定性。", conf_sample_lbl: "樣本數量", conf_recency_lbl: "近期活躍度", conf_high_desc: "高 — 積分可信", conf_medium_desc: "中 — 仍在發展", conf_low_desc: "低 — 需要更多比賽", score_legal: "✅ 合法", score_illegal: "❌ 不合法", score_rule_1: "先到11分且領先2分，正常結束", score_rule_2: "膠著局：超過11分後恰好領先2分", score_rule_3: "只領先1分 — 必須繼續打膠著局", score_rule_4: "比賽應在11-2時結束，不可繼續比到25分", first_to_lbl: "先得 {n} 分", legend_rating_tiers_sec: "積分等級與顏色", legend_how_calc_sec: "積分計算方式", legend_confidence_sec: "積分可信度 %", legend_score_rules_sec: "合法比分規則", legend_pt_win_pct_desc2: "本隊得分佔總分比例。50% 代表勢均力敵；精英休閒球員通常介於 54–58%。", legend_provisional_boost: "暫定加速", legend_full_replay: "完整回放架構", multi_select_hint: "按住 Ctrl 或點選多個選項", event_restore_admin_only: "僅限管理員", trash_admin_only: "只有管理員可以永久清空垃圾桶。", stat_pt_win_pct: "🎯 得分率", pt_win_pct_sec: "🎯 得分勝率", pt_win_pct_desc: "本隊得分佔總分比例。50% 代表勢均力敵；精英球員通常介於 54–58%。", conf_lbl: "可信度", conf_high: "高", conf_medium: "中", conf_low: "低"
  },
  zh_cn: {
    rank: "排名", roster: "名册", session: "球局", custom: "自定义", history: "历史", h2h: "对战", matches_tab: "比赛", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 积分追踪器", players: "球员", players_sub: "管理球员名册", session_title: "循环赛球局", session_sub: "四人循环赛自动对战", log: "记录比赛", log_sub: "登录一场比赛结果", history_title: "比赛历史", history_sub: "所有比赛纪录", compare: "双人对战比较", compare_sub: "头对头数据分析", stats: "团队统计", stats_sub: "数据洞察与纪录", settings: "设置", settings_sub: "数据管理与外观", leaderboard: "🏆 积分排行榜", recent_matches: "⚡ 近期对战", no_players: "目前尚无球员。", add_players_btn: "新增球员", no_matches: "目前尚无比赛纪录。", log_first_match: "记录第一场比赛", add_player_sec: "新增球员", name_lbl: "球员姓名", starting_rating: "初始积分", optional_dupr: "(选填 — 真实 DUPR 积分)", rating_range_hint: "必须介于 1.500 – 6.500 之间", dupr_tiers_hint: "DUPR 级别: 2.0–2.5 初学 · 2.5–3.5 娱乐 · 3.5–4.5 中阶 · 4.5–5.5 进阶 · 5.5+ 精英", add_player_btn: "加入球员", roster_lbl: "球员名册", edit_details: "修改球员资料", cancel: "取消", confirm: "确认", save: "储存", rename: "重命名", remove_player_q: "确定要移除此球员吗？", match_history_stays: "该球员的历史对战纪录仍会保留。", base_rating_sec: "🎯 初始 / 基础积分", base_rating_desc: "所有比赛计算的基准起点点数。", base_rating_lbl: "基础积分", edit_starting_rating: "✏️ 修改初始积分", new_starting_rating: "新初始积分 (1.500 – 6.500)", save_recalc: "储存并重新计算所有比赛", rating_trend_desc: "多打几场比赛即可看到积分走势图。", reset_rating_btn: "重置积分", reset_rating_q: "重置积分为 3.000？", rating_history_cleared: "积分历史纪录将会被清空。", best_win_sec: "🏅 生涯最佳胜场", match_type_sec: "比赛类型", win_to_lbl: "胜出分数:", win_by_lbl: "胜出分差:", point: "分", points: "分", select_prompt: "选择…", team_name_opt: "队伍名称 (选填)", player_a: "球员 A", player_b: "球员 B", player_1: "球员 1", player_2: "球员 2", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者胜，须赢 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期与地点", date_time_lbl: "比赛时间", venue_opt: "球场/地点 (选填)", log_match_btn: "登录比赛并更新积分", filter_search_sec: "筛选与搜寻", search_placeholder: "搜寻比赛纪录…", results_lbl: "对战结果", delete_match_q: "确定要删除这场比赛吗？", ratings_recalculated: "所有球员积分将重新计算。", rating_comp_sec: "积分对比", overview_sec: "📊 数据总览", records_sec: "🏅 纪录保持人", venues_lbl: "比赛球场", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主题色调", typography_sec: "Aa 字体设置", backup_restore_sec: "💾 备份与还原", backup_desc: "导出您的数据以利备份或导入跨浏览器表格进行细致分析。", json_backup_btn: "📤 JSON 备份", csv_export_btn: "📊 CSV 导出", import_json_btn: "📥 导入 JSON 数据", summary_sec: "📋 数据统计", danger_zone_sec: "⚠️ 危险区域", danger_desc: "永久删除所有数据。如有需要，请先导出备份。", clear_all_btn: "🗑️ 清空所有本地数据", about_sec: "ℹ️ 关于系统", about_desc: "专为私有 pickleball 社群设计的 DUPR 导向积分追踪器。采用 ELO 权重算法，结合胜分差加权修正。积分范围 1.5–6.5。所有数据皆储存于本地浏览器。", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. 选择今日四人组合", load_saved_group: "载入常用组合", save_group_btn: "储存此组合", select_4_unique: "请选择 4 位不同的球员。", rr_matchups: "2. 循环赛对战组合", log_score_btn: "登录比分", save_score_btn: "储存比分", match_logged_ok: "✅ 比赛登录成功！", see_history_btn: "前往历史纪录 →", edit_match_title: "✏️ 修改比赛资料", branding_sec: "✨ App 品牌设置", logo_text: "图标文字 / 表情符号", upload_logo: "上传自定义图标", display_size_sec: "🔍 显示大小", size_compact: "紧凑", size_standard: "标准", size_large: "放大", synergy_rivalry_sec: "🤝 最佳搭档与宿敌", best_partner: "最佳拍档", nemesis: "宿敌", win_rate: "胜率", vs_them: "对战胜率", worst_partner: "⚠️ 默契考验", easy_target: "🎯 最佳提款机", admin_sec: "🔒 权限与安全", admin_status: "当前状态", user_mode: "普通用户 (查看/新增/编辑)", admin_mode: "管理员 (完整权限)", passcode_lbl: "管理员密码", login_btn: "登录", logout_btn: "退出", change_pass_btn: "修改密码", wrong_pass: "密码错误。", pass_updated: "密码已更新。", badges_sec: "🎖️ 个人成就", badge_centurion: "百战老将 (100+ 场)", badge_ironman: "铁人 (50+ 场)", badge_slayer: "巨人杀手 (大爆冷门)", badge_streaker: "无人能挡 (5+ 连胜)", badge_sharp: "神射手 (60%+ 胜率)", no_badges: "多打几场比赛来解锁成就！", all_players: "所有球员", view_all_matches: "查看所有比赛", singles_wr: "单打胜率", doubles_wr: "双打胜率", photo: "照片", change_photo: "更换", search_players_placeholder: "搜寻球员...", sort_by: "排序方式:", sort_rating: "积分 (高到低)", sort_fn: "名字 (A-Z)", sort_ln: "姓氏 (A-Z)", sort_games: "比赛场数", err_enter_name: "请输入姓名。", err_exists: "球员已存在。", err_empty: "名称不能为空。", err_taken: "名称已被使用。", err_select_players: "请选择球员。", err_select_4: "请选择 4 位球员。", err_duplicate: "球员重复。", err_valid_scores: "请输入有效的比分。", err_invalid_score_fmt: "比分无效。先得 {winTo} 分，须赢 {winBy} 分。", err_add_game: "请至少新增一局。", err_clear_winner: "比赛必须有明确胜负。", err_error_scores: "比分错误。", h2h_btn: "⚔️ 对战比较 (H2H)", log_custom_btn: "➕ 记录自定义比赛", rating_elite: "精英", rating_advanced: "进阶", rating_intermediate: "中阶", rating_recreational: "休闲", rating_beginner: "新手", stat_matches: "🎮 场次", stat_wins: "✅ 胜场", stat_losses: "❌ 败场", stat_win_pct: "📈 胜率", stat_w_streak: "🔥 连胜", stat_l_streak: "🧊 连败", rating_history_sec: "📈 积分走势", spark_start: "起始", spark_peak: "最高", spark_now: "目前", beat_opp: "击败 {name}", upset_of: "爆冷门赚取", overview_total_matches: "总场次", overview_singles: "单打", overview_doubles: "双打", overview_games_played: "总局数", overview_players: "球员总数", overview_venues: "场地数", record_most_matches: "最多出赛", record_top_rated: "最高积分", record_hot_streak: "最长连胜", record_biggest_upset: "最大爆冷门", record_beat_higher: "击败高分对手，赢得", recent_form: "近期状态", no_data: "尚无数据", match_predictor: "🔮 赛前预测", prob_win: "获胜概率", if_wins: "若 {name} 获胜:", expected_delta: "预期积分变动", singles_title: "单打积分榜", doubles_title: "双打积分榜", verified_status: "认证完成", provisional_status: "暂定评估", teams: "队伍", performance_profile: "👤 五维雷达图", copy_ai_prompt: "🤖 复制 AI 战报提示词", ai_prompt_copied: "提示词已复制！请贴上至 Gemini 生成战报。", kotc: "称王赛", kotc_desc: "与不同搭档进行 3 場比赛。胜场最多（及净胜分最高）的球员将成为王者！", round: "回合", diff: "净胜分", log_kotc: "登录赛事", tournament: "锦标赛", tourney_setup: "赛程设置", bracket_size: "赛程规模", team: "队伍", generate_bracket: "生成赛程表", qf: "八强赛", sf: "四强赛", final: "决赛", winner: "胜者", log_tournament: "登录锦标赛", sort_starred: "星号优先 (A-Z)", select_teams: "选择队伍", start_tournament: "开始锦标赛", singles_rating: "单打积分", doubles_rating: "双打积分", appearance_sec: "外观设置", fun_stats_sec: "趣味数据", my_profile_sec: "我的个人资料", link_device_desc: "将此设备与您的球员档案链接，以向群组显示您的“上线”状态。", guest_not_linked: "访客 / 未链接", exit_admin_btn: "退出管理员模式 (退出)", new_passcode_placeholder: "新密码", app_initials_placeholder: "App 缩写 (例如 PR)", click_to_change_logo: "点击更换图标", version_lbl: "版本", view_changelog_btn: "查看更新日志", unlock_fun_stats: "多打几场比赛来解锁趣味数据！", requires_min_games: "(至少需要与搭档进行2场比赛)", events: "赛事", events_sub: "即将到来的球局", trash: "垃圾桶", trash_sub: "还原删除的项目", legends: "图鉴", legends_sub: "术语与成就", changelog: "更新日志", changelog_sub: "应用程序更新历史", rankings: "排行榜", edit_session: "编辑球局", new_session: "新增球局", event_name: "活动名称", venue: "地点", invite_players: "邀请球员", select_players_invite: "选择要邀请的球员...", selected: "已选:", save_changes: "保存更改", create_session: "创建球局", upcoming_sessions: "即将到来的球局", no_scheduled_sessions: "没有已排定的球局。", invited: "已邀请:", tbd: "待定", local_court: "当地场地", add_new_player_btn: "➕ 新增球员", welcome_setup_desc: "👋 欢迎！请填写下方表单以加入名册。您必须建立 4 位数 PIN 码 (提示：可使用生日 MMDD) 来保护您的帐号。", notes_optional: "备注 (选填)", paddle_playstyle_hint: "球拍型号、打法等...", security_pin_lbl: "安全 PIN 码 (例如: MMDD)", pin_placeholder: "4位数 PIN 码", notes_lbl: "备注", player_notes_placeholder: "球员备注...", pigeon: "手下败将", match_type_singles: "单打", match_type_doubles: "双打", legends_icons_badges: "视觉图标与徽章", legend_prov_title: "暂定积分", legend_prov_desc: "球员出赛少于 5 场。积分波动将会较大，直到数据稳定。", legend_conf_title: "确认积分", legend_conf_desc: "球员已完成 5 场以上比赛，积分状态趋于稳定。", legend_dupr_title: "DUPR 链接", legend_dupr_desc: "该球员的初始积分是直接从 DUPR 导入的。", legend_hot_title: "连胜状态", legend_hot_desc: "球员目前连续赢得 3 场以上的比赛。", legend_cold_title: "连败状态", legend_cold_desc: "球员目前连续输掉 3 场以上的比赛。", legend_fav_title: "已收藏", legend_fav_desc: "球员将被固定在名册与选择画面的顶部。", legends_radar: "雷达图指标", legend_win_pct: "胜率", legend_win_pct_desc: "所有赛制中赢得比赛的整体百分比。", legend_power: "力量 (S)", legend_power_desc: "基于球员的单打 ELO 积分。积分越高，此轴的范围越大。", legend_synergy: "默契 (D)", legend_synergy_desc: "基于球员的双打 ELO 积分。积分越高，此轴的范围越大。", legend_upset: "爆冷指数", legend_upset_desc: "衡量击败积分明显高于自己的对手的能力。", legend_form: "近期状态", legend_form_desc: "基于近期连胜/连败纪录的气势指标。", legends_fun_stats: "趣味数据 (对战历史)", legend_partner_desc: "与您搭档胜率最高的队友（至少需共同出赛 2 场）。", legend_nemesis_desc: "击败过您最多次的特定对手。", legend_pigeon_desc: "您击败过最多次的特定对手。", legends_achievements: "里程碑成就", legend_centurion_desc: "总出赛场次达到或超过 100 场。", legend_ironman_desc: "总出赛场次达到或超过 50 场。", legend_on_fire_desc: "取得 5 场或以上的压倒性连胜。", legend_sharp_desc: "维持 60% 以上的整体胜率（至少需出赛 10 场）。", legend_giant_slayer_desc: "击败 ELO 积分明显较高的对手，并在单场比赛中获得大量积分（+0.30 或以上）。", base_lbl: "基础:", opp_avg_lbl: "对手平均:", prob_lbl: "胜率:", k_adj_lbl: "K值调整:", trash_empty: "垃圾桶是空的。", match_label: "比赛", deleted_lbl: "删除于:", restore_btn: "还原", empty_trash_btn: "清空垃圾桶", empty_trash_confirm: "确定要永久清空垃圾桶吗？此操作无法还原。", welcome_title: "欢迎使用 PickleRank！", welcome_desc_admin: "请输入全局管理员密码。", welcome_desc_user: "请问目前是谁在使用此设备？这有助于我们追踪数据并预先填写您的比赛纪录。", on_roster_btn: "我已在名册中", new_player_btn: "新球员", select_name_placeholder: "请选择您的名字...", admin_pass_placeholder: "管理员密码", invalid_pin_msg: "PIN 码无效，或管理员尚未设置 PIN 码。", incorrect_pass_msg: "密码错误。", setup_awesome_msg: "太棒了！我们将带您前往“新增球员”画面，您可以输入姓名、DUPR 积分，并设置专属的安全 PIN 码。", save_enter_app: "保存并进入系统", enter_as_admin: "以管理员身份进入", go_to_setup: "前往设置", return_player_login: "返回球员登录", verify_identity: "验证身份", verify_desc: "欢迎回来，{name}。请输入您的 4 位数 PIN 码 (提示：您的生日 MMDD) 以继续。", unlock: "解锁", incorrect_pin: "PIN 码错误", create_profile: "创建个人资料", admin_login: "管理员登录", no_pin_required: "无需 PIN 码 — 点击继续", pin_sec: "账号 PIN 码", pin_is_set: "已设置 PIN 码 — 账号受到保护", pin_not_set: "未设置 PIN 码 — 任何人都可以以你的身份登录", set_pin: "设置 PIN", change_pin: "更改 PIN", remove_pin: "移除 PIN", current_pin: "当前 PIN 码", new_pin: "新 PIN 码（4 位数）", confirm_pin: "确认 PIN 码", pin_mismatch: "两次输入的 PIN 码不一致，请重试", pin_must_be_4: "PIN 码必须为 4 位数字", pin_set: "PIN 码设置成功", pin_updated: "PIN 码更新成功", pin_removed: "PIN 码已移除", pin_remove_warning: "移除后，任何人都可以以你的身份登录。", back: "返回", admin_pin_prompt: "请输入管理员 PIN 码以继续", legend_match_vs_game_sec: "🎮 一场比赛 vs 一局比赛——哪个才算数？", legend_match_def: "比赛（Match）", legend_match_def_desc: "两队之间的一次对决（例如 Allen 和 Terry vs Steve 和 Lily）。一场比赛包含一局或多局。赢得较多局数的队伍获胜。这是最基本的统计单位——所有胜负纪录、连胜/连败与积分均以比赛（Match）为基础。", legend_game_def: "局（Game）", legend_game_def_desc: "比赛中的一个计分单元（例如 第1局：11–9，第2局：8–11）。每局先到 11、15 或 21 分者胜，需赢 2 分。多局合为一场比赛。", legend_wl_based_on: "所有胜负统计均以比赛（Match）为基础，而非以局（Game）为基础。", legend_stat_table_wl: "胜负纪录 — 比赛胜场与败场", legend_stat_table_winpct: "胜率 — 比赛胜率百分比", legend_stat_table_streak: "🔥/🧊 连胜/连败 — 连续赢得或输掉的比赛场数", legend_stat_table_rating: "积分 — 每场比赛结束后计算一次", legend_stat_table_ptpct: "🎯 得分率 — 所有比赛中各局得分的加总", legend_stat_table_partner: "搭档矩阵 — 分别显示比赛胜负与局数胜负", legend_margin_example_title: "得分差加权计算范例", legend_margin_example: "Allen 和 Terry 以 11–9 及 11–7 获胜（两局）：本队得分 = 22，对手 = 16。加权值 = 22÷38 = 57.9%。若以 11–2 大胜，加权值 = 84.6% → 积分变动更大。", legend_vs_dupr_sec: "🆚 PickleRank vs DUPR", legend_vs_dupr_intro: "DUPR 与 PickleRank 都是基于 ELO 概念的积分系统，但有以下几点重要差异：", legend_dupr_col: "DUPR", legend_pr_col: "PickleRank", legend_vs_model: "核心模型", legend_vs_model_dupr: "Glicko-2（含不确定性区间）", legend_vs_model_pr: "ELO 加得分差加权", legend_vs_margin: "分差加权", legend_vs_margin_dupr: "每局独立计算", legend_vs_margin_pr: "加总所有局的得分", legend_vs_scale: "积分范围", legend_vs_scale_dupr: "2.0 – 8.0", legend_vs_scale_pr: "1.5 – 6.5", legend_vs_matches: "比赛类型", legend_vs_matches_dupr: "仅限认证／官方赛事", legend_vs_matches_pr: "所有已记录的比赛", legend_vs_confidence: "不确定性", legend_vs_confidence_dupr: "积分偏差（±）", legend_vs_confidence_pr: "📊 可信度 %（我们的版本）", legend_vs_formula: "公式", legend_vs_formula_dupr: "专有算法——从未公开", legend_vs_formula_pr: "完全公开——本页已完整呈现", legend_vs_note: "我们的 📊 可信度 % 近似于 Glicko-2 的不确定性概念：随出赛场次增加而提升，若长期未出赛则下降。数学原理不同，但回答的是同一个问题：这个积分有多可信？", partner_matrix_top: "最佳搭档组合（2场以上）", legend_online_title: "🟢 当前在线", legend_online_desc: "球员名旁的绿色圆点表示他们正在使用应用程序（最近 90 秒内有活动）。", legend_pin_title: "🔒 账号已加密", legend_pin_desc: "此球员已设置 4 位数 PIN 码，只有本人（或管理员）才能编辑个人资料或以其名义记录比赛。", legend_rematch_title: "🔁 重赛", legend_rematch_desc: "当同一组球员在同一天进行超过一场比赛时，历史记录中会显示此橙色标签。", legend_form_title: "W / L 近况点", legend_form_desc: "选择球员时，名字下方显示最近 3 场比赛结果——绿色 W 表示胜利，红色 L 表示落败，让你在选边前了解近况。", legend_dashboard_sec: "📊 主页功能", legend_motd_title: "⚡ 今日最佳比赛", legend_motd_desc: "自动从近期比赛中找出最精彩的一场——综合爆冷指数、比分紧张程度与最大积分波动计算。金色 = 爆冷门，蓝色 = 激烈角逐。", legend_potm_title: "📅 本月最佳球员", legend_potm_desc: "显示过去 30 天积分涨幅最大的前 5 名球员。第 1 名获得金色边框标示，随滚动时间窗自动更新。", legend_session_sec: "🏓 球局模式功能", legend_team_suggest_title: "🤝 最佳队伍分配建议", legend_team_suggest_desc: "选定 4 名球员后自动出现。依公平性排列 3 种分组方式——积分差距最小的最均衡。点击任一方案即可选用。", legend_session_summary_title: "🏆 球局总结卡", legend_session_summary_desc: "记录完球局后出现，显示每位球员的胜负与积分变动、最佳球员、进步最多者、本场总得分及所有比赛比分。点击分享可复制文字战报。", legend_form_dots_title: "📈 近况指示", legend_form_dots_desc: "在任何比赛模式选择球员时，下拉菜单下方显示最近 3 场比赛的 W/L 标记（绿/红），让你在开始前看出谁状态火热、谁处于低潮。", legend_profile_sec: "👤 个人资料功能", legend_goal_title: "🎯 个人目标", legend_goal_desc: "在自己的个人资料页面按赛制设定目标积分（例如 4.000），进度条追踪从起始积分到目标的进展，达成时变为金色。仅本人与管理员可见。", legend_volatility_title: "📉 积分波动率", legend_volatility_desc: "衡量每场比赛后积分的波动幅度（每场变动的标准差）。稳定 <0.02，有起伏 0.02–0.05，波动大 >0.05。数值越低表示表现越稳定。", legend_pt_win_pct_title: "🎯 得分胜率", legend_pt_win_pct_desc2: "本队得分占所有比赛总得分的比例，分别追踪整体、双打、单打。50% 代表势均力敌；精英休闲球员通常介于 54–58%。", legend_partner_matrix_title: "🤝 搭档胜率矩阵", legend_partner_matrix_desc: "位于群组统计页面。以颜色标示的表格显示你与每位潜在搭档的双打胜率（至少合作 1 场）。🟢 ≥60%、🟡 45–59%、🔴 <45%。", legend_match_modes_sec: "🎮 比赛模式", legend_mode_custom_title: "自定义比赛", legend_mode_custom_desc: "手动记录任何单打或双打比赛，选择球员、逐局输入比分，并可添加场地与备注。", legend_mode_session_title: "球局（循环赛）", legend_mode_session_desc: "四人循环赛：每对搭档组合与其他组合各赛一场（共 3 场）。三场全部记录后一起更新积分。", legend_mode_kotc_title: "球场之王", legend_mode_kotc_desc: "胜者留场，败者换场轮替。追踪每位球员在整个球局中的累计胜场数。", legend_mode_tourney_title: "锦标赛", legend_mode_tourney_desc: "适合较大规模群组的单淘汰制赛事，依当前双打积分设定种子序位。", goal_sec: "🎯 个人目标", goal_set_target: "设定目标积分", goal_format_lbl: "赛制", goal_target_lbl: "目标积分", goal_save: "设定目标", goal_clear: "清除目标", goal_progress: "目标达成进度", goal_reached: "🏆 目标达成！", goal_away: "差距", volatility_sec: "📉 积分波动率", volatility_low: "稳定", volatility_med: "有起伏", volatility_high: "波动较大", volatility_desc: "每场比赛后积分的波动幅度。数值越低代表表现越稳定。", rematch_badge: "🔁 重赛", rematch_count: "今日 {n} 场重赛", legend_conf_icon_title: "📊 积分可信度", legend_conf_icon_desc: "反映积分的可信程度。🟢 ≥75% 可信、🟡 45–74% 发展中、🔴 <45% 需要更多比赛。若超过 90 天未出赛，可信度将自动下降。", motd_sec: "⚡ 今日最佳比赛", motd_upset: "爆冷门警报", motd_tight: "激烈角逐", motd_no_recent: "近期无比赛纪录。", motd_beat: "击败", motd_score: "比分", potm_sec: "📅 本月最佳球员", potm_desc: "近 30 天内积分涨幅最大的球员", potm_no_data: "近期活跃度不足。", potm_gain: "积分增益", form_lbl: "近况", team_suggester_sec: "🤝 最佳队伍分配建议", team_suggester_desc: "根据当前双打积分计算最均衡的分组方式。", team_balance_label: "积分差距：", team_fairest: "最均衡", team_use_this: "使用此分组", session_summary_title: "🏆 球局结束！", session_summary_mvp: "最佳球员", session_summary_improved: "进步最多", session_summary_total_pts: "本场总得分", session_summary_results: "比赛结果", session_summary_share: "📤 分享战报", session_summary_close: "开始新球局", session_summary_rating_change: "积分变动", partner_matrix_sec: "🤝 双打搭档胜率矩阵", partner_matrix_desc: "与每位搭档的双打胜率（最少1场合作）。", partner_matrix_no_data: "双打比赛场次不足。", partner_matrix_games: "场次", partner_matrix_in_games: "局数", legend_rating_intro: "每位球员的积分介于 1.500 至 6.500 之间，与 DUPR 制度一致。积分徽章颜色代表球员所属等级，一目了然。", legend_step1_title: "步骤一 — 胜率预测", legend_step1_desc: "每场比赛前，系统会根据双方平均积分计算本队的预期胜率。击败积分较高的对手将获得大量积分；输给积分较低的对手则会损失较多。", legend_step2_title: "步骤二 — 得分差加权", legend_step2_desc: "比赛中的实际得分差（而非单纯胜负）会影响积分变动幅度。11-2 的大胜比 11-9 的险胜带来更大的积分变动，即使对阵的是同一组球员。", legend_step3_title: "步骤三 — 积分更新", legend_step3_actual: "actual（实际结果）= 胜利得 1，落败得 0。", legend_step3_expected: "expected（预期胜率）= 步骤一计算所得的胜率。", legend_step3_k: "基础 K 值 = {k}，控制每场比赛积分的移动速度。", legend_step4_title: "步骤四 — 新手加速期", legend_step4_desc: "新球员在前 {n} 场比赛的积分移动速度可达正常的 2 倍，之后逐渐回归正常 K 值。此设计帮助新球员快速收敛至真实技术水平。", legend_replay_title: "完整回放架构", legend_replay_desc: "每当比赛被修改或删除时，系统会从头依时间顺序重新计算所有比赛积分。这确保积分不会产生漂移——对旧比赛的修改会正确地影响后续所有比赛的积分。", legend_conf_intro: "可信度反映对球员当前积分的信赖程度，由两个因素决定：", conf_sample_desc: "随出赛场次增加而提升（趋近 {n} 场后逐渐饱和）。1 场 ≈ 10%，10 场 ≈ 63%，30 场 ≈ 95%。", conf_recency_desc: "若球员超过 {d} 天未出赛，可信度将开始下降——旧结果逐渐失去参考价值。最低不低于样本可信度的 70%。", legend_score_intro: "比分将依据真实匹克球规则进行验证。只有在比赛应当正式结束的那一刻，比分才算合法。", match_num_k: "第 {n} 场：K={k}", tier_elite_desc: "锦标赛级别选手。强力发球、稳定第三拍放短球、严守厨房区域。", tier_advanced_desc: "基本功扎实，在压力下仍能执行大多数球路，场上阅读能力佳。", tier_intermediate_desc: "稳定的对打能力，战术发展中，偶有非受迫性失误。", tier_recreational_desc: "学习选球时机，改善步法与落点控制。", tier_beginner_desc: "刚起步。专注于发球与接球的稳定性。", conf_sample_lbl: "样本数量", conf_recency_lbl: "近期活跃度", conf_high_desc: "高 — 积分可信", conf_medium_desc: "中 — 仍在发展", conf_low_desc: "低 — 需要更多比赛", score_legal: "✅ 合法", score_illegal: "❌ 不合法", score_rule_1: "先到11分且领先2分，正常结束", score_rule_2: "胶着局：超过11分后恰好领先2分", score_rule_3: "只领先1分 — 必须继续打胶着局", score_rule_4: "比赛应在11-2时结束，不可继续比到25分", first_to_lbl: "先得 {n} 分", legend_rating_tiers_sec: "积分等级与颜色", legend_how_calc_sec: "积分计算方式", legend_confidence_sec: "积分可信度 %", legend_score_rules_sec: "合法比分规则", legend_pt_win_pct_desc2: "本队得分占总分比例。50% 代表势均力敌；精英休闲球员通常介于 54–58%。", legend_provisional_boost: "暂定加速", legend_full_replay: "完整回放架构", multi_select_hint: "按住 Ctrl 或点击多个选项", event_restore_admin_only: "仅限管理员", trash_admin_only: "只有管理员可以永久清空垃圾桶。", stat_pt_win_pct: "🎯 得分率", pt_win_pct_sec: "🎯 得分胜率", pt_win_pct_desc: "本队得分占总分比例。50% 代表势均力敌；精英球员通常介于 54–58%。", conf_lbl: "可信度", conf_high: "高", conf_medium: "中", conf_low: "低"
  }
};

let currentLang = "en";
export function setLang(l) { currentLang = l; }
export function t(key) { return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS["en"]?.[key] || key; }

// ─── Rating Engine ────────────────────────────────────────────────────────────
export function calcExpected(rA, rB) { return 1 / (1 + Math.pow(10, (rB - rA) / 0.4)); }

// FIXED: was calcScoreMargin(gamesWonByTeam, gamesWonByOtherTeam) — for a typical
// single-game match that's always 1 vs 0, so margin was ALWAYS 1.0 no matter if the
// score was 11-9 or 11-0. Now computes margin from real points scored across every
// game in the match, relative to the team that won the match overall, so a nail-biter
// and a blowout actually produce different K-adjustments.
export function calcScoreMargin(games = [], winnerTeam = 0) {
  let winPts = 0, lossPts = 0;
  (games || []).forEach(g => {
    if (!g || isNaN(g.a) || isNaN(g.b)) return;
    if (winnerTeam === 0) { winPts += g.a; lossPts += g.b; }
    else { winPts += g.b; lossPts += g.a; }
  });
  const total = winPts + lossPts;
  return total === 0 ? 0.5 : winPts / total;
}

// NEW: ramps K_FACTOR up to PROVISIONAL_K_MULTIPLIER× for a player's first
// PROVISIONAL_MATCH_THRESHOLD matches (per discipline), then tapers linearly back
// down to the normal K_FACTOR. This is what the "Provisional" badge in the UI was
// always supposed to mean — previously every player moved at the same fixed rate
// regardless of how many matches they'd played.
export function dynamicKFactor(matchesPlayed = 0) {
  const played = Math.max(0, matchesPlayed);
  if (played >= PROVISIONAL_MATCH_THRESHOLD) return K_FACTOR;
  const t = played / PROVISIONAL_MATCH_THRESHOLD;
  return K_FACTOR * (PROVISIONAL_K_MULTIPLIER - t * (PROVISIONAL_K_MULTIPLIER - 1));
}

export function updateRating(current, expected, actual, margin, kFactor = K_FACTOR) {
  const kAdj = kFactor * (1 + (margin - 0.5));
  return Math.max(1.5, Math.min(6.5, current + kAdj * (actual - expected)));
}

// ─── Rating Confidence (DUPR-style reliability %) ─────────────────────────────
// Two components multiplied together:
//  1. Sample size: confidence rises with matches played, saturating (diminishing
//     returns) rather than capping hard — this mirrors how a real rating becomes
//     statistically trustworthy gradually, not at one magic match count.
//  2. Recency: a rating built on real matches but untouched for months is stale —
//     confidence decays the longer it's been since the player's last match in
//     that discipline, down to a floor (it never goes to 0 just from being idle).
export const CONFIDENCE_FULL_MATCHES = 30;       // matches played at which the sample-size component nears 100%
export const CONFIDENCE_RECENCY_WINDOW_DAYS = 90; // grace period before recency starts dragging confidence down
export const CONFIDENCE_RECENCY_FLOOR = 0.7;      // recency alone can't drag confidence below 70% of its matches-based value

export function ratingConfidence(matchesPlayed = 0, lastMatchDate = null, now = new Date()) {
  const played = Math.max(0, matchesPlayed);
  const sampleComponent = 1 - Math.exp((-3 * played) / CONFIDENCE_FULL_MATCHES);

  let recencyComponent = 1;
  if (lastMatchDate) {
    const daysSince = (now - new Date(lastMatchDate)) / 86400000;
    if (daysSince > CONFIDENCE_RECENCY_WINDOW_DAYS) {
      const decayProgress = Math.min(1, (daysSince - CONFIDENCE_RECENCY_WINDOW_DAYS) / CONFIDENCE_RECENCY_WINDOW_DAYS);
      recencyComponent = 1 - decayProgress * (1 - CONFIDENCE_RECENCY_FLOOR);
    }
  } else if (played > 0) {
    recencyComponent = CONFIDENCE_RECENCY_FLOOR;
  }

  return Math.round(Math.max(0, Math.min(1, sampleComponent * recencyComponent)) * 100);
}

// WIN_TO_OPTIONS: the standard point targets used in real pickleball play.
// 11 = standard rec/league game, 15 & 21 = common single-game/tournament formats.
export const WIN_TO_OPTIONS = [11, 15, 21];

// FIXED: the old version checked `high >= winTo && (high - low) >= winBy` — both
// conditions independently. That meant 25-2 passed (25>=11 true, 23>=2 true), even
// though the game would have legally ended the moment the score hit 11-2. A score
// is only legal if it's the EXACT point the game would have stopped:
//   - high === winTo and the lead is at least winBy (won outright, no deuce needed), or
//   - high > winTo and the lead is exactly winBy (deuce situation — the instant the
//     lead reaches winBy is when play stops, so a bigger lead at a higher score is impossible)
export function validatePickleballScore(s1, s2, winTo = 11, winBy = 2) {
  if (s1 == null || s2 == null || isNaN(s1) || isNaN(s2)) return null;
  const high = Math.max(s1, s2);
  const low = Math.min(s1, s2);
  if (high === low) return null;
  const diff = high - low;

  const legal = (high === winTo && diff >= winBy) || (high > winTo && diff === winBy);
  if (legal) {
    return { winner: s1 > s2 ? 0 : 1 };
  }
  return null; 
}

export function replayAllMatches(players = [], matches = []) {
  const ratingMap = { singles: {}, doubles: {} };
  const historyMap = { singles: {}, doubles: {} };
  
  players.forEach(p => {
      const base = p.baseRating ?? DEFAULT_RATING;
      ratingMap.singles[p.id] = p.ratingSingles ?? base;
      ratingMap.doubles[p.id] = p.ratingDoubles ?? base;
      historyMap.singles[p.id] = p.ratingHistorySingles ?? [{ rating: base, date: p.joinedDate || new Date().toISOString() }];
      historyMap.doubles[p.id] = p.ratingHistoryDoubles ?? [{ rating: base, date: p.joinedDate || new Date().toISOString() }];
    });
    
  const orderedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  orderedMatches.forEach(match => {
    const isSingles = match.type === "singles";
    const currentPool = isSingles ? ratingMap.singles : ratingMap.doubles;
    const historyPool = isSingles ? historyMap.singles : historyMap.doubles;
    
    const t1ids = match.teams?.[0] || [], t2ids = match.teams?.[1] || [], allIds = [...t1ids, ...t2ids];
    
    match.ratingSnaps = {};
    allIds.forEach(id => { match.ratingSnaps[id] = currentPool[id] ?? DEFAULT_RATING; });
    
    const avg = ids => ids.reduce((s, id) => s + (currentPool[id] ?? DEFAULT_RATING), 0) / Math.max(1, ids.length);
    const rA = avg(t1ids), rB = avg(t2ids);
    const exp0 = calcExpected(rA, rB);
    const act0 = match.winnerTeam === 0 ? 1 : 0;
    const margin = calcScoreMargin(match.games, match.winnerTeam);
    
    const deltas = {}, kFactors = {};
    allIds.forEach(id => {
      const isT1 = t1ids.includes(id);
      const exp = isT1 ? exp0 : 1 - exp0;
      const act = isT1 ? act0 : 1 - act0;
      const old = currentPool[id] ?? DEFAULT_RATING;
      const matchesSoFar = (historyPool[id]?.length || 1) - 1; // matches in THIS discipline before this one
      const kF = dynamicKFactor(matchesSoFar);
      const nr = updateRating(old, exp, act, margin, kF);
      
      deltas[id] = nr - old;
      kFactors[id] = kF;
      currentPool[id] = nr;
      
      if (!historyPool[id]) historyPool[id] = [];
      historyPool[id].push({ rating: nr, date: match.date });
    });
    
    match.ratingDeltas = deltas;
    match.kFactors = kFactors;
    match.marginUsed = margin;
  });
  
  const derivedPlayers = players.map(p => ({
    ...p,
    ratingSingles: ratingMap.singles[p.id] ?? DEFAULT_RATING,
    ratingDoubles: ratingMap.doubles[p.id] ?? DEFAULT_RATING,
    ratingHistorySingles: historyMap.singles[p.id],
    ratingHistoryDoubles: historyMap.doubles[p.id],
  }));
  
  return { derivedPlayers, derivedMatches: orderedMatches };
}

export function computeStats(players = [], matches = []) {
  return players.map(p => {
    const my = matches.filter(m => m.teams?.flat().includes(p.id));
    const mySingles = my.filter(m => m.type === "singles");
    const myDoubles = my.filter(m => m.type === "doubles");

    const getRecord = (arr) => {
       const w = arr.filter(m => m.teams[m.winnerTeam]?.includes(p.id)).length;
       return { played: arr.length, wins: w, losses: arr.length - w };
    };

    const overall = getRecord(my);
    const singles = getRecord(mySingles);
    const doubles = getRecord(myDoubles);
    
    let streak = 0, streakType = null;
    for (let i = my.length-1; i >= 0; i--) {
      const m = my[i], won = m.teams[m.winnerTeam]?.includes(p.id);
      if (streakType === null) streakType = won ? "W" : "L";
      if ((won && streakType==="W") || (!won && streakType==="L")) streak++; else break;
    }

    let longestWinStreak = 0, tempWStreak = 0;
    my.forEach(m => {
      const won = m.teams[m.winnerTeam]?.includes(p.id);
      if (won) { tempWStreak++; if (tempWStreak > longestWinStreak) longestWinStreak = tempWStreak; } 
      else { tempWStreak = 0; }
    });
    
    let bestWinDelta = 0, bestWinMatch = null;
    const teammateStats = {}, opponentStats = {}; 

    my.forEach(m => {
      const isWin = m.teams[m.winnerTeam]?.includes(p.id);
      const myTeam = m.teams[0]?.includes(p.id) ? m.teams[0] : m.teams[1];
      const oppTeam = m.teams[0]?.includes(p.id) ? m.teams[1] : m.teams[0];
      const myTeamIndex = m.teams[0]?.includes(p.id) ? 0 : 1;

      let gW = 0, gL = 0;
      m.games?.forEach(g => { if(g.winner === myTeamIndex) gW++; else gL++; });

      myTeam?.forEach(tid => {
        if (tid !== p.id) {
          if(!teammateStats[tid]) teammateStats[tid] = {mW:0, mL:0, gW:0, gL:0};
          if(isWin) teammateStats[tid].mW++; else teammateStats[tid].mL++;
          teammateStats[tid].gW += gW; teammateStats[tid].gL += gL;
        }
      });

      oppTeam?.forEach(oid => {
        if(!opponentStats[oid]) opponentStats[oid] = {mW:0, mL:0, gW:0, gL:0};
        if(isWin) opponentStats[oid].mW++; else opponentStats[oid].mL++;
        opponentStats[oid].gW += gW; opponentStats[oid].gL += gL;
      });
      
      if (isWin) {
        oppTeam?.forEach(oid => {
          const snap = m.ratingSnaps?.[oid], mine = m.ratingSnaps?.[p.id];
          if (snap && mine && snap-mine > bestWinDelta) { bestWinDelta = snap-mine; bestWinMatch = m; }
        });
      }
    });

    let bestPartner = null, bestPartnerWinPct = -1, bestPartnerMatches = 0, bestPartnerRecord = "", bestPartnerGamePct = -1;
    let worstPartner = null, worstPartnerWinPct = 2, worstPartnerMatches = 0, worstPartnerRecord = "", worstPartnerGamePct = 2;
    for (const [tid, stats] of Object.entries(teammateStats)) {
      const total = stats.mW + stats.mL, pct = stats.mW / total, gamePct = stats.gW / ((stats.gW + stats.gL) || 1);
      if (total >= 2) {
        if (pct > bestPartnerWinPct || (pct === bestPartnerWinPct && gamePct > bestPartnerGamePct)) {
          bestPartnerWinPct = pct; bestPartnerMatches = total; bestPartner = tid; bestPartnerGamePct = gamePct; bestPartnerRecord = `${stats.mW}W - ${stats.mL}L`;
        }
        if (pct < worstPartnerWinPct || (pct === worstPartnerWinPct && gamePct < worstPartnerGamePct)) {
          worstPartnerWinPct = pct; worstPartnerMatches = total; worstPartner = tid; worstPartnerGamePct = gamePct; worstPartnerRecord = `${stats.mW}W - ${stats.mL}L`;
        }
      }
    }

    let nemesis = null, nemesisWinPct = 2, nemesisMatches = 0, nemesisRecord = "", nemesisGamePct = 2;
    let easyTarget = null, easyTargetWinPct = -1, easyTargetMatches = 0, easyTargetRecord = "", easyTargetGamePct = -1;
    for (const [oid, stats] of Object.entries(opponentStats)) {
      const total = stats.mW + stats.mL, pct = stats.mW / total, gamePct = stats.gW / ((stats.gW + stats.gL) || 1);
      if (total >= 2) {
        if (pct < nemesisWinPct || (pct === nemesisWinPct && gamePct < nemesisGamePct)) {
           nemesisWinPct = pct; nemesisMatches = total; nemesis = oid; nemesisGamePct = gamePct; nemesisRecord = `${stats.mW}W - ${stats.mL}L`;
        }
        if (pct > easyTargetWinPct || (pct === easyTargetWinPct && gamePct > easyTargetGamePct)) {
           easyTargetWinPct = pct; easyTargetMatches = total; easyTarget = oid; easyTargetGamePct = gamePct; easyTargetRecord = `${stats.mW}W - ${stats.mL}L`;
        }
      }
    }

    // ─── Point Win % ──────────────────────────────────────────────────────────
    // Total points scored by this player's team vs total points in all their matches
    let totalPtsFor = 0, totalPtsAgainst = 0;
    let singlesPtsFor = 0, singlesPtsAgainst = 0;
    let doublesPtsFor = 0, doublesPtsAgainst = 0;

    my.forEach(m => {
      const myTeamIdx = m.teams?.[0]?.includes(p.id) ? 0 : 1;
      const oppTeamIdx = myTeamIdx === 0 ? 1 : 0;
      (m.games || []).forEach(g => {
        if (isNaN(g.a) || isNaN(g.b)) return;
        const myPts  = myTeamIdx === 0 ? g.a : g.b;
        const oppPts = myTeamIdx === 0 ? g.b : g.a;
        totalPtsFor     += myPts;  totalPtsAgainst += oppPts;
        if (m.type === "singles") { singlesPtsFor += myPts; singlesPtsAgainst += oppPts; }
        else                      { doublesPtsFor += myPts; doublesPtsAgainst += oppPts; }
      });
    });

    const ptWinPct    = (totalPtsFor + totalPtsAgainst) > 0 ? Math.round(totalPtsFor / (totalPtsFor + totalPtsAgainst) * 1000) / 10 : null;
    const singlesPtWinPct = (singlesPtsFor + singlesPtsAgainst) > 0 ? Math.round(singlesPtsFor / (singlesPtsFor + singlesPtsAgainst) * 1000) / 10 : null;
    const doublesPtWinPct = (doublesPtsFor + doublesPtsAgainst) > 0 ? Math.round(doublesPtsFor / (doublesPtsFor + doublesPtsAgainst) * 1000) / 10 : null;

    // ─── Rating Confidence ────────────────────────────────────────────────────
    const lastSinglesDate = mySingles.length ? mySingles[mySingles.length - 1]?.date : null;
    const lastDoublesDate = myDoubles.length ? myDoubles[myDoubles.length - 1]?.date : null;
    const singlesConfidence = ratingConfidence(singles.played, lastSinglesDate);
    const doublesConfidence = ratingConfidence(doubles.played, lastDoublesDate);
    const overallConfidence = ratingConfidence(overall.played, my.length ? my[my.length-1]?.date : null);

    return { ...p, 
      gamesPlayed: overall.played || 0, wins: overall.wins || 0, losses: overall.losses || 0, winPct: overall.played ? Math.round((overall.wins/overall.played)*100) : null,
      singlesPlayed: singles.played || 0, singlesWins: singles.wins || 0, singlesLosses: singles.losses || 0,
      doublesPlayed: doubles.played || 0, doublesWins: doubles.wins || 0, doublesLosses: doubles.losses || 0,
      ptWinPct, singlesPtWinPct, doublesPtWinPct,
      singlesConfidence, doublesConfidence, overallConfidence,
      streak: streak || 0, streakType: streakType || null, longestWinStreak: longestWinStreak || 0, 
      bestWinDelta: bestWinDelta || 0, bestWinMatch: bestWinMatch || null,
      bestPartner, bestPartnerWinPct, bestPartnerRecord, worstPartner, worstPartnerWinPct, worstPartnerRecord,
      nemesis, nemesisWinPct, nemesisRecord, easyTarget, easyTargetWinPct, easyTargetRecord
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function genId() { return Math.random().toString(36).slice(2, 10); }
export function ratingColor(r) {
  if (r >= 5.5) return "#f0c040"; if (r >= 4.5) return "#e06030";
  if (r >= 3.5) return "#40a0e0"; if (r >= 2.5) return "#50c878"; return "#888";
}
export function ratingLabel(r) {
  if (r >= 5.5) return "rating_elite"; if (r >= 4.5) return "rating_advanced";
  if (r >= 3.5) return "rating_intermediate"; if (r >= 2.5) return "rating_recreational"; 
  return "rating_beginner";
}
export function avatarColor(name) {
  if (!name) return "#888";
  const colors = ["#e05050","#e09040","#e0c040","#50c878","#40a0e0","#8060e0","#e060a0","#40c0c0"];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? (parts[0][0]+parts[parts.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}
export function fmtDate(iso) { return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
export function fmtDelta(d) { return { text: d >= 0 ? `+${d.toFixed(3)}` : (d || 0).toFixed(3), color: d > 0 ? "#50c878" : d < 0 ? "#e05050" : "#888" }; }
export function isoToDatetimeLocal(iso) {
  const d = new Date(iso); const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sortOptionsAlpha(opts, favoredIds = []) {
  if (!opts) return [];
  return [...opts].sort((a,b) => {
     const favA = favoredIds.includes(a.value);
     const favB = favoredIds.includes(b.value);
     if (favA && !favB) return -1;
     if (!favA && favB) return 1;
     return (a.label || "").localeCompare(b.label || "");
  });
}

export function processImage(file, callback, maxDim = 120) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } } else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ─── Shared Database State ────────────────────────────────────────────────────
const DB_DOC_ID = "main_group"; 

export function blankState() {
  return {
    players: [],
    matches: [],
    savedGroups: [],
    trash: [], 
    presence: {},
    activeView: "dashboard",
    logoText: "LS",
    logoData: null,
    adminPass: "1234",
    leaderboardFormat: "doubles"
  };
}

// THE FIX: Filters out user-specific local settings before saving to Cloud
const getSharedState = (state) => {
  const { 
    isAdmin, langId, modeId, accentId, fontId, zoomLevel,
    favoredPlayerIds, // per-user star list — never synced to Firebase
    ...sharedData 
  } = state;
  return sharedData;
};

export async function saveState(state) {
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    
    // Only save the shared data, never the local user settings
    const sharedOnly = getSharedState(state);
    const safeState = { ...sharedOnly };
    
    // Firestore rejects nested arrays (e.g. teams: [[id1,id2],[id3,id4]]).
    // Serialize both matches AND trash as JSON strings to avoid this.
    if (Array.isArray(safeState.matches)) {
      safeState.matches = JSON.stringify(safeState.matches);
    }
    if (Array.isArray(safeState.trash)) {
      safeState.trash = JSON.stringify(safeState.trash);
    }
    
    await setDoc(docRef, safeState, { merge: true });
  } catch (e) {
    console.error("Error saving to cloud:", e);
  }
}

export async function loadState() {
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.matches === "string") {
        data.matches = JSON.parse(data.matches);
      }
      if (typeof data.trash === "string") {
        data.trash = JSON.parse(data.trash);
      }
      return data;
    }
    return blankState(); 
  } catch (e) {
    console.error("Error loading from cloud:", e);
    return blankState();
  }
}

export function patchPlayerRatings(players) {
  return players.map(p => ({
    ...p,
    ratingSingles: p.ratingSingles ?? p.baseRating ?? DEFAULT_RATING,
    ratingDoubles: p.ratingDoubles ?? p.baseRating ?? DEFAULT_RATING,
    ratingHistorySingles: p.ratingHistorySingles ?? [{ rating: p.baseRating ?? DEFAULT_RATING, date: p.joinedDate || new Date().toISOString() }],
    ratingHistoryDoubles: p.ratingHistoryDoubles ?? [{ rating: p.baseRating ?? DEFAULT_RATING, date: p.joinedDate || new Date().toISOString() }]
  }));
}

export async function pingPresence(playerId) {
  if (!playerId) return;
  try {
    const docRef = doc(db, "picklerank", "main_group");
    // This safely updates ONLY the specific player's timestamp
    await updateDoc(docRef, { [`presence.${playerId}`]: Date.now() });
  } catch (e) {
    // Fails silently if offline
  }
}

// Called when a user logs OUT or switches to a different player —
// sets their timestamp to 0 so the green dot disappears immediately for everyone.
export async function clearPresence(playerId) {
  if (!playerId) return;
  try {
    const docRef = doc(db, "picklerank", "main_group");
    await updateDoc(docRef, { [`presence.${playerId}`]: 0 });
  } catch (e) {
    // Fails silently if offline
  }
}
// ─── Feature: Balanced Team Suggester ─────────────────────────────────────────
// Given 4 player IDs + a rating map, returns all 3 possible pairings sorted
// by fairness (smallest avg-rating gap = most balanced first).
export function suggestBalancedTeams(ids, ratingMap) {
  if (ids.length !== 4) return [];
  const r = id => ratingMap[id] ?? DEFAULT_RATING;
  const pairings = [
    { t1: [ids[0], ids[1]], t2: [ids[2], ids[3]] },
    { t1: [ids[0], ids[2]], t2: [ids[1], ids[3]] },
    { t1: [ids[0], ids[3]], t2: [ids[1], ids[2]] },
  ].map(p => {
    const avg1 = (r(p.t1[0]) + r(p.t1[1])) / 2;
    const avg2 = (r(p.t2[0]) + r(p.t2[1])) / 2;
    return { ...p, avg1, avg2, gap: Math.abs(avg1 - avg2) };
  });
  return pairings.sort((a, b) => a.gap - b.gap);
}

// ─── Feature: Partner Matrix ──────────────────────────────────────────────────
// For every pair of players who have been on the same doubles team, computes
// their combined W/L record as partners.
// Returns: { "idA|idB": { wins, total, pct } } (key is always sorted low→high)
export function computePartnerMatrix(matches) {
  const stats = {};
  const key = (a, b) => [a, b].sort().join('|');

  (matches || []).filter(m => m.type === 'doubles' && m.teams?.length === 2).forEach(m => {
    m.teams.forEach((team, ti) => {
      if (!team || team.length < 2) return;
      const matchWon = m.winnerTeam === ti;

      // Count games won/lost for this team within this match.
      // g.a = team-0 score, g.b = team-1 score — so use ti to read the right side.
      let gamesWon = 0, gamesLost = 0;
      (m.games || []).forEach(g => {
        if (isNaN(g.a) || isNaN(g.b)) return;
        const thisTeamScore = ti === 0 ? g.a : g.b;
        const oppTeamScore  = ti === 0 ? g.b : g.a;
        if (thisTeamScore > oppTeamScore) gamesWon++;
        else if (oppTeamScore > thisTeamScore) gamesLost++;
        // equal scores ignored (shouldn't happen with validated scores)
      });

      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const k = key(team[i], team[j]);
          if (!stats[k]) stats[k] = { wins: 0, total: 0, gamesWon: 0, gamesLost: 0 };
          stats[k].total++;
          if (matchWon) stats[k].wins++;
          stats[k].gamesWon  += gamesWon;
          stats[k].gamesLost += gamesLost;
        }
      }
    });
  });

  // Compute derived percentages
  Object.values(stats).forEach(s => {
    s.pct     = s.total > 0               ? Math.round(s.wins / s.total * 100) : null;
    s.gamePct = (s.gamesWon + s.gamesLost) > 0
      ? Math.round(s.gamesWon / (s.gamesWon + s.gamesLost) * 100)
      : null;
  });

  return stats;
}

// ─── Feature: Session Summary ─────────────────────────────────────────────────
// Given 3 just-logged matches and the full post-session derived players array,
// computes a rich summary for the recap card.
export function computeSessionSummary(sessionMatches, preMatchPlayers, postMatchPlayers) {
  const getName = id => postMatchPlayers.find(p => p.id === id)?.name ?? '?';
  const getPost = id => postMatchPlayers.find(p => p.id === id);
  const getPre  = id => preMatchPlayers.find(p => p.id === id);
  const allIds  = [...new Set(sessionMatches.flatMap(m => m.teams.flat()))];

  // Per-player session W/L and rating delta
  const playerStats = allIds.map(id => {
    const wins   = sessionMatches.filter(m => m.teams[m.winnerTeam].includes(id)).length;
    const losses = sessionMatches.filter(m => m.teams[m.winnerTeam === 0 ? 1 : 0].includes(id)).length;
    const preRating  = getPre(id)?.ratingDoubles  ?? DEFAULT_RATING;
    const postRating = getPost(id)?.ratingDoubles ?? DEFAULT_RATING;
    const delta = postRating - preRating;
    return { id, name: getName(id), wins, losses, preRating, postRating, delta };
  });

  // MVP = most wins; tiebreak = most rating gain
  const mvp = [...playerStats].sort((a, b) => b.wins - a.wins || b.delta - a.delta)[0];

  // Most improved = biggest positive delta
  const mostImproved = [...playerStats].sort((a, b) => b.delta - a.delta)[0];

  // Total points played
  const totalPts = sessionMatches.reduce((s, m) => {
    return s + (m.games || []).reduce((gs, g) => gs + (g.a || 0) + (g.b || 0), 0);
  }, 0);

  // Scores per match
  const matchSummaries = sessionMatches.map(m => {
    const t1 = m.teams[0].map(getName).join(' & ');
    const t2 = m.teams[1].map(getName).join(' & ');
    const score = (m.games || []).map(g => `${g.a}–${g.b}`).join(', ');
    const winnerLabel = m.teams[m.winnerTeam].map(getName).join(' & ');
    return { t1, t2, score, winnerLabel, winnerTeam: m.winnerTeam };
  });

  return { playerStats, mvp, mostImproved, totalPts, matchSummaries };
}

// ─── Feature: Match of the Day ────────────────────────────────────────────────
// Finds the single most interesting match from the last 24h (or last session).
// Scores each match on: upset factor + score tightness + rating swing magnitude.
export function computeMatchOfDay(matches, players, windowHours = 48) {
  if (!matches?.length) return null;
  const cutoff = Date.now() - windowHours * 3600000;
  const recent = matches.filter(m => m.date && new Date(m.date).getTime() > cutoff);
  const pool = recent.length > 0 ? recent : matches.slice(-5); // fallback to last 5

  const getName = id => players.find(p => p.id === id)?.name ?? '?';
  let best = null, bestScore = -1;

  pool.forEach(m => {
    if (!m.teams || !m.ratingSnaps || !m.ratingDeltas) return;
    const wTeam = m.teams[m.winnerTeam] || [];
    const lTeam = m.teams[m.winnerTeam === 0 ? 1 : 0] || [];
    const winAvg = wTeam.reduce((s, id) => s + (m.ratingSnaps[id] ?? 3), 0) / Math.max(1, wTeam.length);
    const loseAvg = lTeam.reduce((s, id) => s + (m.ratingSnaps[id] ?? 3), 0) / Math.max(1, lTeam.length);
    const upsetFactor = Math.max(0, loseAvg - winAvg); // positive = underdog won

    // Tightness: total points scored / max possible points (higher = tighter game)
    const totalPts = (m.games || []).reduce((s, g) => s + (g.a || 0) + (g.b || 0), 0);
    const maxPts = (m.games || []).reduce((s, g) => s + Math.max(g.a || 0, g.b || 0) * 2, 0);
    const tightness = maxPts > 0 ? totalPts / maxPts : 0;

    // Max rating swing among all players
    const maxSwing = Object.values(m.ratingDeltas || {}).reduce((s, d) => Math.max(s, Math.abs(d)), 0);

    const interestScore = upsetFactor * 3 + tightness * 1.5 + maxSwing * 2;
    if (interestScore > bestScore) {
      bestScore = interestScore;
      best = { match: m, upsetFactor, tightness, maxSwing, winTeam: wTeam.map(getName), loseTeam: lTeam.map(getName) };
    }
  });
  return best;
}

// ─── Feature: Player of the Month ────────────────────────────────────────────
// Returns top gainers over the last 30 days, sorted by rating gain (doubles).
export function computePlayerOfMonth(players, matches, days = 30) {
  const cutoff = Date.now() - days * 86400000;
  const recentMatches = matches.filter(m => m.date && new Date(m.date).getTime() > cutoff);
  if (!recentMatches.length) return [];

  return players.map(p => {
    // Find earliest rating snapshot in the window for this player
    const playerRecent = recentMatches.filter(m => m.teams?.flat().includes(p.id));
    if (!playerRecent.length) return null;
    const earliest = playerRecent[0];
    const startRating = earliest.ratingSnaps?.[p.id] ?? p.ratingDoubles ?? 3;
    const endRating = p.ratingDoubles ?? 3;
    const gain = endRating - startRating;
    const wins = playerRecent.filter(m => m.teams[m.winnerTeam].includes(p.id)).length;
    return { id: p.id, name: p.name, gain, wins, played: playerRecent.length, endRating };
  }).filter(Boolean).filter(p => p.played > 0).sort((a, b) => b.gain - a.gain).slice(0, 5);
}

// ─── Feature: Form Indicator ──────────────────────────────────────────────────
// Returns a player's last N match results as an array of 'W' | 'L'.
export function getRecentForm(playerId, matches, n = 3) {
  const mine = [...(matches || [])]
    .filter(m => m.teams?.flat().includes(playerId))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-n);
  return mine.map(m => m.teams[m.winnerTeam].includes(playerId) ? 'W' : 'L');
}

// ─── Feature: Rating Volatility ───────────────────────────────────────────────
// Measures how much a player's rating swings match-to-match (std deviation).
// High = inconsistent results, Low = steady player.
export function computeVolatility(ratingHistory = []) {
  const ratings = (ratingHistory || []).map(h => h.rating).filter(r => !isNaN(r));
  if (ratings.length < 3) return null;
  const deltas = ratings.slice(1).map((r, i) => r - ratings[i]);
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const variance = deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length;
  return Math.sqrt(variance);
}

// ─── Feature: Rematch Detector ────────────────────────────────────────────────
// Groups matches by the sorted set of all 4 player IDs on the same day.
// Returns groups where the same 4 players played more than once.
export function detectRematches(matches) {
  const groups = {};
  (matches || []).forEach(m => {
    const allIds = m.teams?.flat().sort().join('|');
    if (!allIds) return;
    const day = m.date ? m.date.slice(0, 10) : 'unknown';
    const key = `${allIds}::${day}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  return Object.values(groups).filter(g => g.length > 1);
}

// ─── Feature: Personal Goal ───────────────────────────────────────────────────
// Goals are stored in user.goals[playerId] = { targetRating, format }
// This helper reads/writes goals from the user settings object.
export function getPlayerGoal(user, playerId) {
  return (user?.goals || {})[playerId] || null;
}
export function setPlayerGoal(setUser, playerId, goal) {
  setUser(prev => ({
    ...prev,
    goals: { ...(prev.goals || {}), [playerId]: goal }
  }));
}
