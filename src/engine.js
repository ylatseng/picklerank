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
export const APP_VERSION = "2.2.49";
export const APP_UPDATED = "2026-06-28";

export const RELEASES = [
  {
    version: "2.2.49",
    date: "2026-06-28",
    title: "Offline Mode Full Audit — 4 Issues Fixed",
    changes: [
      "🐛 FIX: React anti-pattern — saveState() was called inside setState() updater function. React can call updaters multiple times (especially in StrictMode), causing duplicate Firestore writes. Fixed with pendingSaveRef pattern: setState() queues the next state into a ref, and a useEffect() (running after every render) performs the actual saveState() call outside the render cycle.",
      "🐛 FIX: pingPresence() was called every 60 seconds regardless of online status, causing silent Firestore errors while offline. Now guarded with 'if (!navigator.onLine) return' so presence writes are skipped when offline.",
      "🐛 FIX: Settings CSV/JSON import (importData) called setDoc() directly, bypassing setShared() and the offline cache. If triggered offline, it would fail silently with no feedback. Now shows 'Import requires an internet connection' error and returns early when offline.",
      "🛡️ FIX: Cache version mismatch no longer discards all cached data. Previously returning null on version mismatch meant any schema change wiped offline users' local data. Now merges old cached data with blankState() defaults, preserving players/matches/events while filling in any new fields with sensible defaults.",
    ]
  },
  {
    version: "2.2.48",
    date: "2026-06-28",
    title: "Offline Sync Fix — Data Now Reaches Other Users on Reconnect",
    changes: [
      "🐛 FIX: Offline data not syncing to Firestore on reconnect (other users couldn't see new players/events/matches). Root cause: stale closure bug in goOnline(). The function was defined inside a useEffect([]) with an empty deps array — it captured hasOfflineChanges at mount time (always false). So the guard condition '!hasOfflineChanges && no pending matches' always evaluated with the initial false value, and the sync was skipped entirely even when there was data to push. Fix: (1) Added hasOfflineChangesRef that stays in sync with the state via a useEffect, so goOnline() reads the current value via the ref instead of the stale closure. (2) For saveState(), instead of reading the stale closure state or the localStorage cache, we now call setState(currentState => { saveState(currentState); return currentState; }) which gives us the actual current React state without a re-render.",
    ]
  },
  {
    version: "2.2.47",
    date: "2026-06-28",
    title: "Offline Mode: Full Data Persistence, Accurate Messages & Dismissible Banner",
    changes: [
      "🐛 FIX: Offline data (players, events, settings) lost when app closed and reopened. Root cause: saveState() called writeCache() AFTER the async setDoc() call. If the app closed before setDoc() failed (which can take seconds on a hung network), writeCache() never ran. Fixed: writeCache() now runs SYNCHRONOUSLY as the very first line of saveState(), before any network call. Data is always safe in localStorage before any async work begins.",
      "🐛 FIX: Offline banner only said '2 pending sync' even though players and events were also created offline. The match-specific counter has been replaced with a simple 'hasOfflineChanges' flag that becomes true whenever ANY setShared() call happens while offline — matches, players, events, settings, anything.",
      "🐛 FIX: On reconnect, only matches were synced to Firestore — new players and events stayed local. goOnline() now also pushes the full cached state (players, events, everything) to Firestore after syncing the match queue.",
      "✅ NEW: Offline banner is now dismissible. Tap ✕ on the right side to hide it. It reappears automatically the next time the device goes offline. Banner shows different messages: 'Offline — app works, data syncs when reconnected' (no changes) vs 'Offline — changes saved locally, will sync on reconnect' (after any data entry).",
    ]
  },
  {
    version: "2.2.46",
    date: "2026-06-28",
    title: "Offline Sync Fixes + 65 TW Translation Corrections",
    changes: [
      "🐛 FIX: Pending sync count showed double the actual matches (4 instead of 2). Root cause: queueMatchOffline() was not checking if a match ID was already in the queue before appending. setShared() can be called multiple times during one log operation. Fixed: now reads the current pending queue and filters out already-queued IDs before appending.",
      "🐛 FIX: Matches wiped after coming back online. Root cause: after syncPendingMatches(), the code called loadState() from Firestore and overwrote React state. Race condition: Firestore write is async and the subsequent read returned stale data (without the new matches). Fixed: no longer reload from Firestore after sync. Local React state is already correct. syncPendingMatches() now also updates the localStorage cache with the merged data, so manual page refresh also shows correct state.",
      "🌐 FIX: 65 Traditional Chinese (TW) translation values had Simplified Chinese characters mixed in from the v2.2.40 batch insertion. Affected keys include history, dashboard_sub, session_title, log, stats, settings, save, base_rating, and 57 more. All converted back to proper Traditional Chinese (場/賽/錄/歷/積/紀/記/統/計/設/儲/選).",
      "🌐 FIX: Missing 'profile' translation key added to all 3 languages (used in Navigation header when viewing a player profile). EN: 'Player Profile', TW: '球員個人檔案', CN: '球员个人资料'.",
    ]
  },
  {
    version: "2.2.45",
    date: "2026-06-28",
    title: "Instant Load, Offline Polish & Quick Log Scroll Fix",
    changes: [
      "⚡ FIX: Loading slowdown caused by 8-second Firestore timeout introduced in v2.2.44. New approach: on initial load, the localStorage cache is read synchronously (instant) and shown immediately — users see their data in <100ms. Firestore then loads in the background and silently updates state when it arrives. First-time users (no cache) still wait for Firestore normally.",
      "🐛 FIX: Quick Log Custom mode now scrolls to top of the modal after logging a match, so the ✅ confirmation banner and Team selector are visible immediately. Session mode already did this; Custom mode now matches.",
    ]
  },
  {
    version: "2.2.44",
    date: "2026-06-28",
    title: "Offline Mode Revamp — Full App Access While Offline",
    changes: [
      "📶 OFFLINE REVAMP: The app now works fully offline. Previously it showed a loading spinner indefinitely, or loaded blank state, when Firestore was unreachable. Now: (1) loadState() races Firestore against an 8-second timeout — if Firestore wins, state is mirrored to localStorage cache; if timeout/offline, the localStorage cache is used immediately. Users see their last-known data instantly.",
      "📶 WRITE-AHEAD QUEUE: New matches logged while offline are saved to localStorage key 'pr_pending_matches' in addition to the local state cache. The full app — Custom match, Session, KOTC, Quick Log — all work normally offline. Ratings update locally using the replay engine.",
      "📶 AUTO-SYNC ON RECONNECT: When the device comes back online, the app drains the pending queue: reads it from localStorage, deduplicates against the Firestore document (by match ID), merges in chronological order by date, writes to Firestore, and reloads the authoritative state. The queue is cleared only after a confirmed successful write.",
      "📶 OFFLINE BANNER UPGRADED: Now shows '📶 Offline — you can still log matches. They'll sync when reconnected.' with a badge showing the count of pending unsynced matches (e.g. '3 pending sync'). When connectivity is restored, a green banner briefly shows 'Back online — syncing your matches...'",
      "💾 LOCAL CACHE: saveState() now also writes to localStorage on every save (both online and offline) so the cache is always warm. This means even if Firestore is slow, the next load is instant.",
    ]
  },
  {
    version: "2.2.43",
    date: "2026-06-28",
    title: "Quick Log User Prop Fix — Log Match Now Works",
    changes: [
      "🐛 FIX: Quick Log 'Log Match' button still broken after v2.2.42. Root cause was a second issue: 'user is not defined' — QuickLog used user?.myPlayerId in two places (handleLog and handleSessionLog) but 'user' was never in its prop signature and was never passed from App.jsx. Fixed: added user to QuickLog prop destructuring and added user={user} to the <QuickLog> call in App.jsx.",
      "🌐 FIX: admin_role_title, admin_role_desc, admin_granted, admin_regular, admin_login_admin, admin_login_regular, grant_admin, revoke_admin, admin_only, checkin — all 10 keys were added to TW/CN blocks in v2.2.41 but never added to the EN block, causing t() to return the raw key name in English mode. All 10 now added to EN.",
      "🔍 Added automated scan: checks all t('key') calls across views against EN translation block keys to catch this class of bug in future.",
    ]
  },
  {
    version: "2.2.42",
    date: "2026-06-28",
    title: "Quick Log Button Fixed + Translation Cleanup",
    changes: [
      "🐛 FIX: Quick Log 'Log Match' button was silently broken. handleLog() was calling replayAllMatches(state.players, ...) which crashed when state.players was undefined/empty — the error was swallowed by React and set() never executed. Removed the unnecessary call entirely: QuickLog only needs to append the match to state; App.jsx reactive useMemo handles all rating recalculation automatically. The button now works reliably.",
      "🌐 FIX: 5 TW translation values had Simplified Chinese characters (场, 胜, 绿) accidentally mixed in from the v2.2.40 batch insertion. Fixed: log_sub, log_first_match, rating_trend_desc, best_win_sec, venue_opt all restored to Traditional Chinese (場, 勝, 綠).",
      "🌐 FIX: Admin Role section title in Profile ('🔑 Admin Role') now uses t('admin_role_title') — shows '🔑 管理員角色' in TW and '🔑 管理员角色' in CN.",
    ]
  },
  {
    version: "2.2.41",
    date: "2026-06-28",
    title: "Test Suite Fixes, Translation Completions & UI Polish",
    changes: [
      "🐛 FIX: stat_losses in TW had simplified char — '敗场' → '敗場' (Traditional Chinese).",
      "🐛 FIX: Settings page (picture 2) — 3 strings still showing in English even in Chinese mode: 'Most recent login per player', 'Clear All', and 'Show the ⚡ floating button for rapid score entry'. All now use t() with correct TW/CN translations.",
      "🌐 FIX: Admin Role section in Profile (picture 3) — all 4 strings now translated: section title, description, status label ('Regular player'/'Admin access granted'), login description, and button ('Grant Admin'/'Revoke Admin'). TW: '授予管理員' / '撤銷管理員'. CN: '授予管理员' / '撤销管理员'.",
      "🧪 TEST FIX 1: [ELO Math] '4.0 vs 3.0 > 70%' — calcExpected uses divisor 0.4 (not 400), giving 0.997 not 0.909. Test updated to assert '> 90%' which matches the actual implementation.",
      "🧪 TEST FIX 2: [Name Abbreviation] 'smartName: short name full at 1.2' — at large zoom, ALL 2-word names are abbreviated (last initial gets a dot). 'Allen T' → 'Allen T.' at 1.2x zoom. Test updated to expect 'Allen T.'",
      "🧪 TEST FIX 3: [Security] 't() XSS: returns key, not executes' — XSS key '__xss_<script>alert(1)</script>' would return the key string which CONTAINS '<script>'. Fixed: test now uses a safe key '__xss_test_key__' and verifies the return type and value, not string content.",
      "🧪 TEST FIX 4: [Security] SUITE CRASH 'pos.includes is not a function' — fmtDelta() returns {text, color} object, not a plain string. Test was calling pos.includes() on an object. Fixed: test now reads pos.text and neg.text before calling .includes().",
    ]
  },
  {
    version: "2.2.40",
    date: "2026-06-28",
    title: "111 CN Translations + Enhanced Test Suite",
    changes: [
      "🌐 FIX: Simplified Chinese (CN) block was missing 111 translation keys that existed in Traditional Chinese (TW). These were core UI keys: navigation labels, all match mode labels, player management, settings sections, error messages, and more. All 111 now added with proper Simplified Chinese text.",
      "🐛 FIX: Test Suite — [Name Abbreviation] 'smartName at 1.0 = full' was testing an outdated behavior. smartName now abbreviates names >13 chars at ALL zoom levels (not just large zoom). Test updated to reflect the correct spec.",
      "🐛 FIX: Test Suite — [Team Suggester] 'Best option has smallest gap' was calling suggestBalancedTeams(ids, players, format) but the function signature is suggestBalancedTeams(ids, ratingMap) where ratingMap is {id: number}. Also was checking avgT1/avgT2 but function returns avg1/avg2. Both fixed.",
      "🧪 TEST SUITE: Upgraded from 8 to 9 suites (105 → ~130 assertions). New suite: Security & Regression — tests XSS safety in t(), language normalization (zh_tw vs zh-TW), fmtDate null safety, fmtDelta sign correctness, replayAllMatches edge cases (empty arrays, unknown player ID), rapid genId uniqueness, CN/TW language isolation.",
      "🧪 TEST SUITE: Translation suite expanded to 50+ critical keys including all navigation, match modes, error messages, settings sections. Now catches missing CN/TW keys directly.",
      "🧪 TEST SUITE: Score validation adds 21-19 winTo21 test case. Date suite adds language isolation test (explicit lang arg overrides getLang). Name suite adds null-safety and single-word edge cases.",
    ]
  },
  {
    version: "2.2.39",
    date: "2026-06-28",
    title: "Quick Log Default Fix & Full Translation Sweep",
    changes: [
      "🐛 FIX: Quick Log toggle was OFF for Bob, Hasan and other linked players. Root cause: when an admin toggled their own Quick Log off (stored in user.quickLogEnabled), that value was being inherited by all linked players via the fallback chain (pref?.quickLogEnabled ?? user.quickLogEnabled). Any linked player with no explicit preference would inherit the admin's setting. Fixed: linked players now only read their own pref?.quickLogEnabled, defaulting to true. Admin reads user.quickLogEnabled, also defaulting to true. The two settings are now fully isolated.",
      "🌐 TRANSLATION: 36 new keys added across all 3 languages: Quick Log hint steps (ql_step1–5), Quick Log settings hint, court rotation suggestion, personal note placeholder, login activity labels, Best-of-N series labels, 'Awaiting prior round', Rating Trajectory section title, admin mode labels, Clear All button, clear_all_confirm dialog, session_needs_4 warning.",
      "🌐 TRANSLATION: Quick Log hint banner now fully translated — Chinese shows '如何使用快速記分' with steps in Chinese.",
      "🌐 TRANSLATION: Settings login activity section 'Clear All', 'No login activity recorded yet', 'Full admin access active', 'Show the ⚡ floating button' all use t() now.",
      "🌐 TRANSLATION: Court rotation suggestion ('下一回合建議'), session streak banner ('Sessions in a Row'), best-of-N labels ('系列賽' / '單場') now translated.",
      "🌐 TRANSLATION: DE bracket labels 'Winners Bracket Final' and 'Losers Bracket Final' in tournament data use t() so they render in Chinese.",
      "🌐 TRANSLATION: Rating Trajectory section in H2H Compare uses t('rating_trajectory_sec').",
      "🌐 TRANSLATION: 'Awaiting prior round' in tournament bracket uses t('awaiting_prior_round').",
    ]
  },
  {
    version: "2.2.38",
    date: "2026-06-28",
    title: "Name Abbreviation Fix, Collapsible Sections & UX Polish",
    changes: [
      "🐛 FIX: Player names on leaderboard now abbreviate at Standard zoom for long names (>13 chars). Previously smartName() only abbreviated at Large zoom. Now: any two-word name longer than 13 chars → 'Michael J.' at all zoom levels. Very long first names (>10 chars) → initials 'M.J.'",
      "🐛 FIX: Custom Match score boxes now always show 'P1' / 'P2' as placeholders in English, regardless of language or match type (previously showed 隊1/隊2 in Chinese).",
      "📂 Custom Match: Match Type and Teams sections are now also collapsible — on top of Game Scores and Date/Venue. All four sections use the CollapsibleSec component. Match Type and Teams start open, Date/Venue starts collapsed.",
      "🔝 Bottom nav: Tapping Home, Matches, History, Events, or Settings now scrolls to the top of the screen immediately. Both synchronously (in the nav function) and via the existing useEffect — belt-and-suspenders.",
      "⚡ Quick Log: Collapsible 'How to use Quick Log' hint banner added below the header. Tap '💡 How to use Quick Log ▾' to expand. Shows 5 steps and tells users where to disable the button (Settings → Appearance). Quick Log is on by default for all users.",
    ]
  },
  {
    version: "2.2.37",
    date: "2026-06-28",
    title: "Custom Match Improvements, PWA Data Fix & Login Cleanup",
    changes: [
      "🐛 FIX: Best-of-N series toggle now correctly resets game count when switching modes. Clicking 'Single' always resets to 1 game; 'Best of 3' sets to 3; 'Best of 5' sets to 5. Previously clicking back to Single after Best of 5 kept all 5 game rows.",
      "🐛 FIX: Singles score input placeholders now show '球員1'/'球員2' in Chinese instead of '隊1'/'隊2'. Singles uses t('player_1')/t('player_2'); doubles still uses t('team_abbr_1')/t('team_abbr_2').",
      "🐛 FIX: After logging a Custom match, page scrolls to top so user sees ELO breakdown and success card immediately.",
      "📱 FIX: PWA real-time data (Lily's phone not getting updates). Root cause: the service worker was caching JS files and serving stale versions. Changed to strict network-first with cache:'no-cache' on every fetch, falling back to cache only when offline. Firebase/Firestore requests are never intercepted. Updated sw.js cache version to v2 to force existing PWAs to refresh.",
      "📂 Custom Match: Game Scores and Date/Venue sections now collapsible. Game Scores starts open; Date/Venue starts collapsed (most players don't need to change these). Tap the header to expand.",
      "🔝 Dropdowns: Logged-in user bubbles to top in Session, KOTC, and other modes where they aren't pre-filled. In Custom mode (where Player 1 is already pre-filled), the user still appears first in all dropdowns but is excluded from other slots since they're already selected.",
      "🗑️ Admin: Login Activity now has individual ✕ buttons per player to clear their history, plus a 'Clear All' button at the top to wipe all login records. Useful for clearing test-user activity.",
    ]
  },
  {
    version: "2.2.36",
    date: "2026-06-28",
    title: "PWA Fixes, Name Edit & User-First Dropdowns",
    changes: [
      "📱 PWA FIX: Quick Log floater now appears immediately on PWA cold start. Previously gated on isCurrentlyVerified which runs asynchronously — briefly false on app launch. Now also shows when user.myPlayerId exists in localStorage (previously linked), so the floater appears before verification completes.",
      "📱 PWA: Added public/manifest.json, public/sw.js (combined offline + notification service worker), and PWA_SETUP.md with instructions for index.html meta tags and icons. Required for reliable PWA install on iOS and Android.",
      "⚙️ Settings → My Profile: Player dropdown replaced with inline name editor. Tap ✏️ Edit next to your name to rename yourself directly. Saves to Firestore immediately. No longer takes you back to the login/selection flow.",
      "🔝 Dropdowns: Logged-in user now appears first in all player selector dropdowns across Custom, Session, KOTC, and Quick Log. Achieved by injecting myPlayerId as the first entry in the favoredPlayerIds priority list passed to sortOptionsAlpha.",
      "🔝 H2H Compare: Player 1 field now pre-fills with the logged-in user's ID on mount (same as Custom, Session, and KOTC modes). Makes it much faster to look up your own H2H stats against another player.",
    ]
  },
  {
    version: "2.2.35",
    date: "2026-06-28",
    title: "Undo Removed + DUPR Hints + Bug Fixes",
    changes: [
      "🗑️ REMOVED: Undo toast removed from all match modes. The accidental-undo problem (user closes toast, wipes match data) is eliminated. Matches can be corrected or deleted from the History tab. Removed from: Custom, Session, KOTC, Tournament, Quick Log Custom, Quick Log Session.",
      "📝 Welcome page — Create Profile: 'Singles Rating' and 'Doubles Rating' fields renamed to 'DUPR Singles Rating' and 'DUPR Doubles Rating' in all 3 languages. Added 'Skip if unsure — defaults to 3.000' hint below both fields in all 3 languages.",
      "🐛 FIX: Dashboard milestone TIERS array moved outside component function. Previously defined inside, causing a new array reference each render which could trigger the useEffect to re-run. Now a module-level constant.",
      "🐛 FIX: bestOf state in Custom Match now resets to 1 (Single) when the form is cleared after logging. Previously the Best-of-N toggle persisted across logs.",
      "🐛 FIX: Quick Log Session 'scores can't be tied' error now uses t('err_valid_scores') for Chinese translation.",
    ]
  },
  {
    version: "2.2.34",
    date: "2026-06-28",
    title: "5 Enhancements + Error Auto-Clear",
    changes: [
      "🐛 FIX: Quick Log error messages now auto-clear when the user fixes the issue. A useEffect watches t1ids/t2ids/sessionIds — when all required players are selected and no duplicates exist, setErr('') fires automatically without the user needing to re-tap Log.",
      "🔄 ENHANCEMENT 1: Court Rotation Suggestion — After logging a Session, the summary card shows a 'Next Round Suggestion' that pairs the lowest-win player with the highest-win player (balancing skill gap). Keeps the game competitive and auto-rotates without debate.",
      "✍️ ENHANCEMENT 2: Personal Match Notes — A ✍️ button appears on match cards in History for players who participated in the match. Tap to add a private note ('windy day, tried new paddle'). Notes are stored in match.playerNotes[playerId] and only visible to the note author and admins. Saves to Firestore as part of the match document.",
      "🎉 ENHANCEMENT 3: Rating Milestone Notifications — When a linked player's rating crosses a tier boundary (2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5), a celebration banner appears on the Dashboard the next time they visit. Shows the tier name and current rating. Dismissed with ✕ and shown only once per milestone per session.",
      "🎯 ENHANCEMENT 4: Best-of-N Series Tracker — In Custom Match, a 'Series' toggle adds Single / Best of 3 / Best of 5 options above the score entry. Live series score (e.g. 2–1) updates as you enter games, with a 🏆 badge when one side reaches the required wins.",
      "📱 ENHANCEMENT 5: QR Code Player Check-In — In Events, admin can tap '📱 QR' on any upcoming event to display a QR code. Players scan it on their own phone — it opens the app with a ?checkin= URL parameter that automatically populates Today's Players in Quick Log with the event's invitees. No manual selection needed.",
    ]
  },
  {
    version: "2.2.33",
    date: "2026-06-28",
    title: "Quick Log Polish & Legends Updates",
    changes: [
      "🌐 FIX: Quick Log error messages now translated in Chinese. 'Select 2 players per side' → '每側請選擇 2 位球員' (TW) / '每侧请选择 2 位球员' (CN). Also translated: 'Same player on both teams', 'Select 4 players', 'All 4 players must be different'.",
      "🐛 FIX: Quick Log 'Match logged!' banner no longer replaces the form. It now shows as a compact green banner above the form, so players can immediately log the next match without waiting or tapping anything.",
      "⏱️ FIX: Undo toast timer reduced from 30 seconds to 5 seconds. 30 seconds was too long — the toast was blocking the UI. 5 seconds is enough time to tap Undo if needed.",
      "📐 FIX: Legends → Icons tab now uses single-column layout at Large zoom, preventing icon descriptions from being cut off or overflowing the 2-column grid.",
      "📖 UPDATE: Legends → Icons section updated with new icons: ⚡ Quick Log badge (matches logged via Quick Log show ⚡ in History), 🔄 Rematch button (appears on match cards in History to re-open Quick Log with same players), 🔑 Admin Player badge (players granted admin rights via isAdminPlayer).",
    ]
  },
  {
    version: "2.2.32",
    date: "2026-06-27",
    title: "3 Bug Fixes + 4 Enhancements",
    changes: [
      "🐛 FIX: Welcome page zoom buttons now also trigger instant re-render (same forceLangRender fix as the language selector). Previously zoom change on Welcome required navigating away to take effect.",
      "🐛 FIX: Quick Log Session mode now stays on screen after logging — same as Custom mode. Resets player selectors and scores for the next session, shows ✅ for 2 seconds, then stays ready.",
      "🐛 FIX: zh_tw/zh_cn normalization fully complete — Quick Log's prefill also uses the underscore form. All language comparisons now consistent.",
      "🔄 ENHANCEMENT 1: Rematch Quick Log — a 🔄 button appears on every match card in History. Tapping it opens Quick Log with the same players pre-filled (T1 and T2 from the original match). Players can adjust and re-enter scores for the new game.",
      "📈 ENHANCEMENT 2: Rating trajectory overlay in H2H Compare — a dual-line chart shows both players' rating histories on the same SVG canvas. T1 in green, T2 in blue. Visible when at least one player has 2+ rated matches in the selected format.",
      "🔥 ENHANCEMENT 3: Session streak tracker — after logging a session, the summary card shows a '🔥 N Sessions in a Row!' banner when the same 4 players have played together consecutively. Walks back through match history detecting groups of 3 consecutive doubles matches with identical player sets.",
      "▶ ENHANCEMENT 4: Events → Start Session — upcoming events with 2+ invitees show a '▶ Start Session' primary button in the expanded event card. Tapping it opens Quick Log in Session mode with the event's invitees pre-loaded as Today's Players. One tap from event to score entry.",
    ]
  },
  {
    version: "2.2.31",
    date: "2026-06-27",
    title: "Welcome Page Fixes & zh_tw/zh_cn Normalization",
    changes: [
      "🐛 FIX: History crash — 'pendingDelete is not defined'. The state declaration was accidentally removed when inserting collapsedGroups. Restored const [pendingDelete, setPendingDelete] = useState(null).",
      "🐛 FIX: Welcome page language change now reflects instantly. Two changes: (1) onChange now calls setLang(val) synchronously before setUser, so t() uses the new language on the very next render. (2) Added a local forceLangRender counter in WelcomeModal — incrementing it triggers an immediate re-render of the modal without waiting for the App-level useEffect.",
      "🐛 FIX: Root cause of dates never showing in Chinese found and fixed. Translation blocks use 'zh_tw'/'zh_cn' (underscores) as keys, but date-formatting logic was checking for 'zh-TW'/'zh-CN' (hyphens). This meant fmtDate, History date groups, and Events date formatting always fell through to English. Normalized all comparisons to zh_tw/zh_cn throughout engine.js, History.jsx, and Events.jsx.",
      "✏️ FIX: 'Go to Setup' button on Welcome page renamed to 'Create Profile' in all 3 languages (EN: 'Create Profile', TW: '建立個人檔案', CN: '创建个人资料'). The old label 'Go to Setup' was vague.",
      "🏆 FIX: Start Tournament + Reset button layout redesigned — Start Tournament fills full width, Reset is a small text link below it. No more overflow at any zoom level.",
    ]
  },
  {
    version: "2.2.30",
    date: "2026-06-27",
    title: "Quick Log Polish & Events Fixes",
    changes: [
      "🐛 FIX: Quick Log no longer closes automatically after logging a match. Form resets (clears team selections and scores) and shows a 2-second ✅ confirmation, then stays open for the next entry. Close with ✕ when done.",
      "🐛 FIX: Quick Log Custom tab — T1/T2 player pills now hidden until Today's Players are selected. Shows a prompt 'Select Today's Players above to get started' when no players are in the active filter.",
      "🐛 FIX: History date headers and match card dates now definitely render in Chinese. Root cause was that MatchCard in Shared.jsx called fmtDate() without a lang argument, so it always used getLang() at call time — which could be stale. Fixed by passing lang={activeLang} from History down to MatchCard, and using it explicitly in fmtDate(m.date, lang).",
      "🐛 FIX: Quick Log Button toggle now works for global admin (no player profile linked). Was reading pref?.quickLogEnabled but for admin with no myPlayerId, pref is always {} — so the toggle saved to user root but read from pref. Now reads (pref?.quickLogEnabled ?? user.quickLogEnabled) ?? true.",
      "🌐 FIX: Event dates in Events tab now render in Chinese — manual construction 2026年6月27日（六）上午10:30. Previously used toLocaleString() which falls back to English on many mobile browsers.",
      "🔔 FIX: Reminders can now be turned off. A 'Turn off' button appears next to the 'Reminders on' indicator. Since the browser doesn't allow revoking Notification permission via JS, suppression is stored in localStorage (key: ql_notif_suppressed) — no new notifications are scheduled, and the UI shows a 'Reminders off' state with a 'Turn on' button to re-enable.",
      "📅 NEW: History date group headers are now collapsible. Tap any date header to collapse/expand that day's matches. Shows match count when collapsed (e.g. '5 ▶'). Useful when scrolling through months of history.",
    ]
  },
  {
    version: "2.2.29",
    date: "2026-06-27",
    title: "Full Audit Fixes (14 Items)",
    changes: [
      "🗑️ REMOVED: AI Recap Prompt feature (copy_ai_prompt / ai_prompt_copied). Translation keys removed from all 3 language blocks. No UI references existed in views — the feature was dead code.",
      "🐛 FIX: DraggableFloater stale closure bug. onTouchEnd was capturing 'pos' from the initial closure, so saving to localStorage could save the old position. Fixed by adding a posRef that always mirrors the latest pos state — onTouchEnd reads posRef.current instead.",
      "⚠️ FIX: Quick Log Session now shows a warning when Today's Players has fewer than 4 players selected ('Session needs 4 players — tap All or add more Today's Players').",
      "🌐 FIX: Login Activity time-ago labels ('just now', 'm ago', 'h ago', 'd ago') now use t() translation keys in all 3 languages. Previously hardcoded English.",
      "📅 NEW: Past events in the Events tab now show a 'Past' / '已結束' / '已结束' badge and are rendered at 70% opacity to visually separate them from upcoming sessions.",
      "💾 NEW: Quick Log Today's Players selection now persists in sessionStorage across modal opens within the same session. Re-opening Quick Log remembers who you picked.",
      "💾 NEW: History filter state (type filter, mode filter, search text) now persists in sessionStorage. Navigating away and back restores the previous filter state.",
      "📊 NEW: Partner Matrix empty state now shows guidance text explaining that 2+ doubles matches with a partner are needed to unlock it.",
      "🖼️ NOTE: Avatar compression already implemented (processImage → 120px JPEG 80%). Logo compression also implemented (192px). No change needed.",
      "🔒 NOTE: Admin de-elevation race condition is by-design — the guard 'user.myPlayerId' prevents global admin de-elevation. Real isAdminPlayer users may see a brief flash if Firestore briefly returns stale data; this is inherent to the eventual-consistency model and is not harmful.",
    ]
  },
  {
    version: "2.2.28",
    date: "2026-06-27",
    title: "Smart Name Abbreviation & Button Overflow Fix",
    changes: [
      "✂️ NAMES: Leaderboard now shows smart abbreviated names at Large zoom. Rule: (1) 'Michael Jackson' → 'Michael J.' (first name + last initial). (2) If first name itself is >10 chars or result is still >12 chars → full initials 'M.J.' This uses a new smartName() export that reads theme.zoom. Names at Standard and Compact zoom still show in full.",
      "🐛 FIX: 'Start Tournament' button no longer overflows the frame at any zoom level. Root cause: btnPrimary had whiteSpace:nowrap which prevented text from wrapping, forcing the button wider than its container. Changed to whiteSpace:normal with textAlign:center and flex:1 1 auto + minWidth:0. The button now wraps to 2 lines at large zoom rather than escaping the layout.",
      "🐛 FIX: All btnPrimary buttons throughout the app benefit from the whiteSpace:normal fix — any translated text that was long (e.g. '登錄比賽並更新積分' in Chinese) will now wrap instead of overflow.",
    ]
  },
  {
    version: "2.2.27",
    date: "2026-06-27",
    title: "Large Zoom Fixes, Trash Details & UI Polish",
    changes: [
      "🐛 FIX: Large zoom layout overflow fixed in multiple places. Leaderboard player names now truncate with ellipsis instead of wrapping to a second line (overflow:hidden + textOverflow:ellipsis + minWidth:0 on flex container). Score input fields use flex sizing instead of fixed width. Game label (第1局) uses smaller font at large zoom. Profile name header also truncates properly.",
      "🗑️ TRASH: Match cards in the trash now show full details — both team names (color-coded green for winner), score per game, match date, venue, and mode badge. Much easier to identify which specific match you want to restore.",
      "🔄 QUICK LOG: Session tab player picker redesigned from colored pill chips to 4 native dropdown selects (same UX as the Custom Match tab). Each slot is color-coded (accent/red/green/orange) and auto-removes a player from another slot if you select them in a different one.",
      "🐛 FIX: Undo toast labels are now descriptive in all 3 languages. Was showing raw key names (match_tab, mode_session). Now: '比賽已記錄' / '球局已記錄' / '稱王賽已記錄' / '錦標賽已記錄' (TW). Same in Simplified Chinese and English ('Match logged', 'Session logged', etc.).",
    ]
  },
  {
    version: "2.2.26",
    date: "2026-06-27",
    title: "Quick Log Session Tab & History Badge",
    changes: [
      "🐛 FIX: History date group headers now use manual Chinese date construction ('2026年6月27日（六）') instead of toLocaleDateString with zh-TW locale, which was returning English on some browsers/PWA environments. Fully reliable across all platforms.",
      "🐛 FIX: Match card dates (fmtDate) also use manual Chinese construction. Same browser-compatibility fix.",
      "🐛 FIX: Undo toast labels corrected everywhere. LogMatch was passing t('match_tab') (key doesn't exist → showed 'match_tab'). Now uses t('matches_tab') = '比賽'. Session now uses t('mode_session') = '球局' instead of t('session') which returned '編輯球局' (first match in the translation block). TW matches_tab fixed from 'Simplified 比赛' to Traditional '比賽'. CN matches_tab was missing — added.",
      "🔄 NEW: Session tab in Quick Log. Top of modal now has Custom | Session toggle. Session mode: pick 4 players (colour-coded 1-4), 3 Round Robin matchups auto-generate with individual score steppers. One tap logs all 3 matches simultaneously. Undo removes all 3. Uses same RR matchup structure as the full Session mode.",
      "⚡ NEW: Quick-logged matches show a small ⚡ badge next to the match type pill in History. Applies to both custom and session quick logs (loggedBy: 'quick' and 'quick-session').",
    ]
  },
  {
    version: "2.2.25",
    date: "2026-06-27",
    title: "Draggable Floater, Settings Icons & History Date Fix",
    changes: [
      "🐛 FIX: History date group headers (e.g. 'Fri, Jun 26, 2026') now correctly render in Chinese. Root cause: the useMemo had getLang() in the function body but not in the deps array — React never re-ran the memo when language changed. Fixed by passing activeLangId as a 'lang' prop from App.jsx (where it's a reactive state value) down to History. The memo now includes 'activeLang' in deps and re-computes correctly.",
      "🐛 FIX: Match card dates ('Jun 26, 2026') now respect app language. fmtDate() already called getLang() but the MatchCard render in Shared.jsx called it at the wrong time. Updated fmtDate signature to accept an optional lang override, and History passes activeLang explicitly.",
      "🐛 FIX: Undo toast 'logged' word removed. Was hardcoded in App.jsx: '{label} logged'. Now just shows '{label}' — the label itself (e.g. '比賽') is sufficient.",
      "⚡ FLOATER: Quick Log button is now draggable. Touch and drag to reposition it anywhere on screen. Position saved to localStorage (key: 'ql_pos') so it persists across sessions. Tap (without dragging) still opens Quick Log. Works via onTouchStart/Move/End events with a 4px threshold to distinguish drag from tap.",
      "⚙️ SETTINGS: All section titles now have icons — My Profile (👤), Appearance (🎨), Quick Log Button (⚡), Login Activity (🔐). All icons pulled from translation keys so they appear in all languages.",
      "⚙️ SETTINGS: 'Login Activity' section title now uses t('login_activity_sec') — shows '🔐 登入紀錄' (TW) / '🔐 登录纪录' (CN).",
    ]
  },
  {
    version: "2.2.24",
    date: "2026-06-27",
    title: "Settings Collapsible & Quick Log Polish",
    changes: [
      "📜 CHANGELOG: Now reliably scrolls to top when opened. Added an additional useEffect inside the Changelog component itself (mount-time scroll) as belt-and-suspenders alongside the App-level useEffect. Also fixed the changelog_lang_note bug in English — empty string value was falsy so t() fell through and returned the raw key name 'changelog_lang_note'. Now checks the value before rendering.",
      "⚙️ SETTINGS: All sections are now collapsible (chevron toggle). My Profile, Appearance, Quick Log, Admin, Login Activity, Branding, Backup, Danger Zone, About — all start expanded and can be individually collapsed to reduce scroll length.",
      "⚡ QUICK LOG: Today's Players redesigned as a compact scrollable checkbox list instead of a chip grid. Shows all players with checkboxes, starred players marked with ★. Three quick-set buttons: All / ★ Starred / Clear. Fully translated (今日球員 / 今日球员).",
      "⚡ QUICK LOG: Undo toast label cleaned up — now just shows the match type (e.g. '比賽') without the redundant 'logged' suffix.",
    ]
  },
  {
    version: "2.2.23",
    date: "2026-06-27",
    title: "Quick Log Polish & Dashboard Cleanup",
    changes: [
      "🐛 FIX: Undo toast label now shows correctly in Chinese — was showing 'match_tab logged' because the key name was used as a fallback. Now reads t('matches_tab') + t('logged') → '比賽 已記錄' (TW) / '比赛 已记录' (CN).",
      "🐛 FIX: History date group headers now render in Chinese when app language is Chinese. Root cause: the useMemo computing date groups didn't re-run when language changed (getLang() isn't a React state value). Fixed by tracking language in a local state with a 200ms polling interval and adding it to the memo deps.",
      "🐛 FIX: History date group header textTransform:uppercase no longer applied in Chinese — it was harmless on CJK characters but now respects locale (no uppercase, no letter-spacing for zh-* locales).",
      "⚡ QUICK LOG: 'Today's Players' section added at top of modal. All roster players shown as green chips — tap to mark as playing today. Starred players are pre-selected. The T1/T2 assignment pills below only show today's players (fewer buttons = less clutter). A 'Show all' toggle reveals the full roster when needed.",
      "⚙️ SETTINGS: Quick Log floater toggle added to Appearance section. When off, the ⚡ button is hidden — useful for players who prefer to log matches through the main Matches tab.",
      "🗑️ REMOVED: Group Insights card removed from Dashboard. Component definition and render call both deleted.",
      "🗑️ REMOVED: Weekly Recap card removed from Dashboard. Component definition and render call both deleted. No broken imports — useMemo was already imported for other reasons.",
    ]
  },
  {
    version: "2.2.22",
    date: "2026-06-27",
    title: "⚡ Quick Log",
    changes: [
      "⚡ NEW: Quick Log — a floating ⚡ button appears above the bottom nav whenever you're logged in. Tap it to open a half-screen score entry modal optimised for mid-game use, without navigating away from whatever you were viewing.",
      "⚡ Quick Log features: Singles/Doubles toggle · Player pills sorted starred-first (tap to assign to T1 or T2, only unselected players shown on each side) · Live win probability bar (same ELO predictor as Custom mode) · Giant ± score steppers — no keyboard needed · Quick-preset buttons (11–0, 11–5, 11–8, 11–9) · ⇄ Flip button to swap scores · Auto-closes with a ✅ confirmation after logging · Full undo support via the ↩ Undo toast.",
      "⚡ Quick Log saves directly to Firestore via the same path as Custom matches. Rating recalculation and ELO deltas are computed immediately. Match appears in History as type 'singles' or 'doubles', loggedBy: 'quick'.",
      "⚡ Quick Log is hidden when no one is logged in (guests can't log matches) and hidden while the modal is open. Only admins and verified players see it.",
    ]
  },
  {
    version: "2.2.21",
    date: "2026-06-27",
    title: "Translation Sweep & Login Tracking Fix",
    changes: [
      "🌐 30+ new Chinese translation keys added across all modes: Match/Session/Event/KOTC notes labels, Session option labels, tournament round names (Semifinals/Finals/Grand Final/Bracket Finals/Winners Bracket/Losers Bracket), Standings, Match History, RSVP labels (Going/Maybe/Can't), Invited, Undo, matches complete/logged, tap to expand, W/L/G abbreviations, Share Recap, Reminders on, Changelog header.",
      "🌐 fmtDate() now uses app language locale — match card dates in Chinese mode show 2026年6月22日 instead of Jun 22, 2026.",
      "🌐 History date group headers already fixed in v2.2.15 and confirmed working.",
      "🌐 Tournament round names (Semifinals, Grand Final, etc.) now translate in all bracket views.",
      "🌐 W/L abbreviations in Session summaries, KOTC leaderboard, and RR Standings now use t('w_abbr')/t('l_abbr') — shows 勝/敗 (繁中/简中).",
      "🌐 Changelog now shows translated title and hint in Chinese. Detailed entries remain in English (technical release notes).",
      "🐛 Login tracking fix: players auto-verified from cached credentials (remembered from last session) were not having their login recorded. Added a useEffect with a didTrackAutoLogin ref that fires once on mount when isCurrentlyVerified is true — logs an entry to loginHistory and updates lastLoginAt. Fixes Lily's login not being tracked on her own device.",
      "🐛 Weekly Recap was another Hook-in-IIFE violation (useState inside an IIFE). Extracted to WeeklyRecap component with useMemo for computation.",
      "✨ Weekly Recap now shows inline on tap instead of immediately triggering share. Tap the card to expand the recap text, then optionally tap Share to send it. Works cleanly on mobile without triggering the share sheet unexpectedly.",
      "✨ Tournament Champions card: winner names now appear on a separate line below the '🏆 Champions' label (previously concatenated on one line). Success banner auto-clears when starting a new tournament.",
      "✨ Venues in Group Stats: count label no longer shows English 'matches' — uses t('matches_label') which translates to '場比賽' in Chinese, fixing the '39 比賽s' bug.",
    ]
  },
  {
    version: "2.2.20",
    date: "2026-06-26",
    title: "Logout Fix, Language Fix & Event Notifications",
    changes: [
      "🐛 FIX: Logout button now visible for isAdminPlayer users. When a player is granted admin via isAdminPlayer, user.isAdmin becomes true — which previously hid the 'My Profile' section (including logout) because it was gated on !user.isAdmin. Changed condition to (!user.isAdmin || user.myPlayerId) so players with a linked profile always see logout regardless of admin status.",
      "🐛 FIX: Language change now reflects immediately without needing to click away. The root cause: setLang() mutates a module-level variable that t() reads, but it was only called in a useEffect that ran after React committed the render — by then the render with the new language was already done. Fix: call setLang(val) synchronously inside updateAppearance() the moment the user selects a new language, before any React state update.",
      "🗑️ Removed: 'Who's In Today?' availability poll from Dashboard as requested.",
      "🔔 EVENTS: Notify attendees button added to each event's expanded view (admin-only, shown when notification permission is granted). Tapping '🔔 Notify' sends an immediate push notification to the device — useful for sending a last-minute reminder to confirmed attendees. The notification fires in ~1 second and shows the event title, date/time, venue, and Going list.",
      "📋 SETTINGS: Login activity redesigned from verbose 50-entry log to a compact 'last seen' table. Shows one row per player (most recently active first) with a colour-coded dot (green = active in last 5min, accent = today, grey = older), time-ago label ('2h ago', '3d ago'), and total login count. Much less cluttered.",
      "🐛 BUG AUDIT: (1) Verified no WhoIsIn remnants in Dashboard. (2) Confirmed setUserSettings merges correctly in all Settings calls — no state wipes. (3) Events.jsx useEffect import confirmed present. (4) Compare.jsx timeline parses cleanly. (5) Admin de-elevation useEffect has correct guards — no infinite loop when isAdminPlayer users log out.",
    ]
  },
  {
    version: "2.2.19",
    date: "2026-06-26",
    title: "3 New Features: Poll, Timeline & Push Notifications",
    changes: [
      "🐛 FIX: Gap inconsistency on Dashboard — MOTD, Player of the Month, and Group Insights cards now all use identical 8px bottom margin. Previously POTM used 16px causing a visible extra gap between those cards.",
      "🙋 NEW: 'Who's In Today?' availability poll on the Dashboard. Each linked player taps ✅ I'm in / ❓ Maybe / ❌ Can't. Responses are visible to the whole group in real-time (stored in each player's shared availability field keyed by date). Resets automatically each day. Admin sees the tally before deciding to start a session.",
      "📊 NEW: H2H Momentum Timeline in the Compare tab. Shows the last 5 meetings as colour-coded result dots (T1 green / T2 blue). Detects and shows the current win streak ('🔥 Allen on 3-match winning streak'). Below that, the full match list now uses a cleaner timeline layout with a coloured left-border, score, date, and W/L badge — replacing the previous plain icon list.",
      "🔔 NEW: Push notifications for Events. The Events tab shows an 'Enable Reminders' banner (only when permission hasn't been granted). Tapping it requests browser notification permission and registers a service worker (sw-notifications.js). When permission is granted, a notification is scheduled 1 hour before each upcoming session: '🥒 Pickleball in 1 hour: [Event Name] · 📍 [Venue]'. Notifications are also scheduled when a new event is created. The reminder fires even if the app is in the background — the service worker handles delivery.",
    ]
  },
  {
    version: "2.2.18",
    date: "2026-06-26",
    title: "Offline Persistence, Share Card & Bug Audit",
    changes: [
      "💾 OFFLINE: Firebase Firestore now uses IndexedDB persistent local cache (persistentLocalCache + persistentMultipleTabManager). All writes are queued in IndexedDB and automatically synced when connectivity is restored — even if the app was closed and reopened. Previously, pending offline writes were held only in memory and lost on app restart.",
      "📸 SHARE CARD: After logging any Custom match, a '📸 Share Card' button appears next to 'See History'. Tapping it generates an SVG match result card with team names, score, winner callout, upset flag, and per-player rating deltas. On mobile with Web Share API support, it opens the native share sheet with the SVG file. On desktop or when Web Share is unavailable, it opens the SVG in a new tab for screenshotting or saving.",
      "🐛 BUG AUDIT — no critical crashes found. Findings: (1) ratingDeltas access in MatchEloBreakdown uses || 0 fallback — safe. (2) History date group keys use match group.key — no duplicate risk. (3) Events RSVP data is in the shared state blob and flows to Firestore via getSharedState rest spread — saves correctly. (4) isoToDatetimeLocal used in matchDate reset is exported and exists. (5) Admin de-elevation useEffect has correct deps with no infinite loop risk (myPlayerId guard prevents global admin from being de-elevated). (6) All setInterval/setTimeout calls have matching cleanup in useEffect return functions.",
    ]
  },
  {
    version: "2.2.17",
    date: "2026-06-26",
    title: "Admin Elevation Fix & Predictor Polish",
    changes: [
      "🐛 FIX: Player admin elevation (isAdminPlayer) now works correctly in all cases. Previously, a player already logged in with a verified PIN would never see the re-verification screen that grants admin — so the Grant Admin flag had no effect until they logged out and back in. Fixed with a useEffect that watches the player's isAdminPlayer flag and isCurrentlyVerified state: if both are true but isAdmin is false, admin is granted immediately. Also handles revocation: if the flag is removed by admin, the player loses admin rights on the next Firebase sync.",
      "🔑 UI: Players granted admin access now show a 🔑 badge next to their name on the leaderboard and roster. Visible to everyone so the group knows who has admin rights.",
      "🐛 FIX: Match Predictor center label now reads clearly. Was using t('upset_of') which translates to '爆冷門賺取' (earns an upset) — confusing as a standalone label. Now shows '{Name} 🐓 underdog' for the lower-probability team, or '⚖️ Balanced' when the gap is under 10%.",
      "🗑️ Removed: Untried Partners card removed from Dashboard as requested.",
    ]
  },
  {
    version: "2.2.16",
    date: "2026-06-26",
    title: "Translation Sweep & 4 New Features",
    changes: [
      // ── Bug fixes ─────────────────────────────────────────────────────
      "🐛 FIX: '第 1' → '第1局'. The game label in Custom match score entry now correctly renders as '第1局' in Chinese (number sandwiched between 第 and 局), not '第 1' with a trailing space. Logic: if t('game_lbl') === '第' then render '第{n}局', else render '{label} {n}'.",
      "🐛 FIX: Changelog scroll-to-top now works reliably. Root cause identified: two <main> elements exist in the DOM simultaneously (create-profile screen + main app). document.querySelector('main') returned the FIRST one (create-profile), which isn't the scrollable app container. Fixed by using document.querySelectorAll('main')[mains.length-1] to always target the last <main>.",
      "🗑️ Removed version number badge from Welcome screen (looked out of place).",
      // ── Translations ──────────────────────────────────────────────────
      "🌐 TRANSLATION: Tournament format names (Single Elimination / Double Elimination / Round Robin) now translated in all 3 languages. Were hardcoded English in 3 places: formatLabel computation, format card labels, and bracket header. Now use t('format_se'/'format_de'/'format_rr').",
      "🌐 TRANSLATION: Session 'Player 1/2/3/4' and KOTC 'Player 1/2/3/4' placeholder dropdowns now use t('player_n') — shows '球員 1/2/3/4' (繁中) and '球员 1/2/3/4' (简中).",
      "🌐 TRANSLATION: Session subtitle ('SESSION — 4-PLAYER ROUND ROBIN') now uses t() keys for all 3 words.",
      "🌐 TRANSLATION: Singles/Doubles toggle in Custom match now uses t('match_type_singles')/'match_type_doubles' — was using hardcoded .charAt(0).toUpperCase() English manipulation.",
      // ── New features ──────────────────────────────────────────────────
      "🔮 NEW: Match Predictor on Log Match form. Once all players are selected (singles: 2 players, doubles: 4), a live win probability bar appears between player selection and score entry. Shows each team's win % based on current ratings, with a progress bar and underdog callout. Disappears if any player is deselected. Uses calcExpected() from engine.",
      "🤝 NEW: Untried Partners card on Dashboard. After 3+ doubles matches, shows all player pairs who have NEVER played doubles together. Appears as compact pill chips — nudges the group toward variety. Only shows for players with at least 1 match played.",
      "📤 NEW: Weekly Recap Share button on Dashboard. When there are matches from the last 7 days, a share button appears. Generates a text recap: total matches this week, top rating mover, and biggest upset. Uses Web Share API (falls back to clipboard copy on desktop).",
      "📶 NEW: Offline mode indicator. A red banner at the top of the screen appears when the device loses internet connectivity, saying 'Offline — changes saved locally, will sync when reconnected'. Disappears automatically when connectivity is restored. Uses window online/offline events — no polling.",
    ]
  },
  {
    version: "2.2.15",
    date: "2026-06-26",
    title: "Translation Polish & Welcome Screen",
    changes: [
      "🐛 FIX: Changelog (and all tab navigation) now reliably scrolls to the top. Root cause of the previous failed fix: setTimeout(0) runs before React has finished rendering the new view into the DOM, so there was nothing to scroll yet. Fixed by replacing it with a useEffect that watches activeView — this runs after React commits the DOM update, guaranteeing the new view is mounted before scrollTop is set.",
      "🌐 TRANSLATION: Singles/Doubles toggle buttons in Custom match now use t('match_type_singles') / t('match_type_doubles') — previously used hardcoded English capitalization regardless of app language. Now shows 單打/雙打 (繁中) and 单打/双打 (简中).",
      "🌐 TRANSLATION: 'Game 1' label and T1/T2 score input placeholders in Custom match now use t() keys. In Chinese: shows '第 1' and '隊1'/'隊2' (繁中) or '队1'/'队2' (简中).",
      "🌐 TRANSLATION: History match result date group headers (e.g. 'MON, JUN 22, 2026') now use the correct locale. In Chinese mode, renders as '2026年6月22日週一' (zh-TW) or '2026年6月22日周一' (zh-CN). Uses native Intl.DateTimeFormat via toLocaleDateString with the app's active language code.",
      "✨ WELCOME: App version number (v2.2.15) now shown as a small, unobtrusive badge in the bottom-right corner of the Welcome screen. Helps quickly identify which version is running without needing to open Settings → Changelog.",
    ]
  },
  {
    version: "2.2.14",
    date: "2026-06-26",
    title: "Battery, Security & Translation",
    changes: [
      // ── Changelog scroll ──────────────────────────────────────────────
      "📜 CHANGELOG: Now scrolls to the top of the page when opened. Root cause: nav() set the view but never reset the scroll position of the main container. Fixed by attaching a global scrollTop=0 to every nav() call — this also means all tab switches now correctly start at the top.",
      // ── Battery drain ─────────────────────────────────────────────────
      "⚡ BATTERY: Presence ping (the green online dot) now skips Firebase writes when the page tab is hidden (visibilityState === 'hidden'). Previously it wrote to Firestore every 60 seconds even when the phone screen was off or the app was backgrounded, keeping the cellular radio alive unnecessarily.",
      "⚡ BATTERY: setLang() was called directly in the App render body on every React render cycle — meaning it ran dozens of times per second during scroll, typing, etc. Moved into a useEffect that only fires when the active language actually changes.",
      "⚡ BATTERY: Group Insights day/venue computation already memoized via useMemo (fixed in v2.2.12). Confirmed no other render-path computations are looping.",
      // ── Translations ──────────────────────────────────────────────────
      "🌐 TRANSLATIONS: Calendar month names (Jan–Dec) and day headers (S/M/T/W/T/F/S) in both the History tab and Events tab now use t() keys. In Chinese: months show 1月–12月; week days show 日/一/二/三/四/五/六.",
      "🌐 TRANSLATIONS: History tab filter dropdowns (Match Type / Match Mode and all their option labels) now use t() keys — fully translated in all three languages.",
      "🌐 TRANSLATIONS: Group Insights 'Fav Day' now shows translated day names instead of hardcoded English abbreviations.",
      // ── Security ──────────────────────────────────────────────────────
      "🔐 SECURITY: PIN brute-force protection added. After 3 consecutive wrong PIN attempts, the unlock button is disabled for 30 seconds with a visible countdown. State stored in sessionStorage per player — resets on page reload (intentional, since that's a manual act). Prevents automated PIN guessing on an unattended device.",
      "🔐 SECURITY: JSON import now strips isAdminPlayer flag from imported player objects. Previously, anyone could craft a backup JSON with isAdminPlayer:true and gain admin access by importing it then logging in with their PIN. Now the flag is removed during import unless the importing session is already admin.",
    ]
  },
  {
    version: "2.2.13",
    date: "2026-06-26",
    title: "Translation Complete & Group Stats Polish",
    changes: [
      "🌐 TRANSLATIONS: Full Chinese (繁中 + 简中) coverage audit. Added 45 missing keys to both ZH-TW and ZH-CN blocks — covering PIN management, Events tab (search, RSVP, delete), Save Group, Sort Starred, Session Suggester hint, View All Matches link, Profile tab, and Group Insights card. All new features added since v2.0 now have proper Chinese translations.",
      "🌐 TRANSLATIONS: Fixed `profile` key in both ZH-TW (個人資料) and ZH-CN (个人资料) — was incorrectly reusing the radar chart label (五維雷達圖/五维雷达图).",
      "🌐 TRANSLATIONS: Group Insights dashboard card (Matches / Fav Day / Est. Time / Most played at) now uses t() keys instead of hardcoded English — displays correctly in all three languages.",
      "📊 GROUP STATS: Venues section title now shows 📍 icon prefix. Each venue row shows a 🏟️ icon and adds a percentage of total matches (e.g. '8 matches · 62% of total') for context.",
      "📊 GROUP STATS: Partner Matrix player picker replaced with a compact native dropdown — saves ~60px of vertical space compared to the old pill-button row, especially with 5+ players.",
    ]
  },
  {
    version: "2.2.12",
    date: "2026-06-25",
    title: "Events RSVP, Group Stats Collapsible & Bug Fixes",
    changes: [
      // ── {n} bug ───────────────────────────────────────────────────────
      "🐛 FIX: Profile 'View all {n} matches in History' button now correctly substitutes the actual match count instead of showing the literal {n} placeholder.",
      // ── MOTD color ───────────────────────────────────────────────────
      "🎨 MOTD: Match of the Day card now always uses the user's chosen Accent Style color for the card border, background tint, and label — even for upset matches. Previously, upsets forced the card to gold regardless of the user's accent. Gold is now reserved only for the upset emoji label suffix (🎉), not the card chrome.",
      // ── Events RSVP + collapsible ────────────────────────────────────
      "📅 EVENTS: Each event is now collapsible — tap the header row (title + date) to expand or collapse. Collapsed state shows: event title, date/time, and 'N going' count. Expanded state shows: venue, notes, full invitee list with RSVP statuses, and action buttons.",
      "📅 EVENTS: Added RSVP system. Three response options always visible below each collapsed event: ✅ Going / ❓ Maybe / ❌ Can't. Tap to set your response; tap again to toggle off. RSVP state is stored per event per player and persists. Only logged-in players (verified PIN) can respond.",
      "📅 EVENTS: Invitee list in expanded view shows each player's RSVP status with color coding: ✅ Going (green), ❓ Maybe (accent), ❌ Can't (red), • No response (neutral). Share button now includes the Going list in the shared text.",
      // ── Group Stats collapsible ───────────────────────────────────────
      "📊 GROUP STATS: All sections (Overview, Records, Venues, Partner Matrix) are now independently collapsible. Overview and Partner Matrix open by default; Venues and Records can be collapsed to save space. Chevron indicator shows open/closed state.",
      // ── Performance bug fix: Hook in IIFE ────────────────────────────
      "🐛 PERF FIX: Dashboard Group Insights was calling React.useState inside an IIFE render expression — a violation of React's Rules of Hooks that would cause inconsistent state when match counts changed. Extracted into a proper GroupInsights component with useMemo for the day/venue computation so it only re-runs when matches change.",
      // ── Performance issues identified ─────────────────────────────────
      "⚡ PERF NOTE: Identified that Session submit calls replayAllMatches on ALL historical matches to compute the post-session summary. This is a hidden O(n) cost per session log on top of the App-level replay. Will optimize in a future drop by threading derivedPlayers down from App.",
      "⚡ PERF NOTE: Identified 4 additional performance considerations: (1) Group Insights now fixed (was re-running forEach on all matches every render). (2) detectRematches runs on finalViewMatches in History on every filter change — acceptable for small datasets. (3) computePartnerMatrix is O(n) — good. (4) Session replayAllMatches double-call noted above.",
    ]
  },
  {
    version: "2.2.11",
    date: "2026-06-25",
    title: "Admin, Insights & History Fix",
    changes: [
      // ── Custom match ordering fix ──────────────────────────────────────
      "🐛 FIX: Custom matches now always appear in correct chronological order in History. Root cause: when logging a second custom match in the same session, the date/time field still held the timestamp from when the form first opened — not when the user clicked Log. The second match therefore received a timestamp equal to or earlier than the first. Fixed by resetting `matchDate` to the current time after every successful submission. Also fixed timezone parsing to correctly treat datetime-local as local time.",
      // ── History filter dropdowns ───────────────────────────────────────
      "📋 HISTORY: Match Type and Match Mode filters now use compact dropdowns instead of toggle buttons/pill chips. Displayed side-by-side in a 2-column grid, saving ~60px of vertical space in the filter section.",
      // ── Multi-admin support ────────────────────────────────────────────
      "🔑 MULTI-ADMIN: Admin can now grant other players admin access from their Profile page. A new '🔑 Admin Role' section shows at the bottom of each player's profile (admin-only visible). Tap 'Grant Admin' → that player will receive full admin access automatically when they verify their PIN — no separate admin passcode needed. Tap 'Revoke Admin' to remove. A player can be both a named player (appears in stats/ratings) and an admin at the same time.",
      // ── Session Insights dashboard card ───────────────────────────────
      "📊 DASHBOARD: Added 'Group Insights' collapsible card. Shows: total matches played, favorite day of week, estimated time played (~15 min per match), and most-played venue. Only appears once the group has 5+ matches. Collapsed by default to keep the dashboard clean.",
      // ── Performance awareness ──────────────────────────────────────────
      "⚡ PERFORMANCE: Settings → About section now shows a match count health indicator for admin. Under 150 matches: green '✅ database healthy'. Over 150: amber warning that rating recalculation may be slow on edits/deletes, with a recommendation to export a backup.",
    ]
  },
  {
    version: "2.2.10",
    date: "2026-06-25",
    title: "History Filters & Login Audit",
    changes: [
      // ── Custom match date bug ──────────────────────────────────────────
      "🐛 FIX: Custom matches now always default the date/time field to the current moment when the form opens. Previously, if a user had navigated away without submitting, the persisted form state could carry a stale timestamp from earlier — causing those matches to sort below more recent entries in History.",
      // ── History filters ────────────────────────────────────────────────
      "📋 HISTORY: Added 'Match Mode' filter row below the existing Singles/Doubles toggle. Filter buttons (pill style): All · Custom · Session · King of Court · SE · DE · Round Robin. Uses the notes prefix set by each mode at log time to classify matches.",
      "📋 HISTORY: The type filter (All/Singles/Doubles) and mode filter are independent and combinable — e.g. you can show only Doubles + Session matches.",
      // ── Login history ──────────────────────────────────────────────────
      "🔐 LOGIN HISTORY: Admin can now see a full login audit log in Settings → 'Player Login History'. Each login by each player is recorded with date/time in a per-player array (up to 50 entries). Players sorted by most-recently-logged-in first; each entry shows weekday, date, and time.",
      "🔐 LOGIN HISTORY: In Roster, admin now sees 'Last login: [date/time] (N total)' under each player who has a login history. The total count links to the full log in Settings.",
      "🔐 LOGIN HISTORY: Login events are appended (not overwritten) to a `loginHistory` array on the player object. Both the Welcome screen 'Select my name' flow and the PIN Verification flow record an entry.",
      // ── My feedback ───────────────────────────────────────────────────
      "💡 DEV NOTE: Known performance consideration — rating replay is O(n²): every match edit or deletion replays all matches from the beginning. With 200+ matches this can take 2-3 seconds. Future improvement: add a progress indicator or lazy-compute ratings on-demand.",
      "💡 DEV NOTE: Potential enhancement — a 'Session Insights' card on the Dashboard could show the group's most-played venue, most active day of week, and estimated total hours played. The data is already in the match records.",
    ]
  },
  {
    version: "2.2.9",
    date: "2026-06-25",
    title: "UX Cleanup & Bug Fixes",
    changes: [
      // ── Session ──────────────────────────────────────────────────────
      "🏓 SESSION: Player selection and round input forms now hide after results are logged — same as KOTC. Only the inline summary card and 'Start New Session' button are shown. Clicking 'Start New Session' returns to the setup form.",
      "🏓 SESSION: Added live score preview that updates as you enter scores. When any round has a valid score, a '📊 Score Preview' panel appears below showing which team won each round, without needing to log first.",
      // ── KOTC ─────────────────────────────────────────────────────────
      "👑 KOTC: 'King Crowned: [name]' now appears on a second, larger line below '✅ 3 Matches Logged.' for clearer visual hierarchy.",
      // ── Tournament ───────────────────────────────────────────────────
      "🏆 TOURNAMENT: When 'Start Tournament' is clicked, the view now scrolls to the top of the screen automatically so the first round is immediately visible. Previously the user had to scroll up manually after clicking.",
      "🏆 TOURNAMENT: Champion announcement from previous tournament is now cleared when starting a new tournament (via 'Cancel' button or 'Reset' button). Was persisting across multiple tournaments in the same session.",
      // ── Admin login tracking ─────────────────────────────────────────
      "🔐 ADMIN: Player last-login date/time is now tracked in the player object whenever a player verifies their identity (from Welcome screen or PIN Verification screen). Admin can see this in the Roster — shown as '🕐 Jun 25, 2026, 02:30 PM' beneath the player's notes. Only visible to admin.",
      // ── Bug fixes from audit ──────────────────────────────────────────
      "🐛 FIX: KingOfCourt component was missing `const S = makeS(theme)` after an earlier refactor accidentally dropped it. This would have caused crashes whenever any S.* style was referenced in KOTC. Now restored.",
    ]
  },
  {
    version: "2.2.8",
    date: "2026-06-25",
    title: "Match Logging Polish",
    changes: [
      "🏓 SESSION: Round timestamps staggered so Round 3 appears on top in History (same fix as Tournament in v2.2.6). Round number now in notes: 'Session #1 Round 3 of 3'. Multiple sessions on the same day increment: Session #1, Session #2, etc.",
      "🏓 SESSION: Results now show as an inline card below the controls instead of a modal overlay that blocked the screen. The summary card (player stats, MVP, Most Improved, total points, match recap) appears inline and can be dismissed with 'Start New Session' — no more getting stuck.",
      "🏆 TOURNAMENT: Champion banner now shows the format label on one line and the players' names on a second, larger line underneath — instead of cramming them onto one long line.",
      "👑 KOTC: After results appear, the player selection form and match inputs are hidden — only the analysis panel and 'Start Another King of the Court' button remain visible. Tapping that button clears the analysis and shows the setup form again.",
      "📝 SESSION COUNTER: Multiple logs of the same format on the same day now get numbered automatically in notes — 'Session #1 Round 2 of 3', 'King of the Court #2: Match 1 of 3', 'Single Elimination #2: Semifinal'. Lets you distinguish them in History without confusion.",
    ]
  },
  {
    version: "2.2.7",
    date: "2026-06-25",
    title: "Quality of Life",
    changes: [
      // ── Session naming ────────────────────────────────────────────────
      "🏓 SESSION: Reverted nav tab label back to 'Session' (was briefly renamed 'Round Robin' in v2.2.6 — reverted because Session implies the social occasion of a play day, while Round Robin describes just the bracket mechanic). Added subtitle 'Session — 4-Player Round Robin' on the page itself so the format is clear without changing the familiar tab name.",
      // ── KOTC/Session decision ──────────────────────────────────────────
      "👑 ARCHITECTURE: Decided to keep King of the Court and Session as separate modes. KOTC has a distinct identity through its post-game analysis panel and 'King' framing. Consolidation would lose that personality and break existing user habits.",
      // ── Match type memory ─────────────────────────────────────────────
      "#2 MATCH TYPE: Custom match form now defaults to the last-used type (Singles or Doubles) instead of always defaulting to Singles. Preference saved to localStorage per device. If your group plays doubles, you'll only ever need to change it the first time.",
      // ── Per-format C/P badge ──────────────────────────────────────────
      "#3 C/P BADGE: Provisional (P) / Certified (C) badge in Roster now tracks per format. A player with 4 Singles + 4 Doubles = 8 total games was incorrectly showing as Certified (C). Now shows P if both formats are under 5, C if both are certified, or P/C if mixed (certified in one format only). Tooltip explains the per-format breakdown.",
      // ── View all matches link ─────────────────────────────────────────
      "#4 PROFILE: 'Recent Matches' section now shows count as 'N of M' (e.g. '5 of 23'). When there are more than 5 matches, a 'View all N matches in History →' button appears at the bottom that navigates to History pre-filtered for that player.",
      // ── Trash auto-purge ─────────────────────────────────────────────
      "#5 TRASH: Trash items older than 30 days are now auto-purged on mount. Deleted players, matches, and events from months ago are permanently gone — no one was going to restore them, and they were silently consuming storage.",
      // ── Undo last match ───────────────────────────────────────────────
      "#6 UNDO: After logging any match (Custom, Session, KOTC, or Tournament), a 30-second 'Undo' toast appears floating above the bottom nav. Tap '↩ Undo' to remove the just-logged match(es) from the database — useful for 'oops wrong score' moments without hunting through History. Batch undo: Session logs 3 matches at once, undoing removes all 3 together. Toast auto-dismisses if unused.",
    ]
  },
  {
    version: "2.2.6",
    date: "2026-06-25",
    title: "Profile, Changelog & KOTC Polish",
    changes: [
      // ── Profile stat grid redesign ────────────────────────────────────
      "👤 PROFILE: Redesigned the 6-block stats grid (Matches / Wins / Losses / Win% / Pt Win% / Streak). Was using flex-wrap with percentage basis — at Standard and Large zoom the blocks fell out of alignment leaving awkward orphans. Now a proper 3-column CSS Grid with explicit columns, so all 6 blocks line up cleanly at any zoom level.",
      "👤 PROFILE: Stat block labels now truncate gracefully with ellipsis if they overflow at very narrow widths, instead of pushing the layout sideways.",
      // ── Changelog collapsible ─────────────────────────────────────────
      "📜 CHANGELOG: Each version is now a collapsible accordion. Latest version expanded by default; older versions collapsed showing only version number, title, and date. Tap any version header to expand or collapse. Chevron rotates 180° when open.",
      "📜 CHANGELOG: Bullet count shown in collapsed-then-opened state so you know how much history is in each release.",
      // ── Match ordering ────────────────────────────────────────────────
      "📋 HISTORY: Fixed match ordering for multi-match logging sessions. Previously all matches in a tournament or KOTC shared the exact same timestamp, so the stable sort left them in insertion order (SF1, SF2, Final) — backwards in a reverse-chronological view. Now each match within a session gets a 1-second timestamp offset so Final appears above SF2 above SF1 in History.",
      // ── KOTC analysis ─────────────────────────────────────────────────
      "👑 KOTC: After logging all 3 matches, a new 'King of the Court — Analysis' panel appears showing the full standings podium with explanations of why each player landed where they did (wins count, point differential, tiebreaker reasoning).",
      "👑 KOTC: Match recap section in the analysis panel shows all 3 matchups with scores and winning team highlighted.",
      "👑 KOTC: Match notes now include match number (e.g. 'King of the Court: Match 1 of 3') instead of the generic 'Winners stay on court'. Easier to follow in match history.",
      "👑 KOTC: 'Start Another' button on the analysis panel clears it and returns to the setup screen.",
      // ── Session → Round Robin rename ──────────────────────────────────
      "🏷️ RENAME: Match-mode tab 'Session' renamed to 'Round Robin' to match the functional behavior (it's a 4-player round-robin matchup). Also renamed in 繁中 (循環賽) and 简中 (循环赛). The Tournament tab's 'Round Robin' format is the multi-team generalization of this same concept for 3–6 teams.",
    ]
  },
  {
    version: "2.2.5",
    date: "2026-06-24",
    title: "Privacy & Polish",
    changes: [
      // ── Privacy fix ───────────────────────────────────────────────────
      "🔐 PRIVACY: Logout now wipes all sessionStorage form drafts (match logs, event drafts, tournament brackets, new-player forms, etc.). Previously, when user A logged out and user B logged in on the same device, user B could see A's half-completed entries. Cloud-synced match data is unaffected — only local in-progress drafts are cleared.",
      // ── Calendar overflow ─────────────────────────────────────────────
      "📅 LARGE DISPLAY: Fixed History and Events calendars overflowing the screen at Large zoom. Day cells were hardcoded to a fixed pixel width that didn't shrink to fit the container. Now responsive — cells size to fit available width (capped at 36*zoom) with square aspect ratio preserved.",
      // ── Reset buttons ─────────────────────────────────────────────────
      "🔄 RESET: Added Reset/Clear button alongside the Log Match button on Custom Match, Session, King of the Court, and Tournament Setup forms. One tap clears all in-progress fields (players, scores, notes, settings) so you can start fresh instead of editing each field individually.",
    ]
  },
  {
    version: "2.2.4",
    date: "2026-06-24",
    title: "Tournament Formats",
    changes: [
      // ── Champion bug fix ──────────────────────────────────────────────
      "🐛 FIX: Tournament champion calculation was wrong. The old code compared an array (winning team) against a number (winner index), so the comparison was always false — the champion was always announced as SF2's team, even when SF1's team won the final. Fixed by tracking the actual winning team via match.teams[match.winner].",
      // ── Format-aware Tournament rebuild ───────────────────────────────
      "🏆 TOURNAMENT: Complete rebuild as a format-aware state machine. New top-level format selector with three options: Single Elimination, Double Elimination, and Round Robin.",
      "🏆 TOURNAMENT: Single-screen collapsible bracket UI replaces the old multi-step screen flow. All visible rounds shown at once; completed rounds auto-collapse with a one-line summary; tap to expand and review.",
      "🏆 TOURNAMENT: Future rounds remain hidden until all prior rounds are complete — keeps focus on the round currently being played.",
      // ── Single Elimination ────────────────────────────────────────────
      "🥇 SINGLE ELIMINATION: 4 teams · 2 semifinals → final. Winners propagate forward automatically; real finalist names appear in the Final card as soon as SF scores are valid.",
      // ── Double Elimination ────────────────────────────────────────────
      "🥈 DOUBLE ELIMINATION: 4 teams · 2 WB semifinals → WB Final + LB Final → Grand Final. Five matches total. WB-SF losers drop into the Losers Bracket Final; LB winner faces the WB winner in the Grand Final.",
      "🥈 DOUBLE ELIMINATION: All bracket positions populate automatically as scores are entered — no manual seeding between rounds.",
      // ── Round Robin ───────────────────────────────────────────────────
      "🥉 ROUND ROBIN: 3–6 teams configurable, all `n*(n-1)/2` matches generated at once. Live standings table updates as you log matches.",
      "🥉 ROUND ROBIN: Champion determined by most wins; ties broken by point differential. Top 3 marked 🥇🥈🥉 in the standings.",
      // ── Per-match notes ───────────────────────────────────────────────
      "📝 TOURNAMENT: Each match logged separately with proper notes label. Example: 'Single Elimination: Semifinal', 'Double Elimination: Winners SF', 'Round Robin: Match 4', 'Double Elimination: Grand Final'. Venue field stays clean.",
      // ── Legends ───────────────────────────────────────────────────────
      "📖 LEGENDS: Added new 'Tournament Formats' accordion in the Features tab documenting SE, DE, RR with team counts, total matches, and use cases.",
      "📖 LEGENDS: Updated the existing Tournament match-mode entry to reference the three available formats.",
    ]
  },
  {
    version: "2.2.3",
    date: "2026-06-24",
    title: "Tournament Rebuild",
    changes: [
      // ── Venue / Notes data hygiene ────────────────────────────────────
      "🏷️ DATA: Fixed mode names being misused as venue values. Session, King of the Court, and Tournament matches no longer get 'Session Play', 'King of the Court', or 'Tournament SF1/2/Final' stuffed into the Venue field.",
      "🏷️ DATA: Mode context now lives in the Notes field where it belongs. Example: a KOTC match's notes now read 'King of the Court: Winners stay on court' (or the user's actual notes appended). Tournament matches read 'Tournament Semifinal 1', etc. Venue field stays clean for actual location data only.",
      // ── Tournament bracket rebuild ────────────────────────────────────
      "🏆 TOURNAMENT: Complete flow rebuild. Was a single confusing screen showing all 3 rounds at once with placeholder text in the final. Now a proper step-by-step bracket: Setup → SF1 → SF2 → Final.",
      "🏆 TOURNAMENT: Each step shows progress indicator ('Round 2 of 3 · SF1 ✓ · SF2 → Final') so users always know where they are.",
      "🏆 TOURNAMENT: Every step has a ← Back button. Going back doesn't lose data — team assignments and prior scores persist via the form-state system added in v2.2.2.",
      "🏆 TOURNAMENT: SF2 step shows the SF1 winner banner for context as you enter SF2 scores.",
      "🏆 TOURNAMENT: Final step now displays the REAL finalist names (computed from SF results) instead of generic 'Winner SF1' / 'Winner SF2' placeholder text.",
      "🏆 TOURNAMENT: 'Log Match' submit button only appears on the Final step — no more accidental early submission.",
      "🏆 TOURNAMENT: Each step validates its scores before advancing. Bad scores show error inline; can't skip ahead with invalid data.",
    ]
  },
  {
    version: "2.2.2",
    date: "2026-06-24",
    title: "The Continuity Update",
    changes: [
      // ── Theme polish ──────────────────────────────────────────────────
      "🎨 MATCH OF THE DAY: Card color now responds to your accent theme choice. Only upsets stay gold (universal upset signal); tight matches and normal matches now use your chosen accent color.",
      // ── Layout fixes ──────────────────────────────────────────────────
      "🏆 TOURNAMENT: Fixed player name overflow. Team names now stack above the score input row instead of competing for horizontal space.",
      "🏓 SESSION (Round Robin): Same layout fix — team names on their own row above scores. No more overflow with long names.",
      "👑 KING OF THE COURT: Same layout fix applied for consistency.",
      // ── Balanced Team Suggester wiring ────────────────────────────────
      "🤝 BALANCED TEAM SUGGESTER: Clicking a suggestion now highlights the matching round in the round-robin schedule below, with a ✅ Fairest badge. Clarification banner explains you'll still play all 3 rounds.",
      "💡 SAVE GROUP: Added inline help text explaining the feature — 'Save this 4-player lineup for quick re-selection later.'",
      // ── Name shortening system ────────────────────────────────────────
      "👤 NAME SHORTENING: Added centralized shortName() helper in engine.js — abbreviates 'Allen Tw' → 'Allen T.' Used consistently across the app.",
      "👤 LARGE ZOOM AUTO-ABBREVIATE: When zoom level is Large (≥1.13), all player names automatically shorten in dropdowns, lists, and badges — even short names like 'Allen T'. Profile pages always show full names.",
      "👤 DROPDOWNS: All player selection dropdowns across Match modes (Custom, Session, KOTC, Tournament) now use shortened names for cleaner display.",
      // ── Form persistence ──────────────────────────────────────────────
      "💾 FORM PERSISTENCE: Added usePersistentFormState hook in Shared.jsx — wraps useState with sessionStorage. Forms now remember your in-progress work across accidental tab-aways.",
      "💾 EVENTS: New-event form (title, date, venue, notes, invitees) persists. Cleared automatically after successful save.",
      "💾 LOG MATCH: Player picks, scores, team names, venue, notes all persist across navigation.",
      "💾 SESSION: Player IDs, round scores, notes all persist.",
      "💾 KING OF THE COURT: Same persistence applied.",
      "💾 TOURNAMENT: Team assignments, semi/final scores, notes all persist.",
      "💾 NEW PLAYER: Name, ratings, notes, PIN all persist while you're adding a player.",
      "🔄 AUTO-CLEAR ON SUCCESS: All persisted form state clears after successful submit. Clicking the Log button gives you a fresh form for the next entry.",
    ]
  },
  {
    version: "2.2.1",
    date: "2026-06-24",
    title: "Mobile Polish",
    changes: [
      // ── Events form layout ────────────────────────────────────────────
      "📅 EVENTS: Date/Time and Venue fields now stack vertically (was side-by-side grid) so the datetime picker doesn't overflow on narrow mobile screens.",
      "📅 EVENTS: Date/Time input now full-width with explicit box-sizing for reliable rendering on all screen widths.",
      // ── iOS PWA safe-area support ─────────────────────────────────────
      "📱 iOS PWA: Added safe-area-inset handling for notch / Dynamic Island / home indicator when the app is saved to iPhone home screen. Header, scroll area, and bottom nav now respect device insets.",
      "📱 iOS PWA: Added viewport-fit=cover meta tag injection in main.jsx — required for env(safe-area-inset-*) to activate on iOS.",
      // ── Long name handling ────────────────────────────────────────────
      "🏆 RANK TAB: Long player names (12+ characters) are now abbreviated to 'FirstName L.' (last-name initial only) to prevent overflow at any zoom level. Full name shown on hover/long-press.",
      "👥 ROSTER: Same name abbreviation logic applied for consistency.",
      // ── C/P badge relocation ──────────────────────────────────────────
      "🏆 RANK TAB: Removed C/P (Certified/Provisional) badges from leaderboard rows for cleaner appearance.",
      "👥 ROSTER: Added C/P badges next to player names — green C for Certified (5+ matches), amber P for Provisional (under 5).",
    ]
  },
  {
    version: "2.2.0",
    date: "2026-06-24",
    title: "The Polish Update",
    changes: [
      // ── Events: full calendar redesign ────────────────────────────────
      "📅 EVENTS: Complete redesign — added month/year calendar at the top (matching History tab) with activity dots showing event count per day.",
      "📅 EVENTS: Tap any day to filter events to that date; tap again to clear. Today is outlined; selected day is filled.",
      "📅 EVENTS: New search bar searches across event title, venue, notes, AND invitee player names in one query.",
      "📅 EVENTS: Added optional notes field on events with searchable textarea, displayed with italic quote styling on event cards.",
      "📅 EVENTS: When admin creates event after tapping a calendar day, the form pre-fills with that date at 6 PM.",
      "📅 EVENTS: Restored event creation for all users (was accidentally admin-gated during calendar rewrite).",
      "📅 EVENTS: Regular users can now edit existing events (delete remains admin-only).",
      "📅 EVENTS: Required field validation — Event Name, Date & Time, and Venue now marked with red * and show clear error message if missing.",
      "📅 EVENTS: Invitee dropdown now prioritizes your starred players at the top (alphabetical within each group), with ★ indicator shown next to favorited names.",
      // ── History: layout reorder ───────────────────────────────────────
      "📋 HISTORY: Section reorder — Calendar now at top, Filter & Search below it, Match Results last. Matches the Events tab flow.",
      // ── Navigation: tab rename ────────────────────────────────────────
      "🏠 NAVIGATION: Renamed bottom-nav 'Rank' tab to 'Home' with 🏠 icon (better reflects that it's a multi-widget dashboard, not just rankings).",
      // ── Dashboard: hide-by-default cards ──────────────────────────────
      "⚡ DASHBOARD: Match of the Day card now collapsed by default — shows only title and chevron. Tap to expand for full match details.",
      "📈 DASHBOARD: Player of the Month card now collapsed by default — shows only title and chevron. Tap to expand for full medal podium.",
      "🏠 DASHBOARD: Removed Rating Confidence badge from leaderboard rows in Rank tab for cleaner appearance.",
      // ── Roster: simplified UI ─────────────────────────────────────────
      "👥 ROSTER: Removed G/W/L stats and rating badges from player cards for a cleaner, name-focused appearance.",
      "👥 ROSTER: Removed 'Sort by Rating' option from sorting dropdown (no longer applicable). Default sort changed to 'Starred'.",
      // ── Player of the Month: eligibility ──────────────────────────────
      "📈 PoTM: Added eligibility thresholds — requires 10+ total games AND 5+ games within the 30-day window. Prevents brand-new players from winning via lucky provisional matches.",
      // ── Large display fixes ───────────────────────────────────────────
      "📱 LARGE DISPLAY: Fixed cramping at Large zoom on Roster and Rank tabs. Rows now use flex resilience — info column shrinks gracefully with ellipsis, right column stays fixed.",
      // ── Identity verification flow ────────────────────────────────────
      "🔐 IDENTITY: Added Cancel button to Verify Identity screen so users who accidentally selected wrong player can back out cleanly.",
      "🔐 IDENTITY: Added Admin Login option to Verify Identity screen — users can elevate to admin from anywhere.",
      "🔐 IDENTITY: PIN-less players now auto-verified without entering a PIN (was getting stuck in infinite verify loop).",
      // ── PIN management ────────────────────────────────────────────────
      "🔒 PIN: Added Set/Change/Remove PIN management in Settings > My Profile. Requires current PIN to change, confirmation to set new.",
      // ── Security & permissions ────────────────────────────────────────
      "🔒 SECURITY: Locked starting ratings to admin-only — regular users cannot edit Singles/Doubles ratings from either Profile page OR Roster pencil edit form.",
      "🔒 SECURITY: Roster edit form shows read-only rating display with 🔒 icon for non-admin users.",
      "🔒 SECURITY: saveEdit in Players.jsx hardened to preserve existing ratings/PIN for non-admin saves (defense-in-depth).",
      "🔒 SECURITY: Removed delete button from match cards in Player Profiles for regular users — delete is now admin-only everywhere.",
      // ── Welcome screen ────────────────────────────────────────────────
      "🎨 WELCOME: Welcome modal now scrollable at any zoom level (was getting clipped at Large zoom).",
      "🎨 WELCOME: Added S/M/L zoom adjuster to Welcome screen top bar, alongside language selector.",
      "🎨 WELCOME: PIN-less players see green '✓ No PIN required' note instead of disabled PIN input.",
      // ── Partner Matrix ────────────────────────────────────────────────
      "🤝 PARTNER MATRIX: Replaced N×N grid with player-picker chip row + ranked partner cards. Tap any player to see their partnerships ranked.",
      "🤝 PARTNER MATRIX: Added 'Top Partnerships' leaderboard showing top 5 pairings by win rate (min 2 matches).",
      "🤝 PARTNER MATRIX: Fixed terminology — partner record now correctly labeled 'matches' instead of 'games'.",
      "🤝 PARTNER MATRIX: Added separate game-level W/L record (e.g. '5–3 in games') alongside match record.",
      // ── Starting ratings ──────────────────────────────────────────────
      "🎯 RATINGS: Edit Starting Rating now has separate Singles and Doubles inputs (was single combined field). Both saved independently.",
      // ── Trash system ──────────────────────────────────────────────────
      "🗑️ TRASH: Player deletion now strips computed fields (gamesPlayed, wins, etc.) before storing — only raw player data goes to trash.",
      "🗑️ TRASH: Rewrote Trash view with distinct rich cards for Players (avatar, ratings, join date, ID), Matches (score, venue), and Events (date, venue).",
      "🗑️ TRASH: Restore is admin-only for Players and Events. Items sorted by most recently deleted first.",
      // ── Legends page ──────────────────────────────────────────────────
      "📖 LEGENDS: Redesigned as 3-tab layout (Ratings / Features / Icons) with sticky tabs that stay pinned while scrolling content.",
      "📖 LEGENDS: All sections now collapsible accordions with rotating chevron. First section of each tab opens by default.",
      "📖 LEGENDS: Added Match vs Game terminology section with stat-by-stat breakdown table and worked margin example.",
      "📖 LEGENDS: Added PickleRank vs DUPR comparison — 6-row table covering model, margin method, scale, match types, uncertainty, formula transparency.",
      "📖 LEGENDS: Added Head-to-Head Statistics section with 4 sub-topics (Singles, Partners, Oppositions, Rating Differential) — fully trilingual.",
      "📖 LEGENDS: Restored all detailed content lost in 3-tab transition — Match Modes breakdown, Confidence two-factor explanation, Score Rules, Radar Chart metrics, Fun Stats, Full Replay Architecture.",
      // ── Settings: appearance ──────────────────────────────────────────
      "🎨 SETTINGS: Added 5 new lighter background modes — Warm Cream, Fresh Mint, Soft Lavender, Peach Blossom, Paper White.",
      "🎨 SETTINGS: Added 5 new English typography options — Inter, Poppins, Merriweather, Roboto, JetBrains Mono. Loaded via Google Fonts at startup.",
      "🎨 SETTINGS: Added 5 new accent colors — Cyan, Gold, Magenta, Teal, Indigo.",
      "🎨 SETTINGS: Per-player appearance preferences (theme/font/zoom keyed by player ID) — each logged-in player remembers their own settings.",
      // ── Build & deployment ───────────────────────────────────────────
      "🚀 BUILD: Added netlify.toml with SECRETS_SCAN_SMART_DETECTION_ENABLED=false and SPA redirect to fix Firebase API key false-positive build failures.",
      "🚀 FIREBASE: Extracted firebase.js with experimentalForceLongPolling=true for networks that block WebSockets.",
      // ── Bug fixes ─────────────────────────────────────────────────────
      "🐛 FIX: Blank screen when admin clicked any player profile (setUser prop missing from Profile destructuring AND App.jsx Profile render).",
      "🐛 FIX: Trash records self-restoring on refresh (Firestore was silently rejecting nested arrays — trash array now JSON-serialized before save, same as matches).",
      "🐛 FIX: Missing handleFileAdd/handleEditFileAdd functions in Player edit form caused blank screen on roster edit.",
      "🐛 FIX: Personal Goal section refactored from JSX IIFE into proper React component to comply with Rules of Hooks.",
      "🐛 FIX: Legends sticky tabs now actually stick (removed S.view wrapper that was breaking sticky positioning context).",
      "🐛 FIX: Upgraded t() to accept fallback argument so t(key, fallback) calls don't display raw key strings.",
    ]
  },
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
  { id: "lightblue", label: "Sky Blue", bg: "#e0f2fe", card: "#ffffff", nav: "#ffffff", border: "#bae6fd", text: "#0369a1", sub: "#0284c7", faint: "#bae6fd", invert: true },
  // ── New lighter modes ────────────────────────────────────────────────────
  { id: "cream", label: "Warm Cream", bg: "#faf6f0", card: "#ffffff", nav: "#ffffff", border: "#e8dfd0", text: "#3a2e20", sub: "#8a7860", faint: "#d8cdb8", invert: true },
  { id: "mint", label: "Fresh Mint", bg: "#ecfdf5", card: "#ffffff", nav: "#ffffff", border: "#a7f3d0", text: "#064e3b", sub: "#047857", faint: "#a7f3d0", invert: true },
  { id: "lavender", label: "Soft Lavender", bg: "#f5f3ff", card: "#ffffff", nav: "#ffffff", border: "#ddd6fe", text: "#4c1d95", sub: "#7c3aed", faint: "#ddd6fe", invert: true },
  { id: "peach", label: "Peach Blossom", bg: "#fff5f0", card: "#ffffff", nav: "#ffffff", border: "#fed7c3", text: "#7c2d12", sub: "#c2410c", faint: "#fed7c3", invert: true },
  { id: "paper", label: "Paper White", bg: "#fafafa", card: "#ffffff", nav: "#ffffff", border: "#e5e5e5", text: "#1a1a1a", sub: "#666666", faint: "#cccccc", invert: true }
];

