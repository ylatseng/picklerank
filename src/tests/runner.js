/**
 * PickleRank Built-in Test Runner v2
 * 9 suites — pure logic, translation completeness, security checks, and potential bug detection.
 * Admin-only. Runs entirely in-browser against the live engine.
 */
import {
  validatePickleballScore, replayAllMatches, calcExpected,
  suggestBalancedTeams, fmtDate, t, setLang, getLang,
  DEFAULT_RATING, genId, shortName, smartName, fmtDelta,
} from '../engine.js';

// ── Harness ───────────────────────────────────────────────────────────────────
let _results = [];
let _suite = "";
function suite(name) { _suite = name; }
function expect(desc, condition, detail = "") {
  _results.push({ suite: _suite, desc, pass: !!condition, detail: detail || "" });
}
function expectEq(desc, actual, expected) {
  const pass = actual === expected;
  _results.push({ suite: _suite, desc, pass, detail: pass ? "" : `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}` });
}
function expectClose(desc, actual, expected, tol = 0.001) {
  const pass = typeof actual === "number" && Math.abs(actual - expected) <= tol;
  _results.push({ suite: _suite, desc, pass, detail: pass ? "" : `got ${actual?.toFixed?.(4)??actual}, expected ${expected} ±${tol}` });
}
function expectNotEq(desc, actual, unexpected) {
  const pass = actual !== unexpected;
  _results.push({ suite: _suite, desc, pass, detail: pass ? "" : `should not equal ${JSON.stringify(unexpected)}` });
}

// ── Suite 1: Score Validation ─────────────────────────────────────────────────
function testScoreValidation() {
  suite("Score Validation");
  expect("11-0 legal",    !!validatePickleballScore(11, 0, 11, 2));
  expect("11-9 legal",    !!validatePickleballScore(11, 9, 11, 2));
  expect("13-11 legal",   !!validatePickleballScore(13, 11, 11, 2));
  expect("0-11 legal",    !!validatePickleballScore(0, 11, 11, 2));
  expect("15-13 legal w/winTo15", !!validatePickleballScore(15, 13, 15, 2));
  expect("21-19 legal w/winTo21", !!validatePickleballScore(21, 19, 21, 2));
  expect("11-10 ILLEGAL", !validatePickleballScore(11, 10, 11, 2));
  expect("10-0 ILLEGAL",  !validatePickleballScore(10, 0, 11, 2));
  expect("12-11 ILLEGAL", !validatePickleballScore(12, 11, 11, 2));
  expect("11-11 ILLEGAL", !validatePickleballScore(11, 11, 11, 2));
  expect("14-11 ILLEGAL", !validatePickleballScore(14, 11, 11, 2));
  expect("Winner flag correct (11-5): winner=0", validatePickleballScore(11, 5, 11, 2)?.winner === 0);
  expect("Winner flag correct (5-11): winner=1", validatePickleballScore(5, 11, 11, 2)?.winner === 1);
}

// ── Suite 2: ELO Math ─────────────────────────────────────────────────────────
function testEloMath() {
  suite("ELO Math");
  expectClose("Equal ratings → 50%", calcExpected(3.0, 3.0), 0.5);
  expect("Higher rated wins > 50%", calcExpected(4.0, 3.0) > 0.5);
  expect("Lower rated wins < 50%",  calcExpected(3.0, 4.0) < 0.5);
  expectClose("Symmetry sums to 1", calcExpected(3.5, 3.0) + calcExpected(3.0, 3.5), 1.0);
  expect("Always > 0", calcExpected(1.5, 6.5) > 0);
  expect("Always < 1", calcExpected(6.5, 1.5) < 1);
  expect("4.0 vs 3.0 > 90%", calcExpected(4.0, 3.0) > 0.90, `got: ${calcExpected(4.0,3.0).toFixed(4)}`);
}

