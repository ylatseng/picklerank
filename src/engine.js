// Firebase connection setup
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
export { db }; // This unlocks it for Settings.jsx!

// ─── Constants ────────────────────────────────────────────────────────────────
export const DEFAULT_RATING = 3.0;
export const K_FACTOR = 0.08;
export const STORAGE_KEY = "pkl_tracker_v4"; 

// 👉 Add your version tracker here:
export const APP_VERSION = "1.1.0";
export const APP_UPDATED = "2026-06-19";

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
    rating_range_hint: "Must be 1.500 – 6.500", dupr_tiers_hint: "DUPR tiers: 2.0–2.5 Beginner · 2.5–3.5 Recreational · 3.5–4.5 Intermediate · 4.5–5.5 Advanced · 5.5+ Elite", add_player_btn: "Add Player", roster_lbl: "Roster", edit_details: "Edit player details", cancel: "Cancel", save: "Save", rename: "Rename", remove_player_q: "Remove this player?", match_history_stays: "Match history stays.", base_rating_sec: "🎯 Starting / Base Rating", base_rating_desc: "Rating all match calculations start from.", base_rating_lbl: "Base rating", edit_starting_rating: "✏️ Edit Starting Rating", new_starting_rating: "New starting rating (1.500 – 6.500)", save_recalc: "Save & Recalculate", rating_trend_desc: "Play more matches to see rating trend.", reset_rating_btn: "Reset Rating", reset_rating_q: "Reset rating to 3.000?", rating_history_cleared: "Rating history will be cleared.", best_win_sec: "🏅 Best Win", match_type_sec: "Match Type", win_to_lbl: "Win to:", win_by_lbl: "Win by:", point: "Point", points: "Points", select_prompt: "Select…", team_name_opt: "Team Name (optional)", player_a: "Player A", player_b: "Player B", player_1: "Player 1", player_2: "Player 2", game_scores_sec: "Game Scores", score_win_by_2: "First to {winTo}, win by {winBy}.", add_game_btn: "+ Add Game", date_venue_sec: "Date & Venue", date_time_lbl: "Date & Time", venue_opt: "Venue (optional)", log_match_btn: "Log Match & Update Ratings", filter_search_sec: "Filter & Search", search_placeholder: "Search matches...", results_lbl: "Results", delete_match_q: "Delete this match?", ratings_recalculated: "Ratings will be recalculated.", rating_comp_sec: "Rating Comparison", overview_sec: "📊 Overview", records_sec: "🏅 Records", venues_lbl: "Venues", bg_mode_sec: "🌗 Background Mode", accent_style_sec: "🎨 Accent Style", typography_sec: "Aa Typography / 字體", backup_restore_sec: "💾 Backup & Restore", backup_desc: "Export your data for backup or spreadsheet analysis.", json_backup_btn: "📤 JSON Backup", csv_export_btn: "📊 CSV Export", import_json_btn: "📥 Import JSON Data", summary_sec: "📋 Summary", danger_zone_sec: "⚠️ Danger Zone", danger_desc: "Permanently deletes all data. Export first if needed.", clear_all_btn: "🗑️ Clear All Data", about_sec: "ℹ️ About", about_desc: "DUPR-style rating tracker for private pickleball groups. ELO-based algorithm with score-margin weighting. Ratings 1.5–6.5. Data stored locally.", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. Select Foursome", load_saved_group: "Load Saved Group", save_group_btn: "Save Group", select_4_unique: "Select 4 unique players.", rr_matchups: "2. Round Robin Matchups", log_score_btn: "Log Score", save_score_btn: "Save Score", match_logged_ok: "✅ Match Logged!", see_history_btn: "See History →", edit_match_title: "✏️ Edit Match", branding_sec: "✨ App Branding", logo_text: "Logo Text / Emoji", upload_logo: "Upload Image Logo", display_size_sec: "🔍 Display Size", size_compact: "Compact", size_standard: "Standard", size_large: "Large", synergy_rivalry_sec: "🤝 Synergy & Rivalry", best_partner: "Best Partner", nemesis: "Nemesis", win_rate: "Win", vs_them: "vs them", worst_partner: "⚠️ Chemistry Test", easy_target: "🎯 Easy Target", admin_sec: "🔒 Security & Admin", admin_status: "Status", user_mode: "User Mode (Read/Add/Edit)", admin_mode: "Admin Mode (Full Access)", passcode_lbl: "Passcode", login_btn: "Admin Login", logout_btn: "Logout", change_pass_btn: "Change Passcode", wrong_pass: "Incorrect passcode.", pass_updated: "Passcode updated.", badges_sec: "🎖️ Achievements", badge_centurion: "Centurion (100+ Games)", badge_ironman: "Ironman (50+ Games)", badge_slayer: "Giant Slayer (Major Upset)", badge_streaker: "Unstoppable (5+ Win Streak)", badge_sharp: "Sharpshooter (60%+ Win Rate)", no_badges: "Play more matches to earn achievements!", all_players: "All Players", view_all_matches: "View All Matches", singles_wr: "Singles Win%", doubles_wr: "Doubles Win%", photo: "Photo", change_photo: "Change", search_players_placeholder: "Search players...", sort_by: "Sort by:", sort_rating: "Rating (High to Low)", sort_fn: "First Name (A-Z)", sort_ln: "Last Name (A-Z)", sort_games: "Games Played", err_enter_name: "Enter a name.", err_exists: "Player already exists.", err_empty: "Name cannot be empty.", err_taken: "Name already taken.", err_select_players: "Select players.", err_select_4: "Select 4 players.", err_duplicate: "Select unique players.", err_valid_scores: "Valid scores needed.", err_invalid_score_fmt: "Invalid score. First to {winTo}, win by {winBy}.", err_add_game: "Add at least one game.", err_clear_winner: "Need clear winner.", err_error_scores: "Error scores.", h2h_btn: "⚔️ Compare Players (H2H)", log_custom_btn: "➕ Log Custom Match", rating_elite: "Elite", rating_advanced: "Advanced", rating_intermediate: "Intermediate", rating_recreational: "Recreational", rating_beginner: "Beginner", stat_matches: "🎮 Matches", stat_wins: "✅ Wins", stat_losses: "❌ Losses", stat_win_pct: "📈 Win%", stat_w_streak: "🔥 W-Streak", stat_l_streak: "🧊 L-Streak", rating_history_sec: "📈 Performance Trend", spark_start: "Start", spark_peak: "Peak", spark_now: "Now", beat_opp: "Beat {name}", upset_of: "upset of", overview_total_matches: "Total Matches", overview_singles: "Singles", overview_doubles: "Doubles", overview_games_played: "Games Played", overview_players: "Players", overview_venues: "Venues", record_most_matches: "Most Matches", record_top_rated: "Top Rated", record_hot_streak: "Hot Streak", record_biggest_upset: "Biggest Upset", record_beat_higher: "beat higher-rated opponent by", recent_form: "Recent Form", no_data: "No data", match_predictor: "🔮 Match Predictor", prob_win: "Win Probability", if_wins: "If {name} wins:", expected_delta: "Expected Delta", save: "Save", singles_title: "Singles Rank", doubles_title: "Doubles Rank", verified_status: "Certified", provisional_status: "Provisional", teams: "Teams", performance_profile: "👤 Performance Profile", copy_ai_prompt: "🤖 Copy AI Recap Prompt", ai_prompt_copied: "Prompt copied! Paste it into Gemini.", kotc: "King of Court", kotc_desc: "Play 3 games, rotating partners. The player with the most wins (and point differential) is the King!", round: "Round", diff: "Diff", log_kotc: "Log Tournament", tournament: "Tournament", tourney_setup: "Bracket Setup", bracket_size: "Bracket Size", team: "Team", generate_bracket: "Generate Bracket", qf: "Quarterfinals", sf: "Semifinals", final: "Final", winner: "Winner", log_tournament: "Log Tournament", sort_starred: "Starred First (A-Z)", select_teams: "Select Teams", start_tournament: "Start Tournament", 
    singles_rating: "Singles Rating",
    doubles_rating: "Doubles Rating",
  },
  zh_tw: {
    rank: "排名", roster: "名冊", session: "球局", custom: "自訂", history: "歷史", h2h: "對戰", matches_tab: "比賽", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 積分追蹤器", players: "球員", players_sub: "管理球員名冊", session_title: "循環賽球局", session_sub: "四人循環賽自動對戰", log: "記錄比賽", log_sub: "登錄一場比賽結果", history_title: "比賽歷史", history_sub: "所有比賽紀錄", compare: "雙人對戰比較", compare_sub: "頭對頭數據分析", stats: "團隊統計", stats_sub: "數據洞察與紀錄", settings: "設定", settings_sub: "資料管理與外觀", leaderboard: "🏆 積分排行榜", recent_matches: "⚡ 近期對戰", no_players: "目前尚無球員。", add_players_btn: "新增球員", no_matches: "目前尚無比賽紀錄。", log_first_match: "記錄第一場比賽", add_player_sec: "新增球員", name_lbl: "球員姓名", starting_rating: "初始積分", optional_dupr: "(選填 — 真實 DUPR 積分)", rating_range_hint: "必須介於 1.500 – 6.500 之間", dupr_tiers_hint: "DUPR 級別: 2.0–2.5 初學 · 2.5–3.5 娛樂 · 3.5–4.5 中階 · 4.5–5.5 進階 · 5.5+ 精英", add_player_btn: "加入球員", roster_lbl: "球員名冊", edit_details: "修改球員資料", cancel: "取消", save: "儲存", rename: "重命名", remove_player_q: "確定要移除此球員嗎？", match_history_stays: "該球員的歷史對戰紀錄仍會保留。", base_rating_sec: "🎯 初始 / 基礎積分", base_rating_desc: "所有比賽計算的基準起點點數。", base_rating_lbl: "基礎積分", edit_starting_rating: "✏️ 修改初始積分", new_starting_rating: "新初始積分 (1.500 – 6.500)", save_recalc: "儲存並重新計算所有比賽", rating_trend_desc: "多打幾場比賽即可看到積分走勢圖。", reset_rating_btn: "重置積分", reset_rating_q: "重置積分為 3.000？", rating_history_cleared: "積分歷史紀錄將會被清空。", best_win_sec: "🏅 生涯最佳勝場", match_type_sec: "比賽類型", win_to_lbl: "勝出分數:", win_by_lbl: "勝出分差:", point: "分", points: "分", select_prompt: "選擇…", team_name_opt: "隊伍名稱 (選填)", player_a: "球員 A", player_b: "球員 B", player_1: "球員 1", player_2: "球員 2", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者勝，須贏 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期與地點", date_time_lbl: "比賽時間", venue_opt: "球場/地點 (選填)", log_match_btn: "登錄比賽並更新積分", filter_search_sec: "篩選與搜尋", search_placeholder: "搜尋比賽紀錄…", results_lbl: "對戰結果", delete_match_q: "確定要刪除這場比賽嗎？", ratings_recalculated: "所有球員積分將重新計算。", rating_comp_sec: "積分對比", overview_sec: "📊 數據總覽", records_sec: "🏅 紀錄保持人", venues_lbl: "比賽球場", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主題色調", typography_sec: "Aa 字體設定", backup_restore_sec: "💾 備份與還原", backup_desc: "匯出您的資料以利備份或匯入試算表進行精細分析。", json_backup_btn: "📤 JSON 備份", csv_export_btn: "📊 CSV 匯出", import_json_btn: "📥 匯入 JSON 資料", summary_sec: "📋 數據統計", danger_zone_sec: "⚠️ 危險區域", danger_desc: "永久刪除所有資料。如有需要，請先匯出備份。", clear_all_btn: "🗑️ 清空所有本地資料", about_sec: "ℹ️ 關於系統", about_desc: "專為私有 pickleball 社群設計的 DUPR 導向積分追蹤器。採用 ELO 權重演算法，結合勝分差加權修正。積分範圍 1.5–6.5。所有資料皆儲存於本地瀏覽器。", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. 選擇今日四人組合", load_saved_group: "載入常用組合", save_group_btn: "儲存此組合", select_4_unique: "請選擇 4 位不同的球員。", rr_matchups: "2. 循環賽對戰組合", log_score_btn: "登錄比分", save_score_btn: "儲存比分", match_logged_ok: "✅ 比賽登錄成功！", see_history_btn: "前往歷史紀錄 →", edit_match_title: "✏️ 修改比賽資料", branding_sec: "✨ App 品牌設定", logo_text: "圖示文字 / 表情符號", upload_logo: "上傳自訂圖示", display_size_sec: "🔍 顯示大小", size_compact: "緊湊", size_standard: "標準", size_large: "放大", synergy_rivalry_sec: "🤝 最佳拍檔與宿敵", best_partner: "最佳拍檔", nemesis: "宿敵", win_rate: "勝率", vs_them: "對戰勝率", worst_partner: "⚠️ 默契考驗", easy_target: "🎯 最佳提款機", admin_sec: "🔒 權限與安全", admin_status: "目前狀態", user_mode: "一般用戶 (檢視/新增/編輯)", admin_mode: "管理員 (完整權限)", passcode_lbl: "管理員密碼", login_btn: "登入", logout_btn: "登出", change_pass_btn: "更改密碼", wrong_pass: "密碼錯誤。", pass_updated: "密碼已更新。", badges_sec: "🎖️ 個人成就", badge_centurion: "百戰老將 (100+ 場)", badge_ironman: "鐵人 (50+ 場)", badge_slayer: "巨人殺手 (大爆冷門)", badge_streaker: "無人能擋 (5+ 連勝)", badge_sharp: "神射手 (60%+ 勝率)", no_badges: "多打幾場比賽來解鎖成就！", all_players: "所有球員", view_all_matches: "查看所有比賽", singles_wr: "單打勝率", doubles_wr: "雙打勝率", photo: "照片", change_photo: "更換", search_players_placeholder: "搜尋球員...", sort_by: "排序方式:", sort_rating: "積分 (高到低)", sort_fn: "名字 (A-Z)", sort_ln: "姓氏 (A-Z)", sort_games: "比賽場數", err_enter_name: "請輸入姓名。", err_exists: "球員已存在。", err_empty: "名稱不能為空。", err_taken: "名稱已被使用。", err_select_players: "請選擇球員。", err_select_4: "請選擇 4 位球員。", err_duplicate: "球員重複。", err_valid_scores: "請輸入有效的比分。", err_invalid_score_fmt: "比分無效。先得 {winTo} 分，須贏 {winBy} 分。", err_add_game: "請至少新增一局。", err_clear_winner: "比賽必須有明確勝負。", err_error_scores: "比分錯誤。", h2h_btn: "⚔️ 對戰比較 (H2H)", log_custom_btn: "➕ 記錄自訂比賽", rating_elite: "精英", rating_advanced: "進階", rating_intermediate: "中階", rating_recreational: "休閒", rating_beginner: "新手", stat_matches: "🎮 場次", stat_wins: "✅ 勝場", stat_losses: "❌ 敗场", stat_win_pct: "📈 勝率", stat_w_streak: "🔥 連勝", stat_l_streak: "🧊 連敗", rating_history_sec: "📈 積分走勢", spark_start: "起始", spark_peak: "最高", spark_now: "目前", beat_opp: "擊敗 {name}", upset_of: "爆冷門賺取", overview_total_matches: "總場次", overview_singles: "單打", overview_doubles: "雙打", overview_games_played: "總局數", overview_players: "球員總數", overview_venues: "場地數", record_most_matches: "最多出賽", record_top_rated: "最高積分", record_hot_streak: "最長連勝", record_biggest_upset: "最大爆冷門", record_beat_higher: "擊敗高分對手，贏得", recent_form: "近期狀態", no_data: "尚無數據", match_predictor: "🔮 賽前預測", prob_win: "獲勝機率", if_wins: "若 {name} 獲勝:", expected_delta: "預期積分變動", save: "儲存", singles_title: "單打積分榜", doubles_title: "雙打積分榜", verified_status: "認證完成", provisional_status: "暫定評估", teams: "隊伍", performance_profile: "👤 五維雷達圖", copy_ai_prompt: "🤖 複製 AI 戰報提示詞", ai_prompt_copied: "提示詞已複製！請貼上至 Gemini 產生戰報。", kotc: "稱王賽", kotc_desc: "與不同搭檔進行 3 場比賽。勝場最多（及淨勝分最高）的球員將成為王者！", round: "回合", diff: "淨勝分", log_kotc: "登錄賽事", tournament: "錦標賽", tourney_setup: "賽程設定", bracket_size: "賽程規模", team: "隊伍", generate_bracket: "產生賽程表", qf: "八強賽", sf: "四強賽", final: "決賽", winner: "勝者", log_tournament: "登錄錦標賽", sort_starred: "星號優先 (A-Z)", select_teams: "選擇隊伍", start_tournament: "開始錦標賽", singles_rating: "單打積分",
  doubles_rating: "雙打積分",
  },
  zh_cn: {
    rank: "排名", roster: "名册", session: "球局", custom: "自定义", history: "历史", h2h: "对战", matches_tab: "比赛", dashboard: "PickleRank", dashboard_sub: "私有 pickleball 积分追踪器", players: "球员", players_sub: "管理球员名册", session_title: "循环赛球局", session_sub: "四人循环赛自动对战", log: "记录比赛", log_sub: "登录一场比赛结果", history_title: "比赛历史", history_sub: "所有比赛纪录", compare: "双人对战比较", compare_sub: "头对头数据分析", stats: "团队统计", stats_sub: "数据洞察与纪录", settings: "设置", settings_sub: "数据管理与外观", leaderboard: "🏆 积分排行榜", recent_matches: "⚡ 近期对战", no_players: "目前尚无球员。", add_players_btn: "新增球员", no_matches: "目前尚无比赛纪录。", log_first_match: "记录第一场比赛", add_player_sec: "新增球员", name_lbl: "球员姓名", starting_rating: "初始积分", optional_dupr: "(选填 — 真实 DUPR 积分)", rating_range_hint: "必须介于 1.500 – 6.500 之间", dupr_tiers_hint: "DUPR 级别: 2.0–2.5 初学 · 2.5–3.5 娱乐 · 3.5–4.5 中阶 · 4.5–5.5 进阶 · 5.5+ 精英", add_player_btn: "加入球员", roster_lbl: "球员名册", edit_details: "修改球员资料", cancel: "取消", save: "储存", rename: "重命名", remove_player_q: "确定要移除此球员吗？", match_history_stays: "该球员的历史对战纪录仍会保留。", base_rating_sec: "🎯 初始 / 基础积分", base_rating_desc: "所有比赛计算的基准起点点数。", base_rating_lbl: "基础积分", edit_starting_rating: "✏️ 修改初始积分", new_starting_rating: "新初始积分 (1.500 – 6.500)", save_recalc: "储存并重新计算所有比赛", rating_trend_desc: "多打几场比赛即可看到积分走势图。", reset_rating_btn: "重置积分", reset_rating_q: "重置积分为 3.000？", rating_history_cleared: "积分历史纪录将会被清空。", best_win_sec: "🏅 生涯最佳胜场", match_type_sec: "比赛类型", win_to_lbl: "胜出分数:", win_by_lbl: "胜出分差:", point: "分", points: "分", select_prompt: "选择…", team_name_opt: "队伍名称 (选填)", player_a: "球员 A", player_b: "球员 B", player_1: "球员 1", player_2: "球员 2", game_scores_sec: "每局比分", score_win_by_2: "先得 {winTo} 分者胜，须赢 {winBy} 分。", add_game_btn: "+ 新增一局", date_venue_sec: "日期与地点", date_time_lbl: "比赛时间", venue_opt: "球场/地点 (选填)", log_match_btn: "登录比赛并更新积分", filter_search_sec: "筛选与搜寻", search_placeholder: "搜寻比赛纪录…", results_lbl: "对战结果", delete_match_q: "确定要删除这场比赛吗？", ratings_recalculated: "所有球员积分将重新计算。", rating_comp_sec: "积分对比", overview_sec: "📊 数据总览", records_sec: "🏅 纪录保持人", venues_lbl: "比赛球场", bg_mode_sec: "🌗 背景模式", accent_style_sec: "🎨 主题色调", typography_sec: "Aa 字体设置", backup_restore_sec: "💾 备份与还原", backup_desc: "导出您的数据以利备份或导入跨浏览器表格进行细致分析。", json_backup_btn: "📤 JSON 备份", csv_export_btn: "📊 CSV 导出", import_json_btn: "📥 导入 JSON 数据", summary_sec: "📋 数据统计", danger_zone_sec: "⚠️ 危险区域", danger_desc: "永久删除所有数据。如有需要，请先导出备份。", clear_all_btn: "🗑️ 清空所有本地数据", about_sec: "ℹ️ 关于系统", about_desc: "专为私有 pickleball 社群设计的 DUPR 导向积分追踪器。采用 ELO 权重算法，结合胜分差加权修正。积分范围 1.5–6.5。所有数据皆储存于本地浏览器。", lang_sec: "🌐 Language / 語言 / 语言", select_foursome: "1. 选择今日四人组合", load_saved_group: "载入常用组合", save_group_btn: "储存此组合", select_4_unique: "请选择 4 位不同的球员。", rr_matchups: "2. 循环赛对战组合", log_score_btn: "登录比分", save_score_btn: "储存比分", match_logged_ok: "✅ 比赛登录成功！", see_history_btn: "前往历史纪录 →", edit_match_title: "✏️ 修改比赛资料", branding_sec: "✨ App 品牌设置", logo_text: "图标文字 / 表情符号", upload_logo: "上传自定义图标", display_size_sec: "🔍 显示大小", size_compact: "紧凑", size_standard: "标准", size_large: "放大", synergy_rivalry_sec: "🤝 最佳搭档与宿敌", best_partner: "最佳拍档", nemesis: "宿敌", win_rate: "胜率", vs_them: "对战胜率", worst_partner: "⚠️ 默契考验", easy_target: "🎯 最佳提款机", admin_sec: "🔒 权限与安全", admin_status: "当前状态", user_mode: "普通用户 (查看/新增/编辑)", admin_mode: "管理员 (完整权限)", passcode_lbl: "管理员密码", login_btn: "登录", logout_btn: "退出", change_pass_btn: "修改密码", wrong_pass: "密码错误。", pass_updated: "密码已更新。", badges_sec: "🎖️ 个人成就", badge_centurion: "百战老将 (100+ 场)", badge_ironman: "铁人 (50+ 场)", badge_slayer: "巨人杀手 (大爆冷门)", badge_streaker: "无人能挡 (5+ 连胜)", badge_sharp: "神射手 (60%+ 胜率)", no_badges: "多打几场比赛来解锁成就！", all_players: "所有球员", view_all_matches: "查看所有比赛", singles_wr: "单打胜率", doubles_wr: "双打胜率", photo: "照片", change_photo: "更换", search_players_placeholder: "搜寻球员...", sort_by: "排序方式:", sort_rating: "积分 (高到低)", sort_fn: "名字 (A-Z)", sort_ln: "姓氏 (A-Z)", sort_games: "比赛场数", err_enter_name: "请输入姓名。", err_exists: "球员已存在。", err_empty: "名称不能为空。", err_taken: "名称已被使用。", err_select_players: "请选择球员。", err_select_4: "请选择 4 位球员。", err_duplicate: "球员重复。", err_valid_scores: "请输入有效的比分。", err_invalid_score_fmt: "比分无效。先得 {winTo} 分，须赢 {winBy} 分。", err_add_game: "请至少新增一局。", err_clear_winner: "比赛必须有明确胜负。", err_error_scores: "比分错误。", h2h_btn: "⚔️ 对战比较 (H2H)", log_custom_btn: "➕ 记录自定义比赛", rating_elite: "精英", rating_advanced: "进阶", rating_intermediate: "中阶", rating_recreational: "休闲", rating_beginner: "新手", stat_matches: "🎮 场次", stat_wins: "✅ 胜场", stat_losses: "❌ 败场", stat_win_pct: "📈 胜率", stat_w_streak: "🔥 连胜", stat_l_streak: "🧊 连败", rating_history_sec: "📈 积分走势", spark_start: "起始", spark_peak: "最高", spark_now: "目前", beat_opp: "击败 {name}", upset_of: "爆冷门赚取", overview_total_matches: "总场次", overview_singles: "单打", overview_doubles: "双打", overview_games_played: "总局数", overview_players: "球员总数", overview_venues: "场地数", record_most_matches: "最多出赛", record_top_rated: "最高积分", record_hot_streak: "最长连胜", record_biggest_upset: "最大爆冷门", record_beat_higher: "击败高分对手，赢得", recent_form: "近期状态", no_data: "尚无数据", match_predictor: "🔮 赛前预测", prob_win: "获胜概率", if_wins: "若 {name} 获胜:", expected_delta: "预期积分变动", save: "储存", singles_title: "单打积分榜", doubles_title: "双打积分榜", verified_status: "认证完成", provisional_status: "暂定评估", teams: "队伍", performance_profile: "👤 五维雷达图", copy_ai_prompt: "🤖 复制 AI 战报提示词", ai_prompt_copied: "提示词已复制！请贴上至 Gemini 生成战报。", kotc: "称王赛", kotc_desc: "与不同搭档进行 3 场比赛。胜场最多（及净胜分最高）的球员将成为王者！", round: "回合", diff: "净胜分", log_kotc: "登录赛事", tournament: "锦标赛", tourney_setup: "赛程设置", bracket_size: "赛程规模", team: "队伍", generate_bracket: "生成赛程表", qf: "八强赛", sf: "四强赛", final: "决赛", winner: "胜者", log_tournament: "登录锦标赛", sort_starred: "星号优先 (A-Z)", select_teams: "选择队伍", start_tournament: "开始锦标赛", singles_rating: "单打积分",
  doubles_rating: "双打积分",
  }
};