export const APP_ACCENTS = [
  { id: "green", label: "Emerald", hex: "#50c878" },
  { id: "blue", label: "Azure", hex: "#3b82f6" },
  { id: "purple", label: "Plum", hex: "#c084fc" },
  { id: "red", label: "Crimson", hex: "#f87171" },
  { id: "orange", label: "Amber", hex: "#f59e0b" },
  // ── New accent colors ────────────────────────────────────────────────────
  { id: "cyan", label: "Cyan", hex: "#06b6d4" },
  { id: "gold", label: "Gold", hex: "#eab308" },
  { id: "magenta", label: "Magenta", hex: "#ec4899" },
  { id: "teal", label: "Teal", hex: "#14b8a6" },
  { id: "indigo", label: "Indigo", hex: "#6366f1" }
];

export const APP_FONTS = [
  { id: "sans", label: "Heiti (黑體)", css: "'Noto Sans TC', 'Microsoft JhengHei', 'Taipei Sans TC', sans-serif" },
  { id: "serif", label: "Mingti (明體)", css: "'Noto Serif TC', 'PMingLiU', 'MingLiU', serif" },
  { id: "kai", label: "Kaiti (楷體)", css: "'TW-Kai', 'BiauKai', 'Kaiti', serif" },
  { id: "creative", label: "Creative (圆體)", css: "'jf-openhuninn-2.0', 'cwTeXHei', 'Noto Sans TC', sans-serif" },
  // ── New English typography options ────────────────────────────────────────
  { id: "inter",       label: "Inter (Modern Sans)",          css: "'Inter', system-ui, sans-serif" },
  { id: "poppins",     label: "Poppins (Friendly Rounded)",   css: "'Poppins', 'Segoe UI', sans-serif" },
  { id: "merriweather",label: "Merriweather (Classic Serif)", css: "'Merriweather', 'Georgia', serif" },
  { id: "roboto",      label: "Roboto (Clean Geometric)",     css: "'Roboto', 'Helvetica', sans-serif" },
  { id: "jetbrains",   label: "JetBrains Mono (Monospace)",   css: "'JetBrains Mono', 'Consolas', monospace" }
];