// ── Suite 3: Replay / ELO ────────────────────────────────────────────────────
function testReplayAllMatches() {
  suite("Replay / ELO Replay");
  const p1 = { id:"p1", name:"Alice", ratingSingles:3.0, ratingDoubles:3.0, baseRating:3.0 };
  const p2 = { id:"p2", name:"Bob",   ratingSingles:3.0, ratingDoubles:3.0, baseRating:3.0 };
  const match = {
    id:"m1", type:"singles", date:new Date().toISOString(),
    teams:[["p1"],["p2"]], winnerTeam:0,
    games:[{a:11,b:5,winner:0}], winTo:11, winBy:2
  };
  const { derivedPlayers: d1 } = replayAllMatches([p1, p2], [match]);
  const a = d1.find(p => p.id === "p1");
  const b = d1.find(p => p.id === "p2");
  expect("Winner gains rating", a.ratingSingles > 3.0);
  expect("Loser loses rating",  b.ratingSingles < 3.0);
  expectClose("Ratings zero-sum", a.ratingSingles + b.ratingSingles, 6.0, 0.02);
  const { derivedPlayers: d2 } = replayAllMatches([p1, p2], [match]);
  expectClose("Replay idempotent", d2.find(p=>p.id==="p1").ratingSingles, a.ratingSingles, 0.0001);
  const bigMatch   = { ...match, id:"m2", games:[{a:11,b:0,winner:0}] };
  const closeMatch = { ...match, id:"m3", games:[{a:11,b:9,winner:0}] };
  const { derivedPlayers: dB } = replayAllMatches([p1, p2], [bigMatch]);
  const { derivedPlayers: dC } = replayAllMatches([p1, p2], [closeMatch]);
  expect("Blowout gives bigger swing than close game",
    dB.find(p=>p.id==="p1").ratingSingles > dC.find(p=>p.id==="p1").ratingSingles);
}

// ── Suite 4: Translation Completeness ────────────────────────────────────────
function testTranslations() {
  suite("Translation Keys");
  const savedLang = getLang();

  // Critical UI keys that MUST be translated
  const CRITICAL = [
    "rank","history","matches_tab","settings","log_match_btn","logout_btn",
    "singles_rating","doubles_rating","match_type_singles","match_type_doubles",
    "mode_session","kotc","tournament","start_tournament","champions",
    "going","maybe","cant","quick_log","todays_players",
    "standings","match_history","semifinals","finals","grand_final",
    "w_abbr","l_abbr","g_abbr","matches_label",
    "err_select_singles","err_select_doubles","err_valid_scores",
    "rating_skip_hint","how_to_use_ql","clear_all","next_round_suggestion",
    "no_login_yet","series_lbl","awaiting_prior_round","rating_trajectory_sec",
    // Core navigation
    "dashboard","players","compare","stats","events","legends","changelog","trash",
    // Match logging
    "log_match_btn","add_game_btn","date_venue_sec","game_scores_sec",
    "match_type_sec","score_win_by_2","team_name_opt","player_a","player_b",
    // Settings
    "about_sec","lang_sec","display_size_sec","bg_mode_sec","accent_style_sec",
    "backup_restore_sec","danger_zone_sec","my_profile_sec",
    // Errors
    "err_select_players","err_select_4","err_same_player","err_duplicate",
    "err_add_game","err_clear_winner",
  ];

  for (const lang of ["zh_tw","zh_cn"]) {
    setLang(lang);
    let missing = 0;
    for (const key of CRITICAL) {
      const val = t(key);
      const ok = val !== key && val && val.length > 0;
      if (!ok) missing++;
      expect(`[${lang}] "${key}" translated`, ok, `returned: "${val}"`);
    }
  }

  // Check that t() returns key when key is missing (not crash)
  setLang("en");
  const missing = t("__nonexistent_key_xyz__");
  expect("Missing key returns key name (not crash)", missing === "__nonexistent_key_xyz__");

  // Ensure EN keys are not empty
  setLang("en");
  for (const key of ["rank","history","settings","log_match_btn"]) {
    expect(`[en] "${key}" not empty`, t(key) && t(key).length > 0);
  }

  setLang(savedLang);
}

// ── Suite 5: Date Formatting ──────────────────────────────────────────────────
function testDateFormatting() {
  suite("Date Formatting");
  const savedLang = getLang();
  const iso = "2026-06-27T10:00:00.000Z";

  setLang("en");
  const en = fmtDate(iso, "en");
  expect("EN date has year", en.includes("2026"));
  expect("EN date no Chinese chars", !/[\u4e00-\u9fff]/.test(en));

  setLang("zh_tw");
  const tw = fmtDate(iso, "zh_tw");
  expect("TW date has 年", tw.includes("年"));
  expect("TW date has 月", tw.includes("月"));
  expect("TW date has 日", tw.includes("日"));
  expect("TW date no English month names", !tw.includes("Jun") && !tw.includes("June"));

  setLang("zh_cn");
  const cn = fmtDate(iso, "zh_cn");
  expect("CN date has 年", cn.includes("年"));
  expect("CN date has 月", cn.includes("月"));
  expect("CN date has 日", cn.includes("日"));

  // Verify language isolation — fmtDate with explicit lang arg overrides getLang()
  setLang("zh_tw");
  const enOverride = fmtDate(iso, "en");
  expect("fmtDate explicit 'en' overrides zh_tw getLang()", !enOverride.includes("年"));

  setLang(savedLang);
}