let currentLang = "en";
export function setLang(l) { currentLang = l; }
export function t(key) { return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS["en"]?.[key] || key; }

// ─── Rating Engine ────────────────────────────────────────────────────────────
export function calcExpected(rA, rB) { return 1 / (1 + Math.pow(10, (rB - rA) / 0.4)); }
export function calcScoreMargin(w, l) { const t = w + l; return t === 0 ? 0.5 : w / t; }
export function updateRating(current, expected, actual, margin) {
  const kAdj = K_FACTOR * (1 + (margin - 0.5));
  return Math.max(1.5, Math.min(6.5, current + kAdj * (actual - expected)));
}

export function validatePickleballScore(s1, s2, winTo = 11, winBy = 2) {
  if (s1 == null || s2 == null || isNaN(s1) || isNaN(s2)) return null;
  const high = Math.max(s1, s2);
  const low = Math.min(s1, s2);
  
  // Logic: Must reach the target AND satisfy the win-by margin
  if (high >= winTo && (high - low) >= winBy) {
    return { winner: s1 > s2 ? 0 : 1 };
  }
  return null; 
}

export function replayAllMatches(players = [], matches = []) {
  // 1. Initialize pools independently
  const ratingMap = { singles: {}, doubles: {} };
  const historyMap = { singles: {}, doubles: {} };
  
  players.forEach(p => {
      // THIS IS THE SAFETY NET: 
      // It ignores whatever was in the player object and sets defaults if missing.
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
    
    // Snapshot ratings before this match
    match.ratingSnaps = {};
    allIds.forEach(id => { match.ratingSnaps[id] = currentPool[id] ?? DEFAULT_RATING; });
    
    const avg = ids => ids.reduce((s, id) => s + (currentPool[id] ?? DEFAULT_RATING), 0) / Math.max(1, ids.length);
    const rA = avg(t1ids), rB = avg(t2ids);
    const exp0 = calcExpected(rA, rB);
    const act0 = match.winnerTeam === 0 ? 1 : 0;
    const margin = calcScoreMargin(match.team1Wins, match.team2Wins);
    
    const deltas = {};
    allIds.forEach(id => {
      const isT1 = t1ids.includes(id);
      const exp = isT1 ? exp0 : 1 - exp0;
      const act = isT1 ? act0 : 1 - act0;
      const old = currentPool[id] ?? DEFAULT_RATING;
      const nr = updateRating(old, exp, act, margin);
      
      deltas[id] = nr - old;
      currentPool[id] = nr;
      
      if (!historyPool[id]) historyPool[id] = [];
      historyPool[id].push({ rating: nr, date: match.date });
    });
    
    match.ratingDeltas = deltas;
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

    return { ...p, 
      gamesPlayed: overall.played || 0, wins: overall.wins || 0, losses: overall.losses || 0, winPct: overall.played ? Math.round((overall.wins/overall.played)*100) : null,
      singlesPlayed: singles.played || 0, singlesWins: singles.wins || 0, singlesLosses: singles.losses || 0,
      doublesPlayed: doubles.played || 0, doublesWins: doubles.wins || 0, doublesLosses: doubles.losses || 0,
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

const DB_DOC_ID = "main_group"; // A single document for you and your friends to share


export function blankState() {
  return {
    players: [],
    matches: [],
    trash: [], // Centralized storage: { id, type: 'match'|'player', data, deletedAt }
    activeView: "dashboard",
    modeId: "dark",
    accentId: "green",
    fontId: "sans",
    langId: "en",
    zoomLevel: 1.0,
    logoText: "LS",
    isAdmin: false,
    adminPass: "1234",
    leaderboardFormat: "doubles",
    favoredPlayerIds: []
  };
}

export async function loadState() {
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // THE FIX: Translate the text string back into an array for the app
      if (typeof data.matches === "string") {
        data.matches = JSON.parse(data.matches);
      }
      
      return data;
    }
    return blankState(); // If no data exists yet, start fresh
  } catch (e) {
    console.error("Error loading from cloud:", e);
    return blankState();
  }
}

export async function saveState(state) {
  try {
    const docRef = doc(db, "picklerank", DB_DOC_ID);
    
    // THE FIX: Turn nested arrays into a text string to bypass Firestore's limit
    const safeState = { ...state };
    if (Array.isArray(safeState.matches)) {
      safeState.matches = JSON.stringify(safeState.matches);
    }
    
    await setDoc(docRef, safeState);
  } catch (e) {
    console.error("Error saving to cloud:", e);
  }
}

// Ensure this is at the bottom of engine.js
export function patchPlayerRatings(players) {
  return players.map(p => ({
    ...p,
    ratingSingles: p.ratingSingles ?? p.baseRating ?? DEFAULT_RATING,
    ratingDoubles: p.ratingDoubles ?? p.baseRating ?? DEFAULT_RATING,
    ratingHistorySingles: p.ratingHistorySingles ?? [{ rating: p.baseRating ?? DEFAULT_RATING, date: p.joinedDate || new Date().toISOString() }],
    ratingHistoryDoubles: p.ratingHistoryDoubles ?? [{ rating: p.baseRating ?? DEFAULT_RATING, date: p.joinedDate || new Date().toISOString() }]
  }));
}