export const TRANSLATIONS = {
  en: {
    rank: "Rank", roster: "Roster", session: "Session", custom: "Custom", history: "History", 
    h2h: "H2H", matches_tab: "Matches", undo_match: "Match logged", undo_session: "Session logged", undo_kotc: "KOTC logged", undo_tourney: "Tournament logged", dashboard: "PickleRank", dashboard_sub: "Private Rating Tracker", 
    players: "Players", players_sub: "Manage roster", session_title: "Session", session_sub: "Round Robin Auto-Match", 
    log: "Custom Match", log_sub: "Record a result", history_title: "Match History", history_sub: "All results", 
    compare: "H2H Compare", compare_sub: "Head to head", stats: "Group Stats", stats_sub: "Insights & records", 
    settings: "Settings", settings_sub: "Data & appearance", leaderboard: "🏆 Leaderboard", recent_matches: "⚡ Recent Matches", 
    no_players: "No players yet.", add_players_btn: "Add Players", no_matches: "No matches yet.", log_first_match: "Log First Match", 
    add_player_sec: "Add Player", name_lbl: "Player Name", starting_rating: "Starting Rating", optional_dupr: "(optional — real DUPR rating)", 
    rating_range_hint: "Must be 1.500 – 6.500", dupr_tiers_hint: "DUPR tiers: 2.0–2.5 Beginner · 2.5–3.5 Recreational · 3.5–4.5 Intermediate · 4.5–5.5 Advanced · 5.5+ Elite", add_player_btn: "Add Player", roster_lbl: "Roster", edit_details: "Edit player details", cancel: "Cancel", confirm: "Confirm", save: "Save", rename: "Rename", remove_player_q: "Remove this player?", match_history_stays: "Match history stays.", base_rating_sec: "🎯 Starting / Base Rating", base_rating_desc: "Rating all match calculations start from.", base_rating_lbl: "Base rating", edit_starting_rating: "✏️ Edit Starting Rating", new_starting_rating: "New starting rating (1.500 – 6.500)", save_recalc: "Save & Recalculate", rating_trend_desc: "Play more matches to see rating trend.", reset_rating_btn: "Reset Rating", reset_rating_q: "Reset rating to 3.000?", rating_history_cleared: "Rating history will be cleared.", best_win_sec: "🏅 Best Win", match_type_sec: "Match Type", win_to_lbl: "Win to:", win_by_lbl: "Win by:", point: "Point", points: "Points", select_prompt: "Select…", team_name_opt: "Team Name (optional)", player_a: "Player A", player_b: "Player B", player_1: "Player 1", player_2: "Player 2", game_scores_sec: "Game Scores", score_win_by_2: "First to {winTo}, win by {winBy}.", add_game_btn: "+ Add Game", date_venue_sec: "Date & Venue", date_time_lbl: "Date & Time", venue_opt: "Venue (optional)", log_match_btn: "Log Match & Update Ratings", filter_search_sec: "Filter & Search", search_placeholder: "Search matches...", results_lbl: "Results", delete_match_q: "Delete this match?", ratings_recalculated: "Ratings will be recalculated.", rating_comp_sec: "Rating Comparison", overview_sec: "📊 Overview", records_sec: "🏅 Records", venues_lbl: "Venues", bg_mode_sec: "🌗 Background Mode", accent_style_sec: "🎨 Accent Style", typography_sec: "Aa Typography / 字體", backup_restore_sec: "💾 Backup & Restore", backup_desc: "Export your data for backup or spreadsheet analysis.", json_backup_btn: "📤 JSON Backup", csv_export_btn: "📊 CSV Export", import_json_btn: "📥 Import JSON Data", summary_sec: "📋 Summary", danger_zone_sec: "⚠️ Danger Zone", danger_desc: "Permanently deletes all data. Export first if needed.", clear_all_btn: "🗑️ Clear All Data", about_sec: "ℹ️ About", about_desc: "DUPR-style rating tracker for private pickleball groups. ELO-based algorithm with score-margin weighting. Ratings 1.5–6.5. Data stored locally.", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. Select Foursome", load_saved_group: "Load Saved Group", save_group_btn: "Save Group", select_4_unique: "Select 4 unique players.", rr_matchups: "2. Round Robin Matchups", log_score_btn: "Log Score", save_score_btn: "Save Score", match_logged_ok: "✅ Match Logged!", see_history_btn: "See History →", edit_match_title: "✏️ Edit Match", branding_sec: "✨ App Branding", logo_text: "Logo Text / Emoji", upload_logo: "Upload Image Logo", display_size_sec: "🔍 Display Size", size_compact: "Compact", size_standard: "Standard", size_large: "Large", synergy_rivalry_sec: "🤝 Synergy & Rivalry", best_partner: "Best Partner", nemesis: "Nemesis", win_rate: "Win", vs_them: "vs them", worst_partner: "⚠️ Chemistry Test", easy_target: "🎯 Easy Target", admin_sec: "🔒 Security & Admin", admin_status: "Status", user_mode: "User Mode (Read/Add/Edit)", admin_mode: "Admin Mode (Full Access)", passcode_lbl: "Passcode", login_btn: "Admin Login", logout_btn: "Logout", change_pass_btn: "Change Passcode", wrong_pass: "Incorrect passcode.", pass_updated: "Passcode updated.", badges_sec: "🎖️ Achievements", badge_centurion: "Centurion (100+ Games)", badge_ironman: "Ironman (50+ Games)", badge_slayer: "Giant Slayer (Major Upset)", badge_streaker: "Unstoppable (5+ Win Streak)", badge_sharp: "Sharpshooter (60%+ Win Rate)", no_badges: "Play more matches to earn achievements!", all_players: "All Players", view_all_matches: "View All Matches", singles_wr: "Singles Win%", doubles_wr: "Doubles Win%", photo: "Photo", change_photo: "Change", search_players_placeholder: "Search players...", sort_by: "Sort by:", sort_rating: "Rating (High to Low)", sort_fn: "First Name (A-Z)", sort_ln: "Last Name (A-Z)", sort_games: "Games Played", err_enter_name: "Enter a name.", err_exists: "Player already exists.", err_empty: "Name cannot be empty.", err_taken: "Name already taken.", err_select_players: "Select players.", err_select_singles: "Select 1 player per side", err_select_doubles: "Select 2 players per side", err_select_4: "Select 4 players.", err_same_player: "Same player on both teams", err_duplicate: "Select unique players.", err_valid_scores: "Valid scores needed.", err_invalid_score_fmt: "Invalid score. First to {winTo}, win by {winBy}.", err_add_game: "Add at least one game.", err_clear_winner: "Need clear winner.", err_error_scores: "Error scores.", h2h_btn: "⚔️ Compare Players (H2H)", log_custom_btn: "➕ Log Custom Match", rating_elite: "Elite", rating_advanced: "Advanced", rating_intermediate: "Intermediate", rating_recreational: "Recreational", rating_beginner: "Beginner", stat_matches: "🎮 Matches", stat_wins: "✅ Wins", stat_losses: "❌ Losses", stat_win_pct: "📈 Win%", stat_w_streak: "🔥 W-Streak", stat_l_streak: "🧊 L-Streak", rating_history_sec: "📈 Performance Trend", spark_start: "Start", spark_peak: "Peak", spark_now: "Now", awaiting_prior_round: "Awaiting prior round", rating_trajectory_sec: "Rating Trajectory", beat_opp: "Beat {name}", upset_of: "upset of", overview_total_matches: "Total Matches", overview_singles: "Singles", overview_doubles: "Doubles", overview_games_played: "Games Played", overview_players: "Players", overview_venues: "Venues", record_most_matches: "Most Matches", record_top_rated: "Top Rated", record_hot_streak: "Hot Streak", record_biggest_upset: "Biggest Upset", record_beat_higher: "beat higher-rated opponent by", recent_form: "Recent Form", no_data: "No data", match_predictor: "🔮 Match Predictor", prob_win: "Win Probability", if_wins: "If {name} wins:", expected_delta: "Expected Delta", singles_title: "Singles Rank", doubles_title: "Doubles Rank", verified_status: "Certified", provisional_status: "Provisional", teams: "Teams", performance_profile: "👤 Performance Profile", kotc: "King of Court", kotc_desc: "Play 3 games, rotating partners. The player with the most wins (and point differential) is the King!", round: "Round", diff: "Diff", log_kotc: "Log Tournament", tournament: "Tournament", tourney_setup: "Bracket Setup", bracket_size: "Bracket Size", team: "Team", generate_bracket: "Generate Bracket", qf: "Quarterfinals", sf: "Semifinals", final: "Final", winner: "Winner", log_tournament: "Log Tournament", sort_starred: "Starred First (A-Z)", select_teams: "Select Teams", start_tournament: "Start Tournament", singles_rating: "DUPR Singles Rating", doubles_rating: "DUPR Doubles Rating", appearance_sec: "🎨 Appearance", fun_stats_sec: "Fun Stats", my_profile_sec: "👤 My Profile", profile: "Player Profile", link_device_desc: "Link this device to your player profile to show your 'Online' status to the group.", guest_not_linked: "Guest / Not Linked", exit_admin_btn: "Exit Admin Mode (Logout)", new_passcode_placeholder: "New Passcode", app_initials_placeholder: "App Initials (e.g. PR)", click_to_change_logo: "Click to change logo", version_lbl: "Version", view_changelog_btn: "View Changelog", unlock_fun_stats: "Play more matches to unlock Fun Stats!", requires_min_games: "(Requires min. 2 games with a partner)", rating_skip_hint: "Skip if unsure — defaults to 3.000", events: "Events", events_sub: "Upcoming sessions", trash: "Trash Can", trash_sub: "Restore deleted items", legends: "Legends", legends_sub: "Glossary & Achievements", changelog: "Changelog", changelog_sub: "App Updates & History", rankings: "Rankings", edit_session: "EDIT SESSION", new_session: "NEW SESSION", event_name: "Event Name", venue: "Venue", invite_players: "INVITE PLAYERS", select_players_invite: "Select players to invite...", selected: "Selected:", save_changes: "Save Changes", create_session: "Create Session", upcoming_sessions: "UPCOMING SESSIONS", no_scheduled_sessions: "No scheduled sessions.", invited: "Invited:", tbd: "TBD", local_court: "Local Court", add_new_player_btn: "➕ Add New Player", welcome_setup_desc: "👋 Welcome! Fill out the form below to add yourself to the roster. You MUST create a 4-Digit PIN (hint: use your birth date, MMDD) to secure your account.", notes_optional: "Notes (Optional)", paddle_playstyle_hint: "Paddle type, playstyle, etc.", security_pin_lbl: "Security PIN (e.g., MMDD)", pin_placeholder: "4-Digit PIN (e.g., MMDD)", notes_lbl: "Notes", player_notes_placeholder: "Player notes...", pigeon: "Pigeon", match_type_singles: "Singles", match_type_doubles: "Doubles", legends_icons_badges: "Visual Icons & Badges", legend_prov_title: "Provisional Rating", legend_prov_desc: "Player has fewer than 5 matches recorded. Their rating will fluctuate more wildly until it solidifies.", legend_conf_title: "Confirmed Rating", legend_conf_desc: "Player has played 5 or more matches. Their rating is now stabilized.", legend_dupr_title: "DUPR Linked", legend_dupr_desc: "Player's starting base rating was imported directly from DUPR.", legend_hot_title: "Hot Streak", legend_hot_desc: "Player has won 3 or more games in a row.", legend_cold_title: "Cold Streak", legend_cold_desc: "Player has lost 3 or more games in a row.", legend_fav_title: "Favorited", legend_fav_desc: "Player is pinned to the top of your Roster and Selection screens.", legends_radar: "Radar Chart Metrics", legend_win_pct: "Win %", legend_win_pct_desc: "Overall percentage of matches won across all formats.", legend_power: "Power (S)", legend_power_desc: "Based on the player's Singles ELO rating. Higher rating expands this axis.", legend_synergy: "Synergy (D)", legend_synergy_desc: "Based on the player's Doubles ELO rating. Higher rating expands this axis.", legend_upset: "Upset Factor", legend_upset_desc: "Measures the ability to defeat opponents with significantly higher ratings.", legend_form: "Form", legend_form_desc: "Momentum indicator based on recent active win/loss streaks.", legends_fun_stats: "Fun Stats (Match History)", legend_partner_desc: "The teammate with whom you have the highest win percentage (minimum 2 games).", legend_nemesis_desc: "The specific opponent who has defeated you the most times.", legend_pigeon_desc: "The specific opponent you have defeated the most times.", legends_achievements: "Milestone Achievements", legend_centurion_desc: "Played 100 or more total matches.", legend_ironman_desc: "Played 50 or more total matches.", legend_on_fire_desc: "Achieved a dominant win streak of 5 or more matches.", legend_sharp_desc: "Maintained an overall win rate of 60%+ (minimum 10 matches required).", legend_giant_slayer_desc: "Defeated an opponent with a significantly higher ELO rating to earn a massive point boost (+0.30 or higher in a single match).", base_lbl: "Base:", opp_avg_lbl: "Opp Avg:", prob_lbl: "Prob:", k_adj_lbl: "K-Adj:", trash_empty: "Trash is empty.", match_label: "Match", deleted_lbl: "Deleted:", restore_btn: "Restore", empty_trash_btn: "Empty Trash Can", empty_trash_confirm: "Permanently empty the trash? This cannot be undone.", welcome_title: "Welcome to PickleRank!", welcome_desc_admin: "Enter the global administrator passcode.", welcome_desc_user: "Who is holding this device? This helps us track stats and pre-fill your match logs.", on_roster_btn: "I'm on the Roster", new_player_btn: "New Player", select_name_placeholder: "Select your name...", admin_pass_placeholder: "Admin Passcode", invalid_pin_msg: "Invalid PIN or no PIN set by Admin.", incorrect_pass_msg: "Incorrect Passcode.", setup_awesome_msg: "Awesome! We'll take you to the Add Player screen so you can enter your name, DUPR ratings, and set up your secure PIN.", save_enter_app: "Save & Enter App", enter_as_admin: "Enter as Admin", go_to_setup: "Create Profile", return_player_login: "Return to Player Login", verify_identity: "Verify Identity", verify_desc: "Welcome back, {name}. Enter your 4-digit PIN (hint: your birth date, MMDD) to continue.", unlock: "Unlock", incorrect_pin: "Incorrect PIN", create_profile: "Create Profile", admin_login: "Admin Login", group_insights: "Group Insights", insights_matches: "Matches", insights_fav_day: "Fav Day", insights_est_time: "Est. Time", insights_most_at: "Most played at", match_notes_sec: "Match Notes (Optional)", session_notes_sec: "Session Notes (Optional)", event_notes_sec: "Event Notes (Optional)", kotc_notes_sec: "Event Notes (Optional)", kotc_warning: "Please enter valid scores.", option_lbl: "Option", semifinals: "Semifinals", finals: "Final", grand_final: "Grand Final", champions: "Champions", winners_bracket_sf: "Winners Bracket Semifinals", winners_bracket_final: "Winners Bracket Final", losers_bracket_final: "Losers Bracket Final", bracket_finals: "Bracket Finals", standings: "Standings", match_history: "Match History", share_weekly_recap: "Share This Week's Recap", matches_logged: "matches logged", undo: "Undo", reminders_on: "Reminders on · you'll be notified 1h before each session", reminders_off: "Turn off", enable: "Turn on", notif_own_device_short: "Enable on your own phone to get notified 1 hour before each session", notif_own_device_hint: "Reminders only fire on the device where you tap Enable. Tap the bell icon on your phone so you get notified — not someone else's device.", going: "Going", event_past: "Past", maybe: "Maybe", cant: "Can't", invited: "Invited", w_abbr: "W", l_abbr: "L", g_abbr: "G", matches_label: "matches", tap_to_expand: "tap to expand", matches_complete: "matches complete", changelog_title: "Changelog", changelog_hint: "Tap any version to see details.", changelog_lang_note: "", quick_log: "Quick Log", logged: "logged", quick_log_floater: "Quick Log Button", most_recent_login: "Most recent login per player.", admin_mode_active: "Full admin access active", ql_floater_desc: "Show the ⚡ floating button for rapid score entry", session_needs_4: "⚠️ Session needs 4 players — tap All or add more Today's Players", how_to_use_ql: "How to use Quick Log", ql_step1: "Select today's players from the checklist", ql_step2: "Pick teams (T1 / T2) from your Today's Players", ql_step3: "Tap + / − to set scores, or use preset buttons", ql_step4: "Tap ⚡ Log Match — form resets for the next game", ql_step5: "Tap ✕ when done for the session", ql_settings_hint: "To hide the ⚡ button: Settings → 🎨 Appearance → Quick Log Button", clear_all: "Clear All", clear_player_log: "Clear login history for this player", next_round_suggestion: "Next Round Suggestion", personal_note_placeholder: "Add your personal note...", add_note: "Add note", edit: "Edit", no_login_yet: "No login activity recorded yet.", series_lbl: "Series", series_single: "Single", balances_wins: "Balances wins — keeps the competition fresh", clear_all_confirm: "Clear ALL login history for all players? This cannot be undone.", login_activity_sec: "🔐 Login Activity", time_just_now: "just now", time_min_ago: "m ago", time_hr_ago: "h ago", time_day_ago: "d ago", todays_players: "Today's Players", starred: "Starred", select_all: "All", clear: "Clear", month_jan: "Jan", month_feb: "Feb", month_mar: "Mar", month_apr: "Apr", month_may: "May", month_jun: "Jun", month_jul: "Jul", month_aug: "Aug", month_sep: "Sep", month_oct: "Oct", month_nov: "Nov", month_dec: "Dec", day_sun: "Sun", day_mon: "Mon", day_tue: "Tue", day_wed: "Wed", day_thu: "Thu", day_fri: "Fri", day_sat: "Sat", match_type_label: "Match Type", match_mode_label: "Match Mode", all_types: "All Types", all_modes: "All Modes", mode_custom: "Custom", mode_session: "Session", mode_kotc: "King of Court", mode_se: "Single Elim", mode_de: "Double Elim", mode_rr: "Round Robin", game_lbl: "Game", format_se: "Single Elimination", format_de: "Double Elimination", format_rr: "Round Robin", team_abbr_1: "T1", team_abbr_2: "T2", player_n: "Player", view_all_matches_link: "View all {n} matches in History →", reset_btn: "🔄 Reset", legend_sec_tourney_formats: "Tournament Formats", legend_tourney_overview: "Three formats available: Single Elimination, Double Elimination, and Round Robin. Choose at the top of the Tournament tab. Single-screen collapsible bracket UI — completed rounds auto-collapse to free up screen space.", legend_tf_se_title: "Single Elimination (SE)", legend_tf_se_desc: "4 teams. Lose once, you're out. Two semifinals → one final. Fastest format — only 3 matches total. Good for quick afternoons when you want a clear winner without spending much time.", legend_tf_de_title: "Double Elimination (DE)", legend_tf_de_desc: "4 teams. Lose twice, you're out. Winners Bracket (2 SFs + Final) + Losers Bracket (Final) + Grand Final. 5 matches total. An early loss isn't fatal — the loser of WB-Final drops to the Grand Final via the LB path. Best when you want more games and a second chance.", legend_tf_rr_title: "Round Robin (RR)", legend_tf_rr_desc: "3–6 teams. Every team plays every other team exactly once. Champion = most wins; ties broken by point differential. Most matches per team — ideal when you want max court time. 4 teams = 6 matches, 5 teams = 10 matches, 6 teams = 15 matches.", legend_tf_standings_title: "RR Standings", legend_tf_standings_desc: "Round Robin shows a live standings table beneath the matches: 🥇 🥈 🥉 by wins, with point differential as the tiebreaker. Updates as each match is logged.", legend_tf_collapse_title: "Auto-Collapse Rounds", legend_tf_collapse_desc: "When a round finishes, its accordion auto-collapses to free up screen space. Tap the header any time to expand and review or edit. Future rounds only appear once all prior rounds are complete.", tourney_setup: "Tournament Setup", tourney_format: "Format", tourney_team_count: "Number of Teams", err_finish_all_matches: "Please finish all matches before logging.", err_select_players: "Please select all players.", err_duplicate: "A player cannot be on multiple teams.", optional: "Optional", start_tournament: "Start Tournament", team: "Team", player_1: "Player 1", player_2: "Player 2", point: "point", points: "points", win_to_lbl: "Win To", win_by_lbl: "Win By", save_group_lbl: "Save Group", save_group_help: "Save this 4-player lineup for quick re-selection later", save_group_placeholder: "e.g. The Usuals", rr_suggester_hint: "Tip: highlighted round below matches your chosen team split. You'll still play all 3 rounds — this is just the matchup with the fairest team balance.", required_fields_msg: "Please fill in:", view_in_history: "View in History →", home: "Home", event_search_placeholder: "Search by name, notes, or player...", no_events_match: "No events match your search.", clear_date_filter: "Show all events this month", notes_lbl: "Notes", notes_placeholder: "Optional notes about the event...", no_players_selected: "No players selected...", search_roster: "Search roster...", delete_event: "Delete Event", legend_sec_match_modes: "Match Modes", legend_sec_confidence: "Rating Confidence %", legend_sec_dupr: "PickleRank vs DUPR", legend_sec_features: "Features & Stats", legend_tab_ratings: "Ratings", legend_tab_stats: "Features", legend_tab_icons: "Icons", legend_stats_features: "📊 Features & Stats Explained", legend_radar_desc: "The pentagon chart on each profile shows 5 skills at a glance: Win %, Power, Synergy, Upset ability, and recent Form.", legend_fun_stats_desc: "Best Partner, Nemesis, and Pigeon — your most successful teammate, toughest opponent, and easiest matchup.", legend_match_modes_desc: "Custom (any match), Session (4-player round robin), King of the Court, and Tournament brackets.", no_pin_required: "No PIN required — tap to continue", pin_sec: "Account PIN", pin_is_set: "PIN is set — your account is protected", pin_not_set: "No PIN — anyone can log in as you", set_pin: "Set PIN", change_pin: "Change PIN", remove_pin: "Remove PIN", current_pin: "Current PIN", new_pin: "New PIN (4 digits)", confirm_pin: "Confirm PIN", pin_mismatch: "PINs don't match — please try again", pin_must_be_4: "PIN must be exactly 4 digits", pin_set: "PIN set successfully", pin_updated: "PIN updated successfully", pin_removed: "PIN removed", pin_remove_warning: "This will remove your PIN. Anyone can log in as you.", back: "Back", admin_pin_prompt: "Enter Admin PIN to continue", legend_match_vs_game_sec: "🎮 Match vs Game — What Counts?", legend_match_def: "Match", legend_match_def_desc: "One contest between two teams (e.g. Allen & Terry vs Steve & Lily). A match contains 1 or more games. The team that wins more games wins the match. This is the primary unit — all W/L records, streaks, and ratings are based on match outcomes.", legend_game_def: "Game", legend_game_def_desc: "One scoring set within a match (e.g. Game 1: 11–9, Game 2: 8–11). A game is played to 11, 15, or 21 points, win by 2. Multiple games make up a match.", legend_wl_based_on: "All W/L stats are based on matches, not games.", legend_stat_table_wl: "W/L Record — Match wins and losses", legend_stat_table_winpct: "Win % — Match win percentage", legend_stat_table_streak: "🔥/🧊 Streak — Consecutive match wins or losses", legend_stat_table_rating: "Rating — Calculated once per match", legend_stat_table_ptpct: "🎯 Point Win % — Points scored across all games in all matches", legend_stat_table_partner: "Partner Matrix — Match W/L + Game W/L as separate rows", legend_margin_example_title: "How score margin is calculated (example)", legend_margin_example: "Allen & Terry win 11–9 and 11–7 (two games): Their points = 22, Opp = 16. Margin = 22÷38 = 57.9%. A blowout like 11–2 would give margin = 84.6% → bigger rating change.", legend_vs_dupr_sec: "🆚 PickleRank vs DUPR", legend_vs_dupr_intro: "DUPR and PickleRank are both ELO-style rating systems, but they differ in important ways:", legend_dupr_col: "DUPR", legend_pr_col: "PickleRank", legend_vs_model: "Core model", legend_vs_model_dupr: "Glicko-2 (uncertainty bands)", legend_vs_model_pr: "ELO with margin weighting", legend_vs_margin: "Score margin", legend_vs_margin_dupr: "Each game scored separately", legend_vs_margin_pr: "Point totals across all games", legend_vs_scale: "Rating scale", legend_vs_scale_dupr: "2.0 – 8.0", legend_vs_scale_pr: "1.5 – 6.5", legend_vs_matches: "Match types", legend_vs_matches_dupr: "Only verified / sanctioned", legend_vs_matches_pr: "All logged matches", legend_vs_confidence: "Uncertainty", legend_vs_confidence_dupr: "Rating deviation (±)", legend_vs_confidence_pr: "📊 Confidence % (our version)", legend_vs_formula: "Formula", legend_vs_formula_dupr: "Proprietary — never published", legend_vs_formula_pr: "Open — fully shown in this Legends page", legend_vs_note: "Our 📊 Confidence % approximates the Glicko-2 uncertainty concept: it rises with matches played and decays if you haven't played recently. It's not the same math, but it answers the same question: how much should you trust this rating?", partner_matrix_top: "Top Partnerships (2+ matches)", legend_online_title: "🟢 Online Now", legend_online_desc: "Green dot next to a player's name means they have the app open right now (last seen within 90 seconds).", legend_pin_title: "🔒 Secured Account", legend_pin_desc: "This player has set a 4-digit PIN. Only they (or an Admin) can edit their profile or log matches in their name.", legend_rematch_title: "🔁 Rematch", legend_rematch_desc: "Shown in History when the exact same group of players played more than once on the same day. Amber label above the second (and later) match cards.", legend_form_title: "W / L Form Dots", legend_form_desc: "Shown below each player name when picking teams. Displays their last 3 match results — green W for win, red L for loss. Lets you spot hot streaks before choosing sides.", legend_dashboard_sec: "📊 Dashboard Features", legend_motd_title: "⚡ Match of the Day", legend_motd_desc: "Automatically highlights the most interesting recent match — calculated from upset factor (underdog won), score tightness, and max rating swing. Gold = big upset, blue = nail-biter.", legend_potm_title: "📅 Player of the Month", legend_potm_desc: "Shows the top 5 players by rating gain over the last 30 days. The #1 gainer earns a gold border. Resets automatically as the rolling window moves.", legend_session_sec: "🏓 Session Mode Features", legend_team_suggest_title: "🤝 Balanced Team Suggester", legend_team_suggest_desc: "Appears automatically in Session mode once 4 players are selected. Ranks all 3 possible pairings by fairness — smallest average-rating gap = most balanced. Tap a pairing to select it.", legend_session_summary_title: "🏆 Session Summary Card", legend_session_summary_desc: "Appears after logging a session. Shows each player's W/L and rating delta, MVP (most wins), Most Improved (biggest rating gain), total points played, and all match scores. Tap Share to copy a text recap.", legend_form_dots_title: "📈 Form Indicator", legend_form_dots_desc: "When picking players in any match mode, their last 3 results appear as W/L badges (green/red) below the dropdown. Lets you see who's hot and who's on a cold streak before you start.", legend_profile_sec: "👤 Profile Features", legend_goal_title: "🎯 Personal Goal", legend_goal_desc: "Set a target rating (e.g. 4.000) per format on your own profile. A progress bar tracks the journey from your starting rating to the target, turning gold when you reach it. Private — only visible to you and Admin.", legend_volatility_title: "📉 Rating Volatility", legend_volatility_desc: "Measures how much your rating swings per match (standard deviation of per-match deltas). Consistent <0.02, Variable 0.02–0.05, Unpredictable >0.05. A lower number means more predictable results.", legend_pt_win_pct_title: "🎯 Point Win %", legend_pt_win_pct_desc2: "Points scored by your team divided by total points played across all matches. Tracked Overall, Doubles, and Singles separately. 50% = perfectly even; elite rec players typically hold 54–58%.", legend_partner_matrix_title: "🤝 Partner Matrix", legend_partner_matrix_desc: "Found in Group Stats. A colour-coded grid showing your doubles win % with every possible partner (min 1 match together). 🟢 ≥60%, 🟡 45–59%, 🔴 <45%.", legend_match_modes_sec: "🎮 Match Modes", legend_mode_custom_title: "Custom Match", legend_mode_custom_desc: "Log any singles or doubles match manually. Choose players, enter scores game by game, add venue and notes.", legend_mode_session_title: "Session (Round Robin)", legend_mode_session_desc: "4-player round robin: every pair of partners plays every other pair once (3 games total). Ratings update after all 3 are logged together.", legend_mode_kotc_title: "King of the Court", legend_mode_kotc_desc: "Winners stay on court, losers rotate. Tracks cumulative wins per player across the session.", legend_mode_tourney_title: "Tournament", legend_mode_tourney_desc: "Single-elimination bracket for larger groups. Seeded by current doubles rating.", legend_sec_h2h: "Head-to-Head (H2H) Statistics", legend_h2h_singles_title: "H2H Singles", legend_h2h_singles_desc: "Head-to-head singles matches between two players. Rating changes reflect direct one-on-one competition. Perfect for tracking individual skill progression against specific rivals.", legend_h2h_partners_title: "H2H Doubles Partners", legend_h2h_partners_desc: "Track your win/loss record and chemistry with specific doubles partners. Includes partner pairing frequency, combined rating, and avg win margin.", legend_h2h_oppositions_title: "H2H Team Oppositions", legend_h2h_oppositions_desc: "Head-to-head record against specific opposing teams/pairs in doubles. See which team combinations you play best against and which are your toughest matchups.", legend_h2h_differential_title: "H2H Rating Differential", legend_h2h_differential_desc: "Historical rating gap between you and each opponent at time of match. Tracks upsets (beating higher-rated players) and learning curve against tougher competition.", goal_sec: "🎯 Personal Goal", goal_set_target: "Set a target rating", goal_format_lbl: "Format", goal_target_lbl: "Target Rating", goal_save: "Set Goal", goal_clear: "Clear Goal", goal_progress: "Progress to goal", goal_reached: "🏆 Goal reached!", goal_away: "away", volatility_sec: "📉 Rating Volatility", volatility_low: "Consistent", volatility_med: "Variable", volatility_high: "Unpredictable", volatility_desc: "How much your rating swings each match. Lower = more consistent results.", rematch_badge: "🔁 Rematch", rematch_count: "{n} rematches today", legend_conf_icon_title: "📊 Rating Confidence", legend_conf_icon_desc: "How much to trust the rating. 🟢 ≥75% reliable, 🟡 45–74% developing, 🔴 <45% needs more matches. Drops if inactive 90+ days.", motd_sec: "⚡ Match of the Day", motd_upset: "Upset Alert", motd_tight: "Nail-biter", motd_no_recent: "No recent matches.", motd_beat: "beat", motd_score: "Score", potm_sec: "📅 Player of the Month", potm_desc: "Biggest rating gains in the last 30 days", potm_no_data: "Not enough recent activity.", potm_gain: "gain", form_lbl: "Form", team_suggester_sec: "🤝 Balanced Team Suggester", team_suggester_desc: "Fairest split based on current doubles ratings.", team_balance_label: "Balance gap:", team_fairest: "Most Fair", team_use_this: "Use This Split", session_summary_title: "🏆 Session Complete!", session_summary_mvp: "MVP", session_summary_improved: "Most Improved", session_summary_total_pts: "Total Points Played", session_summary_results: "Match Results", session_summary_share: "📤 Share Recap", session_summary_close: "Start New Session", session_summary_rating_change: "Rating Change", partner_matrix_sec: "🤝 Doubles Partner Matrix", partner_matrix_desc: "Win % with each partner (doubles only, min 1 match together).", partner_matrix_no_data: "Not enough doubles matches yet.", partner_matrix_games: "matches", partner_matrix_in_games: "in games", legend_rating_intro: "Every player's rating lives on a 1.500–6.500 scale, mirroring DUPR. The colour of the badge shows their tier at a glance.", legend_step1_title: "Step 1 — Win Probability", legend_step1_desc: "Before each match, we compute the probability that your team wins based on the average ratings on each side. Beating a higher-rated opponent yields a big rating gain; losing to a lower-rated one costs more.", legend_step2_title: "Step 2 — Score Margin", legend_step2_desc: "The actual point differential within the match (not just who won) adjusts how large the rating change is. An 11–2 blowout moves ratings more than an 11–9 nail-biter, even between the same two players.", legend_step3_title: "Step 3 — Rating Update", legend_step3_actual: "actual = 1 if you won, 0 if you lost.", legend_step3_expected: "expected = the win probability from Step 1.", legend_step3_k: "Base K = {k} — controls how fast ratings move per match.", legend_step4_title: "Step 4 — Provisional Boost", legend_step4_desc: "New players' ratings move up to 2× faster for their first {n} matches, then taper back to the normal K. This helps new players converge to their true skill level quickly.", legend_replay_title: "Full Replay Architecture", legend_replay_desc: "Every time a match is edited or deleted, all matches are replayed in chronological order from scratch. This means there's no rating drift — an edit to an old match correctly cascades forward through every subsequent match.", legend_conf_intro: "Confidence reflects how much to trust a player's current rating. It has two components:", conf_sample_desc: "Rises as more matches are played (saturates near {n} matches). 1 match ≈ 10%, 10 matches ≈ 63%, 30 matches ≈ 95%.", conf_recency_desc: "If a player hasn't played in more than {d} days, confidence starts to decay — old results become stale. Floors at 70% of the sample-based value.", legend_score_intro: "Scores are validated against real pickleball rules. A game is only legal if it ends at the exact point play would stop.", match_num_k: "Match #{n}: K={k}", tier_elite_desc: "Tournament-level competitor. Dominant serve, consistent 3rd-shot drop, disciplined dinking.", tier_advanced_desc: "Strong fundamentals, executes most shots under pressure, reads play well.", tier_intermediate_desc: "Consistent rally ability, developing strategy, occasional unforced errors.", tier_recreational_desc: "Learning shot selection, improving footwork and placement.", tier_beginner_desc: "Getting started. Focus on serve and return consistency.", conf_sample_lbl: "Sample Size", conf_recency_lbl: "Recency", conf_high_desc: "High — rating is reliable", conf_medium_desc: "Medium — developing", conf_low_desc: "Low — needs more matches", score_legal: "✅ Legal", score_illegal: "❌ Illegal", score_rule_1: "Won outright at 11, lead ≥ 2", score_rule_2: "Deuce: won by exactly 2 past 11", score_rule_3: "Lead is only 1 — must continue to deuce", score_rule_4: "Game would have ended at 11–2; you can't keep playing", first_to_lbl: "First to {n}", legend_rating_tiers_sec: "Rating Tiers & Colors", legend_how_calc_sec: "How Ratings Are Calculated", legend_confidence_sec: "Rating Confidence %", legend_score_rules_sec: "Valid Score Rules", legend_pt_win_pct_desc2: "Points scored by your team divided by all points played. 50% = even; elite rec players hold 54–58%.", legend_provisional_boost: "Provisional Boost", legend_full_replay: "Full Replay Architecture", multi_select_hint: "Hold Ctrl / tap to select multiple", event_restore_admin_only: "Admin only", trash_admin_only: "Only an Admin can permanently empty the trash.", stat_pt_win_pct: "🎯 Pt Win%", pt_win_pct_sec: "🎯 Point Win %", pt_win_pct_desc: "Points won vs total points played. 50% = perfectly even; elite players typically hold 54–58%.", conf_lbl: "Confidence", conf_high: "High", conf_medium: "Medium", conf_low: "Low", offline_banner: "Offline — app works, data syncs when reconnected.", offline_changes: "Offline — changes saved locally, will sync on reconnect", pending_sync: "pending sync", sync_complete: "Back online — syncing your matches...", offline_mode_title: "Offline Mode", offline_match_queued: "Match saved — will sync when online", syncing_matches: "Syncing your offline matches to the server...", sync_done: "All matches synced successfully!", sync_error: "Sync failed — your matches are still saved locally. Will retry when reconnected.", admin_role_title: "🔑 Admin Role", admin_role_desc: "When enabled, this player will receive full admin access automatically after verifying their PIN. They can log in as themselves and still have admin powers — no separate admin passcode needed.", admin_granted: "✅ Admin access granted", admin_regular: "Regular player", admin_login_admin: "Logs in with PIN → gets admin access", admin_login_regular: "Logs in with PIN → regular access", grant_admin: "Grant Admin", revoke_admin: "Revoke Admin", admin_only: "Admin only", checkin: "Check-in"
  },
  zh_tw: {
    rank: "排名", roster: "名冊", session: "球局", custom: "自訂", history: "歷史", h2h: "對戰", matches_tab: "比賽", undo_match: "比賽已記錄", undo_session: "球局已記錄", undo_kotc: "稱王賽已記錄", undo_tourney: "錦標賽已記錄", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 積分追蹤器", players: "球員", players_sub: "管理球員名冊", session_title: "循環賽球局", session_sub: "四人循環賽自動對戰", log: "記錄比賽", log_sub: "登錄一場比賽結果", history_title: "比賽歷史", history_sub: "所有比賽紀錄", compare: "雙人對戰比較", compare_sub: "頭對頭數據分析", stats: "團隊統計", stats_sub: "數據洞察與紀錄", settings: "設定", settings_sub: "資料管理與外觀", leaderboard: "🏆 積分排行榜", recent_matches: "⚡ 近期對戰", no_players: "目前尚無球員。", add_players_btn: "新增球員", no_matches: "目前尚無比賽紀錄。", log_first_match: "記錄第一場比賽", add_player_sec: "新增球員", name_lbl: "球員姓名", starting_rating: "初始積分", optional_dupr: "(選填 — 真實 DUPR 積分)", rating_range_hint: "必須介於 1.500 – 6.500 之間", dupr_tiers_hint: "DUPR 級別: 2.0–2.5 初學 · 2.5–3.5 娛樂 · 3.5–4.5 中階 · 4.5–5.5 進階 · 5.5+ 精英", add_player_btn: "加入球員", roster_lbl: "球員名冊", edit_details: "修改球員資料", cancel: "取消", confirm: "確認", save: "儲存", rename: "重命名", remove_player_q: "確定要移除此球員嗎？", match_history_stays: "該球員的歷史對戰紀錄仍會保留。", base_rating_sec: "🎯 初始 / 基礎積分", base_rating_desc: "所有比賽計算的基準起點點數。", base_rating_lbl: "基礎積分", edit_starting_rating: "✏️ 修改初始積分", new_starting_rating: "新初始積分 (1.500 – 6.500)", save_recalc: "儲存並重新計算所有比賽", rating_trend_desc: "多打幾場比賽即可看到積分走勢圖。", reset_rating_btn: "重置積分", reset_rating_q: "重置積分為 3.000？", rating_history_cleared: "積分歷史紀錄將會被清空。", best_win_sec: "🏅 生涯最佳勝場", match_type_sec: "比賽類型", win_to_lbl: "勝出分數:", win_by_lbl: "勝出分差:", point: "分", points: "分", select_prompt: "選擇…", team_name_opt: "隊伍名稱 (選填)", player_a: "球員 A", player_b: "球員 B", player_1: "球員 1", player_2: "球員 2", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者勝，須贏 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期與地點", date_time_lbl: "比賽時間", venue_opt: "球場/地點 (選填)", log_match_btn: "登錄比賽並更新積分", filter_search_sec: "篩選與搜尋", search_placeholder: "搜尋比賽紀錄…", results_lbl: "對戰結果", delete_match_q: "確定要刪除這場比賽嗎？", ratings_recalculated: "所有球員積分將重新計算。", rating_comp_sec: "積分對比", overview_sec: "📊 數據總覽", records_sec: "🏅 紀錄保持人", venues_lbl: "比賽球場", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主題色調", typography_sec: "Aa 字體設定", backup_restore_sec: "💾 備份與還原", backup_desc: "匯出您的資料以利備份或匯入試算表進行精細分析。", json_backup_btn: "📤 JSON 備份", csv_export_btn: "📊 CSV 匯出", import_json_btn: "📥 匯入 JSON 資料", summary_sec: "📋 數據統計", danger_zone_sec: "⚠️ 危險區域", danger_desc: "永久刪除所有資料。如有需要，請先匯出備份。", clear_all_btn: "🗑️ 清空所有本地資料", about_sec: "ℹ️ 關於系統", about_desc: "專為私有 pickleball 社群設計的 DUPR 導向積分追蹤器。採用 ELO 權重演算法，結合勝分差加權修正。積分範圍 1.5–6.5。所有資料皆儲存於本地瀏覽器。", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. 選擇今日四人組合", load_saved_group: "載入常用組合", save_group_btn: "儲存此組合", select_4_unique: "請選擇 4 位不同的球員。", rr_matchups: "2. 循環賽對戰組合", log_score_btn: "登錄比分", save_score_btn: "儲存比分", match_logged_ok: "✅ 比賽登錄成功！", see_history_btn: "前往歷史紀錄 →", edit_match_title: "✏️ 修改比賽資料", branding_sec: "✨ App 品牌設定", logo_text: "圖示文字 / 表情符號", upload_logo: "上傳自訂圖示", display_size_sec: "🔍 顯示大小", size_compact: "緊湊", size_standard: "標準", size_large: "放大", synergy_rivalry_sec: "🤝 最佳拍檔與宿敵", best_partner: "最佳拍檔", nemesis: "宿敵", win_rate: "勝率", vs_them: "對戰勝率", worst_partner: "⚠️ 默契考驗", easy_target: "🎯 最佳提款機", admin_sec: "🔒 權限與安全", admin_status: "目前狀態", user_mode: "一般用戶 (檢視/新增/編輯)", admin_mode: "管理員 (完整權限)", passcode_lbl: "管理員密碼", login_btn: "登入", logout_btn: "登出", change_pass_btn: "更改密碼", wrong_pass: "密碼錯誤。", pass_updated: "密碼已更新。", badges_sec: "🎖️ 個人成就", badge_centurion: "百戰老將 (100+ 場)", badge_ironman: "鐵人 (50+ 場)", badge_slayer: "巨人殺手 (大爆冷門)", badge_streaker: "無人能擋 (5+ 連勝)", badge_sharp: "神射手 (60%+ 勝率)", no_badges: "多打幾場比賽來解鎖成就！", all_players: "所有球員", view_all_matches: "查看所有比賽", singles_wr: "單打勝率", doubles_wr: "雙打勝率", photo: "照片", change_photo: "更換", search_players_placeholder: "搜尋球員...", sort_by: "排序方式:", sort_rating: "積分 (高到低)", sort_fn: "名字 (A-Z)", sort_ln: "姓氏 (A-Z)", sort_games: "比賽場數", err_enter_name: "請輸入姓名。", err_exists: "球員已存在。", err_empty: "名稱不能為空。", err_taken: "名稱已被使用。", err_select_4: "請選擇 4 位球員。", err_same_player: "同一球員不能同時在兩隊", err_select_singles: "每側請選擇 1 位球員", err_select_doubles: "每側請選擇 2 位球員", err_valid_scores: "請輸入有效的比分。", err_invalid_score_fmt: "比分無效。先得 {winTo} 分，須贏 {winBy} 分。", err_add_game: "請至少新增一局。", err_clear_winner: "比賽必須有明確勝負。", err_error_scores: "比分錯誤。", h2h_btn: "⚔️ 對戰比較 (H2H)", log_custom_btn: "➕ 記錄自訂比賽", rating_elite: "精英", rating_advanced: "進階", rating_intermediate: "中階", rating_recreational: "休閒", rating_beginner: "新手", stat_matches: "🎮 場次", stat_wins: "✅ 勝場", stat_losses: "❌ 敗場", admin_role_title: "🔑 管理員角色", admin_role_desc: "啟用後，此球員在驗證 PIN 碼後將自動獲得完整管理員權限。可以以本人身分登入並保有管理員功能——無需另外輸入管理員密碼。", admin_granted: "✅ 已授予管理員權限", admin_regular: "一般球員", admin_login_regular: "以 PIN 碼登入 → 一般存取", admin_login_admin: "以 PIN 碼登入 → 獲得管理員權限", grant_admin: "授予管理員", revoke_admin: "撤銷管理員", stat_win_pct: "📈 勝率", stat_w_streak: "🔥 連勝", stat_l_streak: "🧊 連敗", rating_history_sec: "📈 積分走勢", spark_start: "起始", spark_peak: "最高", spark_now: "目前", awaiting_prior_round: "等待上一回合", rating_trajectory_sec: "積分走勢對比", beat_opp: "擊敗 {name}", upset_of: "爆冷門賺取", overview_total_matches: "總場次", overview_singles: "單打", overview_doubles: "雙打", overview_games_played: "總局數", overview_players: "球員總數", overview_venues: "場地數", record_most_matches: "最多出賽", record_top_rated: "最高積分", record_hot_streak: "最長連勝", record_biggest_upset: "最大爆冷門", record_beat_higher: "擊敗高分對手，贏得", recent_form: "近期狀態", no_data: "尚無數據", match_predictor: "🔮 賽前預測", prob_win: "獲勝機率", if_wins: "若 {name} 獲勝:", expected_delta: "預期積分變動", singles_title: "單打積分榜", doubles_title: "雙打積分榜", verified_status: "認證完成", provisional_status: "暫定評估", teams: "隊伍", performance_profile: "個人資料", kotc: "稱王賽", kotc_desc: "與不同搭檔進行 3 場比賽。勝場最多（及淨勝分最高）的球員將成為王者！", round: "回合", diff: "淨勝分", log_kotc: "登錄賽事", tournament: "錦標賽", bracket_size: "賽程規模", generate_bracket: "產生賽程表", qf: "八強賽", sf: "四強賽", final: "決賽", winner: "勝者", log_tournament: "登錄錦標賽", select_teams: "選擇隊伍", singles_rating: "DUPR 單打積分", doubles_rating: "DUPR 雙打積分", appearance_sec: "🎨 外觀設定", fun_stats_sec: "趣味數據", my_profile_sec: "👤 我的個人檔案", profile: "球員個人檔案", link_device_desc: "將此裝置與您的球員檔案連結，以向群組顯示您的「上線」狀態。", guest_not_linked: "訪客 / 未連結", exit_admin_btn: "退出管理員模式 (登出)", new_passcode_placeholder: "新密碼", app_initials_placeholder: "App 縮寫 (例如 PR)", click_to_change_logo: "點擊更換圖示", version_lbl: "版本", view_changelog_btn: "查看更新日誌", unlock_fun_stats: "多打幾場比賽來解鎖趣味數據！", requires_min_games: "(至少需要與搭檔進行2場比賽)", rating_skip_hint: "不確定可略過，預設為 3.000", events: "賽事", events_sub: "即將到來的球局", trash: "垃圾桶", trash_sub: "還原刪除的項目", legends: "圖鑑", legends_sub: "術語與成就", changelog: "更新日誌", changelog_sub: "應用程式更新歷史", rankings: "排行榜", edit_session: "編輯球局", new_session: "新增球局", event_name: "活動名稱", venue: "地點", invite_players: "邀請球員", select_players_invite: "選擇要邀請的球員...", selected: "已選:", save_changes: "儲存變更", create_session: "建立球局", upcoming_sessions: "即將到來的球局", no_scheduled_sessions: "沒有已排定的球局。", invited: "已邀請:", tbd: "待定", local_court: "當地場地", add_new_player_btn: "➕ 新增球員", welcome_setup_desc: "👋 歡迎！請填寫下方表單以加入名冊。您必須建立 4 位數 PIN 碼 (提示：可使用生日 MMDD) 來保護您的帳號。", notes_optional: "備註 (選填)", paddle_playstyle_hint: "球拍型號、打法等...", security_pin_lbl: "安全 PIN 碼 (例如: MMDD)", pin_placeholder: "4位數 PIN 碼", player_notes_placeholder: "球員備註...", pigeon: "手下敗將", match_type_singles: "單打", match_type_doubles: "雙打", legends_icons_badges: "視覺圖示與徽章", legend_prov_title: "暫定積分", legend_prov_desc: "球員出賽少於 5 場。積分波動將會較大，直到數據穩定。", legend_conf_title: "確認積分", legend_conf_desc: "球員已完成 5 場以上比賽，積分狀態趨於穩定。", legend_dupr_title: "DUPR 連結", legend_dupr_desc: "該球員的初始積分是直接從 DUPR 匯入的。", legend_hot_title: "連勝狀態", legend_hot_desc: "球員目前連續贏得 3 場以上的比賽。", legend_cold_title: "連敗狀態", legend_cold_desc: "球員目前連續輸掉 3 場以上的比賽。", legend_fav_title: "已收藏", legend_fav_desc: "球員將被固定在名冊與選擇畫面的頂部。", legends_radar: "雷達圖指標", legend_win_pct: "勝率", legend_win_pct_desc: "所有賽制中贏得比賽的整體百分比。", legend_power: "力量 (S)", legend_power_desc: "基於球員的單打 ELO 積分。積分越高，此軸的範圍越大。", legend_synergy: "默契 (D)", legend_synergy_desc: "基於球員的雙打 ELO 積分。積分越高，此軸的範圍越大。", legend_upset: "爆冷指數", legend_upset_desc: "衡量擊敗積分明顯高於自己的對手的能力。", legend_form: "近期狀態", legends_fun_stats: "趣味數據 (對戰歷史)", legend_partner_desc: "與您搭檔勝率最高的隊友（至少需共同出賽 2 場）。", legend_nemesis_desc: "擊敗過您最多次的特定對手。", legend_pigeon_desc: "您擊敗過最多次的特定對手。", legends_achievements: "里程碑成就", legend_centurion_desc: "總出賽場次達到或超過 100 場。", legend_ironman_desc: "總出賽場次達到或超過 50 場。", legend_on_fire_desc: "取得 5 場或以上的壓倒性連勝。", legend_sharp_desc: "維持 60% 以上的整體勝率（至少需出賽 10 場）。", legend_giant_slayer_desc: "擊敗 ELO 積分明顯較高的對手，並在單場比賽中獲得大量積分（+0.30 或以上）。", base_lbl: "基礎:", opp_avg_lbl: "對手平均:", prob_lbl: "勝率:", k_adj_lbl: "K值調整:", trash_empty: "垃圾桶是空的。", match_label: "比賽", deleted_lbl: "刪除於:", restore_btn: "還原", empty_trash_btn: "清空垃圾桶", empty_trash_confirm: "確定要永久清空垃圾桶嗎？此操作無法還原。", welcome_title: "歡迎使用 PickleRank！", welcome_desc_admin: "請輸入全域管理員密碼。", welcome_desc_user: "請問目前是誰在使用此裝置？這有助於我們追蹤數據並預先填寫您的比賽紀錄。", on_roster_btn: "我已在名冊中", new_player_btn: "新球員", select_name_placeholder: "請選擇您的名字...", admin_pass_placeholder: "管理員密碼", invalid_pin_msg: "PIN 碼無效，或管理員尚未設定 PIN 碼。", incorrect_pass_msg: "密碼錯誤。", setup_awesome_msg: "太棒了！我們將帶您前往「新增球員」畫面，您可以輸入姓名、DUPR 積分，並設定專屬的安全 PIN 碼。", save_enter_app: "儲存並進入系統", enter_as_admin: "以管理員身分進入", go_to_setup: "建立個人檔案", return_player_login: "返回球員登入", verify_identity: "驗證身分", verify_desc: "歡迎回來，{name}。請輸入您的 4 位數 PIN 碼 (提示：您的生日 MMDD) 以繼續。", unlock: "解鎖", incorrect_pin: "PIN 碼錯誤", create_profile: "建立個人檔案", admin_login: "管理員登入", admin_only: "僅限管理員", profile: "個人資料", sort_starred: "星號優先 (A-Z)", group_insights: "群組洞察", insights_matches: "場次", insights_fav_day: "最常打球日", insights_est_time: "預估時間", insights_most_at: "最常打球地點", match_notes_sec: "比賽備註（選填）", session_notes_sec: "球局備註（選填）", event_notes_sec: "活動備註（選填）", kotc_notes_sec: "活動備註（選填）", kotc_warning: "請輸入有效的比分。", option_lbl: "選項", semifinals: "半決賽", finals: "決賽", grand_final: "大決賽", champions: "冠軍", winners_bracket_sf: "勝者組半決賽", winners_bracket_final: "勝者組決賽", losers_bracket_final: "敗者組決賽", bracket_finals: "分組決賽", standings: "積分榜", match_history: "對戰紀錄", share_weekly_recap: "分享本週回顧", matches_logged: "場比賽已記錄", undo: "撤銷", reminders_on: "提醒已開啟・每場球局開始前 1 小時將收到通知", reminders_off: "關閉提醒", enable: "開啟提醒", notif_own_device_short: "在您自己的手機上啟用，以便在球局開始前 1 小時收到提醒", notif_own_device_hint: "提醒只會在您點擊「啟用」的裝置上發送。請在您自己的手機上點擊鈴鐺圖示——而不是別人的手機。", going: "我要去", event_past: "已結束", maybe: "也許", cant: "無法參加", invited: "已受邀", w_abbr: "勝", l_abbr: "敗", g_abbr: "場", matches_label: "場比賽", tap_to_expand: "點擊展開", matches_complete: "場比賽完成", changelog_title: "更新日誌", changelog_hint: "點擊任一版本以查看詳情。", changelog_lang_note: "（詳細說明以英文顯示）", quick_log: "快速記分", logged: "已記錄", quick_log_floater: "快速記分按鈕", most_recent_login: "顯示每位球員最近一次登入。", admin_mode_active: "目前已開啟完整管理員權限", ql_floater_desc: "顯示 ⚡ 懸浮按鈕以快速記錄分數", session_needs_4: "⚠️ 球局需要 4 位球員 — 請點選「全選」或增加今日球員", how_to_use_ql: "如何使用快速記分", ql_step1: "從清單中選擇今日球員", ql_step2: "從今日球員中選擇 T1 / T2 隊員", ql_step3: "點擊 + / − 設定分數，或使用快速預設按鈕", ql_step4: "點擊 ⚡ 登錄比賽 — 表單自動重置以繼續下一場", ql_step5: "完成球局後點擊 ✕ 關閉", ql_settings_hint: "關閉 ⚡ 按鈕：設定 → 🎨 外觀設定 → 快速記分按鈕", clear_all: "清除全部", clear_player_log: "清除此球員的登入紀錄", next_round_suggestion: "下一回合建議", personal_note_placeholder: "新增個人備註...", add_note: "新增備註", edit: "編輯", no_login_yet: "尚無登入紀錄。", series_lbl: "系列賽", series_single: "單場", balances_wins: "平衡勝場 — 保持比賽的新鮮感", clear_all_confirm: "確定清除所有球員的登入紀錄嗎？此操作無法還原。", login_activity_sec: "🔐 登入紀錄", time_just_now: "剛剛", time_min_ago: "分鐘前", time_hr_ago: "小時前", time_day_ago: "天前", todays_players: "今日球員", starred: "已收藏", select_all: "全選", clear: "清除", month_jan: "1月", month_feb: "2月", month_mar: "3月", month_apr: "4月", month_may: "5月", month_jun: "6月", month_jul: "7月", month_aug: "8月", month_sep: "9月", month_oct: "10月", month_nov: "11月", month_dec: "12月", day_sun: "日", day_mon: "一", day_tue: "二", day_wed: "三", day_thu: "四", day_fri: "五", day_sat: "六", match_type_label: "比賽類型", match_mode_label: "比賽模式", all_types: "全部類型", all_modes: "全部模式", mode_custom: "自訂", mode_session: "球局", mode_kotc: "稱王賽", mode_se: "單淘汰", mode_de: "雙淘汰", mode_rr: "循環賽", game_lbl: "第", format_se: "單淘汰", format_de: "雙淘汰", format_rr: "循環賽", team_abbr_1: "隊1", team_abbr_2: "隊2", player_n: "球員", view_all_matches_link: "查看歷史中的全部 {n} 場比賽 →", reset_btn: "🔄 重置", legend_sec_tourney_formats: "錦標賽賽制", legend_tourney_overview: "提供三種賽制：單淘汰、雙淘汰、循環賽。在錦標賽頁面頂部選擇。單一畫面摺疊式賽程介面——已完成的回合會自動收合以節省畫面空間。", legend_tf_se_title: "單淘汰 (SE)", legend_tf_se_desc: "4 支隊伍。輸一場就出局。兩場半決賽 → 一場決賽。最快的賽制——共 3 場比賽。適合下午想快速產生冠軍而不想花太多時間時使用。", legend_tf_de_title: "雙淘汰 (DE)", legend_tf_de_desc: "4 支隊伍。輸兩場才出局。勝者組（2 場半決賽 + 決賽）+ 敗者組（決賽）+ 總決賽。共 5 場比賽。早期失利不是末日——勝者組決賽輸家透過敗者組路徑回到總決賽。適合想多打幾場並擁有第二次機會時使用。", legend_tf_rr_title: "循環賽 (RR)", legend_tf_rr_desc: "3–6 支隊伍。每支隊伍與其他每支隊伍各打一場。冠軍 = 勝場最多；平手時以淨勝分決定。每隊比賽場次最多——適合想要最多上場時間。4 隊 = 6 場，5 隊 = 10 場，6 隊 = 15 場。", legend_tf_standings_title: "循環賽戰績表", legend_tf_standings_desc: "循環賽會在比賽下方顯示即時戰績表：依勝場排序，金 🥇 銀 🥈 銅 🥉 標示，並以淨勝分作為平手時的判定。每場比賽記錄後即時更新。", legend_tf_collapse_title: "回合自動收合", legend_tf_collapse_desc: "回合結束時，其摺疊區會自動收合以節省畫面空間。隨時點擊標題即可展開檢視或編輯。未來回合只在所有先前回合完成後才會出現。", tourney_setup: "錦標賽設置", tourney_format: "賽制", tourney_team_count: "隊伍數量", err_finish_all_matches: "請完成所有比賽後再記錄。", err_select_players: "請選擇所有球員。", err_duplicate: "同一球員不能加入多個隊伍。", optional: "選填", start_tournament: "開始錦標賽", team: "隊伍", save_group_lbl: "儲存組合", save_group_help: "儲存此 4 位球員組合，方便日後快速選用", save_group_placeholder: "例如：常客組", rr_suggester_hint: "提示：下方標示的回合即為你選擇的隊伍分配。你仍會打完全部 3 回合——這只是隊伍最均衡的對戰組合。", required_fields_msg: "請填寫：", view_in_history: "在歷史中查看 →", home: "首頁", event_search_placeholder: "依名稱、備註或球員搜尋...", no_events_match: "沒有符合條件的活動。", clear_date_filter: "顯示本月所有活動", notes_lbl: "備註", notes_placeholder: "活動相關備註（選填）...", no_players_selected: "尚未選擇球員...", search_roster: "搜尋球員...", delete_event: "刪除活動", legend_sec_match_modes: "比賽模式", legend_sec_confidence: "積分可信度 %", legend_sec_dupr: "PickleRank vs DUPR", legend_sec_features: "功能與統計", legend_tab_ratings: "積分", legend_tab_stats: "功能", legend_tab_icons: "圖示", legend_stats_features: "📊 功能與統計說明", legend_radar_desc: "每個個人檔案上的五角形圖表一目了然顯示 5 項能力：勝率、攻擊力、默契、爆冷能力與近期狀態。", legend_fun_stats_desc: "最佳搭檔、剋星與獵物——你最成功的隊友、最難纏的對手與最容易對付的對象。", legend_match_modes_desc: "自訂（任意比賽）、球局（四人循環賽）、球場之王與錦標賽。", no_pin_required: "無需 PIN 碼 — 點擊繼續", pin_sec: "帳號 PIN 碼", pin_is_set: "已設置 PIN 碼 — 帳號受到保護", pin_not_set: "未設置 PIN 碼 — 任何人都可以以你的身份登入", set_pin: "設置 PIN", change_pin: "更改 PIN", remove_pin: "移除 PIN", current_pin: "目前 PIN 碼", new_pin: "新 PIN 碼（4 位數）", confirm_pin: "確認 PIN 碼", pin_mismatch: "兩次輸入的 PIN 碼不一致，請重試", pin_must_be_4: "PIN 碼必須為 4 位數字", pin_set: "PIN 碼設置成功", pin_updated: "PIN 碼更新成功", pin_removed: "PIN 碼已移除", pin_remove_warning: "移除後，任何人都可以以你的身份登入。", back: "返回", admin_pin_prompt: "請輸入管理員 PIN 碼以繼續", legend_match_vs_game_sec: "🎮 一場比賽 vs 一局比賽——哪個才算數？", legend_match_def: "比賽（Match）", legend_match_def_desc: "兩隊之間的一次對決（例如 Allen 和 Terry vs Steve 和 Lily）。一場比賽包含一局或多局。贏得較多局數的隊伍獲勝。這是最基本的統計單位——所有勝負紀錄、連勝/連敗與積分均以比賽（Match）為基礎。", legend_game_def: "局（Game）", legend_game_def_desc: "比賽中的一個計分單元（例如 第1局：11–9，第2局：8–11）。每局先到 11、15 或 21 分者勝，需贏 2 分。多局合為一場比賽。", legend_wl_based_on: "所有勝負統計均以比賽（Match）為基礎，而非以局（Game）為基礎。", legend_stat_table_wl: "勝負紀錄 — 比賽勝場與敗場", legend_stat_table_winpct: "勝率 — 比賽勝率百分比", legend_stat_table_streak: "🔥/🧊 連勝/連敗 — 連續贏得或輸掉的比賽場數", legend_stat_table_rating: "積分 — 每場比賽結束後計算一次", legend_stat_table_ptpct: "🎯 得分率 — 所有比賽中各局得分的加總", legend_stat_table_partner: "搭檔矩陣 — 分別顯示比賽勝負與局數勝負", legend_margin_example_title: "得分差加權計算範例", legend_margin_example: "Allen 和 Terry 以 11–9 及 11–7 獲勝（兩局）：本隊得分 = 22，對手 = 16。加權值 = 22÷38 = 57.9%。若以 11–2 大勝，加權值 = 84.6% → 積分變動更大。", legend_vs_dupr_sec: "🆚 PickleRank vs DUPR", legend_vs_dupr_intro: "DUPR 與 PickleRank 都是基於 ELO 概念的積分系統，但有以下幾點重要差異：", legend_dupr_col: "DUPR", legend_pr_col: "PickleRank", legend_vs_model: "核心模型", legend_vs_model_dupr: "Glicko-2（含不確定性區間）", legend_vs_model_pr: "ELO 加得分差加權", legend_vs_margin: "分差加權", legend_vs_margin_dupr: "每局獨立計算", legend_vs_margin_pr: "加總所有局的得分", legend_vs_scale: "積分範圍", legend_vs_scale_dupr: "2.0 – 8.0", legend_vs_scale_pr: "1.5 – 6.5", legend_vs_matches: "比賽類型", legend_vs_matches_dupr: "僅限認證／官方賽事", legend_vs_matches_pr: "所有已記錄的比賽", legend_vs_confidence: "不確定性", legend_vs_confidence_dupr: "積分偏差（±）", legend_vs_confidence_pr: "📊 可信度 %（我們的版本）", legend_vs_formula: "公式", legend_vs_formula_dupr: "專有算法——從未公開", legend_vs_formula_pr: "完全公開——本頁已完整呈現", legend_vs_note: "我們的 📊 可信度 % 近似於 Glicko-2 的不確定性概念：隨出賽場次增加而提升，若長期未出賽則下降。數學原理不同，但回答的是同一個問題：這個積分有多可信？", partner_matrix_top: "最佳搭檔組合（2場以上）", legend_online_title: "🟢 目前上線", legend_online_desc: "球員名旁的綠色圓點表示他們正在使用應用程式（最近 90 秒內有活動）。", legend_pin_title: "🔒 帳號已加密", legend_pin_desc: "此球員已設置 4 位數 PIN 碼，只有本人（或管理員）才能編輯個人資料或以其名義記錄比賽。", legend_rematch_title: "🔁 重賽", legend_rematch_desc: "當同一組球員在同一天進行超過一場比賽時，歷史記錄中會顯示此橘色標籤。", legend_form_title: "W / L 近況點", legend_form_desc: "選擇球員時，名字下方顯示最近 3 場比賽結果——綠色 W 表示勝利，紅色 L 表示落敗，讓你在選邊前了解近況。", legend_dashboard_sec: "📊 主頁功能", legend_motd_title: "⚡ 今日最佳比賽", legend_motd_desc: "自動從近期比賽中找出最精彩的一場——綜合爆冷指數、比分緊張程度與最大積分波動計算。金色 = 爆冷門，藍色 = 激烈角逐。", legend_potm_title: "📅 本月最佳球員", legend_potm_desc: "顯示過去 30 天積分漲幅最大的前 5 名球員。第 1 名獲得金色邊框標示，隨滾動時間窗自動更新。", legend_session_sec: "🏓 球局模式功能", legend_team_suggest_title: "🤝 最佳隊伍分配建議", legend_team_suggest_desc: "選定 4 名球員後自動出現。依公平性排列 3 種分組方式——積分差距最小的最均衡。點選任一方案即可選用。", legend_session_summary_title: "🏆 球局總結卡", legend_session_summary_desc: "記錄完球局後出現，顯示每位球員的勝負與積分變動、最佳球員、進步最多者、本場總得分及所有比賽比分。點擊分享可複製文字戰報。", legend_form_dots_title: "📈 近況指示", legend_form_dots_desc: "在任何比賽模式選擇球員時，下拉選單下方顯示最近 3 場比賽的 W/L 標記（綠/紅），讓你在開始前看出誰狀態火熱、誰處於低潮。", legend_profile_sec: "👤 個人資料功能", legend_goal_title: "🎯 個人目標", legend_goal_desc: "在自己的個人資料頁面按賽制設定目標積分（例如 4.000），進度條追蹤從起始積分到目標的進展，達成時變為金色。僅本人與管理員可見。", legend_volatility_title: "📉 積分波動率", legend_volatility_desc: "衡量每場比賽後積分的波動幅度（每場變動的標準差）。穩定 <0.02，有起伏 0.02–0.05，波動大 >0.05。數值越低表示表現越穩定。", legend_pt_win_pct_title: "🎯 得分勝率", legend_partner_matrix_title: "🤝 搭檔勝率矩陣", legend_partner_matrix_desc: "位於群組統計頁面。以顏色標示的表格顯示你與每位潛在搭檔的雙打勝率（至少合作 1 場）。🟢 ≥60%、🟡 45–59%、🔴 <45%。", legend_match_modes_sec: "🎮 比賽模式", legend_mode_custom_title: "自訂比賽", legend_mode_custom_desc: "手動記錄任何單打或雙打比賽，選擇球員、逐局輸入比分，並可新增場地與備註。", legend_mode_session_title: "球局（循環賽）", legend_mode_session_desc: "四人循環賽：每對搭檔組合與其他組合各賽一場（共 3 場）。三場全部記錄後一起更新積分。", legend_mode_kotc_title: "球場之王", legend_mode_kotc_desc: "勝者留場，敗者換場輪替。追蹤每位球員在整個球局中的累計勝場數。", legend_mode_tourney_title: "錦標賽", legend_mode_tourney_desc: "適合較大規模群組的單淘汰制賽事，依當前雙打積分設定種子序位。", legend_sec_h2h: "頭對頭（H2H）統計", legend_h2h_singles_title: "H2H 單打", legend_h2h_singles_desc: "兩位球員之間的直接對決單打比賽。積分變動反映一對一的直接競爭。完美追蹤個人技術水平與特定對手的進步情況。", legend_h2h_partners_title: "H2H 雙打搭檔", legend_h2h_partners_desc: "追蹤與特定雙打搭檔的勝負紀錄與默契指數。包括搭檔配對頻率、合併積分及平均勝分差。", legend_h2h_oppositions_title: "H2H 隊伍對陣", legend_h2h_oppositions_desc: "與特定對手隊伍或雙打對組的頭對頭紀錄。查看你表現最好與最具挑戰性的隊伍組合。", legend_h2h_differential_title: "H2H 積分差異", legend_h2h_differential_desc: "比賽時刻你與各對手的歷史積分差距。追蹤冷門勝利（擊敗更高分對手）與面對強敵的學習曲線。", goal_sec: "🎯 個人目標", goal_set_target: "設定目標積分", goal_format_lbl: "賽制", goal_target_lbl: "目標積分", goal_save: "設定目標", goal_clear: "清除目標", goal_progress: "目標達成進度", goal_reached: "🏆 目標達成！", goal_away: "差距", volatility_sec: "📉 積分波動率", volatility_low: "穩定", volatility_med: "有起伏", volatility_high: "波動較大", volatility_desc: "每場比賽後積分的波動幅度。數值越低代表表現越穩定。", rematch_badge: "🔁 重賽", rematch_count: "今日 {n} 場重賽", legend_conf_icon_title: "📊 積分可信度", legend_conf_icon_desc: "反映積分的可信程度。🟢 ≥75% 可信、🟡 45–74% 發展中、🔴 <45% 需要更多比賽。若超過 90 天未出賽，可信度將自動下降。", motd_sec: "⚡ 今日最佳比賽", motd_upset: "爆冷門警報", motd_tight: "激烈角逐", motd_no_recent: "近期無比賽紀錄。", motd_beat: "擊敗", motd_score: "比分", potm_sec: "📅 本月最佳球員", potm_desc: "近 30 天內積分漲幅最大的球員", potm_no_data: "近期活躍度不足。", potm_gain: "積分增益", form_lbl: "近況", team_suggester_sec: "🤝 最佳隊伍分配建議", team_suggester_desc: "根據目前雙打積分計算最均衡的分組方式。", team_balance_label: "積分差距：", team_fairest: "最均衡", team_use_this: "使用此分組", session_summary_title: "🏆 球局結束！", session_summary_mvp: "最佳球員", session_summary_improved: "進步最多", session_summary_total_pts: "本場總得分", session_summary_results: "比賽結果", session_summary_share: "📤 分享戰報", session_summary_close: "開始新球局", session_summary_rating_change: "積分變動", partner_matrix_sec: "🤝 雙打搭檔勝率矩陣", partner_matrix_desc: "與每位搭檔的雙打勝率（最少1場合作）。", partner_matrix_no_data: "雙打比賽場次不足。", partner_matrix_games: "場次", partner_matrix_in_games: "局數", legend_rating_intro: "每位球員的積分介於 1.500 至 6.500 之間，與 DUPR 制度一致。積分徽章顏色代表球員所屬等級，一目了然。", legend_step1_title: "步驟一 — 勝率預測", legend_step1_desc: "每場比賽前，系統會根據雙方平均積分計算本隊的預期勝率。擊敗積分較高的對手將獲得大量積分；輸給積分較低的對手則會損失較多。", legend_step2_title: "步驟二 — 得分差加權", legend_step2_desc: "比賽中的實際得分差（而非單純勝負）會影響積分變動幅度。11-2 的大勝比 11-9 的險勝帶來更大的積分變動，即使對陣的是同一組球員。", legend_step3_title: "步驟三 — 積分更新", legend_step3_actual: "actual（實際結果）= 勝利得 1，落敗得 0。", legend_step3_expected: "expected（預期勝率）= 步驟一計算所得的勝率。", legend_step3_k: "基礎 K 值 = {k}，控制每場比賽積分的移動速度。", legend_step4_title: "步驟四 — 新手加速期", legend_step4_desc: "新球員在前 {n} 場比賽的積分移動速度可達正常的 2 倍，之後逐漸回歸正常 K 值。此設計幫助新球員快速收斂至真實技術水準。", legend_replay_title: "完整回放架構", legend_replay_desc: "每當比賽被修改或刪除時，系統會從頭依時間順序重新計算所有比賽積分。這確保積分不會產生漂移——對舊比賽的修改會正確地影響後續所有比賽的積分。", legend_conf_intro: "可信度反映對球員當前積分的信賴程度，由兩個因素決定：", conf_sample_desc: "隨出賽場次增加而提升（趨近 {n} 場後逐漸飽和）。1 場 ≈ 10%，10 場 ≈ 63%，30 場 ≈ 95%。", conf_recency_desc: "若球員超過 {d} 天未出賽，可信度將開始下降——舊結果逐漸失去參考價值。最低不低於樣本可信度的 70%。", legend_score_intro: "比分將依據真實匹克球規則進行驗證。只有在比賽應當正式結束的那一刻，比分才算合法。", match_num_k: "第 {n} 場：K={k}", tier_elite_desc: "錦標賽級別選手。強力發球、穩定第三拍放短球、嚴守廚房區域。", tier_advanced_desc: "基本功紮實，在壓力下仍能執行大多數球路，場上閱讀能力佳。", tier_intermediate_desc: "穩定的對打能力，戰術發展中，偶有非受迫性失誤。", tier_recreational_desc: "學習選球時機，改善步法與落點控制。", tier_beginner_desc: "剛起步。專注於發球與接球的穩定性。", conf_sample_lbl: "樣本數量", conf_recency_lbl: "近期活躍度", conf_high_desc: "高 — 積分可信", conf_medium_desc: "中 — 仍在發展", conf_low_desc: "低 — 需要更多比賽", score_legal: "✅ 合法", score_illegal: "❌ 不合法", score_rule_1: "先到11分且領先2分，正常結束", score_rule_2: "膠著局：超過11分後恰好領先2分", score_rule_3: "只領先1分 — 必須繼續打膠著局", score_rule_4: "比賽應在11-2時結束，不可繼續比到25分", first_to_lbl: "先得 {n} 分", legend_rating_tiers_sec: "積分等級與顏色", legend_how_calc_sec: "積分計算方式", legend_confidence_sec: "積分可信度 %", legend_score_rules_sec: "合法比分規則", legend_pt_win_pct_desc2: "本隊得分佔總分比例。50% 代表勢均力敵；精英休閒球員通常介於 54–58%。", legend_provisional_boost: "暫定加速", legend_full_replay: "完整回放架構", multi_select_hint: "按住 Ctrl 或點選多個選項", event_restore_admin_only: "僅限管理員", trash_admin_only: "只有管理員可以永久清空垃圾桶。", stat_pt_win_pct: "🎯 得分率", pt_win_pct_sec: "🎯 得分勝率", pt_win_pct_desc: "本隊得分佔總分比例。50% 代表勢均力敵；精英球員通常介於 54–58%。", conf_lbl: "可信度", conf_high: "高", conf_medium: "中", conf_low: "低", offline_banner: "離線中 — 應用程式可正常使用，連線後將自動同步。", offline_changes: "離線中 — 變更已儲存至本機，連線後將同步", pending_sync: "待同步", sync_complete: "已恢復連線 — 正在同步您的比賽...", offline_mode_title: "離線模式", offline_match_queued: "比賽已儲存 — 連線後將同步", syncing_matches: "正在將離線比賽同步至伺服器...", sync_done: "所有比賽已成功同步！", sync_error: "同步失敗 — 比賽資料仍保存在本機，恢復連線後將自動重試。"
  },
  zh_cn: {
    rank: "排名", roster: "名册", session: "球局", custom: "自定义", history: "歷史", h2h: "对战", matches_tab: "比賽", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 積分追踪器", players: "球员", players_sub: "管理球员名册", session_title: "循环賽球局", session_sub: "四人循环賽自动对战", log: "記錄比賽", log_sub: "登錄一場比賽結果", history_title: "比賽歷史", history_sub: "所有比賽紀錄", compare: "双人对战比较", compare_sub: "头对头数据分析", stats: "团队統計", stats_sub: "数据洞察与紀錄", settings: "設置", settings_sub: "数据管理与外观", leaderboard: "🏆 積分排行榜", recent_matches: "⚡ 近期对战", no_players: "目前尚无球员。", add_players_btn: "新增球员", no_matches: "目前尚无比賽紀錄。", log_first_match: "記錄第一場比賽", add_player_sec: "新增球员", name_lbl: "球员姓名", starting_rating: "初始積分", optional_dupr: "(選填 — 真实 DUPR 積分)", rating_range_hint: "必须介于 1.500 – 6.500 之间", dupr_tiers_hint: "DUPR 级别: 2.0–2.5 初学 · 2.5–3.5 娱乐 · 3.5–4.5 中阶 · 4.5–5.5 進阶 · 5.5+ 精英", add_player_btn: "加入球员", roster_lbl: "球员名册", edit_details: "修改球员资料", cancel: "取消", confirm: "确认", save: "儲存", rename: "重命名", remove_player_q: "确定要移除此球员吗？", match_history_stays: "该球员的歷史对战紀錄仍会保留。", base_rating_sec: "🎯 初始 / 基础積分", base_rating_desc: "所有比賽計算的基准起点点数。", base_rating_lbl: "基础積分", edit_starting_rating: "✏️ 修改初始積分", new_starting_rating: "新初始積分 (1.500 – 6.500)", save_recalc: "儲存并重新計算所有比賽", rating_trend_desc: "多打幾場比賽即可看到積分走勢圖。", reset_rating_btn: "重置積分", reset_rating_q: "重置積分为 3.000？", rating_history_cleared: "積分歷史紀錄将会被清空。", best_win_sec: "🏅 生涯最佳勝場", match_type_sec: "比賽类型", win_to_lbl: "勝出分数:", win_by_lbl: "勝出分差:", point: "分", points: "分", select_prompt: "選择…", team_name_opt: "队伍名称 (選填)", player_a: "球员 A", player_b: "球员 B", player_1: "球员 1", player_2: "球员 2", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者勝，须贏 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期与地点", date_time_lbl: "比賽时间", venue_opt: "球場/地點 (選填)", log_match_btn: "登錄比賽并更新積分", filter_search_sec: "筛選与搜寻", search_placeholder: "搜寻比賽紀錄…", results_lbl: "对战结果", delete_match_q: "确定要删除这場比賽吗？", ratings_recalculated: "所有球员積分将重新計算。", rating_comp_sec: "積分对比", overview_sec: "📊 数据总览", records_sec: "🏅 紀錄保持人", venues_lbl: "比賽球場", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主题色调", typography_sec: "Aa 字体設置", backup_restore_sec: "💾 备份与还原", backup_desc: "導出您的数据以利备份或導入跨浏览器表格進行细致分析。", json_backup_btn: "📤 JSON 备份", csv_export_btn: "📊 CSV 導出", import_json_btn: "📥 導入 JSON 数据", summary_sec: "📋 数据統計", danger_zone_sec: "⚠️ 危险区域", danger_desc: "永久删除所有数据。如有需要，請先導出备份。", clear_all_btn: "🗑️ 清空所有本地数据", about_sec: "ℹ️ 关于系統", about_desc: "专为私有 pickleball 社群設計的 DUPR 導向積分追踪器。采用 ELO 权重算法，结合勝分差加权修正。積分范围 1.5–6.5。所有数据皆儲存于本地浏览器。", lang_sec: "🌐 Language / 語言 / 語言", select_foursome: "1. 選择今日四人组合", load_saved_group: "载入常用组合", save_group_btn: "儲存此组合", select_4_unique: "請選择 4 位不同的球员。", rr_matchups: "2. 循环賽对战组合", log_score_btn: "登錄比分", save_score_btn: "儲存比分", match_logged_ok: "✅ 比賽登錄成功！", see_history_btn: "前往歷史紀錄 →", edit_match_title: "✏️ 修改比賽资料", branding_sec: "✨ App 品牌設置", logo_text: "图标文字 / 表情符號", upload_logo: "上傳自定义图标", display_size_sec: "🔍 顯示大小", size_compact: "紧凑", size_standard: "标准", size_large: "放大", synergy_rivalry_sec: "🤝 最佳搭档与宿敌", best_partner: "最佳拍档", nemesis: "宿敌", win_rate: "勝率", vs_them: "对战勝率", worst_partner: "⚠️ 默契考验", easy_target: "🎯 最佳提款机", rank: "排名", roster: "名册", session: "球局", history: "历史", h2h: "对战", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 积分追踪器", players: "球员", players_sub: "管理球员名册", session_title: "循环赛球局", session_sub: "四人循环赛自动对战", log: "记录比赛", log_sub: "登录一场比赛结果", history_title: "比赛历史", history_sub: "所有比赛纪录", compare: "双人对战比较", compare_sub: "头对头数据分析", stats: "团队统计", stats_sub: "数据洞察与纪录", settings: "设置", settings_sub: "数据管理与外观", leaderboard: "🏆 积分排行榜", recent_matches: "⚡ 近期对战", no_players: "目前尚无球员。", add_players_btn: "新增球员", no_matches: "目前尚无比赛纪录。", log_first_match: "记录第一场比赛", add_player_sec: "新增球员", name_lbl: "球员姓名", starting_rating: "初始积分", optional_dupr: "(选填 — 真实 DUPR 积分)", rating_range_hint: "必须介于 1.500 – 6.500 之间", dupr_tiers_hint: "DUPR 级别: 2.0–2.5 初学 · 2.5–3.5 娱乐 · 3.5–4.5 中阶 · 4.5–5.5 进阶 · 5.5+ 精英", add_player_btn: "加入球员", roster_lbl: "球员名册", edit_details: "修改球员资料", cancel: "取消", confirm: "确认", save: "储存", rename: "重命名", remove_player_q: "确定要移除此球员吗？", match_history_stays: "该球员的历史对战纪录仍会保留。", base_rating_sec: "🎯 初始 / 基础积分", base_rating_desc: "所有比赛计算的基准起点点数。", base_rating_lbl: "基础积分", edit_starting_rating: "✏️ 修改初始积分", new_starting_rating: "新初始积分 (1.500 – 6.500)", save_recalc: "储存并重新计算所有比赛", rating_trend_desc: "多打几场比赛即可看到积分走势图。", reset_rating_btn: "重置积分", reset_rating_q: "重置积分为 3.000？", rating_history_cleared: "积分历史纪录将会被清空。", best_win_sec: "🏅 生涯最佳胜场", match_type_sec: "比赛类型", select_prompt: "选择…", team_name_opt: "队伍名称 (选填)", player_a: "球员 A", player_b: "球员 B", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者胜，须赢 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期与地点", date_time_lbl: "比赛时间", venue_opt: "球场/地点 (选填)", log_match_btn: "登录比赛并更新积分", filter_search_sec: "筛选与搜寻", search_placeholder: "搜寻比赛纪录…", results_lbl: "对战结果", delete_match_q: "确定要删除这场比赛吗？", ratings_recalculated: "所有球员积分将重新计算。", rating_comp_sec: "积分对比", overview_sec: "📊 数据总览", records_sec: "🏅 纪录保持人", venues_lbl: "比赛球场", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主题色调", typography_sec: "Aa 字体设置", backup_restore_sec: "💾 备份与还原", backup_desc: "导出您的数据以利备份或导入跨浏览器表格进行细致分析。", json_backup_btn: "📤 JSON 备份", csv_export_btn: "📊 CSV 导出", import_json_btn: "📥 导入 JSON 数据", summary_sec: "📋 数据统计", danger_zone_sec: "⚠️ 危险区域", danger_desc: "永久删除所有数据。如有需要，请先导出备份。", clear_all_btn: "🗑️ 清空所有本地数据", about_sec: "ℹ️ 关于系统", about_desc: "专为私有 pickleball 社群设计的 DUPR 导向积分追踪器。采用 ELO 权重算法，结合胜分差加权修正。积分范围 1.5–6.5。所有数据皆储存于本地浏览器。", lang_sec: "🌐 Language / 语言 / 语言", select_foursome: "1. 选择今日四人组合", load_saved_group: "载入常用组合", select_4_unique: "请选择 4 位不同的球员。", rr_matchups: "2. 循环赛对战组合", log_score_btn: "登录比分", save_score_btn: "储存比分", match_logged_ok: "✅ 比赛登录成功！", see_history_btn: "前往历史纪录 →", edit_match_title: "✏️ 修改比赛资料", branding_sec: "✨ App 品牌设置", logo_text: "图标文字 / 表情符号", upload_logo: "上传自定义图标", display_size_sec: "🔍 显示大小", size_compact: "紧凑", size_standard: "标准", size_large: "放大", synergy_rivalry_sec: "🤝 最佳搭档与宿敌", best_partner: "最佳拍档", nemesis: "宿敌", win_rate: "胜率", vs_them: "对战胜率", worst_partner: "⚠️ 默契考验", admin_sec: "🔒 权限与安全", admin_status: "当前状态", user_mode: "普通用户 (查看/新增/编辑)", admin_mode: "管理员 (完整权限)", passcode_lbl: "管理员密码", login_btn: "登录", logout_btn: "退出", change_pass_btn: "修改密码", wrong_pass: "密码错误。", pass_updated: "密码已更新。", badges_sec: "🎖️ 个人成就", badge_centurion: "百战老将 (100+ 场)", badge_ironman: "铁人 (50+ 场)", badge_slayer: "巨人杀手 (大爆冷门)", badge_streaker: "无人能挡 (5+ 连胜)", badge_sharp: "神射手 (60%+ 胜率)", no_badges: "多打几场比赛来解锁成就！", all_players: "所有球员", view_all_matches: "查看所有比赛", singles_wr: "单打胜率", doubles_wr: "双打胜率", photo: "照片", change_photo: "更换", search_players_placeholder: "搜寻球员...", sort_by: "排序方式:", sort_rating: "积分 (高到低)", sort_fn: "名字 (A-Z)", sort_ln: "姓氏 (A-Z)", sort_games: "比赛场数", err_enter_name: "请输入姓名。", err_exists: "球员已存在。", err_empty: "名称不能为空。", err_taken: "名称已被使用。", err_select_4: "请选择 4 位球员。", err_same_player: "同一球员不能同时在两队", err_select_singles: "每侧请选择 1 位球员", err_select_doubles: "每侧请选择 2 位球员", err_valid_scores: "请输入有效的比分。", err_invalid_score_fmt: "比分无效。先得 {winTo} 分，须赢 {winBy} 分。", err_add_game: "请至少新增一局。", err_clear_winner: "比赛必须有明确胜负。", err_error_scores: "比分错误。", h2h_btn: "⚔️ 对战比较 (H2H)", log_custom_btn: "➕ 记录自定义比赛", rating_elite: "精英", rating_advanced: "进阶", rating_intermediate: "中阶", rating_recreational: "休闲", rating_beginner: "新手", stat_matches: "🎮 场次", stat_wins: "✅ 胜场", stat_losses: "❌ 败场", admin_role_title: "🔑 管理员角色", admin_role_desc: "启用后，此球员在验证 PIN 码后将自动获得完整管理员权限。可以以本人身份登录并保有管理员功能——无需另外输入管理员密码。", admin_granted: "✅ 已授予管理员权限", admin_regular: "普通球员", admin_login_regular: "以 PIN 码登录 → 普通访问", admin_login_admin: "以 PIN 码登录 → 获得管理员权限", grant_admin: "授予管理员", revoke_admin: "撤销管理员", stat_win_pct: "📈 胜率", stat_w_streak: "🔥 连胜", stat_l_streak: "🧊 连败", rating_history_sec: "📈 积分走势", spark_start: "起始", spark_peak: "最高", spark_now: "目前", awaiting_prior_round: "等待上一回合", rating_trajectory_sec: "积分走势对比", beat_opp: "击败 {name}", upset_of: "爆冷门赚取", overview_total_matches: "总场次", overview_singles: "单打", overview_doubles: "双打", overview_games_played: "总局数", overview_players: "球员总数", overview_venues: "场地数", record_most_matches: "最多出赛", record_top_rated: "最高积分", record_hot_streak: "最长连胜", record_biggest_upset: "最大爆冷门", record_beat_higher: "击败高分对手，赢得", recent_form: "近期状态", no_data: "尚无数据", match_predictor: "🔮 赛前预测", prob_win: "获胜概率", if_wins: "若 {name} 获胜:", expected_delta: "预期积分变动", singles_title: "单打积分榜", doubles_title: "双打积分榜", verified_status: "认证完成", provisional_status: "暂定评估", teams: "队伍", performance_profile: "个人资料", kotc: "称王赛", kotc_desc: "与不同搭档进行 3 場比赛。胜场最多（及净胜分最高）的球员将成为王者！", round: "回合", diff: "净胜分", log_kotc: "登录赛事", tournament: "锦标赛", bracket_size: "赛程规模", generate_bracket: "生成赛程表", qf: "八强赛", sf: "四强赛", final: "决赛", winner: "胜者", log_tournament: "登录锦标赛", select_teams: "选择队伍", singles_rating: "DUPR 单打积分", doubles_rating: "DUPR 双打积分", appearance_sec: "🎨 外观设置", fun_stats_sec: "趣味数据", my_profile_sec: "👤 我的个人资料", profile: "球员个人资料", link_device_desc: "将此设备与您的球员档案链接，以向群组显示您的“上线”状态。", guest_not_linked: "访客 / 未链接", exit_admin_btn: "退出管理员模式 (退出)", new_passcode_placeholder: "新密码", app_initials_placeholder: "App 缩写 (例如 PR)", click_to_change_logo: "点击更换图标", version_lbl: "版本", view_changelog_btn: "查看更新日志", unlock_fun_stats: "多打几场比赛来解锁趣味数据！", requires_min_games: "(至少需要与搭档进行2场比赛)", rating_skip_hint: "不确定可跳过，默认为 3.000", events: "赛事", events_sub: "即将到来的球局", trash: "垃圾桶", trash_sub: "还原删除的项目", legends: "图鉴", legends_sub: "术语与成就", changelog: "更新日志", changelog_sub: "应用程序更新历史", rankings: "排行榜", edit_session: "编辑球局", new_session: "新增球局", event_name: "活动名称", venue: "地点", invite_players: "邀请球员", select_players_invite: "选择要邀请的球员...", selected: "已选:", save_changes: "保存更改", create_session: "创建球局", upcoming_sessions: "即将到来的球局", no_scheduled_sessions: "没有已排定的球局。", invited: "已邀请:", tbd: "待定", local_court: "当地场地", add_new_player_btn: "➕ 新增球员", welcome_setup_desc: "👋 欢迎！请填写下方表单以加入名册。您必须建立 4 位数 PIN 码 (提示：可使用生日 MMDD) 来保护您的帐号。", notes_optional: "备注 (选填)", paddle_playstyle_hint: "球拍型号、打法等...", security_pin_lbl: "安全 PIN 码 (例如: MMDD)", pin_placeholder: "4位数 PIN 码", player_notes_placeholder: "球员备注...", pigeon: "手下败将", match_type_singles: "单打", match_type_doubles: "双打", legends_icons_badges: "视觉图标与徽章", legend_prov_title: "暂定积分", legend_prov_desc: "球员出赛少于 5 场。积分波动将会较大，直到数据稳定。", legend_conf_title: "确认积分", legend_conf_desc: "球员已完成 5 场以上比赛，积分状态趋于稳定。", legend_dupr_title: "DUPR 链接", legend_dupr_desc: "该球员的初始积分是直接从 DUPR 导入的。", legend_hot_title: "连胜状态", legend_hot_desc: "球员目前连续赢得 3 场以上的比赛。", legend_cold_title: "连败状态", legend_cold_desc: "球员目前连续输掉 3 场以上的比赛。", legend_fav_title: "已收藏", legend_fav_desc: "球员将被固定在名册与选择画面的顶部。", legends_radar: "雷达图指标", legend_win_pct: "胜率", legend_win_pct_desc: "所有赛制中赢得比赛的整体百分比。", legend_power: "力量 (S)", legend_power_desc: "基于球员的单打 ELO 积分。积分越高，此轴的范围越大。", legend_synergy: "默契 (D)", legend_synergy_desc: "基于球员的双打 ELO 积分。积分越高，此轴的范围越大。", legend_upset: "爆冷指数", legend_upset_desc: "衡量击败积分明显高于自己的对手的能力。", legend_form: "近期状态", legends_fun_stats: "趣味数据 (对战历史)", legend_partner_desc: "与您搭档胜率最高的队友（至少需共同出赛 2 场）。", legend_nemesis_desc: "击败过您最多次的特定对手。", legend_pigeon_desc: "您击败过最多次的特定对手。", legends_achievements: "里程碑成就", legend_centurion_desc: "总出赛场次达到或超过 100 场。", legend_ironman_desc: "总出赛场次达到或超过 50 场。", legend_on_fire_desc: "取得 5 场或以上的压倒性连胜。", legend_sharp_desc: "维持 60% 以上的整体胜率（至少需出赛 10 场）。", legend_giant_slayer_desc: "击败 ELO 积分明显较高的对手，并在单场比赛中获得大量积分（+0.30 或以上）。", base_lbl: "基础:", opp_avg_lbl: "对手平均:", prob_lbl: "胜率:", k_adj_lbl: "K值调整:", trash_empty: "垃圾桶是空的。", match_label: "比赛", deleted_lbl: "删除于:", restore_btn: "还原", empty_trash_btn: "清空垃圾桶", empty_trash_confirm: "确定要永久清空垃圾桶吗？此操作无法还原。", welcome_title: "欢迎使用 PickleRank！", welcome_desc_admin: "请输入全局管理员密码。", welcome_desc_user: "请问目前是谁在使用此设备？这有助于我们追踪数据并预先填写您的比赛纪录。", on_roster_btn: "我已在名册中", new_player_btn: "新球员", select_name_placeholder: "请选择您的名字...", admin_pass_placeholder: "管理员密码", invalid_pin_msg: "PIN 码无效，或管理员尚未设置 PIN 码。", incorrect_pass_msg: "密码错误。", setup_awesome_msg: "太棒了！我们将带您前往“新增球员”画面，您可以输入姓名、DUPR 积分，并设置专属的安全 PIN 码。", save_enter_app: "保存并进入系统", enter_as_admin: "以管理员身份进入", go_to_setup: "创建个人资料", return_player_login: "返回球员登录", verify_identity: "验证身份", verify_desc: "欢迎回来，{name}。请输入您的 4 位数 PIN 码 (提示：您的生日 MMDD) 以继续。", unlock: "解锁", incorrect_pin: "PIN 码错误", create_profile: "创建个人资料", admin_login: "管理员登录", admin_only: "仅限管理员", custom: "自定义", profile: "个人资料", save_group_btn: "储存此组合", sort_starred: "星号优先 (A-Z)", group_insights: "群组洞察", insights_matches: "场次", insights_fav_day: "最常打球日", insights_est_time: "预估时间", insights_most_at: "最常打球地点", match_notes_sec: "比赛备注（选填）", session_notes_sec: "球局备注（选填）", event_notes_sec: "活动备注（选填）", kotc_notes_sec: "活动备注（选填）", kotc_warning: "请输入有效的比分。", option_lbl: "选项", semifinals: "半决赛", finals: "决赛", grand_final: "大决赛", champions: "冠军", winners_bracket_sf: "胜者组半决赛", winners_bracket_final: "胜者组决赛", losers_bracket_final: "败者组决赛", bracket_finals: "分组决赛", standings: "积分榜", match_history: "对战记录", share_weekly_recap: "分享本周回顾", matches_logged: "场比赛已记录", undo: "撤销", reminders_on: "提醒已开启・每场球局开始前 1 小时将收到通知", reminders_off: "关闭提醒", enable: "开启提醒", notif_own_device_short: "在您自己的手机上启用，以便在球局开始前 1 小时收到提醒", notif_own_device_hint: "提醒只会在您点击「启用」的设备上发送。请在您自己的手机上点击铃铛图标——而不是别人的手机。", going: "我要去", event_past: "已结束", maybe: "也许", cant: "无法参加", invited: "已受邀", w_abbr: "胜", l_abbr: "负", g_abbr: "场", matches_label: "场比赛", tap_to_expand: "点击展开", matches_complete: "场比赛完成", changelog_title: "更新日志", changelog_hint: "点击任一版本以查看详情。", changelog_lang_note: "（详细说明以英文显示）", quick_log: "快速记分", logged: "已记录", quick_log_floater: "快速记分按钮", most_recent_login: "显示每位球员最近一次登录。", admin_mode_active: "当前已开启完整管理员权限", ql_floater_desc: "显示 ⚡ 悬浮按钮以快速记录分数", session_needs_4: "⚠️ 球局需要 4 位球员 — 请点击「全选」或增加今日球员", how_to_use_ql: "如何使用快速记分", ql_step1: "从清单中选择今日球员", ql_step2: "从今日球员中选择 T1 / T2 队员", ql_step3: "点击 + / − 设定分数，或使用快速预设按钮", ql_step4: "点击 ⚡ 登录比赛 — 表单自动重置以继续下一场", ql_step5: "完成球局后点击 ✕ 关闭", ql_settings_hint: "关闭 ⚡ 按钮：设置 → 🎨 外观设置 → 快速记分按钮", clear_all: "清除全部", clear_player_log: "清除此球员的登录纪录", next_round_suggestion: "下一回合建议", personal_note_placeholder: "添加个人备注...", add_note: "添加备注", edit: "编辑", no_login_yet: "尚无登录纪录。", series_lbl: "系列赛", series_single: "单场", balances_wins: "平衡胜场 — 保持比赛的新鲜感", clear_all_confirm: "确定清除所有球员的登录纪录吗？此操作无法还原。", login_activity_sec: "🔐 登录纪录", time_just_now: "刚刚", time_min_ago: "分钟前", time_hr_ago: "小时前", time_day_ago: "天前", todays_players: "今日球员", starred: "已收藏", select_all: "全选", clear: "清除", month_jan: "1月", month_feb: "2月", month_mar: "3月", month_apr: "4月", month_may: "5月", month_jun: "6月", month_jul: "7月", month_aug: "8月", month_sep: "9月", month_oct: "10月", month_nov: "11月", month_dec: "12月", day_sun: "日", day_mon: "一", day_tue: "二", day_wed: "三", day_thu: "四", day_fri: "五", day_sat: "六", match_type_label: "比赛类型", match_mode_label: "比赛模式", all_types: "全部类型", all_modes: "全部模式", mode_custom: "自定义", mode_session: "球局", mode_kotc: "称王赛", matches_tab: "比赛", undo_match: "比赛已记录", undo_session: "球局已记录", undo_kotc: "称王赛已记录", undo_tourney: "锦标赛已记录", mode_se: "单淘汰", mode_de: "双淘汰", mode_rr: "循环赛", game_lbl: "第", format_se: "单淘汰", format_de: "双淘汰", format_rr: "循环赛", team_abbr_1: "队1", team_abbr_2: "队2", player_n: "球员", view_all_matches_link: "查看历史中的全部 {n} 场比赛 →", reset_btn: "🔄 重置", legend_sec_tourney_formats: "锦标赛赛制", legend_tourney_overview: "提供三种赛制：单淘汰、双淘汰、循环赛。在锦标赛页面顶部选择。单一画面折叠式赛程界面——已完成的回合会自动收起以节省屏幕空间。", legend_tf_se_title: "单淘汰 (SE)", legend_tf_se_desc: "4 支队伍。输一场就出局。两场半决赛 → 一场决赛。最快的赛制——共 3 场比赛。适合下午想快速产生冠军而不想花太多时间时使用。", legend_tf_de_title: "双淘汰 (DE)", legend_tf_de_desc: "4 支队伍。输两场才出局。胜者组（2 场半决赛 + 决赛）+ 败者组（决赛）+ 总决赛。共 5 场比赛。早期失利不是末日——胜者组决赛输家通过败者组路径回到总决赛。适合想多打几场并拥有第二次机会时使用。", legend_tf_rr_title: "循环赛 (RR)", legend_tf_rr_desc: "3–6 支队伍。每支队伍与其他每支队伍各打一场。冠军 = 胜场最多；平局时以净胜分决定。每队比赛场次最多——适合想要最多上场时间。4 队 = 6 场，5 队 = 10 场，6 队 = 15 场。", legend_tf_standings_title: "循环赛战绩表", legend_tf_standings_desc: "循环赛会在比赛下方显示实时战绩表：依胜场排序，金 🥇 银 🥈 铜 🥉 标示，并以净胜分作为平局时的判定。每场比赛记录后实时更新。", legend_tf_collapse_title: "回合自动收起", legend_tf_collapse_desc: "回合结束时，其折叠区会自动收起以节省屏幕空间。随时点击标题即可展开查看或编辑。未来回合只在所有先前回合完成后才会出现。", tourney_setup: "锦标赛设置", tourney_format: "赛制", tourney_team_count: "队伍数量", err_finish_all_matches: "请完成所有比赛后再记录。", err_select_players: "请选择所有球员。", err_duplicate: "同一球员不能加入多个队伍。", optional: "选填", start_tournament: "开始锦标赛", team: "队伍", player_1: "球员 1", player_2: "球员 2", point: "分", points: "分", win_to_lbl: "获胜分数", win_by_lbl: "领先分数", save_group_lbl: "保存组合", save_group_help: "保存此 4 位球员组合，方便日后快速选用", save_group_placeholder: "例如：常客组", rr_suggester_hint: "提示：下方标示的回合即为你选择的队伍分配。你仍会打完全部 3 回合——这只是队伍最均衡的对战组合。", required_fields_msg: "请填写：", view_in_history: "在历史中查看 →", home: "首页", event_search_placeholder: "按名称、备注或球员搜索...", no_events_match: "没有符合条件的活动。", clear_date_filter: "显示本月所有活动", notes_lbl: "备注", notes_placeholder: "活动相关备注（选填）...", no_players_selected: "尚未选择球员...", search_roster: "搜索球员...", delete_event: "删除活动", legend_sec_match_modes: "比赛模式", legend_sec_confidence: "积分可信度 %", legend_sec_dupr: "PickleRank vs DUPR", legend_sec_features: "功能与统计", legend_tab_ratings: "积分", legend_tab_stats: "功能", legend_tab_icons: "图示", legend_stats_features: "📊 功能与统计说明", legend_radar_desc: "每个个人档案上的五角形图表一目了然显示 5 项能力：胜率、攻击力、默契、爆冷能力与近期状态。", legend_fun_stats_desc: "最佳搭档、克星与猎物——你最成功的队友、最难缠的对手与最容易对付的对象。", legend_match_modes_desc: "自定义（任意比赛）、球局（四人循环赛）、球场之王与锦标赛。", no_pin_required: "无需 PIN 码 — 点击继续", pin_sec: "账号 PIN 码", pin_is_set: "已设置 PIN 码 — 账号受到保护", pin_not_set: "未设置 PIN 码 — 任何人都可以以你的身份登录", set_pin: "设置 PIN", change_pin: "更改 PIN", remove_pin: "移除 PIN", current_pin: "当前 PIN 码", new_pin: "新 PIN 码（4 位数）", confirm_pin: "确认 PIN 码", pin_mismatch: "两次输入的 PIN 码不一致，请重试", pin_must_be_4: "PIN 码必须为 4 位数字", pin_set: "PIN 码设置成功", pin_updated: "PIN 码更新成功", pin_removed: "PIN 码已移除", pin_remove_warning: "移除后，任何人都可以以你的身份登录。", back: "返回", admin_pin_prompt: "请输入管理员 PIN 码以继续", legend_match_vs_game_sec: "🎮 一场比赛 vs 一局比赛——哪个才算数？", legend_match_def: "比赛（Match）", legend_match_def_desc: "两队之间的一次对决（例如 Allen 和 Terry vs Steve 和 Lily）。一场比赛包含一局或多局。赢得较多局数的队伍获胜。这是最基本的统计单位——所有胜负纪录、连胜/连败与积分均以比赛（Match）为基础。", legend_game_def: "局（Game）", legend_game_def_desc: "比赛中的一个计分单元（例如 第1局：11–9，第2局：8–11）。每局先到 11、15 或 21 分者胜，需赢 2 分。多局合为一场比赛。", legend_wl_based_on: "所有胜负统计均以比赛（Match）为基础，而非以局（Game）为基础。", legend_stat_table_wl: "胜负纪录 — 比赛胜场与败场", legend_stat_table_winpct: "胜率 — 比赛胜率百分比", legend_stat_table_streak: "🔥/🧊 连胜/连败 — 连续赢得或输掉的比赛场数", legend_stat_table_rating: "积分 — 每场比赛结束后计算一次", legend_stat_table_ptpct: "🎯 得分率 — 所有比赛中各局得分的加总", legend_stat_table_partner: "搭档矩阵 — 分别显示比赛胜负与局数胜负", legend_margin_example_title: "得分差加权计算范例", legend_margin_example: "Allen 和 Terry 以 11–9 及 11–7 获胜（两局）：本队得分 = 22，对手 = 16。加权值 = 22÷38 = 57.9%。若以 11–2 大胜，加权值 = 84.6% → 积分变动更大。", legend_vs_dupr_sec: "🆚 PickleRank vs DUPR", legend_vs_dupr_intro: "DUPR 与 PickleRank 都是基于 ELO 概念的积分系统，但有以下几点重要差异：", legend_dupr_col: "DUPR", legend_pr_col: "PickleRank", legend_vs_model: "核心模型", legend_vs_model_dupr: "Glicko-2（含不确定性区间）", legend_vs_model_pr: "ELO 加得分差加权", legend_vs_margin: "分差加权", legend_vs_margin_dupr: "每局独立计算", legend_vs_margin_pr: "加总所有局的得分", legend_vs_scale: "积分范围", legend_vs_scale_dupr: "2.0 – 8.0", legend_vs_scale_pr: "1.5 – 6.5", legend_vs_matches: "比赛类型", legend_vs_matches_dupr: "仅限认证／官方赛事", legend_vs_matches_pr: "所有已记录的比赛", legend_vs_confidence: "不确定性", legend_vs_confidence_dupr: "积分偏差（±）", legend_vs_confidence_pr: "📊 可信度 %（我们的版本）", legend_vs_formula: "公式", legend_vs_formula_dupr: "专有算法——从未公开", legend_vs_formula_pr: "完全公开——本页已完整呈现", legend_vs_note: "我们的 📊 可信度 % 近似于 Glicko-2 的不确定性概念：随出赛场次增加而提升，若长期未出赛则下降。数学原理不同，但回答的是同一个问题：这个积分有多可信？", partner_matrix_top: "最佳搭档组合（2场以上）", legend_online_title: "🟢 当前在线", legend_online_desc: "球员名旁的绿色圆点表示他们正在使用应用程序（最近 90 秒内有活动）。", legend_pin_title: "🔒 账号已加密", legend_pin_desc: "此球员已设置 4 位数 PIN 码，只有本人（或管理员）才能编辑个人资料或以其名义记录比赛。", legend_rematch_title: "🔁 重赛", legend_rematch_desc: "当同一组球员在同一天进行超过一场比赛时，历史记录中会显示此橙色标签。", legend_form_title: "W / L 近况点", legend_form_desc: "选择球员时，名字下方显示最近 3 场比赛结果——绿色 W 表示胜利，红色 L 表示落败，让你在选边前了解近况。", legend_dashboard_sec: "📊 主页功能", legend_motd_title: "⚡ 今日最佳比赛", legend_motd_desc: "自动从近期比赛中找出最精彩的一场——综合爆冷指数、比分紧张程度与最大积分波动计算。金色 = 爆冷门，蓝色 = 激烈角逐。", legend_potm_title: "📅 本月最佳球员", legend_potm_desc: "显示过去 30 天积分涨幅最大的前 5 名球员。第 1 名获得金色边框标示，随滚动时间窗自动更新。", legend_session_sec: "🏓 球局模式功能", legend_team_suggest_title: "🤝 最佳队伍分配建议", legend_team_suggest_desc: "选定 4 名球员后自动出现。依公平性排列 3 种分组方式——积分差距最小的最均衡。点击任一方案即可选用。", legend_session_summary_title: "🏆 球局总结卡", legend_session_summary_desc: "记录完球局后出现，显示每位球员的胜负与积分变动、最佳球员、进步最多者、本场总得分及所有比赛比分。点击分享可复制文字战报。", legend_form_dots_title: "📈 近况指示", legend_form_dots_desc: "在任何比赛模式选择球员时，下拉菜单下方显示最近 3 场比赛的 W/L 标记（绿/红），让你在开始前看出谁状态火热、谁处于低潮。", legend_profile_sec: "👤 个人资料功能", legend_goal_title: "🎯 个人目标", legend_goal_desc: "在自己的个人资料页面按赛制设定目标积分（例如 4.000），进度条追踪从起始积分到目标的进展，达成时变为金色。仅本人与管理员可见。", legend_volatility_title: "📉 积分波动率", legend_volatility_desc: "衡量每场比赛后积分的波动幅度（每场变动的标准差）。稳定 <0.02，有起伏 0.02–0.05，波动大 >0.05。数值越低表示表现越稳定。", legend_pt_win_pct_title: "🎯 得分胜率", legend_partner_matrix_title: "🤝 搭档胜率矩阵", legend_partner_matrix_desc: "位于群组统计页面。以颜色标示的表格显示你与每位潜在搭档的双打胜率（至少合作 1 场）。🟢 ≥60%、🟡 45–59%、🔴 <45%。", legend_match_modes_sec: "🎮 比赛模式", legend_mode_custom_title: "自定义比赛", legend_mode_custom_desc: "手动记录任何单打或双打比赛，选择球员、逐局输入比分，并可添加场地与备注。", legend_mode_session_title: "球局（循环赛）", legend_mode_session_desc: "四人循环赛：每对搭档组合与其他组合各赛一场（共 3 场）。三场全部记录后一起更新积分。", legend_mode_kotc_title: "球场之王", legend_mode_kotc_desc: "胜者留场，败者换场轮替。追踪每位球员在整个球局中的累计胜场数。", legend_mode_tourney_title: "锦标赛", legend_mode_tourney_desc: "适合较大规模群组的单淘汰制赛事，依当前双打积分设定种子序位。", legend_sec_h2h: "头对头（H2H）统计", legend_h2h_singles_title: "H2H 单打", legend_h2h_singles_desc: "两位球员之间的直接对决单打比赛。积分变动反映一对一的直接竞争。完美追踪个人技术水平与特定对手的进步情况。", legend_h2h_partners_title: "H2H 双打搭档", legend_h2h_partners_desc: "追踪与特定双打搭档的胜负纪录与默契指数。包括搭档配对频率、合并积分及平均胜分差。", legend_h2h_oppositions_title: "H2H 队伍对阵", legend_h2h_oppositions_desc: "与特定对手队伍或双打对组的头对头纪录。查看你表现最好与最具挑战性的队伍组合。", legend_h2h_differential_title: "H2H 积分差异", legend_h2h_differential_desc: "比赛时刻你与各对手的历史积分差距。追踪冷门胜利（击败更高分对手）与面对强敌的学习曲线。", goal_sec: "🎯 个人目标", goal_set_target: "设定目标积分", goal_format_lbl: "赛制", goal_target_lbl: "目标积分", goal_save: "设定目标", goal_clear: "清除目标", goal_progress: "目标达成进度", goal_reached: "🏆 目标达成！", goal_away: "差距", volatility_sec: "📉 积分波动率", volatility_low: "稳定", volatility_med: "有起伏", volatility_high: "波动较大", volatility_desc: "每场比赛后积分的波动幅度。数值越低代表表现越稳定。", rematch_badge: "🔁 重赛", rematch_count: "今日 {n} 场重赛", legend_conf_icon_title: "📊 积分可信度", legend_conf_icon_desc: "反映积分的可信程度。🟢 ≥75% 可信、🟡 45–74% 发展中、🔴 <45% 需要更多比赛。若超过 90 天未出赛，可信度将自动下降。", motd_sec: "⚡ 今日最佳比赛", motd_upset: "爆冷门警报", motd_tight: "激烈角逐", motd_no_recent: "近期无比赛纪录。", motd_beat: "击败", motd_score: "比分", potm_sec: "📅 本月最佳球员", potm_desc: "近 30 天内积分涨幅最大的球员", potm_no_data: "近期活跃度不足。", potm_gain: "积分增益", form_lbl: "近况", team_suggester_sec: "🤝 最佳队伍分配建议", team_suggester_desc: "根据当前双打积分计算最均衡的分组方式。", team_balance_label: "积分差距：", team_fairest: "最均衡", team_use_this: "使用此分组", session_summary_title: "🏆 球局结束！", session_summary_mvp: "最佳球员", session_summary_improved: "进步最多", session_summary_total_pts: "本场总得分", session_summary_results: "比赛结果", session_summary_share: "📤 分享战报", session_summary_close: "开始新球局", session_summary_rating_change: "积分变动", partner_matrix_sec: "🤝 双打搭档胜率矩阵", partner_matrix_desc: "与每位搭档的双打胜率（最少1场合作）。", partner_matrix_no_data: "双打比赛场次不足。", partner_matrix_games: "场次", partner_matrix_in_games: "局数", legend_rating_intro: "每位球员的积分介于 1.500 至 6.500 之间，与 DUPR 制度一致。积分徽章颜色代表球员所属等级，一目了然。", legend_step1_title: "步骤一 — 胜率预测", legend_step1_desc: "每场比赛前，系统会根据双方平均积分计算本队的预期胜率。击败积分较高的对手将获得大量积分；输给积分较低的对手则会损失较多。", legend_step2_title: "步骤二 — 得分差加权", legend_step2_desc: "比赛中的实际得分差（而非单纯胜负）会影响积分变动幅度。11-2 的大胜比 11-9 的险胜带来更大的积分变动，即使对阵的是同一组球员。", legend_step3_title: "步骤三 — 积分更新", legend_step3_actual: "actual（实际结果）= 胜利得 1，落败得 0。", legend_step3_expected: "expected（预期胜率）= 步骤一计算所得的胜率。", legend_step3_k: "基础 K 值 = {k}，控制每场比赛积分的移动速度。", legend_step4_title: "步骤四 — 新手加速期", legend_step4_desc: "新球员在前 {n} 场比赛的积分移动速度可达正常的 2 倍，之后逐渐回归正常 K 值。此设计帮助新球员快速收敛至真实技术水平。", legend_replay_title: "完整回放架构", legend_replay_desc: "每当比赛被修改或删除时，系统会从头依时间顺序重新计算所有比赛积分。这确保积分不会产生漂移——对旧比赛的修改会正确地影响后续所有比赛的积分。", legend_conf_intro: "可信度反映对球员当前积分的信赖程度，由两个因素决定：", conf_sample_desc: "随出赛场次增加而提升（趋近 {n} 场后逐渐饱和）。1 场 ≈ 10%，10 场 ≈ 63%，30 场 ≈ 95%。", conf_recency_desc: "若球员超过 {d} 天未出赛，可信度将开始下降——旧结果逐渐失去参考价值。最低不低于样本可信度的 70%。", legend_score_intro: "比分将依据真实匹克球规则进行验证。只有在比赛应当正式结束的那一刻，比分才算合法。", match_num_k: "第 {n} 场：K={k}", tier_elite_desc: "锦标赛级别选手。强力发球、稳定第三拍放短球、严守厨房区域。", tier_advanced_desc: "基本功扎实，在压力下仍能执行大多数球路，场上阅读能力佳。", tier_intermediate_desc: "稳定的对打能力，战术发展中，偶有非受迫性失误。", tier_recreational_desc: "学习选球时机，改善步法与落点控制。", tier_beginner_desc: "刚起步。专注于发球与接球的稳定性。", conf_sample_lbl: "样本数量", conf_recency_lbl: "近期活跃度", conf_high_desc: "高 — 积分可信", conf_medium_desc: "中 — 仍在发展", conf_low_desc: "低 — 需要更多比赛", score_legal: "✅ 合法", score_illegal: "❌ 不合法", score_rule_1: "先到11分且领先2分，正常结束", score_rule_2: "胶着局：超过11分后恰好领先2分", score_rule_3: "只领先1分 — 必须继续打胶着局", score_rule_4: "比赛应在11-2时结束，不可继续比到25分", first_to_lbl: "先得 {n} 分", legend_rating_tiers_sec: "积分等级与颜色", legend_how_calc_sec: "积分计算方式", legend_confidence_sec: "积分可信度 %", legend_score_rules_sec: "合法比分规则", legend_pt_win_pct_desc2: "本队得分占总分比例。50% 代表势均力敌；精英休闲球员通常介于 54–58%。", legend_provisional_boost: "暂定加速", legend_full_replay: "完整回放架构", multi_select_hint: "按住 Ctrl 或点击多个选项", event_restore_admin_only: "仅限管理员", trash_admin_only: "只有管理员可以永久清空垃圾桶。", stat_pt_win_pct: "🎯 得分率", pt_win_pct_sec: "🎯 得分胜率", pt_win_pct_desc: "本队得分占总分比例。50% 代表势均力敌；精英球员通常介于 54–58%。", conf_lbl: "可信度", conf_high: "高", conf_medium: "中", conf_low: "低", offline_banner: "离线中 — 应用程式可正常使用，连线后将自动同步。", offline_changes: "离线中 — 更改已保存至本机，连线后将同步", pending_sync: "待同步", sync_complete: "已恢复连线 — 正在同步您的比赛...", offline_mode_title: "离线模式", offline_match_queued: "比赛已保存 — 连线后将同步", syncing_matches: "正在将离线比赛同步至服务器...", sync_done: "所有比赛已成功同步！", sync_error: "同步失败 — 比赛数据仍保存在本机，恢复连线后将自动重试。"
  }
};