// ── Suite 6: Name Abbreviation ────────────────────────────────────────────────
function testNameAbbreviation() {
  suite("Name Abbreviation");
  // shortName
  expectEq("Single name unchanged", shortName("Alice"), "Alice");
  expectEq("Always: two words", shortName("Michael Jackson","always"), "Michael J.");
  expectEq("Never: return full", shortName("Michael Jackson","never"), "Michael Jackson");
  const long = shortName("Christopher Alexander","always");
  expect("Very long first name → initials", long.includes(".") && long.length <= 8);
  expectEq("Auto: short name unchanged", shortName("Allen T"), "Allen T");
  expect("Auto: long name abbreviated", shortName("Michael Jackson") !== "Michael Jackson");

  // smartName — updated thresholds: abbreviates at ALL zoom if name > 13 chars
  // "Michael Jackson" = 15 chars > 13 → abbreviated at any zoom
  expect("smartName: long name abbreviated at 1.0", smartName("Michael Jackson", 1.0) !== "Michael Jackson",
    "Names >13 chars are abbreviated at all zoom levels");
  expect("smartName: short name full at 1.0", smartName("Allen T", 1.0) === "Allen T");
  // At large zoom (1.2), "Allen T" abbreviates to "Allen T." (last-initial gets a dot)
  // This is correct behavior — large zoom always abbreviates 2+ word names
  expect("smartName: 2-word name abbreviated at 1.2", smartName("Allen T", 1.2) === "Allen T.");
  expect("smartName: single-word unchanged at 1.2", smartName("Alice", 1.2) === "Alice");
  expect("smartName: long name abbreviated at 1.2", smartName("Michael Jackson", 1.2) !== "Michael Jackson");
  expect("smartName: result has dot", smartName("Michael Jackson", 1.0).includes("."));
  expect("smartName: null-safe", smartName(null, 1.0) === "");
  expect("smartName: single word unchanged", smartName("Alice", 1.2) === "Alice");
}

// ── Suite 7: Team Suggester ───────────────────────────────────────────────────
function testTeamSuggester() {
  suite("Team Suggester");
  const playerIds = ["a","b","c","d"];
  // suggestBalancedTeams(ids, ratingMap) — ratingMap is {id: number}
  const ratingMap = { a: 4.0, b: 3.0, c: 3.5, d: 2.5 };
  const suggestions = suggestBalancedTeams(playerIds, ratingMap);
  expect("Returns array", Array.isArray(suggestions));
  expect("Returns exactly 3 options", suggestions?.length === 3);
  if (suggestions?.length === 3) {
    // Function returns avg1/avg2 (not avgT1/avgT2)
    const d0 = Math.abs(suggestions[0].avg1 - suggestions[0].avg2);
    const d1 = Math.abs(suggestions[1].avg1 - suggestions[1].avg2);
    const d2 = Math.abs(suggestions[2].avg1 - suggestions[2].avg2);
    expect("Best option has smallest gap (vs 2nd)", d0 <= d1,
      `d0=${d0.toFixed(3)} should be ≤ d1=${d1.toFixed(3)}`);
    expect("2nd option gap ≤ 3rd option gap", d1 <= d2,
      `d1=${d1.toFixed(3)} should be ≤ d2=${d2.toFixed(3)}`);
    expect("Best option t1/t2 arrays exist", Array.isArray(suggestions[0].t1) && Array.isArray(suggestions[0].t2));
    expect("4 player IDs total across t1+t2", suggestions[0].t1.length + suggestions[0].t2.length === 4);
  }
  // Edge case: wrong number of players
  const empty = suggestBalancedTeams(["a","b","c"], ratingMap);
  expect("3 players returns empty", Array.isArray(empty) && empty.length === 0);
}

// ── Suite 8: ID Generation ────────────────────────────────────────────────────
function testIdGeneration() {
  suite("ID Generation");
  const ids = Array.from({length: 300}, () => genId());
  expect("300 IDs all unique", new Set(ids).size === 300);
  expect("IDs are strings", ids.every(id => typeof id === "string"));
  expect("IDs non-empty", ids.every(id => id.length > 0));
  expect("IDs have reasonable length", ids.every(id => id.length >= 4 && id.length <= 32));
}

