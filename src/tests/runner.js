/**
 * PickleRank Built-in Test Runner
 * Tests pure logic: ELO math, score validation, date formatting, translation completeness, replay.
 * Admin-only. Importable from any component.
 */
import {
  validatePickleballScore, replayAllMatches, calcExpected,
  suggestBalancedTeams, fmtDate, t, setLang, getLang,
  DEFAULT_RATING, genId, shortName, smartName,
} from '../engine.js';

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

function testScoreValidation() {
  suite("Score Validation");
  expect("11-0 legal",    !!validatePickleballScore(11, 0, 11, 2));
  expect("11-9 legal",    !!validatePickleballScore(11, 9, 11, 2));
  expect("13-11 legal",   !!validatePickleballScore(13, 11, 11, 2));
  expect("0-11 legal",    !!validatePickleballScore(0, 11, 11, 2));
  expect("15-13 legal w/winTo15", !!validatePickleballScore(15, 13, 15, 2));
  expect("11-10 ILLEGAL", !validatePickleballScore(11, 10, 11, 2));
  expect("10-0 ILLEGAL",  !validatePickleballScore(10, 0, 11, 2));
  expect("12-11 ILLEGAL", !validatePickleballScore(12, 11, 11, 2));
  expect("11-11 ILLEGAL", !validatePickleballScore(11, 11, 11, 2));
  expect("Winner flag correct (11-5)", validatePickleballScore(11, 5, 11, 2)?.winner === 0);
  expect("Winner flag correct (5-11)", validatePickleballScore(5, 11, 11, 2)?.winner === 1);
}

function testEloMath() {
  suite("ELO Math");
  expectClose("Equal ratings → 50%", calcExpected(3.0, 3.0), 0.5);
  expect("Higher rated wins > 50%", calcExpected(4.0, 3.0) > 0.5);
  expect("Lower rated wins < 50%",  calcExpected(3.0, 4.0) < 0.5);
  expectClose("Symmetry sums to 1", calcExpected(3.5, 3.0) + calcExpected(3.0, 3.5), 1.0);
  expect("Always > 0", calcExpected(1.5, 6.5) > 0);
  expect("Always < 1", calcExpected(6.5, 1.5) < 1);
}

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
  // Replay idempotence
  const { derivedPlayers: d2 } = replayAllMatches([p1, p2], [match]);
  expectClose("Replay idempotent", d2.find(p=>p.id==="p1").ratingSingles, a.ratingSingles, 0.0001);
  // Blowout = bigger swing
  const bigMatch = { ...match, id:"m2", games:[{a:11,b:0,winner:0}] };
  const closeMatch = { ...match, id:"m3", games:[{a:11,b:9,winner:0}] };
  const { derivedPlayers: dB } = replayAllMatches([p1, p2], [bigMatch]);
  const { derivedPlayers: dC } = replayAllMatches([p1, p2], [closeMatch]);
  expect("Blowout gives bigger swing than close game",
    dB.find(p=>p.id==="p1").ratingSingles > dC.find(p=>p.id==="p1").ratingSingles);
}

function testTranslations() {
  suite("Translation Keys");
  const savedLang = getLang();
  const CRITICAL = [
    "rank","history","matches_tab","settings","log_match_btn","logout_btn",
    "singles_rating","doubles_rating","match_type_singles","match_type_doubles",
    "mode_session","kotc","tournament","start_tournament","champions",
    "going","maybe","cant","quick_log","todays_players",
    "standings","match_history","semifinals","finals","grand_final",
    "w_abbr","l_abbr","g_abbr","matches_label","err_select_singles","err_select_doubles",
    "rating_skip_hint",
  ];
  for (const lang of ["zh_tw","zh_cn"]) {
    setLang(lang);
    for (const key of CRITICAL) {
      const val = t(key);
      expect(`[${lang}] "${key}" translated`, val !== key && val && val.length > 0, `returned: "${val}"`);
    }
  }
  setLang(savedLang);
  // EN baseline
  setLang("en");
  expect('[en] "rank" not empty', t("rank") && t("rank").length > 0);
  setLang(savedLang);
}

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
  setLang("zh_cn");
  const cn = fmtDate(iso, "zh_cn");
  expect("CN date has 年", cn.includes("年"));
  setLang(savedLang);
}

function testNameAbbreviation() {
  suite("Name Abbreviation");
  expectEq("Single name unchanged", shortName("Alice"), "Alice");
  expectEq("Always: two words", shortName("Michael Jackson","always"), "Michael J.");
  expectEq("Never: return full", shortName("Michael Jackson","never"), "Michael Jackson");
  const long = shortName("Christopher Alexander","always");
  expect("Very long first name → initials", long.includes(".") && long.length <= 8);
  // smartName
  expect("smartName at 1.0 = full", smartName("Michael Jackson", 1.0) === "Michael Jackson");
  const large = smartName("Michael Jackson", 1.2);
  expect("smartName at 1.2 abbreviated", large !== "Michael Jackson");
}

function testTeamSuggester() {
  suite("Team Suggester");
  const playerIds = ["a","b","c","d"];
  const players = [
    {id:"a", ratingDoubles:4.0},{id:"b", ratingDoubles:3.0},
    {id:"c", ratingDoubles:3.5},{id:"d", ratingDoubles:2.5},
  ];
  const suggestions = suggestBalancedTeams(playerIds, players, "doubles");
  expect("Returns array", Array.isArray(suggestions));
  expect("Returns 3 options", suggestions?.length === 3);
  if (suggestions?.length >= 2) {
    const d0 = Math.abs(suggestions[0].avgT1 - suggestions[0].avgT2);
    const d1 = Math.abs(suggestions[1].avgT1 - suggestions[1].avgT2);
    expect("Best option has smallest gap", d0 <= d1);
  }
}

function testIdGeneration() {
  suite("ID Generation");
  const ids = Array.from({length: 200}, () => genId());
  expect("All IDs unique", new Set(ids).size === 200);
  expect("IDs are strings", ids.every(id => typeof id === "string"));
  expect("IDs non-empty", ids.every(id => id.length > 0));
}

export function runAllTests() {
  _results = [];
  try { testScoreValidation(); }    catch(e) { _results.push({suite:"Score Validation",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testEloMath(); }            catch(e) { _results.push({suite:"ELO Math",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testReplayAllMatches(); }   catch(e) { _results.push({suite:"Replay",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testTranslations(); }       catch(e) { _results.push({suite:"Translations",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testDateFormatting(); }     catch(e) { _results.push({suite:"Dates",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testNameAbbreviation(); }   catch(e) { _results.push({suite:"Names",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testTeamSuggester(); }      catch(e) { _results.push({suite:"Teams",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  try { testIdGeneration(); }       catch(e) { _results.push({suite:"IDs",desc:"SUITE CRASH",pass:false,detail:e.message}); }
  const total = _results.length;
  const passed = _results.filter(r => r.pass).length;
  const failed = _results.filter(r => !r.pass);
  return { total, passed, failed, results: _results };
}