let currentLang = "en";
export function setLang(l) { currentLang = l; }
export function getLang() { return currentLang; }
export function t(key, fallback) { return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS["en"]?.[key] || fallback || key; }

// ─── Rating Engine ────────────────────────────────────────────────────────────
// ─── Session counter ──────────────────────────────────────────────────────────
// Returns the 1-based session number for a given prefix on today's date.
// Used to distinguish multiple Session/KOTC/Tournament logs on the same day.
// e.g. first Session of the day → 1, second → 2, etc.
export function getSessionNum(matches, notePrefix) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = new Set(
    (matches || [])
      .filter(m => {
        if (!m.date || !m.notes) return false;
        const matchDay = new Date(m.date).toISOString().slice(0, 10);
        return matchDay === todayStr && m.notes.startsWith(notePrefix);
      })
      .map(m => {
        // Extract the session number from notes like "Session #2 Round 1 of 3"
        const match = m.notes.match(/#(\d+)/);
        return match ? match[1] : "1";
      })
  );
  return todaySessions.size + 1;
}

export function calcExpected(rA, rB) { return 1 / (1 + Math.pow(10, (rB - rA) / 0.4)); }

// ─── Name shortening ──────────────────────────────────────────────────────────
// Abbreviates "Allen Tw" → "Allen T." when needed (long names or large zoom).
// Use everywhere a player name appears in chrome (lists, dropdowns, badges) so
// the UI stays consistent. Profile pages always show the full name.
//
//   force = "auto"    — abbreviate only when name.length >= 12
//   force = "always"  — always abbreviate (e.g. caller knows space is tight)
//   force = "never"   — always return full name (profile pages)
export function shortName(name, force = "auto") {
  if (!name) return "";
  if (force === "never") return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const tooLong = name.length >= 12;
  if (force === "always" || tooLong) {
    // First pass: First + Last initial → "Michael J."
    const firstLastInit = `${parts[0]} ${parts[parts.length - 1][0]}.`;
    // If still >12 chars (very long first name), go full initials → "M.J."
    if (firstLastInit.length > 12) {
      return parts.map(p => p[0].toUpperCase() + ".").join("");
    }
    return firstLastInit;
  }
  return name;
}