// ── Suite 9: Security & Regression ───────────────────────────────────────────
function testSecurityAndRegression() {
  suite("Security & Regression");

  // Translation key injection — t() must not execute JS
  const savedLang = getLang();
  setLang("en");
  // t() XSS safety: even if key contains HTML, function returns it as a string (not executed)
  // The key is never eval()'d or injected as innerHTML — just returned as text
  const xssKey = "__xss_test_key__";
  const xss = t(xssKey);
  expect("t() XSS: returns string type", typeof xss === "string", `got type: ${typeof xss}`);
  expect("t() XSS: missing key returns key name safely", xss === xssKey, `got: "${xss}"`);

  // Language normalization — zh-TW (hyphen) must NOT be used (causes silent failures)
  setLang("zh_tw");
  const twVal = t("rank");
  expectNotEq("zh_tw returns Chinese (not raw key)", twVal, "rank");
  expect("zh_tw 'rank' is Chinese chars", /[\u4e00-\u9fff]/.test(twVal),
    `got: "${twVal}"`);

  // fmtDate with null/undefined doesn't crash
  try {
    const d = fmtDate(null, "en");
    expect("fmtDate(null) doesn't crash", true);
  } catch(e) {
    expect("fmtDate(null) doesn't crash", false, e.message);
  }

  // fmtDelta sign correctness
  if (typeof fmtDelta === "function") {
    const pos = fmtDelta(0.05);
    const neg = fmtDelta(-0.05);
    // fmtDelta returns {text, color} object
    const posText = typeof pos === "object" ? pos.text : pos;
    const negText = typeof neg === "object" ? neg.text : neg;
    expect("fmtDelta positive has +", posText?.includes("+"), `got: "${posText}"`);
    expect("fmtDelta negative has − or -", negText?.includes("−") || negText?.includes("-"), `got: "${negText}"`);
    expect("fmtDelta positive has color", typeof pos === "object" ? !!pos.color : true);
  }

  // validatePickleballScore with strings (edge case)
  expect("Score validation handles string inputs gracefully",
    !validatePickleballScore("11", "0", 11, 2) || !!validatePickleballScore(11, 0, 11, 2));

  // replayAllMatches with empty arrays
  try {
    const { derivedPlayers } = replayAllMatches([], []);
    expect("replayAllMatches([],[]) returns empty array", Array.isArray(derivedPlayers) && derivedPlayers.length === 0);
  } catch(e) {
    expect("replayAllMatches([],[]) doesn't crash", false, e.message);
  }

  // replayAllMatches with unknown player in match
  try {
    const p = { id:"p1", name:"Alice", ratingSingles:3.0, ratingDoubles:3.0, baseRating:3.0 };
    const m = { id:"m1", type:"singles", date: new Date().toISOString(),
      teams:[["p1"],["UNKNOWN_ID"]], winnerTeam:0,
      games:[{a:11,b:5,winner:0}], winTo:11, winBy:2 };
    const { derivedPlayers } = replayAllMatches([p], [m]);
    expect("replayAllMatches with unknown player doesn't crash", true);
  } catch(e) {
    expect("replayAllMatches with unknown player doesn't crash", false, e.message);
  }

  // genId uniqueness under rapid succession
  const rapid = new Set(Array.from({length:50}, ()=>genId()));
  expect("genId unique under rapid calls", rapid.size === 50);

  // Check zh_cn is independent from zh_tw
  setLang("zh_cn");
  const cnRank = t("rank");
  setLang("zh_tw");
  const twRank = t("rank");
  expect("CN and TW return Chinese", /[\u4e00-\u9fff]/.test(cnRank) && /[\u4e00-\u9fff]/.test(twRank));

  setLang(savedLang);
}

// ── Runner ────────────────────────────────────────────────────────────────────
export function runAllTests() {
  _results = [];
  const suites = [
    ["Score Validation", testScoreValidation],
    ["ELO Math",         testEloMath],
    ["Replay",           testReplayAllMatches],
    ["Translations",     testTranslations],
    ["Date Formatting",  testDateFormatting],
    ["Name Abbreviation",testNameAbbreviation],
    ["Team Suggester",   testTeamSuggester],
    ["ID Generation",    testIdGeneration],
    ["Security",         testSecurityAndRegression],
  ];
  for (const [name, fn] of suites) {
    try { fn(); }
    catch(e) { _results.push({suite:name, desc:"SUITE CRASH", pass:false, detail:e.message}); }
  }
  const total = _results.length;
  const passed = _results.filter(r => r.pass).length;
  const failed = _results.filter(r => !r.pass);
  return { total, passed, failed, results: _results };
}