// smartName: used in leaderboard at large zoom — abbreviates if needed
export function smartName(name, zoom) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const z = zoom || 1.0;
  // Threshold: at large zoom abbreviate anything with 2+ words;
  // at standard/compact only abbreviate names longer than 13 chars total
  const shouldAbbreviate = isLargeZoom(z) || name.length > 13;
  if (!shouldAbbreviate) return name;
  const abbreviated = `${parts[0]} ${parts[parts.length - 1][0]}.`;
  // If first name itself is >10 chars or result still >12, go full initials
  if (parts[0].length > 10 || abbreviated.length > 12) {
    return parts.map(p => p[0].toUpperCase() + ".").join("");
  }
  return abbreviated;
}

// Helper: convenience reading of "is the current user at Large zoom?" — used
// by views to decide whether to force-abbreviate names even when name.length<12.
export function isLargeZoom(zoom) { return (zoom || 1) >= 1.13; }

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
export function fmtDate(iso, lang) {
  const l = lang || getLang();
  const d = new Date(iso);
  if (l === "zh_tw" || l === "zh_cn") {
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  }
  return d.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"});
}
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

// ─── Offline-aware State Persistence ─────────────────────────────────────────
//
// Architecture:
//   1. LOAD:  Try Firestore (with 8s timeout). On success, mirror to localStorage
//             as "pr_state_cache" so it's available on next offline load.
//             If Firestore fails/times out (offline), use the cached snapshot.
//   2. SAVE:  Always write to Firestore (SDK queues offline writes automatically).
//             Also mirror to localStorage so the cache stays fresh.
//   3. QUEUE: New matches added while offline go into "pr_pending_matches" in
//             localStorage. On reconnect, they're merged into Firestore before
//             any other write, preserving chronological order.
//
const CACHE_KEY     = "pr_state_cache";
const PENDING_KEY   = "pr_pending_matches";
const CACHE_VERSION = 1;

export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // If version matches, return as-is
    if (parsed.v === CACHE_VERSION) return parsed.data;
    // Version mismatch: older cache — merge with blankState to fill any missing fields
    // This prevents cache invalidation on every schema update
    if (parsed.data) {
      console.info("Cache version mismatch — merging with defaults");
      return { ...blankState(), ...parsed.data };
    }
    return null;
  } catch { return null; }
}

function writeCache(state) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, data: state, ts: Date.now() }));
  } catch {}
}

export function readPendingMatches() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); } catch { return []; }
}

export function writePendingMatches(matches) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(matches)); } catch {}
}

export function clearPendingMatches() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

export function queueMatchOffline(match) {
  const pending = readPendingMatches();
  pending.push(match);
  writePendingMatches(pending);
}

export async function saveState(state) {
  // Write to localStorage cache FIRST — synchronously — before any async network call.
  // This ensures data survives if the user closes the app before Firestore responds.
  writeCache(state);
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    const sharedOnly = getSharedState(state);
    const safeState = { ...sharedOnly };
    if (Array.isArray(safeState.matches)) safeState.matches = JSON.stringify(safeState.matches);
    if (Array.isArray(safeState.trash))   safeState.trash   = JSON.stringify(safeState.trash);
    await setDoc(docRef, safeState, { merge: true });
  } catch (e) {
    // Offline or error — cache was already written above, so data is safe.
    console.warn("saveState: Firestore unavailable, data cached locally:", e.message);
  }
}

export async function loadState() {
  // If clearly offline, skip the network call entirely and use cache immediately
  if (!navigator.onLine) {
    const cached = readCache();
    if (cached) return cached;
    return blankState();
  }
  // Online: try Firestore with a 5-second timeout (was 8s — too slow)
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore timeout")), 5000)
    );
    const docSnap = await Promise.race([fetchPromise, timeoutPromise]);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.matches === "string") data.matches = JSON.parse(data.matches);
      if (typeof data.trash   === "string") data.trash   = JSON.parse(data.trash);
      writeCache(data); // keep cache fresh
      return data;
    }
    return blankState();
  } catch (e) {
    // Network error or timeout — use localStorage cache
    console.warn("loadState: Firestore unavailable, using local cache:", e.message);
    const cached = readCache();
    if (cached) return cached;
    return blankState();
  }
}

// Merge queued offline matches into Firestore state and clear the queue.
// Called by App.jsx when isOnline flips true.
export async function syncPendingMatches() {
  const pending = readPendingMatches();
  if (pending.length === 0) return 0;
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return 0;
    const data = docSnap.data();
    const existing = typeof data.matches === "string" ? JSON.parse(data.matches) : (data.matches || []);
    // Merge: only add matches whose IDs don't already exist in Firestore
    const existingIds = new Set(existing.map(m => m.id));
    const newMatches = pending.filter(m => !existingIds.has(m.id));
    if (newMatches.length === 0) { clearPendingMatches(); return 0; }
    const merged = [...existing, ...newMatches].sort((a, b) => new Date(a.date) - new Date(b.date));
    const mergedStr = JSON.stringify(merged);
    await setDoc(docRef, { matches: mergedStr }, { merge: true });
    clearPendingMatches();
    // Update local cache with the merged state so a page refresh shows correct data
    try {
      const cached = readCache() || {};
      cached.matches = merged;
      writeCache(cached);
    } catch {}
    return newMatches.length;
  } catch (e) {
    console.error("syncPendingMatches failed:", e);
    return 0;
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
// ─── Feature: Player of the Month ─────────────────────────────────────────────
// Eligibility gate prevents brand-new players from "winning" via 2-3 lucky
// provisional matches. A real PoTM requires:
//   - 10+ total games played (sustained commitment)
//   - 5+ games within the current window (active recent participation)
export const POTM_MIN_TOTAL_GAMES   = 10;
export const POTM_MIN_WINDOW_GAMES  = 5;

export function computePlayerOfMonth(players, matches, days = 30) {
  const cutoff = Date.now() - days * 86400000;
  const recentMatches = matches.filter(m => m.date && new Date(m.date).getTime() > cutoff);
  if (!recentMatches.length) return [];

  return players.map(p => {
    // Find earliest rating snapshot in the window for this player
    const playerRecent = recentMatches.filter(m => m.teams?.flat().includes(p.id));
    if (!playerRecent.length) return null;

    // Eligibility gates
    if ((p.gamesPlayed || 0) < POTM_MIN_TOTAL_GAMES)  return null;
    if (playerRecent.length < POTM_MIN_WINDOW_GAMES)  return null;

    const earliest = playerRecent[0];
    const startRating = earliest.ratingSnaps?.[p.id] ?? p.ratingDoubles ?? 3;
    const endRating = p.ratingDoubles ?? 3;
    const gain = endRating - startRating;
    const wins = playerRecent.filter(m => m.teams[m.winnerTeam].includes(p.id)).length;
    return { id: p.id, name: p.name, gain, wins, played: playerRecent.length, endRating };
  }).filter(Boolean).sort((a, b) => b.gain - a.gain).slice(0, 5);
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
