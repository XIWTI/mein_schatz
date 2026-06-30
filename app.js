"use strict";

const STORAGE_KEY = "love-arcade-progress-v2";
const FLAG_MOOD_CACHE_KEY = "flag-mood-countries-v1";
const TODAY = new Date().toISOString().slice(0, 10);
const SECRET_GIFT_GOAL = 20000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const HEART_PROMOS = {
  xxx: 5000,
  iloveyou: 5000,
  "мойкотеночек": 5000,
  "моё_счастье": 5000,
  "09.12.2025": 5000,
  "29.11.2025": 5000,
  "14.02.2026": 5000,
  "22.05.2026": 5000,
  "02.06.2026": 25000,
  "светланочка": 100,
};

const TRACKS = [
  { type: "file", title: "Mrs Magic - Strawberry Guy", src: "music/Mrs Magic - Strawberry Guy.mp3" },
  { type: "file", title: "LUV3MEMORE - Надеюсь, что тебе также хорошо", src: "music/LUV3MEMORE_надеюсь,_что_тебе_также_хорошо.mp3" },
  { type: "file", title: "Lucy Rose - Pale Blue Eyes", src: "music/Lucy Rose - Pale Blue Eyes.mp3" },
  { type: "file", title: "i don t like mirrors - i miss your warm hands", src: "music/i don t like mirrors - i miss your warm hands.mp3" },
  { type: "file", title: "Flxweroff - Killswitch", src: "music/Flxweroff - Killswitch.mp3" },
  { type: "file", title: "A Normal Life", src: "music/02 A Normal Life.mp3" },
];
let customTrackSeed = 1;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const defaultState = {
  accepted: false,
  hearts: 0,
  gamesWon: 0,
  gamesPlayed: 0,
  losses: 0,
  streak: 0,
  bestPuzzleMoves: null,
  quizDone: false,
  quizScore: 0,
  giftClaimedAt: null,
  firstGiftNoticeSeen: false,
  secretGiftSeen: false,
  secretMessagesUnlocked: false,
  lastReward: "",
  trackIndex: 0,
  volume: 0.55,
  sfxVolume: 0.82,
  musicEnabled: true,
  sfxEnabled: true,
  shuffleTracks: false,
  repeatTrack: false,
  usedPromos: {},
  rewards: [],
  shopPurchases: {},
  wheelLastSpin: null,
  wheelRotation: 0,
  achievements: {},
  dailies: {
    date: TODAY,
    winGame: false,
    earnHearts: 0,
    puzzleUnder80: false,
  },
};

let state = loadState();
let currentQuizIndex = 0;
let quizCorrect = 0;
let memoryState = null;
let puzzleState = null;
let chessState = null;
let simonState = null;
let codebreakerState = null;
let lightsOutState = null;
let mathRushState = null;
let nonMathGameState = null;
let activeGame = null;
let audioCtx = null;
let chessMoveAudio = null;
let pendingResult = null;

const achievements = [
  { id: "yes", title: "Сказала да", reward: 500, text: "самый важный старт" },
  { id: "night", title: "Ночная магия", reward: 350, text: "зашла вечером или ночью" },
  { id: "firstWin", title: "Первая победа", reward: 400, text: "выиграна первая игра" },
  { id: "streak5", title: "Серия из 5", reward: 1000, text: "пять побед подряд" },
  { id: "memoryFast", title: "Память сердца", reward: 700, text: "Memory на высокой сложности за 24 хода или меньше" },
  { id: "puzzleFast", title: "Мастер пятнашек", reward: 900, text: "пятнашки 4x4 или 5x5 меньше чем за 80 ходов" },
  { id: "quizPerfect", title: "Знает нас", reward: 1200, text: "викторина без ошибок" },
  { id: "chessHard", title: "Королева доски", reward: 1400, text: "мат роботу на 4 или 5 уровне" },
  { id: "giftReady", title: "Подарок открыт", reward: 0, text: "цель достигнута" },
];

const shopItems = [
  { id: "chupa", title: "Чупа-чупс один на двоих", price: 1500, limit: null },
  { id: "cola", title: "Ванильная кола с доставкой", price: 15000, limit: null },
  { id: "popcorn", title: "Попкорн с доставкой", price: 10000, limit: null },
  { id: "hug", title: "Обнимашки", price: 500, limit: null },
  { id: "come-over", title: "Прийти к тебе тогда когда ты этого захочешь и побыть рядом", price: 10000, limit: null },
  { id: "kiss", title: "Поцелуй", price: 1000, limit: null },
  { id: "bracelets", title: "Парные браслеты", price: 25000, limit: 1 },
  { id: "handmade", title: "Подарок своими руками", price: 50000, limit: 1 },
  { id: "cook", title: "Приготовить что-то вкусное для тебя", price: 75000, limit: 1 },
  { id: "wish", title: "Желание", price: 100000, limit: 1 },
  { id: "mom", title: "Знакомство с мамой", price: 250000, limit: 1 },
];

const wheelRewards = [
  { text: "Поцелуй 💋", color: "#ff5c8d" },
  { text: "Обнимашки 🫂", color: "#9c7cff" },
  { text: "Комплимент ❤️", color: "#f6c766" },
  { text: "Поцелуй 💋", color: "#ff9cb8" },
  { text: "Обнимашки 🫂", color: "#79e2c2" },
  { text: "Комплимент ❤️", color: "#8ec5ff" },
];

let wheelSpinning = false;

const dailyTasks = [
  { id: "winGame", title: "Выиграй 1 игру", reward: 180, target: 1 },
  { id: "earnHearts", title: "Набери 1000 hearts", reward: 220, target: 1000 },
  { id: "puzzleUnder80", title: "Пятнашки за 80 ходов", reward: 260, target: 1 },
];

const memoryLevels = {
  easy: { label: "Лёгкий", pairs: 6, columns: 4, reward: 140, fast: 14 },
  normal: { label: "Средний", pairs: 8, columns: 4, reward: 240, fast: 18 },
  hard: { label: "Сложный", pairs: 12, columns: 6, reward: 420, fast: 24 },
};

const chessLevelLabels = {
  1: "1 · 250 elo",
  2: "2 · 500 elo",
  3: "3 · 750 elo",
  4: "4 · 1000 elo",
  5: "5 · 1250 elo",
  6: "6 · 1500 elo",
  7: "7 · 1750 elo",
  8: "8 · 2000 elo",
  9: "9 · 2250 elo",
  10: "10 · 2500 elo",
};

const chessStyles = {
  balanced: { label: "Сбалансированный", depthBonus: 0, random: 8, attack: 1, defense: 1, material: 1, mobility: 1, kingSafety: 1, pawn: 1 },
  attacker: { label: "Атакующий", depthBonus: 0, random: 6, attack: 1.35, defense: 0.85, material: 0.98, mobility: 1.2, kingSafety: 0.85, pawn: 0.95 },
  defender: { label: "Защитник", depthBonus: 0, random: 5, attack: 0.9, defense: 1.35, material: 1.05, mobility: 0.9, kingSafety: 1.35, pawn: 1.1 },
  tactician: { label: "Тактик", depthBonus: 1, random: 1.5, attack: 1.18, defense: 1.05, material: 1.12, mobility: 1.15, kingSafety: 1, pawn: 1 },
  positional: { label: "Позиционный", depthBonus: 0, random: 3, attack: 0.95, defense: 1.12, material: 1.04, mobility: 1.3, kingSafety: 1.15, pawn: 1.25 },
  endgame: { label: "Эндшпильный", depthBonus: 0, random: 2.5, attack: 1, defense: 1, material: 1.12, mobility: 1.15, kingSafety: 0.9, pawn: 1.45 },
  blitz: { label: "Блиц", depthBonus: -1, random: 12, attack: 1.25, defense: 0.9, material: 1, mobility: 1.35, kingSafety: 0.9, pawn: 0.9 },
  ruthless: { label: "Безжалостный", depthBonus: 1, random: 0.4, attack: 1.15, defense: 1.15, material: 1.2, mobility: 1.2, kingSafety: 1.25, pawn: 1.15 },
  risky: { label: "Авантюрист", depthBonus: -1, random: 16, attack: 1.55, defense: 0.65, material: 0.88, mobility: 1.25, kingSafety: 0.7, pawn: 0.85 },
};

const simonPads = [
  { id: 0, label: "Роза", color: "#ff5c8d" },
  { id: 1, label: "Солнце", color: "#f6c766" },
  { id: 2, label: "Мята", color: "#79e2c2" },
  { id: 3, label: "Небо", color: "#8ec5ff" },
];

const simonDifficulties = {
  easy: { label: "Лёгкий", maxRounds: 6, startLength: 2, stepDelay: 620, pulseMs: 370, rewardBase: 420 },
  normal: { label: "Средний", maxRounds: 8, startLength: 2, stepDelay: 520, pulseMs: 320, rewardBase: 680 },
  hard: { label: "Сложный", maxRounds: 10, startLength: 3, stepDelay: 430, pulseMs: 260, rewardBase: 980 },
};

const irregularVerbPool = [
  { base: "be", past: ["was", "were"], participle: ["been"] },
  { base: "beat", past: ["beat"], participle: ["beaten"] },
  { base: "become", past: ["became"], participle: ["become"] },
  { base: "begin", past: ["began"], participle: ["begun"] },
  { base: "bend", past: ["bent"], participle: ["bent"] },
  { base: "bet", past: ["bet"], participle: ["bet"] },
  { base: "bind", past: ["bound"], participle: ["bound"] },
  { base: "bite", past: ["bit"], participle: ["bitten"] },
  { base: "bleed", past: ["bled"], participle: ["bled"] },
  { base: "blow", past: ["blew"], participle: ["blown"] },
  { base: "break", past: ["broke"], participle: ["broken"] },
  { base: "breed", past: ["bred"], participle: ["bred"] },
  { base: "bring", past: ["brought"], participle: ["brought"] },
  { base: "broadcast", past: ["broadcast"], participle: ["broadcast"] },
  { base: "build", past: ["built"], participle: ["built"] },
  { base: "burn", past: ["burned", "burnt"], participle: ["burned", "burnt"] },
  { base: "buy", past: ["bought"], participle: ["bought"] },
  { base: "catch", past: ["caught"], participle: ["caught"] },
  { base: "choose", past: ["chose"], participle: ["chosen"] },
  { base: "come", past: ["came"], participle: ["come"] },
  { base: "cost", past: ["cost"], participle: ["cost"] },
  { base: "cut", past: ["cut"], participle: ["cut"] },
  { base: "deal", past: ["dealt"], participle: ["dealt"] },
  { base: "dig", past: ["dug"], participle: ["dug"] },
  { base: "do", past: ["did"], participle: ["done"] },
  { base: "draw", past: ["drew"], participle: ["drawn"] },
  { base: "dream", past: ["dreamed", "dreamt"], participle: ["dreamed", "dreamt"] },
  { base: "drink", past: ["drank"], participle: ["drunk"] },
  { base: "drive", past: ["drove"], participle: ["driven"] },
  { base: "eat", past: ["ate"], participle: ["eaten"] },
  { base: "fall", past: ["fell"], participle: ["fallen"] },
  { base: "feed", past: ["fed"], participle: ["fed"] },
  { base: "feel", past: ["felt"], participle: ["felt"] },
  { base: "fight", past: ["fought"], participle: ["fought"] },
  { base: "find", past: ["found"], participle: ["found"] },
  { base: "fit", past: ["fit", "fitted"], participle: ["fit", "fitted"] },
  { base: "fly", past: ["flew"], participle: ["flown"] },
  { base: "forget", past: ["forgot"], participle: ["forgotten"] },
  { base: "forgive", past: ["forgave"], participle: ["forgiven"] },
  { base: "freeze", past: ["froze"], participle: ["frozen"] },
  { base: "get", past: ["got"], participle: ["got", "gotten"] },
  { base: "give", past: ["gave"], participle: ["given"] },
  { base: "go", past: ["went"], participle: ["gone"] },
  { base: "grow", past: ["grew"], participle: ["grown"] },
  { base: "hang", past: ["hung"], participle: ["hung"] },
  { base: "have", past: ["had"], participle: ["had"] },
  { base: "hear", past: ["heard"], participle: ["heard"] },
  { base: "hide", past: ["hid"], participle: ["hidden"] },
  { base: "hit", past: ["hit"], participle: ["hit"] },
  { base: "hold", past: ["held"], participle: ["held"] },
  { base: "hurt", past: ["hurt"], participle: ["hurt"] },
  { base: "keep", past: ["kept"], participle: ["kept"] },
  { base: "know", past: ["knew"], participle: ["known"] },
  { base: "lay", past: ["laid"], participle: ["laid"] },
  { base: "lead", past: ["led"], participle: ["led"] },
  { base: "learn", past: ["learned", "learnt"], participle: ["learned", "learnt"] },
  { base: "leave", past: ["left"], participle: ["left"] },
  { base: "lend", past: ["lent"], participle: ["lent"] },
  { base: "let", past: ["let"], participle: ["let"] },
  { base: "lie", past: ["lay"], participle: ["lain"] },
  { base: "light", past: ["lit", "lighted"], participle: ["lit", "lighted"] },
  { base: "lose", past: ["lost"], participle: ["lost"] },
  { base: "make", past: ["made"], participle: ["made"] },
  { base: "mean", past: ["meant"], participle: ["meant"] },
  { base: "meet", past: ["met"], participle: ["met"] },
  { base: "pay", past: ["paid"], participle: ["paid"] },
  { base: "put", past: ["put"], participle: ["put"] },
  { base: "read", past: ["read"], participle: ["read"] },
  { base: "ride", past: ["rode"], participle: ["ridden"] },
  { base: "ring", past: ["rang"], participle: ["rung"] },
  { base: "rise", past: ["rose"], participle: ["risen"] },
  { base: "run", past: ["ran"], participle: ["run"] },
  { base: "say", past: ["said"], participle: ["said"] },
  { base: "see", past: ["saw"], participle: ["seen"] },
  { base: "sell", past: ["sold"], participle: ["sold"] },
  { base: "send", past: ["sent"], participle: ["sent"] },
  { base: "set", past: ["set"], participle: ["set"] },
  { base: "shake", past: ["shook"], participle: ["shaken"] },
  { base: "shine", past: ["shone"], participle: ["shone"] },
  { base: "shoot", past: ["shot"], participle: ["shot"] },
  { base: "show", past: ["showed"], participle: ["shown", "showed"] },
  { base: "shut", past: ["shut"], participle: ["shut"] },
  { base: "sing", past: ["sang"], participle: ["sung"] },
  { base: "sit", past: ["sat"], participle: ["sat"] },
  { base: "sleep", past: ["slept"], participle: ["slept"] },
  { base: "smell", past: ["smelled", "smelt"], participle: ["smelled", "smelt"] },
  { base: "speak", past: ["spoke"], participle: ["spoken"] },
  { base: "spend", past: ["spent"], participle: ["spent"] },
  { base: "stand", past: ["stood"], participle: ["stood"] },
  { base: "steal", past: ["stole"], participle: ["stolen"] },
  { base: "stick", past: ["stuck"], participle: ["stuck"] },
  { base: "swear", past: ["swore"], participle: ["sworn"] },
  { base: "swim", past: ["swam"], participle: ["swum"] },
  { base: "take", past: ["took"], participle: ["taken"] },
  { base: "teach", past: ["taught"], participle: ["taught"] },
  { base: "tell", past: ["told"], participle: ["told"] },
  { base: "think", past: ["thought"], participle: ["thought"] },
  { base: "throw", past: ["threw"], participle: ["thrown"] },
  { base: "understand", past: ["understood"], participle: ["understood"] },
  { base: "wake", past: ["woke"], participle: ["woken"] },
  { base: "wear", past: ["wore"], participle: ["worn"] },
  { base: "win", past: ["won"], participle: ["won"] },
  { base: "write", past: ["wrote"], participle: ["written"] },
];

const codebreakerPalette = [
  { id: "rose", color: "#ff5c8d" },
  { id: "gold", color: "#f6c766" },
  { id: "mint", color: "#79e2c2" },
  { id: "sky", color: "#8ec5ff" },
  { id: "violet", color: "#9c7cff" },
  { id: "peach", color: "#ff9cb8" },
  { id: "lime", color: "#9ee357" },
  { id: "amber", color: "#ffb547" },
];

const codebreakerDifficulties = {
  easy: { label: "Лёгкий", codeLength: 3, paletteSize: 5, maxAttempts: 12, rewardBase: 220, rewardStep: 62 },
  normal: { label: "Средний", codeLength: 4, paletteSize: 6, maxAttempts: 10, rewardBase: 280, rewardStep: 78 },
  hard: { label: "Сложный", codeLength: 5, paletteSize: 8, maxAttempts: 9, rewardBase: 360, rewardStep: 96 },
};

const mathRushQuestionTypes = [
  { id: "add", label: "Сложение" },
  { id: "sub", label: "Вычитание" },
  { id: "square", label: "Квадраты 2-99" },
  { id: "equation", label: "Уравнения" },
  { id: "root", label: "Корни" },
  { id: "percent", label: "Проценты" },
  { id: "fraction", label: "Дроби" },
];

const mathRushTypeMap = Object.fromEntries(mathRushQuestionTypes.map((item) => [item.id, item]));
const mathRushDefaultTypes = ["add", "sub", "square", "equation", "root", "percent", "fraction"];
const mathRushSettings = {
  timeLimit: 60,
  rewardBase: 260,
  rewardStep: 66,
  scoreStep: 1,
};

const nonMathArcadeGames = [
  { id: "pathFinder", icon: "🗺", title: "Path Finder", subtitle: "Маршрут по шагам", mode: "pathFinder", rewardBase: 240, rewardStep: 54, timeLimit: 55 },
  { id: "directionTap", icon: "🧭", title: "Direction Tap", subtitle: "Ориентация и реакция", mode: "directionTap", rewardBase: 120, rewardStep: 18, timeLimit: 50 },
  { id: "flagMood", icon: "🏁", title: "Flag Mood", subtitle: "Флаги, страны и столицы", mode: "flagMood", rewardBase: 260, rewardStep: 56, timeLimit: 60 },
];

const nonMathGameMap = Object.fromEntries(nonMathArcadeGames.map((game) => [game.id, game]));

let irregularVerbState = null;

const flagMoodRegionLabels = {
  world: "\u0412\u0441\u0435 \u0441\u0442\u0440\u0430\u043d\u044b",
  europe: "\u0415\u0432\u0440\u043e\u043f\u0430",
  asia: "\u0410\u0437\u0438\u044f",
  africa: "\u0410\u0444\u0440\u0438\u043a\u0430",
  northAmerica: "\u0421\u0435\u0432\u0435\u0440\u043d\u0430\u044f \u0410\u043c\u0435\u0440\u0438\u043a\u0430",
  centralAmerica: "\u0426\u0435\u043d\u0442\u0440\u0430\u043b\u044c\u043d\u0430\u044f \u0410\u043c\u0435\u0440\u0438\u043a\u0430",
  caribbean: "\u041a\u0430\u0440\u0438\u0431\u044b",
  southAmerica: "\u042e\u0436\u043d\u0430\u044f \u0410\u043c\u0435\u0440\u0438\u043a\u0430",
  oceania: "\u041e\u043a\u0435\u0430\u043d\u0438\u044f",
  antarctica: "\u0410\u043d\u0442\u0430\u0440\u043a\u0442\u0438\u043a\u0430",
};

const flagMoodFallbackRows = [
  ["AU", "\u0410\u0432\u0441\u0442\u0440\u0430\u043b\u0438\u044f", "Canberra", "Oceania", "Australia and New Zealand"],
  ["AT", "\u0410\u0432\u0441\u0442\u0440\u0438\u044f", "Vienna", "Europe", "Central Europe"],
  ["AZ", "\u0410\u0437\u0435\u0440\u0431\u0430\u0439\u0434\u0436\u0430\u043d", "Baku", "Asia", "Western Asia"],
  ["AX", "\u0410\u043b\u0430\u043d\u0434\u0441\u043a\u0438\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "Mariehamn", "Europe", "Northern Europe"],
  ["AL", "\u0410\u043b\u0431\u0430\u043d\u0438\u044f", "Tirana", "Europe", "Southeast Europe"],
  ["DZ", "\u0410\u043b\u0436\u0438\u0440", "Algiers", "Africa", "Northern Africa"],
  ["AS", "\u0410\u043c\u0435\u0440\u0438\u043a\u0430\u043d\u0441\u043a\u043e\u0435 \u0421\u0430\u043c\u043e\u0430", "Pago Pago", "Oceania", "Polynesia"],
  ["AI", "\u0410\u043d\u0433\u0438\u043b\u044c\u044f", "The Valley", "Americas", "Caribbean"],
  ["AO", "\u0410\u043d\u0433\u043e\u043b\u0430", "Luanda", "Africa", "Middle Africa"],
  ["AD", "\u0410\u043d\u0434\u043e\u0440\u0440\u0430", "Andorra la Vella", "Europe", "Southern Europe"],
  ["AQ", "\u0410\u043d\u0442\u0430\u0440\u043a\u0442\u0438\u0434\u0430", "\u0410\u043d\u0442\u0430\u0440\u043a\u0442\u0438\u0434\u0430", "Antarctic", ""],
  ["AG", "\u0410\u043d\u0442\u0438\u0433\u0443\u0430 \u0438 \u0411\u0430\u0440\u0431\u0443\u0434\u0430", "Saint John's", "Americas", "Caribbean"],
  ["AR", "\u0410\u0440\u0433\u0435\u043d\u0442\u0438\u043d\u0430", "Buenos Aires", "Americas", "South America"],
  ["AM", "\u0410\u0440\u043c\u0435\u043d\u0438\u044f", "Yerevan", "Asia", "Western Asia"],
  ["AW", "\u0410\u0440\u0443\u0431\u0430", "Oranjestad", "Americas", "Caribbean"],
  ["AF", "\u0410\u0444\u0433\u0430\u043d\u0438\u0441\u0442\u0430\u043d", "Kabul", "Asia", "Southern Asia"],
  ["BS", "\u0411\u0430\u0433\u0430\u043c\u0441\u043a\u0438\u0435 \u041e\u0441\u0442\u0440\u043e\u0432\u0430", "Nassau", "Americas", "Caribbean"],
  ["BD", "\u0411\u0430\u043d\u0433\u043b\u0430\u0434\u0435\u0448", "Dhaka", "Asia", "Southern Asia"],
  ["BB", "\u0411\u0430\u0440\u0431\u0430\u0434\u043e\u0441", "Bridgetown", "Americas", "Caribbean"],
  ["BH", "\u0411\u0430\u0445\u0440\u0435\u0439\u043d", "Manama", "Asia", "Western Asia"],
  ["BY", "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u044c", "Minsk", "Europe", "Eastern Europe"],
  ["BZ", "\u0411\u0435\u043b\u0438\u0437", "Belmopan", "Americas", "Central America"],
  ["BE", "\u0411\u0435\u043b\u044c\u0433\u0438\u044f", "Brussels", "Europe", "Western Europe"],
  ["BJ", "\u0411\u0435\u043d\u0438\u043d", "Porto-Novo", "Africa", "Western Africa"],
  ["BM", "\u0411\u0435\u0440\u043c\u0443\u0434\u0441\u043a\u0438\u0435 \u041e\u0441\u0442\u0440\u043e\u0432\u0430", "Hamilton", "Americas", "North America"],
  ["BG", "\u0411\u043e\u043b\u0433\u0430\u0440\u0438\u044f", "Sofia", "Europe", "Southeast Europe"],
  ["BO", "\u0411\u043e\u043b\u0438\u0432\u0438\u044f", "Sucre", "Americas", "South America"],
  ["BA", "\u0411\u043e\u0441\u043d\u0438\u044f \u0438 \u0413\u0435\u0440\u0446\u0435\u0433\u043e\u0432\u0438\u043d\u0430", "Sarajevo", "Europe", "Southeast Europe"],
  ["BW", "\u0411\u043e\u0442\u0441\u0432\u0430\u043d\u0430", "Gaborone", "Africa", "Southern Africa"],
  ["BR", "\u0411\u0440\u0430\u0437\u0438\u043b\u0438\u044f", "Bras\u00edlia", "Americas", "South America"],
  ["IO", "\u0411\u0440\u0438\u0442\u0430\u043d\u0441\u043a\u0430\u044f \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u044f \u0432 \u0418\u043d\u0434\u0438\u0439\u0441\u043a\u043e\u043c \u043e\u043a\u0435\u0430\u043d\u0435", "Diego Garcia", "Africa", "Eastern Africa"],
  ["VG", "\u0411\u0440\u0438\u0442\u0430\u043d\u0441\u043a\u0438\u0435 \u0412\u0438\u0440\u0433\u0438\u043d\u0441\u043a\u0438\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "Road Town", "Americas", "Caribbean"],
  ["BN", "\u0411\u0440\u0443\u043d\u0435\u0439", "Bandar Seri Begawan", "Asia", "South-Eastern Asia"],
  ["BF", "\u0411\u0443\u0440\u043a\u0438\u043d\u0430-\u0424\u0430\u0441\u043e", "Ouagadougou", "Africa", "Western Africa"],
  ["BI", "\u0411\u0443\u0440\u0443\u043d\u0434\u0438", "Gitega", "Africa", "Eastern Africa"],
  ["BT", "\u0411\u0443\u0442\u0430\u043d", "Thimphu", "Asia", "Southern Asia"],
  ["VU", "\u0412\u0430\u043d\u0443\u0430\u0442\u0443", "Port Vila", "Oceania", "Melanesia"],
  ["VA", "\u0412\u0430\u0442\u0438\u043a\u0430\u043d", "Vatican City", "Europe", "Southern Europe"],
  ["GB", "\u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f", "London", "Europe", "Northern Europe"],
  ["HU", "\u0412\u0435\u043d\u0433\u0440\u0438\u044f", "Budapest", "Europe", "Central Europe"],
  ["VE", "\u0412\u0435\u043d\u0435\u0441\u0443\u044d\u043b\u0430", "Caracas", "Americas", "South America"],
  ["VI", "\u0412\u0438\u0440\u0433\u0438\u043d\u0441\u043a\u0438\u0435 \u041e\u0441\u0442\u0440\u043e\u0432\u0430", "Charlotte Amalie", "Americas", "Caribbean"],
  ["UM", "\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u043c\u0430\u043b\u044b\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430 \u0421\u0428\u0410", "\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u043c\u0430\u043b\u044b\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430 \u0421\u0428\u0410", "Americas", "North America"],
  ["TL", "\u0412\u043e\u0441\u0442\u043e\u0447\u043d\u044b\u0439 \u0422\u0438\u043c\u043e\u0440", "Dili", "Asia", "South-Eastern Asia"],
  ["VN", "\u0412\u044c\u0435\u0442\u043d\u0430\u043c", "Hanoi", "Asia", "South-Eastern Asia"],
  ["GA", "\u0413\u0430\u0431\u043e\u043d", "Libreville", "Africa", "Middle Africa"],
  ["GY", "\u0413\u0430\u0439\u0430\u043d\u0430", "Georgetown", "Americas", "South America"],
  ["HT", "\u0413\u0430\u0438\u0442\u0438", "Port-au-Prince", "Americas", "Caribbean"],
  ["GM", "\u0413\u0430\u043c\u0431\u0438\u044f", "Banjul", "Africa", "Western Africa"],
  ["GH", "\u0413\u0430\u043d\u0430", "Accra", "Africa", "Western Africa"],
  ["GP", "\u0413\u0432\u0430\u0434\u0435\u043b\u0443\u043f\u0430", "Basse-Terre", "Americas", "Caribbean"],
  ["GT", "\u0413\u0432\u0430\u0442\u0435\u043c\u0430\u043b\u0430", "Guatemala City", "Americas", "Central America"],
  ["GN", "\u0413\u0432\u0438\u043d\u0435\u044f", "Conakry", "Africa", "Western Africa"],
  ["GW", "\u0413\u0432\u0438\u043d\u0435\u044f-\u0411\u0438\u0441\u0430\u0443", "Bissau", "Africa", "Western Africa"],
  ["DE", "\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f", "Berlin", "Europe", "Western Europe"],
  ["GG", "\u0413\u0435\u0440\u043d\u0441\u0438", "St. Peter Port", "Europe", "Northern Europe"],
  ["GI", "\u0413\u0438\u0431\u0440\u0430\u043b\u0442\u0430\u0440", "Gibraltar", "Europe", "Southern Europe"],
  ["HN", "\u0413\u043e\u043d\u0434\u0443\u0440\u0430\u0441", "Tegucigalpa", "Americas", "Central America"],
  ["HK", "\u0413\u043e\u043d\u043a\u043e\u043d\u0433", "City of Victoria", "Asia", "Eastern Asia"],
  ["GD", "\u0413\u0440\u0435\u043d\u0430\u0434\u0430", "St. George's", "Americas", "Caribbean"],
  ["GL", "\u0413\u0440\u0435\u043d\u043b\u0430\u043d\u0434\u0438\u044f", "Nuuk", "Americas", "North America"],
  ["GR", "\u0413\u0440\u0435\u0446\u0438\u044f", "Athens", "Europe", "Southern Europe"],
  ["GE", "\u0413\u0440\u0443\u0437\u0438\u044f", "Tbilisi", "Asia", "Western Asia"],
  ["GU", "\u0413\u0443\u0430\u043c", "Hag\u00e5t\u00f1a", "Oceania", "Micronesia"],
  ["DK", "\u0414\u0430\u043d\u0438\u044f", "Copenhagen", "Europe", "Northern Europe"],
  ["CD", "\u0414\u0435\u043c\u043e\u043a\u0440\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u041a\u043e\u043d\u0433\u043e", "Kinshasa", "Africa", "Middle Africa"],
  ["JE", "\u0414\u0436\u0435\u0440\u0441\u0438", "Saint Helier", "Europe", "Northern Europe"],
  ["DJ", "\u0414\u0436\u0438\u0431\u0443\u0442\u0438", "Djibouti", "Africa", "Eastern Africa"],
  ["DM", "\u0414\u043e\u043c\u0438\u043d\u0438\u043a\u0430", "Roseau", "Americas", "Caribbean"],
  ["DO", "\u0414\u043e\u043c\u0438\u043d\u0438\u043a\u0430\u043d\u0441\u043a\u0430\u044f \u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430", "Santo Domingo", "Americas", "Caribbean"],
  ["EG", "\u0415\u0433\u0438\u043f\u0435\u0442", "Cairo", "Africa", "Northern Africa"],
  ["ZM", "\u0417\u0430\u043c\u0431\u0438\u044f", "Lusaka", "Africa", "Eastern Africa"],
  ["EH", "\u0417\u0430\u043f\u0430\u0434\u043d\u0430\u044f \u0421\u0430\u0445\u0430\u0440\u0430", "El Aai\u00fan", "Africa", "Northern Africa"],
  ["ZW", "\u0417\u0438\u043c\u0431\u0430\u0431\u0432\u0435", "Harare", "Africa", "Eastern Africa"],
  ["YE", "\u0419\u0435\u043c\u0435\u043d", "Sana'a", "Asia", "Western Asia"],
  ["IL", "\u0418\u0437\u0440\u0430\u0438\u043b\u044c", "Jerusalem", "Asia", "Western Asia"],
  ["IN", "\u0418\u043d\u0434\u0438\u044f", "New Delhi", "Asia", "Southern Asia"],
  ["ID", "\u0418\u043d\u0434\u043e\u043d\u0435\u0437\u0438\u044f", "Jakarta", "Asia", "South-Eastern Asia"],
  ["JO", "\u0418\u043e\u0440\u0434\u0430\u043d\u0438\u044f", "Amman", "Asia", "Western Asia"],
  ["IQ", "\u0418\u0440\u0430\u043a", "Baghdad", "Asia", "Western Asia"],
  ["IR", "\u0418\u0440\u0430\u043d", "Tehran", "Asia", "Southern Asia"],
  ["IE", "\u0418\u0440\u043b\u0430\u043d\u0434\u0438\u044f", "Dublin", "Europe", "Northern Europe"],
  ["IS", "\u0418\u0441\u043b\u0430\u043d\u0434\u0438\u044f", "Reykjavik", "Europe", "Northern Europe"],
  ["ES", "\u0418\u0441\u043f\u0430\u043d\u0438\u044f", "Madrid", "Europe", "Southern Europe"],
  ["IT", "\u0418\u0442\u0430\u043b\u0438\u044f", "Rome", "Europe", "Southern Europe"],
  ["CV", "\u041a\u0430\u0431\u043e-\u0412\u0435\u0440\u0434\u0435", "Praia", "Africa", "Western Africa"],
  ["KZ", "\u041a\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043d", "Astana", "Asia", "Central Asia"],
  ["KY", "\u041a\u0430\u0439\u043c\u0430\u043d\u043e\u0432\u044b \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "George Town", "Americas", "Caribbean"],
  ["KH", "\u041a\u0430\u043c\u0431\u043e\u0434\u0436\u0430", "Phnom Penh", "Asia", "South-Eastern Asia"],
  ["CM", "\u041a\u0430\u043c\u0435\u0440\u0443\u043d", "Yaound\u00e9", "Africa", "Middle Africa"],
  ["CA", "\u041a\u0430\u043d\u0430\u0434\u0430", "Ottawa", "Americas", "North America"],
  ["BQ", "\u041a\u0430\u0440\u0438\u0431\u0441\u043a\u0438\u0435 \u041d\u0438\u0434\u0435\u0440\u043b\u0430\u043d\u0434\u044b", "Kralendijk", "Americas", "Caribbean"],
  ["QA", "\u041a\u0430\u0442\u0430\u0440", "Doha", "Asia", "Western Asia"],
  ["KE", "\u041a\u0435\u043d\u0438\u044f", "Nairobi", "Africa", "Eastern Africa"],
  ["CY", "\u041a\u0438\u043f\u0440", "Nicosia", "Europe", "Southern Europe"],
  ["KG", "\u041a\u0438\u0440\u0433\u0438\u0437\u0438\u044f", "Bishkek", "Asia", "Central Asia"],
  ["KI", "\u041a\u0438\u0440\u0438\u0431\u0430\u0442\u0438", "South Tarawa", "Oceania", "Micronesia"],
  ["CN", "\u041a\u0438\u0442\u0430\u0439", "Beijing", "Asia", "Eastern Asia"],
  ["CC", "\u041a\u043e\u043a\u043e\u0441\u043e\u0432\u044b\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "West Island", "Oceania", "Australia and New Zealand"],
  ["CO", "\u041a\u043e\u043b\u0443\u043c\u0431\u0438\u044f", "Bogot\u00e1", "Americas", "South America"],
  ["KM", "\u041a\u043e\u043c\u043e\u0440\u044b", "Moroni", "Africa", "Eastern Africa"],
  ["CR", "\u041a\u043e\u0441\u0442\u0430-\u0420\u0438\u043a\u0430", "San Jos\u00e9", "Americas", "Central America"],
  ["CI", "\u041a\u043e\u0442-\u0434\u2019\u0418\u0432\u0443\u0430\u0440", "Yamoussoukro", "Africa", "Western Africa"],
  ["CU", "\u041a\u0443\u0431\u0430", "Havana", "Americas", "Caribbean"],
  ["KW", "\u041a\u0443\u0432\u0435\u0439\u0442", "Kuwait City", "Asia", "Western Asia"],
  ["CW", "\u041a\u044e\u0440\u0430\u0441\u0430\u043e", "Willemstad", "Americas", "Caribbean"],
  ["LA", "\u041b\u0430\u043e\u0441", "Vientiane", "Asia", "South-Eastern Asia"],
  ["LV", "\u041b\u0430\u0442\u0432\u0438\u044f", "Riga", "Europe", "Northern Europe"],
  ["LS", "\u041b\u0435\u0441\u043e\u0442\u043e", "Maseru", "Africa", "Southern Africa"],
  ["LR", "\u041b\u0438\u0431\u0435\u0440\u0438\u044f", "Monrovia", "Africa", "Western Africa"],
  ["LB", "\u041b\u0438\u0432\u0430\u043d", "Beirut", "Asia", "Western Asia"],
  ["LY", "\u041b\u0438\u0432\u0438\u044f", "Tripoli", "Africa", "Northern Africa"],
  ["LT", "\u041b\u0438\u0442\u0432\u0430", "Vilnius", "Europe", "Northern Europe"],
  ["LI", "\u041b\u0438\u0445\u0442\u0435\u043d\u0448\u0442\u0435\u0439\u043d", "Vaduz", "Europe", "Western Europe"],
  ["LU", "\u041b\u044e\u043a\u0441\u0435\u043c\u0431\u0443\u0440\u0433", "Luxembourg", "Europe", "Western Europe"],
  ["MU", "\u041c\u0430\u0432\u0440\u0438\u043a\u0438\u0439", "Port Louis", "Africa", "Eastern Africa"],
  ["MR", "\u041c\u0430\u0432\u0440\u0438\u0442\u0430\u043d\u0438\u044f", "Nouakchott", "Africa", "Western Africa"],
  ["MG", "\u041c\u0430\u0434\u0430\u0433\u0430\u0441\u043a\u0430\u0440", "Antananarivo", "Africa", "Eastern Africa"],
  ["YT", "\u041c\u0430\u0439\u043e\u0442\u0442\u0430", "Mamoudzou", "Africa", "Eastern Africa"],
  ["MO", "\u041c\u0430\u043a\u0430\u043e", "\u041c\u0430\u043a\u0430\u043e", "Asia", "Eastern Asia"],
  ["MW", "\u041c\u0430\u043b\u0430\u0432\u0438", "Lilongwe", "Africa", "Eastern Africa"],
  ["MY", "\u041c\u0430\u043b\u0430\u0439\u0437\u0438\u044f", "Kuala Lumpur", "Asia", "South-Eastern Asia"],
  ["ML", "\u041c\u0430\u043b\u0438", "Bamako", "Africa", "Western Africa"],
  ["MV", "\u041c\u0430\u043b\u044c\u0434\u0438\u0432\u044b", "Mal\u00e9", "Asia", "Southern Asia"],
  ["MT", "\u041c\u0430\u043b\u044c\u0442\u0430", "Valletta", "Europe", "Southern Europe"],
  ["MA", "\u041c\u0430\u0440\u043e\u043a\u043a\u043e", "Rabat", "Africa", "Northern Africa"],
  ["MQ", "\u041c\u0430\u0440\u0442\u0438\u043d\u0438\u043a\u0430", "Fort-de-France", "Americas", "Caribbean"],
  ["MH", "\u041c\u0430\u0440\u0448\u0430\u043b\u043b\u043e\u0432\u044b \u041e\u0441\u0442\u0440\u043e\u0432\u0430", "Majuro", "Oceania", "Micronesia"],
  ["MX", "\u041c\u0435\u043a\u0441\u0438\u043a\u0430", "Mexico City", "Americas", "North America"],
  ["MZ", "\u041c\u043e\u0437\u0430\u043c\u0431\u0438\u043a", "Maputo", "Africa", "Eastern Africa"],
  ["MD", "\u041c\u043e\u043b\u0434\u0430\u0432\u0438\u044f", "Chi\u0219in\u0103u", "Europe", "Eastern Europe"],
  ["MC", "\u041c\u043e\u043d\u0430\u043a\u043e", "Monaco", "Europe", "Western Europe"],
  ["MN", "\u041c\u043e\u043d\u0433\u043e\u043b\u0438\u044f", "Ulan Bator", "Asia", "Eastern Asia"],
  ["MS", "\u041c\u043e\u043d\u0442\u0441\u0435\u0440\u0440\u0430\u0442", "Plymouth", "Americas", "Caribbean"],
  ["MM", "\u041c\u044c\u044f\u043d\u043c\u0430", "Naypyidaw", "Asia", "South-Eastern Asia"],
  ["NA", "\u041d\u0430\u043c\u0438\u0431\u0438\u044f", "Windhoek", "Africa", "Southern Africa"],
  ["NR", "\u041d\u0430\u0443\u0440\u0443", "Yaren", "Oceania", "Micronesia"],
  ["NP", "\u041d\u0435\u043f\u0430\u043b", "Kathmandu", "Asia", "Southern Asia"],
  ["NE", "\u041d\u0438\u0433\u0435\u0440", "Niamey", "Africa", "Western Africa"],
  ["NG", "\u041d\u0438\u0433\u0435\u0440\u0438\u044f", "Abuja", "Africa", "Western Africa"],
  ["NL", "\u041d\u0438\u0434\u0435\u0440\u043b\u0430\u043d\u0434\u044b", "Amsterdam", "Europe", "Western Europe"],
  ["NI", "\u041d\u0438\u043a\u0430\u0440\u0430\u0433\u0443\u0430", "Managua", "Americas", "Central America"],
  ["NU", "\u041d\u0438\u0443\u044d", "Alofi", "Oceania", "Polynesia"],
  ["NZ", "\u041d\u043e\u0432\u0430\u044f \u0417\u0435\u043b\u0430\u043d\u0434\u0438\u044f", "Wellington", "Oceania", "Australia and New Zealand"],
  ["NC", "\u041d\u043e\u0432\u0430\u044f \u041a\u0430\u043b\u0435\u0434\u043e\u043d\u0438\u044f", "Noum\u00e9a", "Oceania", "Melanesia"],
  ["NO", "\u041d\u043e\u0440\u0432\u0435\u0433\u0438\u044f", "Oslo", "Europe", "Northern Europe"],
  ["NF", "\u041d\u043e\u0440\u0444\u043e\u043b\u043a", "Kingston", "Oceania", "Australia and New Zealand"],
  ["AE", "\u041e\u0431\u044a\u0435\u0434\u0438\u043d\u0451\u043d\u043d\u044b\u0435 \u0410\u0440\u0430\u0431\u0441\u043a\u0438\u0435 \u042d\u043c\u0438\u0440\u0430\u0442\u044b", "Abu Dhabi", "Asia", "Western Asia"],
  ["OM", "\u041e\u043c\u0430\u043d", "Muscat", "Asia", "Western Asia"],
  ["BV", "\u041e\u0441\u0442\u0440\u043e\u0432 \u0411\u0443\u0432\u0435", "\u041e\u0441\u0442\u0440\u043e\u0432 \u0411\u0443\u0432\u0435", "Antarctic", ""],
  ["IM", "\u041e\u0441\u0442\u0440\u043e\u0432 \u041c\u044d\u043d", "Douglas", "Europe", "Northern Europe"],
  ["CX", "\u041e\u0441\u0442\u0440\u043e\u0432 \u0420\u043e\u0436\u0434\u0435\u0441\u0442\u0432\u0430", "Flying Fish Cove", "Oceania", "Australia and New Zealand"],
  ["HM", "\u041e\u0441\u0442\u0440\u043e\u0432 \u0425\u0435\u0440\u0434 \u0438 \u043e\u0441\u0442\u0440\u043e\u0432\u0430 \u041c\u0430\u043a\u0434\u043e\u043d\u0430\u043b\u044c\u0434", "\u041e\u0441\u0442\u0440\u043e\u0432 \u0425\u0435\u0440\u0434 \u0438 \u043e\u0441\u0442\u0440\u043e\u0432\u0430 \u041c\u0430\u043a\u0434\u043e\u043d\u0430\u043b\u044c\u0434", "Antarctic", ""],
  ["CK", "\u041e\u0441\u0442\u0440\u043e\u0432\u0430 \u041a\u0443\u043a\u0430", "Avarua", "Oceania", "Polynesia"],
  ["PN", "\u041e\u0441\u0442\u0440\u043e\u0432\u0430 \u041f\u0438\u0442\u043a\u044d\u0440\u043d", "Adamstown", "Oceania", "Polynesia"],
  ["SH", "\u041e\u0441\u0442\u0440\u043e\u0432\u0430 \u0421\u0432\u044f\u0442\u043e\u0439 \u0415\u043b\u0435\u043d\u044b, \u0412\u043e\u0437\u043d\u0435\u0441\u0435\u043d\u0438\u044f \u0438 \u0422\u0440\u0438\u0441\u0442\u0430\u043d-\u0434\u0430-\u041a\u0443\u043d\u044c\u044f", "Jamestown", "Africa", "Western Africa"],
  ["PK", "\u041f\u0430\u043a\u0438\u0441\u0442\u0430\u043d", "Islamabad", "Asia", "Southern Asia"],
  ["PW", "\u041f\u0430\u043b\u0430\u0443", "Ngerulmud", "Oceania", "Micronesia"],
  ["PS", "\u041f\u0430\u043b\u0435\u0441\u0442\u0438\u043d\u0430", "Ramallah", "Asia", "Western Asia"],
  ["PA", "\u041f\u0430\u043d\u0430\u043c\u0430", "Panama City", "Americas", "Central America"],
  ["PG", "\u041f\u0430\u043f\u0443\u0430 \u2014 \u041d\u043e\u0432\u0430\u044f \u0413\u0432\u0438\u043d\u0435\u044f", "Port Moresby", "Oceania", "Melanesia"],
  ["PY", "\u041f\u0430\u0440\u0430\u0433\u0432\u0430\u0439", "Asunci\u00f3n", "Americas", "South America"],
  ["PE", "\u041f\u0435\u0440\u0443", "Lima", "Americas", "South America"],
  ["PL", "\u041f\u043e\u043b\u044c\u0448\u0430", "Warsaw", "Europe", "Central Europe"],
  ["PT", "\u041f\u043e\u0440\u0442\u0443\u0433\u0430\u043b\u0438\u044f", "Lisbon", "Europe", "Southern Europe"],
  ["PR", "\u041f\u0443\u044d\u0440\u0442\u043e-\u0420\u0438\u043a\u043e", "San Juan", "Americas", "Caribbean"],
  ["CG", "\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u041a\u043e\u043d\u0433\u043e", "Brazzaville", "Africa", "Middle Africa"],
  ["XK", "\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u041a\u043e\u0441\u043e\u0432\u043e", "Pristina", "Europe", "Southeast Europe"],
  ["RE", "\u0420\u0435\u044e\u043d\u044c\u043e\u043d", "Saint-Denis", "Africa", "Eastern Africa"],
  ["RU", "\u0420\u043e\u0441\u0441\u0438\u044f", "Moscow", "Europe", "Eastern Europe"],
  ["RW", "\u0420\u0443\u0430\u043d\u0434\u0430", "Kigali", "Africa", "Eastern Africa"],
  ["RO", "\u0420\u0443\u043c\u044b\u043d\u0438\u044f", "Bucharest", "Europe", "Southeast Europe"],
  ["SV", "\u0421\u0430\u043b\u044c\u0432\u0430\u0434\u043e\u0440", "San Salvador", "Americas", "Central America"],
  ["WS", "\u0421\u0430\u043c\u043e\u0430", "Apia", "Oceania", "Polynesia"],
  ["SM", "\u0421\u0430\u043d-\u041c\u0430\u0440\u0438\u043d\u043e", "City of San Marino", "Europe", "Southern Europe"],
  ["ST", "\u0421\u0430\u043d-\u0422\u043e\u043c\u0435 \u0438 \u041f\u0440\u0438\u043d\u0441\u0438\u043f\u0438", "S\u00e3o Tom\u00e9", "Africa", "Middle Africa"],
  ["SA", "\u0421\u0430\u0443\u0434\u043e\u0432\u0441\u043a\u0430\u044f \u0410\u0440\u0430\u0432\u0438\u044f", "Riyadh", "Asia", "Western Asia"],
  ["SZ", "\u0421\u0432\u0430\u0437\u0438\u043b\u0435\u043d\u0434", "Lobamba", "Africa", "Southern Africa"],
  ["KP", "\u0421\u0435\u0432\u0435\u0440\u043d\u0430\u044f \u041a\u043e\u0440\u0435\u044f", "Pyongyang", "Asia", "Eastern Asia"],
  ["MK", "\u0421\u0435\u0432\u0435\u0440\u043d\u0430\u044f \u041c\u0430\u043a\u0435\u0434\u043e\u043d\u0438\u044f", "Skopje", "Europe", "Southeast Europe"],
  ["MP", "\u0421\u0435\u0432\u0435\u0440\u043d\u044b\u0435 \u041c\u0430\u0440\u0438\u0430\u043d\u0441\u043a\u0438\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "Saipan", "Oceania", "Micronesia"],
  ["SC", "\u0421\u0435\u0439\u0448\u0435\u043b\u044c\u0441\u043a\u0438\u0435 \u041e\u0441\u0442\u0440\u043e\u0432\u0430", "Victoria", "Africa", "Eastern Africa"],
  ["BL", "\u0421\u0435\u043d-\u0411\u0430\u0440\u0442\u0435\u043b\u0435\u043c\u0438", "Gustavia", "Americas", "Caribbean"],
  ["SN", "\u0421\u0435\u043d\u0435\u0433\u0430\u043b", "Dakar", "Africa", "Western Africa"],
  ["MF", "\u0421\u0435\u043d-\u041c\u0430\u0440\u0442\u0435\u043d", "Marigot", "Americas", "Caribbean"],
  ["PM", "\u0421\u0435\u043d-\u041f\u044c\u0435\u0440 \u0438 \u041c\u0438\u043a\u0435\u043b\u043e\u043d", "Saint-Pierre", "Americas", "North America"],
  ["VC", "\u0421\u0435\u043d\u0442-\u0412\u0438\u043d\u0441\u0435\u043d\u0442 \u0438 \u0413\u0440\u0435\u043d\u0430\u0434\u0438\u043d\u044b", "Kingstown", "Americas", "Caribbean"],
  ["KN", "\u0421\u0435\u043d\u0442-\u041a\u0438\u0442\u0441 \u0438 \u041d\u0435\u0432\u0438\u0441", "Basseterre", "Americas", "Caribbean"],
  ["LC", "\u0421\u0435\u043d\u0442-\u041b\u044e\u0441\u0438\u044f", "Castries", "Americas", "Caribbean"],
  ["RS", "\u0421\u0435\u0440\u0431\u0438\u044f", "Belgrade", "Europe", "Southeast Europe"],
  ["SG", "\u0421\u0438\u043d\u0433\u0430\u043f\u0443\u0440", "Singapore", "Asia", "South-Eastern Asia"],
  ["SX", "\u0421\u0438\u043d\u0442-\u041c\u0430\u0440\u0442\u0435\u043d", "Philipsburg", "Americas", "Caribbean"],
  ["SY", "\u0421\u0438\u0440\u0438\u044f", "Damascus", "Asia", "Western Asia"],
  ["SK", "\u0421\u043b\u043e\u0432\u0430\u043a\u0438\u044f", "Bratislava", "Europe", "Central Europe"],
  ["SI", "\u0421\u043b\u043e\u0432\u0435\u043d\u0438\u044f", "Ljubljana", "Europe", "Central Europe"],
  ["US", "\u0421\u043e\u0435\u0434\u0438\u043d\u0451\u043d\u043d\u044b\u0435 \u0428\u0442\u0430\u0442\u044b \u0410\u043c\u0435\u0440\u0438\u043a\u0438", "Washington D.C.", "Americas", "North America"],
  ["SB", "\u0421\u043e\u043b\u043e\u043c\u043e\u043d\u043e\u0432\u044b \u041e\u0441\u0442\u0440\u043e\u0432\u0430", "Honiara", "Oceania", "Melanesia"],
  ["SO", "\u0421\u043e\u043c\u0430\u043b\u0438", "Mogadishu", "Africa", "Eastern Africa"],
  ["SD", "\u0421\u0443\u0434\u0430\u043d", "Khartoum", "Africa", "Northern Africa"],
  ["SR", "\u0421\u0443\u0440\u0438\u043d\u0430\u043c", "Paramaribo", "Americas", "South America"],
  ["SL", "\u0421\u044c\u0435\u0440\u0440\u0430-\u041b\u0435\u043e\u043d\u0435", "Freetown", "Africa", "Western Africa"],
  ["TJ", "\u0422\u0430\u0434\u0436\u0438\u043a\u0438\u0441\u0442\u0430\u043d", "Dushanbe", "Asia", "Central Asia"],
  ["TW", "\u0422\u0430\u0439\u0432\u0430\u043d\u044c", "Taipei", "Asia", "Eastern Asia"],
  ["TH", "\u0422\u0430\u0438\u043b\u0430\u043d\u0434", "Bangkok", "Asia", "South-Eastern Asia"],
  ["TZ", "\u0422\u0430\u043d\u0437\u0430\u043d\u0438\u044f", "Dodoma", "Africa", "Eastern Africa"],
  ["TC", "\u0422\u0435\u0440\u043a\u0441 \u0438 \u041a\u0430\u0439\u043a\u043e\u0441", "Cockburn Town", "Americas", "Caribbean"],
  ["TG", "\u0422\u043e\u0433\u043e", "Lom\u00e9", "Africa", "Western Africa"],
  ["TK", "\u0422\u043e\u043a\u0435\u043b\u0430\u0443", "Fakaofo", "Oceania", "Polynesia"],
  ["TO", "\u0422\u043e\u043d\u0433\u0430", "Nuku'alofa", "Oceania", "Polynesia"],
  ["TT", "\u0422\u0440\u0438\u043d\u0438\u0434\u0430\u0434 \u0438 \u0422\u043e\u0431\u0430\u0433\u043e", "Port of Spain", "Americas", "Caribbean"],
  ["TV", "\u0422\u0443\u0432\u0430\u043b\u0443", "Funafuti", "Oceania", "Polynesia"],
  ["TN", "\u0422\u0443\u043d\u0438\u0441", "Tunis", "Africa", "Northern Africa"],
  ["TM", "\u0422\u0443\u0440\u043a\u043c\u0435\u043d\u0438\u044f", "Ashgabat", "Asia", "Central Asia"],
  ["TR", "\u0422\u0443\u0440\u0446\u0438\u044f", "Ankara", "Asia", "Western Asia"],
  ["UG", "\u0423\u0433\u0430\u043d\u0434\u0430", "Kampala", "Africa", "Eastern Africa"],
  ["UZ", "\u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d", "Tashkent", "Asia", "Central Asia"],
  ["UA", "\u0423\u043a\u0440\u0430\u0438\u043d\u0430", "Kyiv", "Europe", "Eastern Europe"],
  ["WF", "\u0423\u043e\u043b\u043b\u0438\u0441 \u0438 \u0424\u0443\u0442\u0443\u043d\u0430", "Mata-Utu", "Oceania", "Polynesia"],
  ["UY", "\u0423\u0440\u0443\u0433\u0432\u0430\u0439", "Montevideo", "Americas", "South America"],
  ["FO", "\u0424\u0430\u0440\u0435\u0440\u0441\u043a\u0438\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "T\u00f3rshavn", "Europe", "Northern Europe"],
  ["FM", "\u0424\u0435\u0434\u0435\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0435 \u0428\u0442\u0430\u0442\u044b \u041c\u0438\u043a\u0440\u043e\u043d\u0435\u0437\u0438\u0438", "Palikir", "Oceania", "Micronesia"],
  ["FJ", "\u0424\u0438\u0434\u0436\u0438", "Suva", "Oceania", "Melanesia"],
  ["PH", "\u0424\u0438\u043b\u0438\u043f\u043f\u0438\u043d\u044b", "Manila", "Asia", "South-Eastern Asia"],
  ["FI", "\u0424\u0438\u043d\u043b\u044f\u043d\u0434\u0438\u044f", "Helsinki", "Europe", "Northern Europe"],
  ["FK", "\u0424\u043e\u043b\u043a\u043b\u0435\u043d\u0434\u0441\u043a\u0438\u0435 \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "Stanley", "Americas", "South America"],
  ["FR", "\u0424\u0440\u0430\u043d\u0446\u0438\u044f", "Paris", "Europe", "Western Europe"],
  ["GF", "\u0424\u0440\u0430\u043d\u0446\u0443\u0437\u0441\u043a\u0430\u044f \u0413\u0432\u0438\u0430\u043d\u0430", "Cayenne", "Americas", "South America"],
  ["PF", "\u0424\u0440\u0430\u043d\u0446\u0443\u0437\u0441\u043a\u0430\u044f \u041f\u043e\u043b\u0438\u043d\u0435\u0437\u0438\u044f", "Papeet\u0113", "Oceania", "Polynesia"],
  ["TF", "\u0424\u0440\u0430\u043d\u0446\u0443\u0437\u0441\u043a\u0438\u0435 \u042e\u0436\u043d\u044b\u0435 \u0438 \u0410\u043d\u0442\u0430\u0440\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0438", "Port-aux-Fran\u00e7ais", "Antarctic", ""],
  ["HR", "\u0425\u043e\u0440\u0432\u0430\u0442\u0438\u044f", "Zagreb", "Europe", "Southeast Europe"],
  ["CF", "\u0426\u0435\u043d\u0442\u0440\u0430\u043b\u044c\u043d\u043e\u0430\u0444\u0440\u0438\u043a\u0430\u043d\u0441\u043a\u0430\u044f \u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430", "Bangui", "Africa", "Middle Africa"],
  ["TD", "\u0427\u0430\u0434", "N'Djamena", "Africa", "Middle Africa"],
  ["ME", "\u0427\u0435\u0440\u043d\u043e\u0433\u043e\u0440\u0438\u044f", "Podgorica", "Europe", "Southeast Europe"],
  ["CZ", "\u0427\u0435\u0445\u0438\u044f", "Prague", "Europe", "Central Europe"],
  ["CL", "\u0427\u0438\u043b\u0438", "Santiago", "Americas", "South America"],
  ["CH", "\u0428\u0432\u0435\u0439\u0446\u0430\u0440\u0438\u044f", "Bern", "Europe", "Western Europe"],
  ["SE", "\u0428\u0432\u0435\u0446\u0438\u044f", "Stockholm", "Europe", "Northern Europe"],
  ["SJ", "\u0428\u043f\u0438\u0446\u0431\u0435\u0440\u0433\u0435\u043d \u0438 \u042f\u043d-\u041c\u0430\u0439\u0435\u043d", "Longyearbyen", "Europe", "Northern Europe"],
  ["LK", "\u0428\u0440\u0438-\u041b\u0430\u043d\u043a\u0430", "Colombo", "Asia", "Southern Asia"],
  ["EC", "\u042d\u043a\u0432\u0430\u0434\u043e\u0440", "Quito", "Americas", "South America"],
  ["GQ", "\u042d\u043a\u0432\u0430\u0442\u043e\u0440\u0438\u0430\u043b\u044c\u043d\u0430\u044f \u0413\u0432\u0438\u043d\u0435\u044f", "Malabo", "Africa", "Middle Africa"],
  ["ER", "\u042d\u0440\u0438\u0442\u0440\u0435\u044f", "Asmara", "Africa", "Eastern Africa"],
  ["EE", "\u042d\u0441\u0442\u043e\u043d\u0438\u044f", "Tallinn", "Europe", "Northern Europe"],
  ["ET", "\u042d\u0444\u0438\u043e\u043f\u0438\u044f", "Addis Ababa", "Africa", "Eastern Africa"],
  ["GS", "\u042e\u0436\u043d\u0430\u044f \u0413\u0435\u043e\u0440\u0433\u0438\u044f \u0438 \u042e\u0436\u043d\u044b\u0435 \u0421\u0430\u043d\u0434\u0432\u0438\u0447\u0435\u0432\u044b \u043e\u0441\u0442\u0440\u043e\u0432\u0430", "King Edward Point", "Antarctic", ""],
  ["KR", "\u042e\u0436\u043d\u0430\u044f \u041a\u043e\u0440\u0435\u044f", "Seoul", "Asia", "Eastern Asia"],
  ["ZA", "\u042e\u0436\u043d\u043e-\u0410\u0444\u0440\u0438\u043a\u0430\u043d\u0441\u043a\u0430\u044f \u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430", "Pretoria", "Africa", "Southern Africa"],
  ["SS", "\u042e\u0436\u043d\u044b\u0439 \u0421\u0443\u0434\u0430\u043d", "Juba", "Africa", "Middle Africa"],
  ["JM", "\u042f\u043c\u0430\u0439\u043a\u0430", "Kingston", "Americas", "Caribbean"],
  ["JP", "\u042f\u043f\u043e\u043d\u0438\u044f", "Tokyo", "Asia", "Eastern Asia"],
];

function flagFromCountryCode(code) {
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function mapCountryToFlagRegion(regionRaw = "", subregionRaw = "") {
  const region = regionRaw.toLowerCase();
  const subregion = subregionRaw.toLowerCase();
  if (region === "europe") return "europe";
  if (region === "asia") return "asia";
  if (region === "africa") return "africa";
  if (region === "oceania") return "oceania";
  if (region === "antarctic") return "antarctica";
  if (region === "americas") {
    if (subregion.includes("south")) return "southAmerica";
    if (subregion.includes("central")) return "centralAmerica";
    if (subregion.includes("caribbean")) return "caribbean";
    return "northAmerica";
  }
  return "world";
}

function buildFlagMoodRegions(rows) {
  const buckets = Object.fromEntries(Object.keys(flagMoodRegionLabels).map((key) => [key, []]));
  rows.forEach(([code, country, capital, region, subregion]) => {
    if (!/^[A-Z]{2}$/.test(code) || !country) return;
    const row = { flag: flagFromCountryCode(code), country, capital: capital || country };
    const key = mapCountryToFlagRegion(region || "", subregion || "");
    buckets.world.push(row);
    if (buckets[key]) buckets[key].push(row);
  });
  Object.values(buckets).forEach((list) => list.sort((a, b) => a.country.localeCompare(b.country, "ru")));
  const result = {};
  Object.entries(buckets).forEach(([key, countries]) => {
    if (countries.length >= 4) {
      result[key] = { label: `${flagMoodRegionLabels[key]} (${countries.length})`, countries };
    }
  });
  return result;
}

let flagMoodRegions = buildFlagMoodRegions(flagMoodFallbackRows);
let flagMoodLoaded = false;

async function loadFlagMoodCountries() {
  if (flagMoodLoaded) return;
  flagMoodLoaded = true;
  try {
    const cachedRaw = localStorage.getItem(FLAG_MOOD_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached && typeof cached === "object" && cached.world?.countries?.length >= flagMoodFallbackRows.length) {
        flagMoodRegions = cached;
      }
    }
  } catch {}
  try {
    let regionNames = null;
    try {
      regionNames = new Intl.DisplayNames(["ru"], { type: "region" });
    } catch {}
    const response = await fetch("https://restcountries.com/v3.1/all?fields=cca2,capital,region,subregion,name,translations");
    if (!response.ok) return;
    const payload = await response.json();
    const onlineRows = [];
    const used = new Set();
    payload.forEach((item) => {
      const code = String(item.cca2 || "").toUpperCase();
      if (!/^[A-Z]{2}$/.test(code) || used.has(code)) return;
      used.add(code);
      const country =
        item?.translations?.rus?.common
        || item?.name?.common
        || regionNames?.of(code)
        || code;
      if (!country || country === code) return;
      const capital = Array.isArray(item.capital) && item.capital[0] ? item.capital[0] : country;
      onlineRows.push([code, country, capital, item.region || "", item.subregion || ""]);
    });
    if (onlineRows.length >= flagMoodFallbackRows.length) {
      flagMoodRegions = buildFlagMoodRegions(onlineRows);
      try {
        localStorage.setItem(FLAG_MOOD_CACHE_KEY, JSON.stringify(flagMoodRegions));
      } catch {}
    }
  } catch {}
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(localStorage.getItem("love-arcade-progress-v1"));
    const merged = { ...defaultState, ...saved };
    merged.trackIndex = Math.min(merged.trackIndex || 0, TRACKS.length - 1);
    merged.volume = Math.max(0, Math.min(1, Number.isFinite(merged.volume) ? merged.volume : defaultState.volume));
    merged.sfxVolume = Math.max(0, Math.min(1, Number.isFinite(merged.sfxVolume) ? merged.sfxVolume : defaultState.sfxVolume));
    merged.usedPromos = { ...defaultState.usedPromos, ...(saved?.usedPromos || {}) };
    merged.shopPurchases = { ...defaultState.shopPurchases, ...(saved?.shopPurchases || {}) };
    merged.rewards = Array.isArray(saved?.rewards) ? saved.rewards : [];
    merged.dailies = { ...defaultState.dailies, ...(saved?.dailies || {}) };
    if (merged.dailies.date !== TODAY) merged.dailies = { ...defaultState.dailies };
    return merged;
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatHearts(value) {
  return Number(value || 0).toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

function addReward(title, source, options = {}) {
  state.rewards.unshift({
    id: uid("reward"),
    title,
    source,
    createdAt: new Date().toISOString(),
    special: options.special || null,
  });
  saveState();
  renderRewards();
}

function ensureFirstGiftReward() {
  const exists = state.rewards.some((item) => item.special === "firstGift") || state.giftClaimedAt;
  if (!exists) {
    addReward("Первый подарок", "Подарок за ответ «Да»", { special: "firstGift" });
  }
}

function showModal({ title, body, actions = [], details = "" }) {
  const root = $("#modalRoot");
  const buttons = actions.length ? actions : [{ label: "Хорошо" }];
  root.innerHTML = `
    <div class="modal-card">
      <h3>${title}</h3>
      <p>${body}</p>
      ${details ? `<div class="modal-details">${details}</div>` : ""}
      <div class="modal-actions">
        ${buttons.map((button, index) => `<button class="${index === 0 ? "primary-btn" : "soft-btn"}" data-modal-action="${index}">${button.label}</button>`).join("")}
      </div>
    </div>
  `;
  root.classList.remove("hidden");
  $$("[data-modal-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = buttons[Number(button.dataset.modalAction)]?.action;
      root.classList.add("hidden");
      root.innerHTML = "";
      if (action) action();
    });
  });
}

function resetProgress() {
  if (!confirm("Сбросить всё и вернуться к вопросу Да/Нет?")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("love-arcade-progress-v1");
  state = {
    ...JSON.parse(JSON.stringify(defaultState)),
    volume: state.volume,
    sfxVolume: state.sfxVolume,
    trackIndex: state.trackIndex,
  };
  saveState();
  closeGame();
  $("#gameApp").classList.add("hidden");
  $("#proposalGate").classList.remove("hidden");
  renderAll();
}

function init() {
  setupGate();
  setupNavigation();
  injectNonMathGames();
  setupMusic();
  setupAmbient();
  setupServiceWorker();
  loadFlagMoodCountries().then(() => {
    if (activeGame && nonMathGameMap[activeGame]) drawNonMathArcade();
  });
  applyTimeMode();
  initFortuneWheel();
  if (state.accepted) openApp();
  renderAll();
}

function injectNonMathGames() {
  const grid = $("#gamesView .game-grid");
  if (!grid || grid.dataset.nonMathInjected === "true") return;
  grid.dataset.nonMathInjected = "true";
  const markup = nonMathArcadeGames.map((game) => `
    <button class="game-card" data-game="${game.id}">
      <span class="game-icon">${game.icon}</span>
      <strong>${game.title}</strong>
      <small>${game.subtitle}</small>
      <em>${game.rewardBase}-${game.rewardBase + 1200} hearts</em>
    </button>
  `).join("");
  grid.insertAdjacentHTML("beforeend", markup);
}

function setupGate() {
  $("#yesBtn").addEventListener("click", () => {
    playSfx("win");
    state.accepted = true;
    ensureFirstGiftReward();
    saveState();
    openApp();
    unlockAchievement("yes");
    if (!state.firstGiftNoticeSeen) {
      state.firstGiftNoticeSeen = true;
      saveState();
      showModal({
        title: "Теперь ты моя девушка",
        body: "Твой подарок ждёт тебя в разделе награды. Я безумно рад, что ты согласилась. Спасибо тебе, солнышко моё, я так люблю тебя 💗",
        actions: [{ label: "Открыть награды", action: () => setView("rewards") }],
      });
    }
  });

  const noBtn = $("#noBtn");
  const moveNo = () => {
    playSfx("tick");
    const box = $(".proposal-actions").getBoundingClientRect();
    const btn = noBtn.getBoundingClientRect();
    const yes = $("#yesBtn").getBoundingClientRect();
    let x = 0;
    let y = 0;
    for (let i = 0; i < 24; i += 1) {
      x = Math.random() * Math.max(0, box.width - btn.width);
      y = Math.random() * Math.max(0, box.height - btn.height);
      const candidate = {
        left: box.left + x,
        top: box.top + y,
        right: box.left + x + btn.width,
        bottom: box.top + y + btn.height,
      };
      const overlapsYes = !(candidate.right < yes.left - 10 || candidate.left > yes.right + 10 || candidate.bottom < yes.top - 10 || candidate.top > yes.bottom + 10);
      if (!overlapsYes) break;
    }
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  };
  noBtn.addEventListener("pointerenter", moveNo);
  noBtn.addEventListener("pointerdown", moveNo);
}

function openApp() {
  ensureFirstGiftReward();
  $("#proposalGate").classList.add("hidden");
  $("#gameApp").classList.remove("hidden");
  applyTimeMode();
  renderAll();
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js?v=16").catch(() => {});
  }
}

function setupNavigation() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      playSfx("click");
      setView(viewButton.dataset.view);
    }

    const gameButton = event.target.closest("[data-game]");
    if (gameButton) {
      playSfx("click");
      openGame(gameButton.dataset.game);
    }

    if (event.target.closest("[data-close-game]")) closeGame();

    const buyButton = event.target.closest("[data-buy]");
    if (buyButton) confirmShopPurchase(buyButton.dataset.buy);

    const claimRewardButton = event.target.closest("[data-claim-reward]");
    if (claimRewardButton) claimReward(claimRewardButton.dataset.claimReward);

    const settingsTab = event.target.closest("[data-settings-tab]");
    if (settingsTab) setSettingsTab(settingsTab.dataset.settingsTab);
  });

  $("#applyPromoBtn")?.addEventListener("click", applyPromo);
}

function setView(view) {
  $$(".view").forEach((el) => el.classList.remove("active"));
  $(`#${view}View`)?.classList.add("active");
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  renderAll();
}

function setSettingsTab(tab) {
  $$(".settings-pane").forEach((pane) => pane.classList.remove("active"));
  $(`#${tab}Settings`)?.classList.add("active");
  $$("[data-settings-tab]").forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
}

function ensureAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playChessMoveAudio() {
  if (!state.sfxEnabled) return;
  try {
    if (!chessMoveAudio) {
      chessMoveAudio = new Audio("music/capture.mp3");
      chessMoveAudio.preload = "auto";
    }
    chessMoveAudio.pause();
    chessMoveAudio.currentTime = 0;
    chessMoveAudio.volume = Math.min(1, Math.max(0, state.sfxVolume * 0.95));
    chessMoveAudio.play().catch(() => {});
  } catch {}
}

function playSfx(type) {
  if (!state.sfxEnabled) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;
  const profile = {
    click: { notes: [560], dur: 0.06, wave: "triangle", vol: 0.048 },
    tick: { notes: [700, 880], dur: 0.08, wave: "triangle", vol: 0.045 },
    move: { notes: [430, 540], dur: 0.12, wave: "triangle", vol: 0.058 },
    match: { notes: [620, 830], dur: 0.14, wave: "triangle", vol: 0.07 },
    error: { notes: [210, 145], dur: 0.16, wave: "sawtooth", vol: 0.05 },
    win: { notes: [520, 660, 880], dur: 0.28, wave: "triangle", vol: 0.095 },
  }[type] || { notes: [460], dur: 0.08, wave: "sine", vol: 0.052 };
  const loudnessBoost = 0.8 + state.sfxVolume * 1.05;
  profile.notes.forEach((frequency, index) => {
    const startAt = now + index * 0.028;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = profile.wave;
    osc.frequency.setValueAtTime(frequency, startAt);
    if (type === "win") osc.frequency.exponentialRampToValueAtTime(frequency * 1.08, startAt + profile.dur * 0.8);
    if (type === "error") osc.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.55), startAt + profile.dur * 0.85);
    gain.gain.setValueAtTime(profile.vol * loudnessBoost, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + profile.dur + 0.03);
  });
}

function setupMusic() {
  const audio = $("#audioPlayer");
  audio.volume = state.volume;
  audio.src = TRACKS[state.trackIndex].src;
  $("#volumeRange").value = Math.round(state.volume * 100);
  $("#sfxVolumeRange").value = Math.round(state.sfxVolume * 100);

  $("#playPause").addEventListener("click", async () => {
    if (!state.musicEnabled) {
      state.musicEnabled = true;
      $("#musicEnabledToggle").checked = true;
    }
    if (audio.paused) {
      await audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    renderMusic();
  });
  $("#prevTrack").addEventListener("click", () => changeTrack(-1, true));
  $("#nextTrack").addEventListener("click", () => changeTrack(1, true));
  $("#volumeRange").addEventListener("input", (event) => {
    state.volume = Number(event.target.value) / 100;
    audio.volume = state.volume;
    saveState();
  });
  $("#sfxVolumeRange").addEventListener("input", (event) => {
    state.sfxVolume = Number(event.target.value) / 100;
    saveState();
  });
  $("#shuffleBtn").addEventListener("click", () => {
    state.shuffleTracks = !state.shuffleTracks;
    saveState();
    renderMusic();
  });
  $("#repeatBtn").addEventListener("click", () => {
    state.repeatTrack = !state.repeatTrack;
    audio.loop = state.repeatTrack;
    saveState();
    renderMusic();
  });
  $("#musicEnabledToggle").addEventListener("change", (event) => {
    state.musicEnabled = event.target.checked;
    if (!state.musicEnabled) audio.pause();
    saveState();
    renderMusic();
  });
  $("#sfxEnabledToggle").addEventListener("change", (event) => {
    state.sfxEnabled = event.target.checked;
    saveState();
  });
  $("#customTrackInput")?.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    addCustomTracks(files);
    event.target.value = "";
  });
  $("#resetProgressBtn").addEventListener("click", resetProgress);
  audio.addEventListener("ended", () => {
    if (!state.repeatTrack) changeTrack(1, true);
  });
  audio.addEventListener("play", renderMusic);
  audio.addEventListener("pause", renderMusic);
}

function changeTrack(delta, autoplay) {
  if (state.shuffleTracks && autoplay) {
    let next = Math.floor(Math.random() * TRACKS.length);
    if (TRACKS.length > 1) while (next === state.trackIndex) next = Math.floor(Math.random() * TRACKS.length);
    selectTrack(next, autoplay);
    return;
  }
  selectTrack((state.trackIndex + delta + TRACKS.length) % TRACKS.length, autoplay);
}

function selectTrack(index, autoplay = true) {
  state.trackIndex = index;
  const track = TRACKS[index];
  const audio = $("#audioPlayer");
  audio.src = track.src;
  audio.loop = state.repeatTrack;
  if (autoplay && state.musicEnabled) audio.play().catch(() => {});
  saveState();
  renderMusic();
}

function addCustomTracks(files) {
  const audioFiles = files.filter((file) => {
    if (!file) return false;
    const type = String(file.type || "");
    if (type.startsWith("audio/")) return true;
    return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name || "");
  });
  if (!audioFiles.length) return;
  const startIndex = TRACKS.length;
  audioFiles.forEach((file) => {
    const src = URL.createObjectURL(file);
    const cleanName = file.name.replace(/\.[a-z0-9]+$/i, "");
    TRACKS.push({
      type: "custom",
      title: cleanName || `Мой трек ${customTrackSeed}`,
      src,
    });
    customTrackSeed += 1;
  });
  selectTrack(startIndex, true);
}

function applyTimeMode() {
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  document.body.classList.toggle("night", isNight);
  $("#timeMood").textContent = isNight ? "night mode" : "day Mode";
  $("#secretMessage").textContent = isNight
    ? "Секретное ночное событие активно: атмосфера стала тише, глубже и немного волшебнее."
    : "Днём здесь больше света, мягких бликов и спокойного настроения.";
  if (isNight && state.accepted) unlockAchievement("night");
}

function addHearts(amount, reason) {
  const before = state.hearts;
  state.hearts += amount;
  state.lastReward = `+${formatHearts(amount)} hearts · ${reason}`;
  state.dailies.earnHearts += amount;
  saveState();
  animateCounter(before, state.hearts);
  showReward(`+${formatHearts(amount)} hearts · ${reason}`);
  renderAll();
  if (state.hearts >= SECRET_GIFT_GOAL && !state.secretGiftSeen) {
    state.secretGiftSeen = true;
    saveState();
    showModal({
      title: "Секретный подарок открыт",
      body: "Напиши мне, чтобы забрать его. А если знаешь секретный промокод, введи его в настройках.",
      actions: [{ label: "Открыть подарок", action: () => setView("gift") }],
    });
  }
}

function animateCounter(from, to) {
  const start = performance.now();
  const duration = 700;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const value = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    $("#heartCount").textContent = `${formatHearts(value)} hearts`;
    $("#orbPercent").textContent = formatHearts(value);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showReward(text) {
  const toast = $("#rewardToast");
  toast.textContent = text;
  toast.classList.add("show");
  burstConfetti();
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function burstConfetti() {
  const colors = ["#ff5c8d", "#f6c766", "#79e2c2", "#8ec5ff", "#ff9cb8"];
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${44 + Math.random() * 12}%`;
    piece.style.top = "18%";
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--dx", `${Math.random() * 240 - 120}px`);
    document.body.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function completeWin(baseReward, reason) {
  playSfx("win");
  const beforeAchievements = new Set(Object.keys(state.achievements));
  state.gamesWon += 1;
  state.gamesPlayed += 1;
  state.streak += 1;
  state.losses = 0;
  state.dailies.winGame = true;
  const streakBonus = state.streak >= 3 ? Math.min(500, state.streak * 60) : 0;
  addHearts(baseReward + streakBonus, streakBonus ? `${reason} + серия` : reason);
  unlockAchievement("firstWin");
  if (state.streak >= 5) unlockAchievement("streak5");
  const gained = Object.keys(state.achievements)
    .filter((id) => !beforeAchievements.has(id))
    .map((id) => achievements.find((item) => item.id === id)?.title)
    .filter(Boolean);
  showResultModal("Победа", baseReward + streakBonus, gained);
}

function completeLoss() {
  playSfx("error");
  state.gamesPlayed += 1;
  state.losses += 1;
  state.streak = 0;
  if (state.losses >= 3) showReward("Секрет: даже серии поражений считаются частью истории");
  saveState();
  renderAll();
  showResultModal("Проигрыш", 0, []);
}

function unlockAchievement(id) {
  if (state.achievements[id]) return;
  const achievement = achievements.find((item) => item.id === id);
  if (!achievement) return;
  state.achievements[id] = new Date().toISOString();
  saveState();
  if (achievement.reward > 0) addHearts(achievement.reward, `достижение: ${achievement.title}`);
  renderAll();
}

function showResultModal(title, hearts, gainedAchievements) {
  const details = gainedAchievements.length
    ? `<strong>Полученные достижения:</strong><ul>${gainedAchievements.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : `<span class="muted">Новых достижений нет.</span>`;
  showModal({
    title,
    body: hearts > 0 ? `Получено: +${hearts} hearts.` : "В этот раз hearts не начислены.",
    details,
  });
}

function renderAll() {
  renderProgress();
  renderDaily();
  renderAchievements();
  renderGift();
  renderMusic();
  renderRewards();
  renderShop();
  renderWheel();
}

function renderProgress() {
  $("#heartCount").textContent = `${formatHearts(state.hearts)} hearts`;
  $("#orbPercent").textContent = formatHearts(state.hearts);
  $("#lastReward").textContent = state.lastReward || "Пока наград нет. Самое приятное впереди.";
}

function renderDaily() {
  const markup = dailyTasks.map((task) => {
    const progress = getDailyProgress(task);
    const done = progress >= task.target;
    const claimed = state.dailies[`${task.id}Claimed`];
    return `
      <article class="task-item">
        <div class="task-top">
          <strong>${task.title}</strong>
          <span>${done ? "готово" : `${progress}/${task.target}`}</span>
        </div>
        <div class="task-meter"><span style="width:${Math.min(100, (progress / task.target) * 100)}%"></span></div>
        <button class="soft-btn" ${done && !claimed ? "" : "disabled"} data-daily="${task.id}">
          ${claimed ? "получено" : `+${task.reward} hearts`}
        </button>
      </article>
    `;
  }).join("");
  $("#dailyTasks").innerHTML = markup;
  $("#dailyPreview").innerHTML = markup;
  $$("[data-daily]").forEach((btn) => btn.addEventListener("click", () => claimDaily(btn.dataset.daily)));
}

function getDailyProgress(task) {
  if (task.id === "winGame") return state.dailies.winGame ? 1 : 0;
  if (task.id === "earnHearts") return Math.min(task.target, state.dailies.earnHearts);
  if (task.id === "puzzleUnder80") return state.dailies.puzzleUnder80 ? 1 : 0;
  return 0;
}

function claimDaily(id) {
  const task = dailyTasks.find((item) => item.id === id);
  if (!task || state.dailies[`${id}Claimed`] || getDailyProgress(task) < task.target) return;
  playSfx("match");
  state.dailies[`${id}Claimed`] = true;
  addHearts(task.reward, `daily task: ${task.title}`);
}

function renderAchievements() {
  const markup = achievements.map((item) => {
    const unlocked = Boolean(state.achievements[item.id]);
    return `
      <article class="achievement ${unlocked ? "" : "locked"}">
        <div class="achievement-top">
          <strong>${item.title}</strong>
          <span>${unlocked ? "открыто" : `+${item.reward}`}</span>
        </div>
        <p class="muted">${item.text}</p>
      </article>
    `;
  }).join("");
  $("#achievements").innerHTML = markup;
  $("#achievementPreview").innerHTML = markup;
}

function renderGift() {
  const ready = Boolean(state.giftClaimedAt);
  const panel = $("#giftPanel");
  panel.classList.toggle("unlocked", ready);
  if (state.giftClaimedAt) {
    $("#giftTitle").textContent = "Теперь ты моя девушка";
    $("#giftText").textContent = "Я безумно рад, что ты согласилась. Спасибо тебе, солнышко моё, я так люблю тебя 💗";
  } else {
    $("#giftTitle").textContent = "Первый подарок ждёт тебя в разделе награды.";
    $("#giftText").textContent = "Забери его там, и приложение сохранит дату и время этого момента.";
  }
  $("#giftStamp").textContent = state.giftClaimedAt ? `Получено: ${new Date(state.giftClaimedAt).toLocaleString()}` : "";
  const hideSecretText = state.hearts < SECRET_GIFT_GOAL || state.secretMessagesUnlocked;
  $("#secretGiftPanel").classList.toggle("hidden", hideSecretText);
}

function renderMusic() {
  const audio = $("#audioPlayer");
  const track = TRACKS[state.trackIndex];
  $("#trackName").textContent = track.title;
  $("#trackStatus").textContent = audio.paused ? "пауза" : "играет";
  $("#playPause").textContent = audio.paused ? "Play" : "Pause";
  $("#shuffleBtn").classList.toggle("active", state.shuffleTracks);
  $("#repeatBtn").classList.toggle("active", state.repeatTrack);
  $("#musicEnabledToggle").checked = state.musicEnabled;
  $("#sfxEnabledToggle").checked = state.sfxEnabled;
  $("#volumeRange").value = Math.round(state.volume * 100);
  $("#sfxVolumeRange").value = Math.round(state.sfxVolume * 100);
  $("#messagesTabBtn").classList.toggle("hidden", !state.secretMessagesUnlocked);
  $("#trackList").innerHTML = TRACKS.map((item, index) => `
    <button class="track-option ${index === state.trackIndex ? "active" : ""}" data-track="${index}">
      ${item.type === "custom" ? "🎵 " : ""}${item.title}
    </button>
  `).join("");
  $$("[data-track]").forEach((btn) => btn.addEventListener("click", () => selectTrack(Number(btn.dataset.track))));
}

function renderRewards() {
  const list = $("#rewardList");
  if (!list) return;
  if (!state.rewards.length) {
    list.innerHTML = `<article class="panel compact"><h3>Пока пусто</h3><p class="muted">Награды из колеса и магазина появятся здесь.</p></article>`;
    return;
  }
  list.innerHTML = state.rewards.map((reward) => `
    <article class="reward-card">
      <div>
        <strong>${reward.title}</strong>
        <p class="muted">${reward.source} · ${new Date(reward.createdAt).toLocaleString()}</p>
      </div>
      <button class="primary-btn" data-claim-reward="${reward.id}">${reward.special === "firstGift" ? "Забрать" : "Получено"}</button>
    </article>
  `).join("");
}

function claimReward(id) {
  const reward = state.rewards.find((item) => item.id === id);
  if (!reward) return;
  if (reward.special === "firstGift") {
    state.giftClaimedAt = new Date().toISOString();
    showModal({
      title: "Подарок получен",
      body: "Теперь ты моя девушка, я безумно рад что ты согласилась спасибо тебе солнышко моё, я так люблю тебя 💗",
    });
  }
  state.rewards = state.rewards.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function renderShop() {
  const list = $("#shopList");
  if (!list) return;
  list.innerHTML = [...shopItems].sort((a, b) => a.price - b.price).map((item) => {
    const bought = state.shopPurchases[item.id] || 0;
    const soldOut = item.limit !== null && bought >= item.limit;
    return `
      <article class="shop-card">
        <div>
          <strong>${item.title}</strong>
          <p class="muted">${item.price.toLocaleString()} hearts · ${item.limit === null ? "без ограничений" : `осталось ${Math.max(0, item.limit - bought)}`}</p>
        </div>
        <button class="primary-btn" data-buy="${item.id}" ${soldOut || state.hearts < item.price ? "disabled" : ""}>Купить</button>
      </article>
    `;
  }).join("");
}

function confirmShopPurchase(id) {
  const item = shopItems.find((entry) => entry.id === id);
  if (!item) return;
  const bought = state.shopPurchases[id] || 0;
  if (item.limit !== null && bought >= item.limit) return;
  if (state.hearts < item.price) {
    showModal({ title: "Не хватает hearts", body: `Для покупки нужно ${item.price.toLocaleString()} hearts.` });
    return;
  }
  showModal({
    title: "Подтвердить покупку",
    body: `Купить «${item.title}» за ${item.price.toLocaleString()} hearts?`,
    actions: [
      { label: "Купить", action: () => buyShopItem(item) },
      { label: "Отмена" },
    ],
  });
}

function buyShopItem(item) {
  state.hearts -= item.price;
  state.shopPurchases[item.id] = (state.shopPurchases[item.id] || 0) + 1;
  addReward(item.title, "Покупка в магазине");
  saveState();
  renderAll();
  showModal({ title: "Покупка готова", body: `Ты приобрела: ${item.title}. Награда добавлена во вкладку «Награды».` });
}

function drawWheelCanvas(rotationDeg) {
  const canvas = $("#wheelCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 12;
  const sectorCount = wheelRewards.length;
  const sectorAngle = (Math.PI * 2) / sectorCount;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  for (let i = 0; i < sectorCount; i += 1) {
    const startAngle = -Math.PI / 2 + i * sectorAngle;
    const endAngle = startAngle + sectorAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = wheelRewards[i].color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 248, 251, 0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(startAngle + sectorAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#130d16";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(wheelRewards[i].text, radius - 18, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(18, 12, 22, 0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 248, 251, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 10;
  ctx.stroke();
}

function renderWheel() {
  const status = $("#wheelStatus");
  const button = $("#spinWheelBtn");
  if (!status || !button) return;

  drawWheelCanvas(state.wheelRotation || 0);

  if (wheelSpinning) return;

  const last = state.wheelLastSpin ? new Date(state.wheelLastSpin).getTime() : 0;
  const canSpin = !last || Date.now() - last >= WEEK_MS;
  button.disabled = !canSpin;
  if (canSpin) {
    status.textContent = "Колесо готово.";
  } else if (!status.textContent.startsWith("Выпало:")) {
    const next = new Date(last + WEEK_MS);
    status.textContent = `Следующая попытка: ${next.toLocaleString()}`;
  }
}

function initFortuneWheel() {
  const button = $("#spinWheelBtn");
  const canvas = $("#wheelCanvas");
  if (!button || !canvas) return;

  renderWheel();

  if (button.dataset.wheelReady) return;
  button.dataset.wheelReady = "true";

  button.addEventListener("click", () => {
    const last = state.wheelLastSpin ? new Date(state.wheelLastSpin).getTime() : 0;
    if (wheelSpinning || (last && Date.now() - last < WEEK_MS)) return;

    const rewardIndex = Math.floor(Math.random() * wheelRewards.length);
    const reward = wheelRewards[rewardIndex];
    const sector = 360 / wheelRewards.length;
    const startRotation = state.wheelRotation || 0;
    const currentNormalized = ((startRotation % 360) + 360) % 360;
    const desiredNormalized = ((-(rewardIndex + 0.5) * sector) % 360 + 360) % 360;
    const extraRotation = (desiredNormalized - currentNormalized + 360) % 360;
    const target = startRotation + 360 * (7 + Math.floor(Math.random() * 3)) + extraRotation;
    const duration = 4500;
    const startTime = performance.now();

    wheelSpinning = true;
    button.disabled = true;

    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startRotation + (target - startRotation) * eased;
      drawWheelCanvas(current);

      if (t < 1) {
        requestAnimationFrame(animate);
        return;
      }

      state.wheelRotation = target;
      state.wheelLastSpin = new Date().toISOString();
      wheelSpinning = false;
      saveState();

      const status = $("#wheelStatus");
      if (status) status.textContent = `Выпало: ${reward.text}`;

      button.disabled = true;
      addReward(reward.text, "Колесо фортуны");
      renderRewards();
      showModal({
        title: "Колесо фортуны",
        body: `Выпало: ${reward.text}. Награда добавлена во вкладку «Награды».`,
      });
    }

    requestAnimationFrame(animate);
  });
}

function applyPromo() {
  const input = $("#promoInput");
  const code = input.value.trim();
  const normalized = code.toLowerCase();
  if (normalized === "солнышко") {
    if (state.usedPromos.sun) {
      $("#promoStatus").textContent = "Этот промокод уже был использован.";
      return;
    }
    state.usedPromos.sun = true;
    addHearts(5000, "промокод солнышко");
    $("#promoStatus").textContent = "+5000 hearts начислены.";
    input.value = "";
    return;
  }
  if (code.toUpperCase() === "ILU") {
    if (state.hearts < SECRET_GIFT_GOAL) {
      $("#promoStatus").textContent = "Секретный промокод откроется после 20 000 hearts.";
      return;
    }
    state.secretMessagesUnlocked = true;
    saveState();
    renderMusic();
    renderGift();
    setSettingsTab("messages");
    $("#promoStatus").textContent = "Открыта вкладка сообщений.";
    input.value = "";
    return;
  }
  const hearts = HEART_PROMOS[normalized];
  if (hearts !== undefined) {
    if (state.usedPromos[normalized]) {
      $("#promoStatus").textContent = "Этот промокод уже был использован.";
      return;
    }
    state.usedPromos[normalized] = true;
    addHearts(hearts, `промокод ${code}`);
    $("#promoStatus").textContent = `+${hearts} hearts начислены.`;
    input.value = "";
    return;
  }
  $("#promoStatus").textContent = "Промокод не найден.";
}

function openGame(game) {
  stopRuntimeGames();
  activeGame = game;
  const stage = $("#gameStage");
  document.body.classList.add("game-open");
  stage.classList.add("active");
  if (game === "memory") renderMemory("normal");
  if (game === "puzzle") renderPuzzle(4);
  if (game === "quiz") renderQuizStart();
  if (game === "chess") renderChess();
  if (game === "simon") renderSimon();
  if (game === "codebreaker") renderCodebreaker();
  if (game === "lightsout") renderLightsOut(5);
  if (game === "mathrush") renderMathRush();
  if (game === "irregularverbs") renderIrregularVerbs();
  if (nonMathGameMap[game]) renderNonMathArcade(game);
}

function closeGame() {
  stopRuntimeGames();
  activeGame = null;
  $("#gameStage").classList.remove("active");
  $("#gameStage").innerHTML = "";
  document.body.classList.remove("game-open");
}

function stopRuntimeGames() {
  if (simonState?.timers?.length) {
    simonState.timers.forEach((timer) => clearTimeout(timer));
    simonState.timers = [];
    simonState.showing = false;
  }
  if (mathRushState?.timer) {
    clearInterval(mathRushState.timer);
    mathRushState.timer = null;
  }
  if (nonMathGameState?.timer) {
    clearInterval(nonMathGameState.timer);
    nonMathGameState.timer = null;
  }
}

function stageShell(title, subtitle, actions = "") {
  return `
    <div class="stage-head">
      <div>
        <p class="kicker">${subtitle}</p>
        <h3>${title}</h3>
      </div>
      <div class="stage-actions">
        ${actions}
        <button class="soft-btn" data-close-game>Назад</button>
      </div>
    </div>
  `;
}

function renderMemory(level = memoryState?.level || "normal") {
  const config = memoryLevels[level];
  const icons = ["♥", "✦", "☾", "♛", "✿", "◇", "★", "∞", "☼", "♪", "✧", "❣"];
  const selected = icons.slice(0, config.pairs);
  const deck = shuffleMemoryDeck([...selected, ...selected], config.columns).map((icon, index) => ({ icon, id: index, flipped: false, matched: false }));
  memoryState = { deck, moves: 0, lock: false, level, startedAt: Date.now() };
  drawMemory();
}

function drawMemory() {
  const config = memoryLevels[memoryState.level];
  $("#gameStage").innerHTML = stageShell(
    "Memory Love",
    `${config.label} · ходов: ${memoryState.moves}`,
    `
      <div class="segmented">
        ${Object.entries(memoryLevels).map(([key, item]) => `<button class="chip ${memoryState.level === key ? "active" : ""}" data-memory-level="${key}">${item.label}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartMemory">Заново</button>
    `
  ) + `<div class="memory-board memory-${memoryState.level}" style="--memory-cols:${config.columns}">${memoryState.deck.map((card, index) => `
      <button class="memory-card ${card.flipped || card.matched ? "flipped" : ""} ${card.matched ? "matched" : ""}" data-card="${index}">
        ${card.flipped || card.matched ? card.icon : ""}
      </button>
    `).join("")}</div>`;
  $("#restartMemory").addEventListener("click", () => renderMemory(memoryState.level));
  $$("[data-memory-level]").forEach((btn) => btn.addEventListener("click", () => renderMemory(btn.dataset.memoryLevel)));
  $$("[data-card]").forEach((btn) => btn.addEventListener("click", () => flipMemory(Number(btn.dataset.card))));
}

function shuffleMemoryDeck(items, columns) {
  let best = shuffle(items);
  let bestScore = scoreMemoryDeck(best, columns);
  for (let i = 0; i < 80 && bestScore > 0; i += 1) {
    const candidate = shuffle(items);
    const score = scoreMemoryDeck(candidate, columns);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function scoreMemoryDeck(deck, columns) {
  let score = 0;
  deck.forEach((value, index) => {
    const neighbors = [index + 1, index - 1, index + columns, index - columns];
    neighbors.forEach((neighbor) => {
      if (neighbor >= 0 && neighbor < deck.length && deck[neighbor] === value) score += 1;
    });
  });
  return score;
}

function flipMemory(index) {
  if (memoryState.lock) return;
  const card = memoryState.deck[index];
  if (card.flipped || card.matched) return;
  playSfx("move");
  card.flipped = true;
  const open = memoryState.deck.filter((item) => item.flipped && !item.matched);
  if (open.length === 2) {
    memoryState.moves += 1;
    if (open[0].icon === open[1].icon) {
      playSfx("match");
      open.forEach((item) => {
        item.matched = true;
        item.flipped = false;
      });
      if (memoryState.deck.every((item) => item.matched)) {
        const config = memoryLevels[memoryState.level];
        const bonus = Math.max(50, config.reward - memoryState.moves * (memoryState.level === "hard" ? 8 : 6));
        completeWin(bonus, `Memory Love ${config.label}`);
        if (memoryState.level === "hard" && memoryState.moves <= config.fast) unlockAchievement("memoryFast");
      }
    } else {
      memoryState.lock = true;
      playSfx("error");
      setTimeout(() => {
        open.forEach((item) => { item.flipped = false; });
        memoryState.lock = false;
        drawMemory();
      }, 650);
    }
  }
  drawMemory();
}

function renderPuzzle(size = puzzleState?.size || 4) {
  const tiles = makeSolvablePuzzle(size);
  puzzleState = { tiles, size, moves: 0, startedAt: Date.now() };
  drawPuzzle();
}

function makeSolvablePuzzle(size) {
  const count = size * size;
  const tiles = [...Array(count - 1).keys()].map((n) => n + 1).concat(0);
  for (let i = 0; i < size * size * 24; i += 1) {
    const empty = tiles.indexOf(0);
    const moves = puzzleMoves(empty, size);
    const next = moves[Math.floor(Math.random() * moves.length)];
    [tiles[empty], tiles[next]] = [tiles[next], tiles[empty]];
  }
  return tiles;
}

function puzzleMoves(index, size = puzzleState.size) {
  const row = Math.floor(index / size);
  const col = index % size;
  return [
    row > 0 ? index - size : null,
    row < size - 1 ? index + size : null,
    col > 0 ? index - 1 : null,
    col < size - 1 ? index + 1 : null,
  ].filter((value) => value !== null);
}

function drawPuzzle() {
  const size = puzzleState.size;
  $("#gameStage").innerHTML = stageShell(
    "Пятнашки",
    `${size}x${size} · ходов: ${puzzleState.moves}`,
    `
      <div class="segmented">
        ${[3, 4, 5].map((value) => `<button class="chip ${size === value ? "active" : ""}" data-puzzle-size="${value}">${value}x${value}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartPuzzle">Перемешать</button>
    `
  ) + `<div class="puzzle-board" style="--puzzle-size:${size}">${puzzleState.tiles.map((tile, index) => `
      <button class="tile ${tile === 0 ? "empty" : ""}" data-tile="${index}">${tile || ""}</button>
    `).join("")}</div>`;
  $("#restartPuzzle").addEventListener("click", () => renderPuzzle(size));
  $$("[data-puzzle-size]").forEach((btn) => btn.addEventListener("click", () => renderPuzzle(Number(btn.dataset.puzzleSize))));
  $$("[data-tile]").forEach((btn) => btn.addEventListener("click", () => movePuzzle(Number(btn.dataset.tile))));
}

function movePuzzle(index) {
  const empty = puzzleState.tiles.indexOf(0);
  if (!puzzleMoves(empty).includes(index)) return;
  playSfx("move");
  [puzzleState.tiles[empty], puzzleState.tiles[index]] = [puzzleState.tiles[index], puzzleState.tiles[empty]];
  puzzleState.moves += 1;
  const solved = puzzleState.tiles.slice(0, -1).every((tile, index) => tile === index + 1);
  if (solved) {
    state.bestPuzzleMoves = state.bestPuzzleMoves ? Math.min(state.bestPuzzleMoves, puzzleState.moves) : puzzleState.moves;
    if (puzzleState.size >= 4 && puzzleState.moves <= 80) {
      state.dailies.puzzleUnder80 = true;
      unlockAchievement("puzzleFast");
    }
    const base = { 3: 220, 4: 520, 5: 760 }[puzzleState.size];
    const reward = Math.max(80, base - puzzleState.moves * (puzzleState.size + 1));
    completeWin(reward, `Пятнашки ${puzzleState.size}x${puzzleState.size}`);
  }
  drawPuzzle();
}

const quizQuestions = [
  { question: "Как зовут бабушкиного котика?", options: ["Юки", "Снежок", "Марсик", "Персик"], answer: "Юки", comment: "Правильно! Его зовут Юки" },
  { question: "На какой фильм мы в первый раз пошли в кинотеатр?", options: ["Иллюзия обмана", "Сказка о царе Салтане", "Аватар", "Ла-Ла Ленд"], answer: "Иллюзия обмана", comment: "Верно! «Иллюзия обмана» — наш первый фильм в кино" },
  { question: "Сколько раз я сказал что люблю тебя?", options: ["25", "67", "85", "счет потерян"], answer: "счет потерян", comment: "Счёт потерян, потому что я люблю тебя бесконечно ❤️" },
  { question: "Кто ты для меня?", options: ["самый дорогой человек", "моя любимая", "мое счастье и солнышко", "все перечисленное и даже больше"], answer: "все перечисленное и даже больше", comment: "Ты — всё для меня, и даже больше чем слова могут выразить 💕" },
];

function renderQuizStart() {
  if (state.quizDone) {
    $("#gameStage").innerHTML = stageShell("Викторина уже пройдена", "одноразовая игра") +
      `<p class="muted">Результат сохранён: ${state.quizScore}/${quizQuestions.length}. Повторное получение hearts отключено.</p>`;
    return;
  }
  currentQuizIndex = 0;
  quizCorrect = 0;
  drawQuiz();
}

function drawQuiz() {
  const q = quizQuestions[currentQuizIndex];
  $("#gameStage").innerHTML = stageShell(q.question, `вопрос ${currentQuizIndex + 1} из ${quizQuestions.length}`) +
    `<div class="quiz-options">${q.options.map((option) => `<button class="quiz-option" data-answer="${option}">${option}</button>`).join("")}</div>`;
  $$("[data-answer]").forEach((btn) => btn.addEventListener("click", () => answerQuiz(btn.dataset.answer)));
}

function answerQuiz(answer) {
  const q = quizQuestions[currentQuizIndex];
  if (answer === q.answer) {
    quizCorrect += 1;
    playSfx("match");
  } else {
    playSfx("error");
  }
  $$(".quiz-option").forEach((btn) => {
    btn.disabled = true;
    btn.classList.toggle("correct", btn.dataset.answer === q.answer);
    btn.classList.toggle("wrong", btn.dataset.answer === answer && answer !== q.answer);
  });
  $("#gameStage").insertAdjacentHTML("beforeend", `
    <div class="quiz-comment">
      <strong>${answer === q.answer ? q.comment : `Правильный ответ: ${q.answer}`}</strong>
      <button id="nextQuizBtn" class="primary-btn">Дальше</button>
    </div>
  `);
  $("#nextQuizBtn").addEventListener("click", () => {
    currentQuizIndex += 1;
    if (currentQuizIndex >= quizQuestions.length) finishQuiz();
    else drawQuiz();
  });
}

function finishQuiz() {
  state.quizDone = true;
  state.quizScore = quizCorrect;
  const reward = 500 + quizCorrect * 250;
  completeWin(reward, "Викторина");
  if (quizCorrect === quizQuestions.length) unlockAchievement("quizPerfect");
  $("#gameStage").innerHTML = stageShell("Викторина завершена", `${quizCorrect}/${quizQuestions.length}`) +
    `<p class="muted">Результат сохранён. Эту викторину нельзя пройти повторно ради hearts.</p>`;
}

function randomSimonPad(exclude = null) {
  let value = Math.floor(Math.random() * simonPads.length);
  if (exclude === null) return value;
  let guard = 0;
  while (value === exclude && guard < 12) {
    value = Math.floor(Math.random() * simonPads.length);
    guard += 1;
  }
  return value;
}

function getSimonDifficulty(level = "normal") {
  return simonDifficulties[level] || simonDifficulties.normal;
}

function renderSimon(level = simonState?.difficulty || "normal") {
  const difficulty = getSimonDifficulty(level);
  const sequence = [randomSimonPad()];
  while (sequence.length < difficulty.startLength) {
    sequence.push(randomSimonPad(sequence[sequence.length - 1]));
  }
  simonState = {
    difficulty: level,
    sequence,
    playerIndex: 0,
    round: 1,
    maxRounds: difficulty.maxRounds,
    showing: false,
    locked: true,
    readyToContinue: false,
    over: false,
    pressCount: 0,
    timers: [],
    status: "Нажми «Показать последовательность» и повтори её без ошибок.",
  };
  drawSimon();
}

function drawSimon() {
  const difficulty = getSimonDifficulty(simonState.difficulty);
  const actionLabel = simonState.readyToContinue ? "Продолжить" : "Показать последовательность";
  const actionClass = simonState.readyToContinue ? "soft-btn simon-continue-btn" : "primary-btn";
  $("#gameStage").innerHTML = stageShell(
    "Simon Pulse",
    `раунд ${simonState.round}/${simonState.maxRounds} · ${difficulty.label}`,
    `
      <span class="simon-counter-badge">${simonState.pressCount}/${simonState.sequence.length}</span>
      <div class="segmented">
        ${Object.entries(simonDifficulties).map(([key, value]) => `<button class="chip ${simonState.difficulty === key ? "active" : ""}" data-simon-diff="${key}" ${simonState.showing ? "disabled" : ""}>${value.label}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartSimon">Заново</button>
    `
  ) + `
    <div class="mini-game-panel simon-wrap">
      <p class="muted">Повтори последовательность. Ошибка завершает раунд.</p>
      <div class="simon-grid">
        ${simonPads.map((pad) => `
          <button class="simon-pad" data-simon-pad="${pad.id}" style="--pad-color:${pad.color}" ${simonState.locked ? "disabled" : ""}>
            ${pad.label}
          </button>
        `).join("")}
      </div>
      <div class="control-row">
        <button id="showSimonSeq" class="${actionClass}" ${simonState.showing || simonState.over ? "disabled" : ""}>${actionLabel}</button>
      </div>
      <p id="simonStatus" class="muted">${simonState.status}</p>
    </div>
  `;
  $$("[data-simon-diff]").forEach((btn) => btn.addEventListener("click", () => {
    if (simonState.showing) return;
    renderSimon(btn.dataset.simonDiff);
  }));
  $("#restartSimon").addEventListener("click", () => renderSimon(simonState.difficulty));
  $("#showSimonSeq").addEventListener("click", runSimonAction);
  $$("[data-simon-pad]").forEach((btn) => btn.addEventListener("click", () => pressSimonPad(Number(btn.dataset.simonPad))));
}

function runSimonAction() {
  if (!simonState || simonState.showing || simonState.over) return;
  if (simonState.readyToContinue) {
    simonState.readyToContinue = false;
    simonState.status = "Новый раунд. Смотри внимательно...";
  }
  playSimonSequence();
}

function flashSimonPad(id, pulseMs = 340) {
  const pad = $(`[data-simon-pad="${id}"]`);
  if (!pad) return;
  pad.classList.add("active");
  const timer = setTimeout(() => pad.classList.remove("active"), pulseMs);
  simonState.timers.push(timer);
}

function playSimonSequence() {
  if (!simonState || simonState.showing || simonState.over) return;
  const difficulty = getSimonDifficulty(simonState.difficulty);
  stopRuntimeGames();
  simonState.showing = true;
  simonState.locked = true;
  simonState.readyToContinue = false;
  simonState.playerIndex = 0;
  simonState.pressCount = 0;
  simonState.status = "Смотри внимательно...";
  drawSimon();
  let delay = 260;
  simonState.sequence.forEach((id) => {
    const timer = setTimeout(() => {
      flashSimonPad(id, difficulty.pulseMs);
      playSfx("tick");
    }, delay);
    simonState.timers.push(timer);
    delay += difficulty.stepDelay;
  });
  const finishTimer = setTimeout(() => {
    simonState.showing = false;
    simonState.locked = false;
    simonState.status = "Твоя очередь — повтори всю цепочку.";
    drawSimon();
  }, delay + 120);
  simonState.timers.push(finishTimer);
}

function pressSimonPad(id) {
  if (!simonState || simonState.locked || simonState.over) return;
  const difficulty = getSimonDifficulty(simonState.difficulty);
  flashSimonPad(id, 220);
  const expected = simonState.sequence[simonState.playerIndex];
  simonState.pressCount += 1;
  if (id !== expected) {
    simonState.over = true;
    simonState.locked = true;
    simonState.status = `Ошибка на шаге ${simonState.pressCount}/${simonState.sequence.length}. Попробуй ещё раз!`;
    drawSimon();
    completeLoss();
    return;
  }
  playSfx("match");
  simonState.playerIndex += 1;
  simonState.status = `Верно: ${simonState.playerIndex}/${simonState.sequence.length}`;
  drawSimon();
  if (simonState.playerIndex < simonState.sequence.length) return;
  if (simonState.round >= simonState.maxRounds) {
    simonState.over = true;
    simonState.locked = true;
    simonState.status = "Идеально! Ты прошла все раунды.";
    drawSimon();
    const reward = difficulty.rewardBase + simonState.maxRounds * 90;
    completeWin(reward, `Simon Pulse · ${difficulty.label}`);
    return;
  }
  simonState.round += 1;
  simonState.sequence.push(randomSimonPad(simonState.sequence[simonState.sequence.length - 1]));
  simonState.playerIndex = 0;
  simonState.pressCount = 0;
  simonState.locked = true;
  simonState.readyToContinue = true;
  simonState.status = "Раунд пройден. Нажми «Продолжить».";
  drawSimon();
}

function normalizeVerbForm(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function nextIrregularVerbQuestion() {
  const formsAll = [
    { key: "past", label: "Past Simple" },
    { key: "participle", label: "Past Participle" },
  ];
  const forms = irregularVerbState?.mode === "v2"
    ? [formsAll[0]]
    : irregularVerbState?.mode === "v3"
      ? [formsAll[1]]
      : formsAll;
  let candidates = irregularVerbPool.filter((verb) => {
    return forms.some((form) => !irregularVerbState.asked.includes(`${verb.base}:${form.key}`));
  });
  if (!candidates.length) {
    irregularVerbState.asked = [];
    candidates = [...irregularVerbPool];
  }
  const verb = candidates[randomInt(0, candidates.length - 1)];
  const form = forms[randomInt(0, forms.length - 1)];
  const signature = `${verb.base}:${form.key}`;
  irregularVerbState.asked.push(signature);
  const answers = Array.isArray(verb[form.key]) ? verb[form.key].map(normalizeVerbForm) : [normalizeVerbForm(verb[form.key])];
  irregularVerbState.current = {
    signature,
    base: verb.base,
    formLabel: form.label,
    answers,
  };
}

function renderIrregularVerbs() {
  stopRuntimeGames();
  irregularVerbState = {
    mode: irregularVerbState?.mode || "mix",
    phase: "setup",
    lives: 5,
    maxLives: 5,
    score: 0,
    answered: 0,
    maxRounds: 30,
    asked: [],
    current: null,
    over: false,
    status: "Выбери режим и нажми «Играть». В раунде 30 вопросов и 5 жизней.",
  };
  drawIrregularVerbs();
}

function drawIrregularVerbs() {
  const inSetup = irregularVerbState.phase === "setup";
  $("#gameStage").innerHTML = stageShell(
    "Irregular Verbs",
    inSetup
      ? "выбор режима"
      : `жизни ${irregularVerbState.lives}/${irregularVerbState.maxLives} · ${irregularVerbState.answered}/${irregularVerbState.maxRounds}`,
    `<button class="soft-btn" id="restartIrregular">Заново</button>`
  ) + `
    <div class="mini-game-panel mathrush-wrap">
      ${inSetup ? `
        <div class="segmented">
          <button class="chip ${irregularVerbState.mode === "v2" ? "active" : ""}" data-verb-mode="v2">Только V2</button>
          <button class="chip ${irregularVerbState.mode === "v3" ? "active" : ""}" data-verb-mode="v3">Только V3</button>
          <button class="chip ${irregularVerbState.mode === "mix" ? "active" : ""}" data-verb-mode="mix">Микс</button>
        </div>
        <p class="muted">Выбери режим формы и начни раунд.</p>
        <button id="startIrregular" class="primary-btn">Играть</button>
      ` : `
        <p class="muted">Инфинитив: <strong>${irregularVerbState.current?.base || "-"}</strong></p>
        <p class="muted">Нужная форма: <strong>${irregularVerbState.current?.formLabel || "-"}</strong></p>
        <div class="promo-row">
          <input id="irregularInput" type="text" placeholder="Введи форму глагола" ${irregularVerbState.over ? "disabled" : ""} />
          <button id="submitIrregular" class="primary-btn" ${irregularVerbState.over ? "disabled" : ""}>Ответить</button>
        </div>
      `}
      <p class="muted">${irregularVerbState.status}</p>
      <p class="muted">Правильных: ${irregularVerbState.score}</p>
      ${irregularVerbState.over ? `<p class="muted">Игра завершена. Нажми «Заново» для новой попытки.</p>` : ""}
    </div>
  `;
  $("#restartIrregular").addEventListener("click", renderIrregularVerbs);
  $$("[data-verb-mode]").forEach((btn) => btn.addEventListener("click", () => {
    if (!inSetup) return;
    irregularVerbState.mode = btn.dataset.verbMode;
    drawIrregularVerbs();
  }));
  $("#startIrregular")?.addEventListener("click", startIrregularVerbs);
  if (inSetup) return;
  const input = $("#irregularInput");
  const submit = $("#submitIrregular");
  const submitAnswer = () => {
    if (!input || irregularVerbState.over) return;
    const answer = normalizeVerbForm(input.value);
    if (!answer) {
      irregularVerbState.status = "Введи ответ перед проверкой.";
      drawIrregularVerbs();
      return;
    }
    irregularVerbState.answered += 1;
    if (irregularVerbState.current.answers.includes(answer)) {
      irregularVerbState.score += 1;
      irregularVerbState.status = "Верно! Следующий глагол.";
      playSfx("match");
    } else {
      irregularVerbState.lives -= 1;
      irregularVerbState.status = `Неверно. Правильный ответ: ${irregularVerbState.current.answers.join(" / ")}`;
      playSfx("error");
    }
    input.value = "";
    if (irregularVerbState.lives <= 0 || irregularVerbState.answered >= irregularVerbState.maxRounds) {
      finishIrregularVerbs();
      return;
    }
    nextIrregularVerbQuestion();
    drawIrregularVerbs();
  };
  submit?.addEventListener("click", submitAnswer);
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitAnswer();
  });
}

function startIrregularVerbs() {
  irregularVerbState.phase = "playing";
  irregularVerbState.over = false;
  irregularVerbState.lives = irregularVerbState.maxLives;
  irregularVerbState.score = 0;
  irregularVerbState.answered = 0;
  irregularVerbState.asked = [];
  irregularVerbState.status = "Вводи нужную форму. Время не ограничено, но жизней всего 5.";
  nextIrregularVerbQuestion();
  drawIrregularVerbs();
}

function finishIrregularVerbs() {
  irregularVerbState.phase = "finished";
  irregularVerbState.over = true;
  irregularVerbState.current = null;
  drawIrregularVerbs();
  const reward = Math.min(1800, 180 + irregularVerbState.score * 45 + irregularVerbState.lives * 35);
  if (irregularVerbState.score >= 10) {
    completeWin(reward, "Irregular Verbs");
  } else {
    completeLoss();
  }
}

function getCodebreakerPalette(level) {
  const difficulty = codebreakerDifficulties[level] || codebreakerDifficulties.normal;
  return codebreakerPalette.slice(0, difficulty.paletteSize);
}

function renderCodebreaker(level = codebreakerState?.level || "normal") {
  const difficulty = codebreakerDifficulties[level] || codebreakerDifficulties.normal;
  const palette = getCodebreakerPalette(level);
  codebreakerState = {
    level,
    codeLength: difficulty.codeLength,
    palette,
    secret: shuffle(palette.map((item) => item.id)).slice(0, difficulty.codeLength),
    current: [],
    history: [],
    attempts: 0,
    maxAttempts: difficulty.maxAttempts,
    over: false,
    status: `Собери комбинацию из ${difficulty.codeLength} цветов. Повторы не допускаются.`,
  };
  drawCodebreaker();
}

function drawCodebreaker() {
  const slots = Array.from({ length: codebreakerState.codeLength }, (_, index) => codebreakerState.current[index] || null);
  $("#gameStage").innerHTML = stageShell(
    "Codebreaker",
    `попытка ${codebreakerState.attempts}/${codebreakerState.maxAttempts}`,
    `
      <div class="segmented">
        ${Object.entries(codebreakerDifficulties).map(([key, item]) => `<button class="chip ${codebreakerState.level === key ? "active" : ""}" data-code-level="${key}">${item.label}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartCodebreaker">Заново</button>
    `
  ) + `
    <div class="mini-game-panel codebreaker-wrap">
      <p class="muted">${codebreakerState.status}</p>
      <div class="codebreaker-current">
        ${slots.map((colorId) => {
    const color = codebreakerState.palette.find((item) => item.id === colorId)?.color || "rgba(255,255,255,0.12)";
    return `<span class="code-dot" style="background:${color}"></span>`;
  }).join("")}
      </div>
      <div class="code-palette" style="--code-cols:${Math.min(8, codebreakerState.palette.length)}">
        ${codebreakerState.palette.map((item) => `
          <button class="code-color" data-code-color="${item.id}" style="--dot:${item.color}" ${codebreakerState.current.includes(item.id) || codebreakerState.over ? "disabled" : ""}></button>
        `).join("")}
      </div>
      <div class="control-row">
        <button id="clearCodeGuess" class="soft-btn" ${!codebreakerState.current.length || codebreakerState.over ? "disabled" : ""}>Очистить</button>
        <button id="submitCodeGuess" class="primary-btn" ${codebreakerState.current.length !== codebreakerState.codeLength || codebreakerState.over ? "disabled" : ""}>Проверить</button>
      </div>
      <div class="code-history">
        ${codebreakerState.history.map((entry) => `
          <article class="code-row">
            <div class="code-row-guess">
              ${entry.guess.map((colorId) => `<span class="code-dot small" style="background:${codebreakerState.palette.find((item) => item.id === colorId).color}"></span>`).join("")}
            </div>
            <strong>${entry.exact} точно · ${entry.misplaced} не на месте</strong>
          </article>
        `).join("")}
      </div>
      ${codebreakerState.over ? `<p class="muted">Секрет: ${codebreakerState.secret.map((id) => `<span class="inline-dot" style="--dot:${codebreakerState.palette.find((item) => item.id === id).color}"></span>`).join("")}</p>` : ""}
    </div>
  `;
  $("#restartCodebreaker").addEventListener("click", () => renderCodebreaker(codebreakerState.level));
  $$("[data-code-level]").forEach((btn) => btn.addEventListener("click", () => renderCodebreaker(btn.dataset.codeLevel)));
  $("#clearCodeGuess").addEventListener("click", () => {
    codebreakerState.current = [];
    drawCodebreaker();
  });
  $("#submitCodeGuess").addEventListener("click", submitCodebreakerGuess);
  $$("[data-code-color]").forEach((btn) => btn.addEventListener("click", () => {
    if (codebreakerState.over || codebreakerState.current.length >= codebreakerState.codeLength) return;
    codebreakerState.current.push(btn.dataset.codeColor);
    playSfx("click");
    drawCodebreaker();
  }));
}

function submitCodebreakerGuess() {
  if (codebreakerState.over || codebreakerState.current.length !== codebreakerState.codeLength) return;
  const guess = [...codebreakerState.current];
  const secret = codebreakerState.secret;
  const exact = guess.filter((item, index) => item === secret[index]).length;
  const misplaced = guess.filter((item, index) => item !== secret[index] && secret.includes(item)).length;
  codebreakerState.attempts += 1;
  codebreakerState.history.unshift({ guess, exact, misplaced });
  codebreakerState.current = [];
  if (exact === codebreakerState.codeLength) {
    codebreakerState.over = true;
    codebreakerState.status = "Код взломан. Очень мощная дедукция!";
    drawCodebreaker();
    const difficulty = codebreakerDifficulties[codebreakerState.level] || codebreakerDifficulties.normal;
    const reward = difficulty.rewardBase + Math.max(0, codebreakerState.maxAttempts - codebreakerState.attempts) * difficulty.rewardStep;
    completeWin(reward, "Codebreaker");
    return;
  }
  if (codebreakerState.attempts >= codebreakerState.maxAttempts) {
    codebreakerState.over = true;
    codebreakerState.status = "Попытки закончились. Но логика уже заметно прокачалась.";
    drawCodebreaker();
    completeLoss();
    return;
  }
  codebreakerState.status = "Почти. Анализируй подсказки и пробуй следующий вариант.";
  playSfx("tick");
  drawCodebreaker();
}

function createLightsOutBoard(size) {
  const board = Array.from({ length: size }, () => Array(size).fill(false));
  const randomMoves = size * size * 2 + 3;
  for (let i = 0; i < randomMoves; i += 1) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    toggleLights(board, r, c);
  }
  return board;
}

function toggleLights(board, r, c) {
  const size = board.length;
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size) board[rr][cc] = !board[rr][cc];
  });
}

function renderLightsOut(size = 5) {
  lightsOutState = {
    size,
    board: createLightsOutBoard(size),
    moves: 0,
    over: false,
  };
  drawLightsOut();
}

function drawLightsOut() {
  const { size, board, moves } = lightsOutState;
  $("#gameStage").innerHTML = stageShell(
    "Lights Out",
    `${size}x${size} · ходов: ${moves}`,
    `
      <div class="segmented">
        ${[4, 5, 6].map((value) => `<button class="chip ${value === size ? "active" : ""}" data-lights-size="${value}">${value}x${value}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartLights">Перемешать</button>
    `
  ) + `
    <div class="mini-game-panel lights-wrap">
      <p class="muted">Нажатие переключает клетку и соседние. Погаси все огни.</p>
      <div class="lights-grid" style="--lights-size:${size}">
        ${board.map((row, r) => row.map((on, c) => `
          <button class="light-cell ${on ? "on" : "off"}" data-light="${r},${c}" ${lightsOutState.over ? "disabled" : ""}></button>
        `).join("")).join("")}
      </div>
    </div>
  `;
  $("#restartLights").addEventListener("click", () => renderLightsOut(size));
  $$("[data-lights-size]").forEach((btn) => btn.addEventListener("click", () => renderLightsOut(Number(btn.dataset.lightsSize))));
  $$("[data-light]").forEach((btn) => btn.addEventListener("click", () => {
    const [r, c] = btn.dataset.light.split(",").map(Number);
    moveLightsOut(r, c);
  }));
}

function moveLightsOut(r, c) {
  if (lightsOutState.over) return;
  toggleLights(lightsOutState.board, r, c);
  lightsOutState.moves += 1;
  playSfx("move");
  const solved = lightsOutState.board.every((row) => row.every((cell) => !cell));
  if (solved) {
    lightsOutState.over = true;
    const base = { 4: 540, 5: 820, 6: 1200 }[lightsOutState.size] || 700;
    const reward = Math.max(260, base - lightsOutState.moves * (lightsOutState.size + 2));
    drawLightsOut();
    completeWin(reward, `Lights Out ${lightsOutState.size}x${lightsOutState.size}`);
    return;
  }
  drawLightsOut();
}

function createMathQuestionVariant(progress = 0, type = "add") {
  const tier = Math.min(6, Math.floor(progress / 4));
  if (type === "add") {
    const a = randomInt(12 + tier * 2, 90 + tier * 8);
    const b = randomInt(8 + tier, 85 + tier * 6);
    return {
      ...makeNumericQuestion(`${a} + ${b}`, a + b, 14 + tier * 2, `add:${a}:${b}`),
      type,
    };
  }
  if (type === "sub") {
    const a = randomInt(30 + tier * 5, 220 + tier * 10);
    const b = randomInt(9 + tier, Math.max(14, a - 2));
    return {
      ...makeNumericQuestion(`${a} - ${b}`, a - b, 14 + tier * 2, `sub:${a}:${b}`),
      type,
    };
  }
  if (type === "square") {
    const n = randomInt(2, 99);
    return {
      ...makeNumericQuestion(`${n}²`, n * n, 30 + tier * 3, `square:${n}`),
      type,
    };
  }
  if (type === "equation") {
    const x = randomInt(2, 28);
    const a = randomInt(2, 12 + Math.min(8, tier));
    const b = randomInt(2, 40 + tier * 4);
    if (Math.random() > 0.5) {
      const c = a * x + b;
      return {
        ...makeNumericQuestion(`${a}x + ${b} = ${c}. Найди x`, x, 6 + tier, `eq-plus:${a}:${b}:${c}`),
        type,
      };
    }
    const c = a * x - b;
    return {
      ...makeNumericQuestion(`${a}x - ${b} = ${c}. Найди x`, x, 6 + tier, `eq-minus:${a}:${b}:${c}`),
      type,
    };
  }
  if (type === "root") {
    const n = randomInt(2, 35 + Math.min(20, tier * 2));
    return {
      ...makeNumericQuestion(`√${n * n}`, n, 7 + tier, `root:${n}`),
      type,
    };
  }
  if (type === "percent") {
    const base = randomInt(8, 80) * 5;
    const percent = [10, 20, 25, 30, 40, 50, 60, 75][randomInt(0, 7)];
    const answer = Math.round((base * percent) / 100);
    return {
      ...makeNumericQuestion(`${percent}% от ${base}`, answer, 12 + tier * 2, `percent:${percent}:${base}`),
      type,
    };
  }
  if (type === "fraction") {
    const den = randomInt(3, 12);
    const num = randomInt(1, den - 1);
    const k = randomInt(2, 10);
    if (Math.random() > 0.5) {
      const sourceNum = num * k;
      const sourceDen = den * k;
      const answer = `${num}/${den}`;
      const wrong = new Set();
      while (wrong.size < 3) {
        const nDelta = randomInt(-3, 3);
        const dDelta = randomInt(-2, 2);
        const n = Math.max(1, num + nDelta);
        const d = Math.max(2, den + dDelta);
        const option = `${n}/${d}`;
        if (option !== answer) wrong.add(option);
      }
      const options = shuffle([answer, ...wrong]);
      return {
        text: `Сократи дробь ${sourceNum}/${sourceDen}`,
        options,
        answerIndex: options.indexOf(answer),
        signature: `fraction-reduce:${sourceNum}:${sourceDen}`,
        type,
      };
    }
    const answer = `${num * k}/${den * k}`;
    const wrong = new Set();
    while (wrong.size < 3) {
      const mult = randomInt(2, 11);
      const variant = `${Math.max(1, num * mult + randomInt(-2, 2))}/${Math.max(2, den * mult + randomInt(-2, 2))}`;
      if (variant !== answer) wrong.add(variant);
    }
    const options = shuffle([answer, ...wrong]);
    return {
      text: `Выбери дробь, равную ${num}/${den}`,
      options,
      answerIndex: options.indexOf(answer),
      signature: `fraction-eq:${num}:${den}:${k}`,
      type,
    };
  }
  return {
    ...makeNumericQuestion("6 + 7", 13, 8, "fallback:add"),
    type: "add",
  };
}

function pickMathRushType(selectedTypes = [], recentTypes = []) {
  const pool = selectedTypes.length ? selectedTypes : ["add"];
  const history = recentTypes.slice(-5);
  const last = history[history.length - 1];
  const hasStreak = history.length >= 2 && history[history.length - 1] === history[history.length - 2];
  let candidates = [...pool];
  if (last && candidates.length > 1) {
    candidates = candidates.filter((item) => item !== last);
  }
  if (hasStreak && candidates.length > 1) candidates = candidates.filter((item) => item !== last);
  if (!candidates.length) candidates = [...pool];
  let best = candidates[0];
  let bestScore = -Infinity;
  candidates.forEach((type) => {
    let score = Math.random() * 0.8;
    const freq = history.filter((item) => item === type).length;
    score -= freq * 0.45;
    if (history[history.length - 1] === type) score -= 1.2;
    if (history[history.length - 2] === type) score -= 0.65;
    if (history[history.length - 3] === type) score -= 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  });
  return best;
}

function generateMathQuestion(progress = 0, recentSignatures = [], selectedTypes = [], recentTypes = []) {
  const types = selectedTypes.length ? selectedTypes : ["add"];
  let question = createMathQuestionVariant(progress, types[0]);
  const scratchHistory = [...recentTypes];
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const nextType = pickMathRushType(types, scratchHistory);
    const candidate = createMathQuestionVariant(progress + attempt, nextType);
    if (!recentSignatures.includes(candidate.signature)) {
      question = candidate;
      break;
    }
    scratchHistory.push(nextType);
  }
  return question;
}

function formatMathRushTypes(typeIds = []) {
  const readable = typeIds.map((id) => mathRushTypeMap[id]?.label || id);
  if (!readable.length) return "не выбраны";
  if (readable.length <= 3) return readable.join(", ");
  return `${readable.slice(0, 3).join(", ")} +${readable.length - 3}`;
}

function renderMathRush() {
  stopRuntimeGames();
  const initialTypesRaw = Array.isArray(mathRushState?.selectedTypes) && mathRushState.selectedTypes.length
    ? mathRushState.selectedTypes.filter((id) => mathRushTypeMap[id])
    : [...mathRushDefaultTypes];
  const initialTypes = initialTypesRaw.length ? initialTypesRaw : [...mathRushDefaultTypes];
  const initialPlayMode = mathRushState?.playMode === "lives" ? "lives" : "time";
  mathRushState = {
    active: false,
    over: false,
    playMode: initialPlayMode,
    timeLeft: mathRushSettings.timeLimit,
    livesLeft: 5,
    score: 0,
    answered: 0,
    combo: 0,
    maxCombo: 0,
    current: null,
    selectedTypes: initialTypes,
    recentTypes: [],
    recentSignatures: [],
    timer: null,
    status: `Выбери одну или несколько тем и нажми «Играть». Сейчас: ${formatMathRushTypes(initialTypes)}.`,
  };
  drawMathRush();
}

function drawMathRush() {
  const isTimeMode = mathRushState.playMode !== "lives";
  const inSetup = !mathRushState.active && !mathRushState.over && !mathRushState.current;
  if (inSetup) {
    mathRushState.timeLeft = mathRushSettings.timeLimit;
    mathRushState.livesLeft = 5;
  }
  const selected = new Set(mathRushState.selectedTypes);
  if (inSetup) {
    $("#gameStage").innerHTML = stageShell(
      "Math Rush",
      "выбор режима",
      `
        <button class="soft-btn" id="restartMathRush">Заново</button>
      `
    ) + `
      <div class="mini-game-panel mathrush-wrap">
        <p class="muted">Режим игры:</p>
        <div class="segmented">
          <button class="chip ${mathRushState.playMode === "time" ? "active" : ""}" data-math-run="time">На время (1 мин)</button>
          <button class="chip ${mathRushState.playMode === "lives" ? "active" : ""}" data-math-run="lives">На жизни (5)</button>
        </div>
        <p class="muted">Темы (можно выбрать несколько):</p>
        <div class="segmented">
          ${mathRushQuestionTypes.map((item) => `
            <button class="chip ${selected.has(item.id) ? "active" : ""}" data-math-type="${item.id}">
              ${item.label}
            </button>
          `).join("")}
        </div>
        <p class="muted">${mathRushState.status}</p>
        <button id="startMathRush" class="primary-btn" ${mathRushState.selectedTypes.length ? "" : "disabled"}>Играть (${mathRushState.playMode === "time" ? "1 минута" : "5 жизней"})</button>
      </div>
    `;
  } else {
    $("#gameStage").innerHTML = stageShell(
      "Math Rush",
      mathRushState.active
        ? (isTimeMode ? `осталось ${mathRushState.timeLeft} сек` : `жизни ${mathRushState.livesLeft}/5`)
        : "результат раунда",
      `
        <button class="soft-btn" id="restartMathRush">Заново</button>
      `
    ) + `
      <div class="mini-game-panel mathrush-wrap">
        <div class="mathrush-stats">
          <div><strong>${isTimeMode ? mathRushState.timeLeft : mathRushState.livesLeft}</strong><small>${isTimeMode ? "сек" : "жизни"}</small></div>
          <div><strong>${mathRushState.score}</strong><small>очки</small></div>
          <div><strong>${mathRushState.maxCombo}</strong><small>макс. серия</small></div>
        </div>
        <p class="muted">${mathRushState.status}</p>
        ${mathRushState.current ? `
          <div class="math-question">${mathRushState.current.text}</div>
          <div class="math-options">
            ${mathRushState.current.options.map((option, index) => `
              <button class="quiz-option" data-math-answer="${index}" ${!mathRushState.active ? "disabled" : ""}>${option}</button>
            `).join("")}
          </div>
        ` : ""}
        ${mathRushState.over ? `<p class="muted">Раунд завершён. Нажми «Заново», чтобы попробовать улучшить результат.</p>` : ""}
      </div>
    `;
  }
  $("#restartMathRush").addEventListener("click", renderMathRush);
  $$("[data-math-run]").forEach((btn) => btn.addEventListener("click", () => {
    if (mathRushState.active) return;
    const value = btn.dataset.mathRun;
    mathRushState.playMode = value === "lives" ? "lives" : "time";
    mathRushState.status = `Режим: ${mathRushState.playMode === "time" ? "на время (1 минута)" : "на жизни (5)"} · Темы: ${formatMathRushTypes(mathRushState.selectedTypes)}.`;
    drawMathRush();
  }));
  $$("[data-math-type]").forEach((btn) => btn.addEventListener("click", () => {
    if (mathRushState.active) return;
    const typeId = btn.dataset.mathType;
    const picked = new Set(mathRushState.selectedTypes);
    if (picked.has(typeId)) {
      if (picked.size === 1) {
        mathRushState.status = "Нужно оставить хотя бы одну тему.";
        drawMathRush();
        return;
      }
      picked.delete(typeId);
    } else {
      picked.add(typeId);
    }
    mathRushState.selectedTypes = mathRushQuestionTypes.filter((item) => picked.has(item.id)).map((item) => item.id);
    mathRushState.status = `Выбрано: ${formatMathRushTypes(mathRushState.selectedTypes)}.`;
    drawMathRush();
  }));
  $("#startMathRush")?.addEventListener("click", startMathRush);
  $$("[data-math-answer]").forEach((btn) => btn.addEventListener("click", () => answerMathRush(Number(btn.dataset.mathAnswer))));
}

function startMathRush() {
  if (!mathRushState || mathRushState.active || !mathRushState.selectedTypes.length) return;
  const isTimeMode = mathRushState.playMode !== "lives";
  mathRushState.active = true;
  mathRushState.over = false;
  mathRushState.timeLeft = mathRushSettings.timeLimit;
  mathRushState.livesLeft = 5;
  mathRushState.score = 0;
  mathRushState.answered = 0;
  mathRushState.combo = 0;
  mathRushState.maxCombo = 0;
  mathRushState.status = "Раунд начался. Решай примеры подряд и держи серию.";
  mathRushState.recentSignatures = [];
  mathRushState.recentTypes = [];
  nextMathRushQuestion();
  if (isTimeMode) {
    mathRushState.timer = setInterval(() => {
      mathRushState.timeLeft -= 1;
      if (mathRushState.timeLeft <= 0) {
        finishMathRush();
        return;
      }
      drawMathRush();
    }, 1000);
  } else {
    mathRushState.timer = null;
  }
  drawMathRush();
}

function nextMathRushQuestion() {
  const question = generateMathQuestion(
    mathRushState.answered,
    mathRushState.recentSignatures,
    mathRushState.selectedTypes,
    mathRushState.recentTypes
  );
  mathRushState.current = question;
  mathRushState.recentSignatures.push(question.signature);
  if (mathRushState.recentSignatures.length > 28) mathRushState.recentSignatures.shift();
  if (question.type) {
    mathRushState.recentTypes.push(question.type);
    if (mathRushState.recentTypes.length > 10) mathRushState.recentTypes.shift();
  }
}

function answerMathRush(answerIndex) {
  if (!mathRushState.active || !mathRushState.current) return;
  const isLivesMode = mathRushState.playMode === "lives";
  mathRushState.answered += 1;
  if (answerIndex === mathRushState.current.answerIndex) {
    mathRushState.combo += 1;
    mathRushState.maxCombo = Math.max(mathRushState.maxCombo, mathRushState.combo);
    mathRushState.score += mathRushSettings.scoreStep + Math.floor(mathRushState.combo / 3);
    playSfx("match");
  } else {
    mathRushState.combo = 0;
    if (isLivesMode) {
      mathRushState.livesLeft -= 1;
      if (mathRushState.livesLeft <= 0) {
        finishMathRush();
        return;
      }
    }
    playSfx("error");
  }
  nextMathRushQuestion();
  drawMathRush();
}

function finishMathRush() {
  if (!mathRushState) return;
  if (mathRushState.timer) {
    clearInterval(mathRushState.timer);
    mathRushState.timer = null;
  }
  mathRushState.active = false;
  mathRushState.over = true;
  mathRushState.current = null;
  const modeText = mathRushState.playMode === "lives"
    ? `жизни: ${Math.max(0, mathRushState.livesLeft)}`
    : `время: ${Math.max(0, mathRushState.timeLeft)} сек`;
  mathRushState.status = `Финиш: ${mathRushState.score} очков, серия ${mathRushState.maxCombo}, ${modeText}. Темы: ${formatMathRushTypes(mathRushState.selectedTypes)}.`;
  drawMathRush();
  const reward = Math.max(120, mathRushSettings.rewardBase + mathRushState.score * mathRushSettings.rewardStep + mathRushState.maxCombo * 18);
  if (mathRushState.score < 3) {
    completeLoss();
  } else {
    completeWin(reward, `Math Rush · ${formatMathRushTypes(mathRushState.selectedTypes)}`);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeNumericQuestion(text, answer, spread = Math.max(8, Math.round(Math.abs(answer) * 0.15)), signature = text) {
  const options = new Set([answer]);
  while (options.size < 4) {
    const delta = randomInt(-spread, spread);
    if (!delta) continue;
    options.add(Math.max(0, answer + delta));
  }
  const shuffled = shuffle([...options]);
  return {
    text,
    options: shuffled,
    answerIndex: shuffled.indexOf(answer),
    signature,
  };
}

function isPrimeNumber(value) {
  if (value < 2) return false;
  if (value % 2 === 0) return value === 2;
  for (let i = 3; i * i <= value; i += 2) if (value % i === 0) return false;
  return true;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function toRoman(value) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = value;
  let result = "";
  map.forEach(([amount, symbol]) => {
    while (n >= amount) {
      result += symbol;
      n -= amount;
    }
  });
  return result;
}

function generateArcadeChallengeQuestion(mode, progress = 0, recentSignatures = []) {
  const level = Math.min(10, Math.floor(progress / 3));
  let question = createArcadeQuestionVariant(mode, level);
  for (let attempt = 0; attempt < 22; attempt += 1) {
    if (!recentSignatures.includes(question.signature)) break;
    question = createArcadeQuestionVariant(mode, level + 1);
  }
  return question;
}

function createArcadeQuestionVariant(mode, level = 0) {
  const weighted = {
    addOnly: ["addOnly"],
    subOnly: ["subOnly"],
    mulOnly: ["mulOnly"],
    divOnly: ["divOnly"],
    squareOnly: ["squareOnly"],
    cubeOnly: ["cubeOnly"],
    mixedOps: ["mixedOps", "mixedOps", "resultPick"],
    percentOnly: ["percentOnly"],
    equationOnly: ["equationOnly"],
    sequenceOnly: ["sequenceOnly"],
    primeOnly: ["primeOnly"],
    parityOnly: ["parityOnly"],
    rootOnly: ["rootOnly"],
    fractionOnly: ["fractionOnly"],
    resultPick: ["resultPick"],
    logicOnly: ["logicOnly", "resultPick", "sequenceOnly"],
  };
  const typePool = weighted[mode] || ["mixedOps"];
  const type = typePool[randomInt(0, typePool.length - 1)];

  if (type === "addOnly") {
    const a = randomInt(15 + level, 140 + level * 4);
    const b = randomInt(10, 120 + level * 3);
    return makeNumericQuestion(`${a} + ${b}`, a + b, 22 + level * 2, `add:${a}:${b}`);
  }
  if (type === "subOnly") {
    const a = randomInt(60 + level * 2, 260 + level * 4);
    const b = randomInt(12, Math.min(a - 2, 180 + level * 3));
    return makeNumericQuestion(`${a} - ${b}`, a - b, 20 + level * 2, `sub:${a}:${b}`);
  }
  if (type === "mulOnly") {
    const a = randomInt(3, 16 + Math.floor(level / 2));
    const b = randomInt(2, 15 + Math.floor(level / 2));
    return makeNumericQuestion(`${a} × ${b}`, a * b, 28 + level * 2, `mul:${a}:${b}`);
  }
  if (type === "divOnly") {
    const divisor = randomInt(2, 14 + Math.floor(level / 2));
    const quotient = randomInt(2, 28 + level * 2);
    const dividend = divisor * quotient;
    return makeNumericQuestion(`${dividend} ÷ ${divisor}`, quotient, 18 + level * 2, `div:${dividend}:${divisor}`);
  }
  if (type === "squareOnly") {
    const n = randomInt(2, 99);
    return makeNumericQuestion(`${n}²`, n * n, 180 + level * 18, `sq:${n}`);
  }
  if (type === "cubeOnly") {
    const n = randomInt(2, 20);
    return makeNumericQuestion(`${n}³`, n * n * n, 240 + level * 22, `cube:${n}`);
  }
  if (type === "percentOnly") {
    const percent = [5, 10, 15, 20, 25, 40, 50, 75][randomInt(0, 7)];
    const base = randomInt(8, 90) * 20;
    const answer = Math.round((base * percent) / 100);
    return makeNumericQuestion(`${percent}% от ${base}`, answer, 26 + level * 2, `percent:${percent}:${base}`);
  }
  if (type === "equationOnly") {
    if (Math.random() > 0.5) {
      const x = randomInt(3, 80 + level * 2);
      const a = randomInt(4, 80 + level * 2);
      const b = x + a;
      return makeNumericQuestion(`x + ${a} = ${b}. Чему равен x?`, x, 18 + level * 2, `eq-plus:${x}:${a}`);
    }
    const x = randomInt(2, 24 + level);
    const a = randomInt(2, 12);
    const b = x * a;
    return makeNumericQuestion(`${a}x = ${b}. Чему равен x?`, x, 12 + level * 2, `eq-mul:${x}:${a}`);
  }
  if (type === "sequenceOnly") {
    const start = randomInt(2, 40);
    const step = randomInt(2, 12);
    if (Math.random() > 0.4) {
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const answer = start + step * 4;
      return makeNumericQuestion(`${seq.join(", ")}, ?`, answer, 15 + level * 2, `seq-a:${start}:${step}`);
    }
    const mult = randomInt(2, 4);
    const seq = [start, start * mult, start * mult * mult];
    const answer = start * mult * mult * mult;
    return makeNumericQuestion(`${seq.join(", ")}, ?`, answer, 40 + level * 3, `seq-g:${start}:${mult}`);
  }
  if (type === "primeOnly") {
    const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
    const prime = primes[randomInt(0, primes.length - 1)];
    const composites = [];
    while (composites.length < 3) {
      const candidate = randomInt(10, 65);
      if (!isPrimeNumber(candidate) && !composites.includes(candidate) && candidate !== prime) composites.push(candidate);
    }
    const options = shuffle([prime, ...composites]);
    return {
      text: "Найди простое число",
      options,
      answerIndex: options.indexOf(prime),
      signature: `prime:${options.join("-")}`,
    };
  }
  if (type === "parityOnly") {
    const value = randomInt(8, 999);
    const answer = value % 2 === 0 ? "Чётное" : "Нечётное";
    const options = ["Чётное", "Нечётное"];
    return {
      text: `Число ${value} — чётное или нечётное?`,
      options,
      answerIndex: options.indexOf(answer),
      signature: `parity:${value}`,
    };
  }
  if (type === "rootOnly") {
    const n = randomInt(2, 99);
    const square = n * n;
    return makeNumericQuestion(`√${square}`, n, 16 + level * 2, `root:${square}`);
  }
  if (type === "rootCompare") {
    const a = randomInt(4, 90);
    const b = randomInt(4, 90);
    const left = Math.sqrt(a * a);
    const right = Math.sqrt(b * b);
    const answer = left === right ? "=" : left > right ? ">" : "<";
    const options = [">", "<", "="];
    return { text: `Сравни: √${a * a} ? √${b * b}`, options, answerIndex: options.indexOf(answer), signature: `root-cmp:${a}:${b}` };
  }
  if (type === "fractionOnly") {
    const d = randomInt(3, 12);
    const a = randomInt(1, d - 1);
    const b = randomInt(1, d - 1);
    const answer = a + b;
    return makeNumericQuestion(`${a}/${d} + ${b}/${d} = ?/${d}`, answer, 8 + level, `frac:${a}:${b}:${d}`);
  }
  if (type === "logicOnly") {
    const a = randomInt(3, 20);
    const b = randomInt(2, 16);
    const c = randomInt(3, 20);
    const d = randomInt(2, 16);
    const left = a * b;
    const right = c * d;
    const answer = left === right ? "Равны" : left > right ? "Левое" : "Правое";
    const options = ["Левое", "Правое", "Равны"];
    return {
      text: `Что больше: ${a}×${b} или ${c}×${d}?`,
      options,
      answerIndex: options.indexOf(answer),
      signature: `logic:${a}:${b}:${c}:${d}`,
    };
  }
  if (type === "addGrid") {
    const a = randomInt(2, 40);
    const b = randomInt(2, 40);
    const c = randomInt(2, 40);
    const d = randomInt(2, 40);
    return makeNumericQuestion(`[${a} ${b}] + [${c} ${d}] → сумма всех?`, a + b + c + d, 14 + level * 2, `grid:${a}:${b}:${c}:${d}`);
  }
  if (type === "subChain") {
    const a = randomInt(120, 420);
    const b = randomInt(15, 110);
    const c = randomInt(15, 110);
    return makeNumericQuestion(`${a} - ${b} - ${c}`, a - b - c, 18 + level * 2, `sub-chain:${a}:${b}:${c}`);
  }
  if (type === "doubleMul") {
    const a = randomInt(4, 15);
    const b = randomInt(3, 12);
    const c = randomInt(2, 9);
    return makeNumericQuestion(`${a} × ${b} × ${c}`, a * b * c, 28 + level * 2, `double-mul:${a}:${b}:${c}`);
  }
  if (type === "divRemainder") {
    const divisor = randomInt(3, 17);
    const quotient = randomInt(2, 26);
    const rem = randomInt(1, divisor - 1);
    const dividend = divisor * quotient + rem;
    return makeNumericQuestion(`Остаток от ${dividend} ÷ ${divisor}`, rem, 10 + level, `rem:${dividend}:${divisor}`);
  }
  if (type === "powerMix") {
    const n = randomInt(2, 20);
    const m = randomInt(2, 12);
    return makeNumericQuestion(`${n}² + ${m}³`, n * n + m * m * m, 60 + level * 5, `pow-mix:${n}:${m}`);
  }
  if (type === "squareChain") {
    const n = randomInt(2, 40);
    return makeNumericQuestion(`${n}² + ${n + 1}²`, n * n + (n + 1) * (n + 1), 50 + level * 4, `sq-chain:${n}`);
  }
  if (type === "cubeCompare") {
    const a = randomInt(2, 14);
    const b = randomInt(2, 14);
    const left = a * a * a;
    const right = b * b * b;
    const answer = left === right ? "Равны" : left > right ? "Левый куб" : "Правый куб";
    const options = ["Левый куб", "Правый куб", "Равны"];
    return { text: `Что больше: ${a}³ или ${b}³?`, options, answerIndex: options.indexOf(answer), signature: `cube-cmp:${a}:${b}` };
  }
  if (type === "modOnly") {
    const a = randomInt(60, 500);
    const b = randomInt(3, 19);
    return makeNumericQuestion(`${a} mod ${b}`, a % b, 8 + level, `mod:${a}:${b}`);
  }
  if (type === "gcdOnly") {
    const a = randomInt(30, 220);
    const b = randomInt(30, 220);
    return makeNumericQuestion(`НОД(${a}, ${b})`, gcd(a, b), 14 + level * 2, `gcd:${a}:${b}`);
  }
  if (type === "lcmOnly") {
    const a = randomInt(8, 28);
    const b = randomInt(8, 28);
    return makeNumericQuestion(`НОК(${a}, ${b})`, lcm(a, b), 30 + level * 3, `lcm:${a}:${b}`);
  }
  if (type === "ratioOnly") {
    const a = randomInt(2, 14);
    const b = randomInt(2, 14);
    const x = randomInt(2, 20);
    const answer = Math.round((b * x) / a);
    return makeNumericQuestion(`${a}:${b} = ${x}:?`, answer, 12 + level * 2, `ratio:${a}:${b}:${x}`);
  }
  if (type === "percentChange") {
    const base = randomInt(80, 480);
    const p = randomInt(5, 40);
    if (Math.random() > 0.5) {
      return makeNumericQuestion(`${base} увеличить на ${p}%`, Math.round(base * (1 + p / 100)), 24 + level * 2, `pct-plus:${base}:${p}`);
    }
    return makeNumericQuestion(`${base} уменьшить на ${p}%`, Math.round(base * (1 - p / 100)), 24 + level * 2, `pct-minus:${base}:${p}`);
  }
  if (type === "discountOnly") {
    const price = randomInt(500, 9000);
    const discount = [5, 10, 15, 20, 25, 30][randomInt(0, 5)];
    return makeNumericQuestion(`Цена ${price}, скидка ${discount}%. Итог?`, Math.round(price * (1 - discount / 100)), 60 + level * 4, `discount:${price}:${discount}`);
  }
  if (type === "taxOnly") {
    const price = randomInt(400, 7000);
    const tax = [5, 12, 18, 20][randomInt(0, 3)];
    return makeNumericQuestion(`Цена ${price}, налог ${tax}%. Итог?`, Math.round(price * (1 + tax / 100)), 60 + level * 4, `tax:${price}:${tax}`);
  }
  if (type === "timeSpeed") {
    const speed = randomInt(20, 120);
    const hours = randomInt(1, 7);
    return makeNumericQuestion(`Скорость ${speed} км/ч и ${hours} ч. Путь?`, speed * hours, 22 + level * 2, `speed:${speed}:${hours}`);
  }
  if (type === "moneyOnly") {
    const bill = randomInt(500, 5000);
    const paid = bill + randomInt(50, 1500);
    return makeNumericQuestion(`Счёт ${bill}, оплатили ${paid}. Сдача?`, paid - bill, 24 + level * 2, `money:${bill}:${paid}`);
  }
  if (type === "temperatureOnly") {
    const c = randomInt(-20, 40);
    const f = Math.round(c * 9 / 5 + 32);
    return makeNumericQuestion(`${c}°C это сколько °F (округл.)?`, f, 14 + level * 2, `temp:${c}`);
  }
  if (type === "areaOnly") {
    const a = randomInt(2, 28);
    const b = randomInt(2, 28);
    return makeNumericQuestion(`Площадь прямоугольника ${a}×${b}`, a * b, 20 + level * 2, `area:${a}:${b}`);
  }
  if (type === "perimeterOnly") {
    const a = randomInt(3, 30);
    const b = randomInt(3, 30);
    return makeNumericQuestion(`Периметр прямоугольника ${a}×${b}`, 2 * (a + b), 20 + level * 2, `perim:${a}:${b}`);
  }
  if (type === "volumeOnly") {
    const a = randomInt(2, 12);
    const b = randomInt(2, 12);
    const c = randomInt(2, 12);
    return makeNumericQuestion(`Объём блока ${a}×${b}×${c}`, a * b * c, 28 + level * 3, `vol:${a}:${b}:${c}`);
  }
  if (type === "primeSeq") {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
    const idx = randomInt(0, primes.length - 5);
    const seq = primes.slice(idx, idx + 4);
    const answer = primes[idx + 4];
    return makeNumericQuestion(`${seq.join(", ")}, ?`, answer, 10 + level * 2, `pseq:${seq.join("-")}`);
  }
  if (type === "fiboOnly") {
    const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const idx = randomInt(0, fib.length - 5);
    const seq = fib.slice(idx, idx + 4);
    const answer = fib[idx + 4];
    return makeNumericQuestion(`${seq.join(", ")}, ?`, answer, 10 + level * 2, `fibo:${seq.join("-")}`);
  }
  if (type === "geoSeq") {
    const start = randomInt(2, 12);
    const mult = randomInt(2, 5);
    const seq = [start, start * mult, start * mult * mult, start * mult * mult * mult];
    const answer = seq[3] * mult;
    return makeNumericQuestion(`${seq.join(", ")}, ?`, answer, 30 + level * 3, `gseq:${start}:${mult}`);
  }
  if (type === "compareOnly") {
    const a = randomInt(20, 200);
    const b = randomInt(20, 200);
    const answer = a === b ? "=" : a > b ? ">" : "<";
    const options = [">", "<", "="];
    return { text: `Выбери знак: ${a} ? ${b}`, options, answerIndex: options.indexOf(answer), signature: `cmp:${a}:${b}` };
  }
  if (type === "signOnly") {
    const a = randomInt(5, 40);
    const b = randomInt(2, 18);
    const c = randomInt(5, 40);
    const d = randomInt(2, 18);
    const left = a - b;
    const right = c - d;
    const answer = left === right ? "=" : left > right ? ">" : "<";
    const options = [">", "<", "="];
    return { text: `(${a}-${b}) ? (${c}-${d})`, options, answerIndex: options.indexOf(answer), signature: `sign:${a}:${b}:${c}:${d}` };
  }
  if (type === "averageOnly") {
    const a = randomInt(6, 80);
    const b = randomInt(6, 80);
    const c = randomInt(6, 80);
    const answer = Math.round((a + b + c) / 3);
    return makeNumericQuestion(`Среднее из ${a}, ${b}, ${c} (округл.)`, answer, 10 + level * 2, `avg:${a}:${b}:${c}`);
  }
  if (type === "medianOnly") {
    const values = [randomInt(2, 90), randomInt(2, 90), randomInt(2, 90)].sort((x, y) => x - y);
    return makeNumericQuestion(`Медиана: ${values.join(", ")}`, values[1], 9 + level * 2, `median:${values.join("-")}`);
  }
  if (type === "oddOneOut") {
    const base = randomInt(6, 30);
    const oddValue = base * 2 + 1;
    const options = [base * 2, base * 4, base * 6, oddValue];
    const mixed = shuffle(options);
    const answer = oddValue;
    return {
      text: "Какое число НЕ чётное?",
      options: mixed,
      answerIndex: mixed.indexOf(answer),
      signature: `oddout:${mixed.join("-")}`,
    };
  }
  if (type === "factorOnly") {
    const answer = randomInt(2, 12);
    const value = answer * randomInt(4, 15);
    const notFactors = [];
    while (notFactors.length < 3) {
      const candidate = randomInt(2, 14);
      if (candidate !== answer && value % candidate !== 0 && !notFactors.includes(candidate)) notFactors.push(candidate);
    }
    const options = shuffle([answer, ...notFactors]);
    return {
      text: `Что является делителем числа ${value}?`,
      options,
      answerIndex: options.indexOf(answer),
      signature: `factor:${value}:${options.join("-")}`,
    };
  }
  if (type === "multipleOnly") {
    const base = randomInt(3, 17);
    const mult = randomInt(2, 12);
    const answer = base * mult;
    return makeNumericQuestion(`Выбери кратное ${base}`, answer, 18 + level * 2, `multiple:${base}:${answer}`);
  }
  if (type === "fractionReduce") {
    const n = randomInt(2, 12);
    const d = randomInt(2, 12);
    const k = randomInt(2, 9);
    const num = n * k;
    const den = d * k;
    return makeNumericQuestion(`Сократи ${num}/${den}. Какой числитель?`, n, 8 + level, `fred:${num}:${den}`);
  }
  if (type === "romanOnly") {
    const value = randomInt(4, 199);
    return makeNumericQuestion(`Сколько это: ${toRoman(value)}?`, value, 16 + level * 2, `roman:${value}`);
  }
  if (type === "binaryOnly") {
    const value = randomInt(5, 127);
    return makeNumericQuestion(`Двоичное ${value.toString(2)} = ?`, value, 12 + level * 2, `bin:${value}`);
  }
  if (type === "clockOnly") {
    const hour = randomInt(1, 11);
    const add = [15, 30, 45, 60, 90, 120][randomInt(0, 5)];
    const total = hour * 60 + add;
    const answer = Math.floor((total / 60 - 1) % 12) + 1;
    return makeNumericQuestion(`${hour}:00 + ${add} минут. Часовая стрелка около?`, answer, 4, `clock:${hour}:${add}`);
  }
  if (type === "calendarOnly") {
    const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const start = randomInt(0, 6);
    const add = randomInt(3, 30);
    const answer = days[(start + add) % 7];
    const options = shuffle(days).slice(0, 4);
    if (!options.includes(answer)) options[randomInt(0, 3)] = answer;
    const shuffled = shuffle(options);
    return { text: `Сегодня ${days[start]}. Какой день через ${add} дней?`, options: shuffled, answerIndex: shuffled.indexOf(answer), signature: `cal:${start}:${add}` };
  }
  if (type === "probabilityOnly") {
    const questions = [
      { text: "Вероятность выбросить 6 на кубике", answer: "1/6", options: ["1/6", "1/3", "1/2", "2/6"] },
      { text: "Вероятность орла при броске монеты", answer: "1/2", options: ["1/2", "1/3", "1/4", "2/3"] },
      { text: "Вероятность вытащить красную карту из обычной колоды", answer: "1/2", options: ["1/2", "1/4", "1/13", "2/3"] },
    ];
    const item = questions[randomInt(0, questions.length - 1)];
    const options = shuffle([...item.options]);
    return { text: item.text, options, answerIndex: options.indexOf(item.answer), signature: `prob:${item.text}` };
  }
  if (type === "coordinateOnly") {
    const x1 = randomInt(-5, 5);
    const y1 = randomInt(-5, 5);
    const x2 = randomInt(-5, 5);
    const y2 = randomInt(-5, 5);
    const dist = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    return makeNumericQuestion(`Манхэттен-дистанция (${x1},${y1}) → (${x2},${y2})`, dist, 8 + level, `coord:${x1}:${y1}:${x2}:${y2}`);
  }
  if (type === "cipherOnly") {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const index = randomInt(0, 25);
    const shift = randomInt(1, 5);
    const answer = alphabet[(index + shift) % alphabet.length];
    const options = shuffle([answer, alphabet[(index + shift + 1) % 26], alphabet[(index + shift + 2) % 26], alphabet[(index + shift + 3) % 26]]);
    return { text: `Шифр Цезаря: ${alphabet[index]} + ${shift}`, options, answerIndex: options.indexOf(answer), signature: `cipher:${index}:${shift}` };
  }
  if (type === "unitConvert") {
    if (Math.random() > 0.5) {
      const meters = randomInt(2, 90);
      return makeNumericQuestion(`${meters} м = ? см`, meters * 100, 80 + level * 5, `unit-m:${meters}`);
    }
    const kg = randomInt(2, 30);
    return makeNumericQuestion(`${kg} кг = ? г`, kg * 1000, 500 + level * 20, `unit-kg:${kg}`);
  }

  const a = randomInt(3, 22);
  const b = randomInt(2, 18);
  const c = randomInt(2, 16);
  const answer = a * b + c;
  return makeNumericQuestion(`${a} × ${b} + ${c}`, answer, 24 + level * 2, `mix:${a}:${b}:${c}`);
}

function generateNonMathQuestion(mode, progress = 0, recentSignatures = []) {
  const level = Math.min(10, Math.floor(progress / 3));
  let question = createNonMathQuestionVariant(mode, level);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!recentSignatures.includes(question.signature)) break;
    question = createNonMathQuestionVariant(mode, level + 1);
  }
  return question;
}

function createNonMathQuestionVariant(mode, level = 0) {
  if (mode === "flagMood") return generateFlagMoodQuestion();

  if (mode === "pathFinder") {
    const moves = ["⬆️", "⬇️", "⬅️", "➡️"];
    const route = Array.from({ length: 4 + randomInt(0, 2) }, () => moves[randomInt(0, 3)]);
    let x = 0;
    let y = 0;
    route.forEach((step) => {
      if (step === "⬆️") y -= 1;
      if (step === "⬇️") y += 1;
      if (step === "⬅️") x -= 1;
      if (step === "➡️") x += 1;
    });
    const answer = `${x > 0 ? "право" : x < 0 ? "лево" : "центр"} / ${y > 0 ? "вниз" : y < 0 ? "вверх" : "центр"}`;
    const options = shuffle([
      answer,
      "центр / центр",
      `${x >= 0 ? "лево" : "право"} / ${y > 0 ? "вверх" : "вниз"}`,
      `${x > 0 ? "право" : "лево"} / центр`,
    ]);
    return { text: `Маршрут: ${route.join(" ")}. Где финиш относительно старта?`, options, answerIndex: options.indexOf(answer), signature: `path:${route.join("")}` };
  }
  if (mode === "directionTap") {
    const dirs = ["⬆️", "⬇️", "⬅️", "➡️"];
    const opposite = { "⬆️": "⬇️", "⬇️": "⬆️", "⬅️": "➡️", "➡️": "⬅️" };
    const dir = dirs[randomInt(0, dirs.length - 1)];
    const options = shuffle(dirs);
    return { text: `Выбери противоположное направление для ${dir}`, options, answerIndex: options.indexOf(opposite[dir]), signature: `dir:${dir}` };
  }

  const fallback = ["Да", "Нет", "Иногда", "Никогда"];
  return { text: "Выбери самый подходящий вариант", options: fallback, answerIndex: 0, signature: `fallback:${level}` };
}

function renderNonMathArcade(gameId) {
  const game = nonMathGameMap[gameId];
  if (!game) return;
  stopRuntimeGames();
  nonMathGameState = {
    gameId,
    region: nonMathGameState?.region || "europe",
    flagMode: nonMathGameState?.flagMode || "flag",
    playMode: nonMathGameState?.playMode || "time",
    flagMoodSolved: [],
    flagMoodRecent: [],
    active: false,
    over: false,
    timeLeft: 60,
    livesLeft: 5,
    score: 0,
    answered: 0,
    combo: 0,
    maxCombo: 0,
    current: null,
    recentSignatures: [],
    timer: null,
    status: "Выбери режим и нажми «Играть».",
  };
  drawNonMathArcade();
}

function drawNonMathArcade() {
  const game = nonMathGameMap[nonMathGameState.gameId];
  if (!game) return;
  const inSetup = !nonMathGameState.active && !nonMathGameState.over && !nonMathGameState.current;
  if (inSetup) {
    drawNonMathSetup(game);
    return;
  }
  const isTimeMode = nonMathGameState.playMode !== "lives";
  $("#gameStage").innerHTML = stageShell(
    game.title,
    nonMathGameState.active
      ? (isTimeMode ? `осталось ${nonMathGameState.timeLeft} сек` : `жизни ${nonMathGameState.livesLeft}/5`)
      : game.subtitle,
    `<button class="soft-btn" id="restartNonMathGame">Заново</button>`
  ) + `
    <div class="mini-game-panel mathrush-wrap">
      <div class="mathrush-stats">
        <div><strong>${isTimeMode ? nonMathGameState.timeLeft : nonMathGameState.livesLeft}</strong><small>${isTimeMode ? "сек" : "жизни"}</small></div>
        <div><strong>${nonMathGameState.score}</strong><small>очки</small></div>
        <div><strong>${nonMathGameState.maxCombo}</strong><small>серия</small></div>
      </div>
      <p class="muted">${nonMathGameState.status}</p>
      ${nonMathGameState.current ? `
        <div class="math-question">${nonMathGameState.current.text}</div>
        <div class="math-options">
          ${nonMathGameState.current.options.map((option, index) => `<button class="quiz-option" data-nonmath-answer="${index}" ${!nonMathGameState.active ? "disabled" : ""}>${option}</button>`).join("")}
        </div>
      ` : ""}
      ${nonMathGameState.over ? `<p class="muted">Раунд завершён. Нажми «Заново», чтобы улучшить результат.</p>` : ""}
    </div>
  `;
  $("#restartNonMathGame").addEventListener("click", () => renderNonMathArcade(nonMathGameState.gameId));
  $$("[data-nonmath-answer]").forEach((btn) => btn.addEventListener("click", () => answerNonMathArcade(Number(btn.dataset.nonmathAnswer))));
}

function drawNonMathSetup(game) {
  const safeRegionKey = flagMoodRegions[nonMathGameState.region] ? nonMathGameState.region : Object.keys(flagMoodRegions)[0];
  if (nonMathGameState.region !== safeRegionKey) nonMathGameState.region = safeRegionKey;
  const selectedRegion = flagMoodRegions[safeRegionKey] || Object.values(flagMoodRegions)[0];
  const countriesCount = selectedRegion?.countries?.length || 0;
  const isFlagMood = game.mode === "flagMood";
  $("#gameStage").innerHTML = stageShell(
    game.title,
    "выбор режима",
    ""
  ) + `
    <div class="mini-game-panel mathrush-wrap">
      ${isFlagMood ? `
        <label class="range-label">Регион
          <select id="flagRegionSelect">
            ${Object.entries(flagMoodRegions).map(([key, region]) => `<option value="${key}" ${nonMathGameState.region === key ? "selected" : ""}>${region.label}</option>`).join("")}
          </select>
        </label>
        <label class="range-label">Тип вопросов
          <select id="flagModeSelect">
            <option value="flag" ${nonMathGameState.flagMode === "flag" ? "selected" : ""}>Флаг → страна</option>
            <option value="capital" ${nonMathGameState.flagMode === "capital" ? "selected" : ""}>Страна + флаг → столица</option>
          </select>
        </label>
      ` : ""}
      <label class="range-label">Режим игры
        <select id="nonMathPlayModeSelect">
          <option value="time" ${nonMathGameState.playMode === "time" ? "selected" : ""}>На время (1 минута)</option>
          <option value="lives" ${nonMathGameState.playMode === "lives" ? "selected" : ""}>На жизни (5)</option>
        </select>
      </label>
      <p class="muted">${isFlagMood
        ? `Доступно стран: ${countriesCount}. В режиме столиц будет написана страна и показан флаг, а снизу нужно выбрать столицу.`
        : "Выбери режим и нажми «Играть». В режиме на жизни ошибка уменьшает запас."}
      </p>
      <button id="startNonMathGame" class="primary-btn">Играть</button>
    </div>
  `;
  $("#nonMathPlayModeSelect").addEventListener("change", (event) => {
    nonMathGameState.playMode = event.target.value === "lives" ? "lives" : "time";
  });
  $("#flagRegionSelect")?.addEventListener("change", (event) => {
    nonMathGameState.region = event.target.value;
    drawNonMathSetup(game);
  });
  $("#flagModeSelect")?.addEventListener("change", (event) => {
    nonMathGameState.flagMode = event.target.value;
  });
  $("#startNonMathGame").addEventListener("click", startNonMathArcade);
}

function startNonMathArcade() {
  if (!nonMathGameState || nonMathGameState.active) return;
  const game = nonMathGameMap[nonMathGameState.gameId];
  const isTimeMode = nonMathGameState.playMode !== "lives";
  nonMathGameState.active = true;
  nonMathGameState.over = false;
  nonMathGameState.timeLeft = isTimeMode ? 60 : game.timeLimit;
  nonMathGameState.livesLeft = 5;
  nonMathGameState.score = 0;
  nonMathGameState.combo = 0;
  nonMathGameState.maxCombo = 0;
  nonMathGameState.answered = 0;
  nonMathGameState.status = "Раунд начался. Отвечай точно и набирай серию.";
  nonMathGameState.recentSignatures = [];
  nonMathGameState.flagMoodSolved = [];
  nonMathGameState.flagMoodRecent = [];
  nextNonMathArcadeQuestion();
  if (isTimeMode) {
    nonMathGameState.timer = setInterval(() => {
      nonMathGameState.timeLeft -= 1;
      if (nonMathGameState.timeLeft <= 0) {
        finishNonMathArcade();
        return;
      }
      drawNonMathArcade();
    }, 1000);
  } else {
    nonMathGameState.timer = null;
  }
  drawNonMathArcade();
}

function nextNonMathArcadeQuestion() {
  const game = nonMathGameMap[nonMathGameState.gameId];
  const question = generateNonMathQuestion(game.mode, nonMathGameState.answered, nonMathGameState.recentSignatures);
  nonMathGameState.current = question;
  nonMathGameState.recentSignatures.push(question.signature);
  if (nonMathGameState.recentSignatures.length > 26) nonMathGameState.recentSignatures.shift();
}

function generateFlagMoodQuestion() {
  const region = flagMoodRegions[nonMathGameState?.region] || flagMoodRegions.europe || Object.values(flagMoodRegions)[0];
  const allCountries = (region.countries || []).map((item) => ({ ...item, capital: item.capital || item.country }));
  const countries = allCountries;
  const solved = nonMathGameState?.flagMoodSolved || [];
  const recent = nonMathGameState?.flagMoodRecent || [];
  let candidates = countries.filter((country) => !solved.includes(country.country) && !recent.includes(country.country));
  if (!candidates.length) candidates = countries.filter((country) => !solved.includes(country.country));
  if (!candidates.length) {
    if (nonMathGameState) nonMathGameState.flagMoodSolved = [];
    candidates = countries.filter((country) => !recent.includes(country.country));
    if (!candidates.length) {
      if (nonMathGameState) nonMathGameState.flagMoodRecent = [];
      candidates = [...countries];
    }
  }
  const item = candidates[randomInt(0, candidates.length - 1)];
  if (nonMathGameState) {
    nonMathGameState.flagMoodRecent.push(item.country);
    if (nonMathGameState.flagMoodRecent.length > 10) nonMathGameState.flagMoodRecent.shift();
  }
  if (nonMathGameState?.flagMode === "capital") {
    const options = shuffle([item.capital, ...shuffle(countries.filter((country) => country.capital !== item.capital)).slice(0, 3).map((country) => country.capital)]);
    return {
      text: `${item.flag} ${item.country}. Выбери столицу:`,
      options,
      answerIndex: options.indexOf(item.capital),
      signature: `flag-capital:${region.label}:${item.country}`,
      countryKey: item.country,
    };
  }
  const options = shuffle([item.country, ...shuffle(countries.filter((country) => country.country !== item.country)).slice(0, 3).map((country) => country.country)]);
  return {
    text: `Какой стране принадлежит флаг ${item.flag}?`,
    options,
    answerIndex: options.indexOf(item.country),
    signature: `flag-country:${region.label}:${item.country}`,
    countryKey: item.country,
  };
}

function answerNonMathArcade(answerIndex) {
  if (!nonMathGameState?.active || !nonMathGameState.current) return;
  const game = nonMathGameMap[nonMathGameState.gameId];
  const isLivesMode = nonMathGameState.playMode === "lives";
  nonMathGameState.answered += 1;
  if (answerIndex === nonMathGameState.current.answerIndex) {
    nonMathGameState.combo += 1;
    nonMathGameState.maxCombo = Math.max(nonMathGameState.maxCombo, nonMathGameState.combo);
    nonMathGameState.score += 1 + Math.floor(nonMathGameState.combo / 4);
    if (game?.mode === "flagMood" && nonMathGameState.current.countryKey) {
      if (!nonMathGameState.flagMoodSolved.includes(nonMathGameState.current.countryKey)) {
        nonMathGameState.flagMoodSolved.push(nonMathGameState.current.countryKey);
      }
    }
    playSfx("match");
  } else {
    nonMathGameState.combo = 0;
    if (isLivesMode) {
      nonMathGameState.livesLeft -= 1;
      if (nonMathGameState.livesLeft <= 0) {
        finishNonMathArcade();
        return;
      }
    }
    playSfx("error");
  }
  nextNonMathArcadeQuestion();
  drawNonMathArcade();
}

function finishNonMathArcade() {
  if (!nonMathGameState) return;
  if (nonMathGameState.timer) {
    clearInterval(nonMathGameState.timer);
    nonMathGameState.timer = null;
  }
  nonMathGameState.active = false;
  nonMathGameState.over = true;
  nonMathGameState.current = null;
  const modeText = nonMathGameState.playMode === "lives"
    ? `жизни: ${Math.max(0, nonMathGameState.livesLeft)}`
    : `время: ${Math.max(0, nonMathGameState.timeLeft)} сек`;
  nonMathGameState.status = `Финиш: ${nonMathGameState.score} очков · серия ${nonMathGameState.maxCombo} · ${modeText}.`;
  drawNonMathArcade();
  const game = nonMathGameMap[nonMathGameState.gameId];
  if (nonMathGameState.score < 3) {
    completeLoss();
    return;
  }
  const rewardRaw = game.rewardBase * 0.45 + nonMathGameState.score * Math.max(8, game.rewardStep * 0.28) + nonMathGameState.maxCombo * 5;
  const reward = Math.min(2400, Math.max(80, Math.round(rewardRaw)));
  completeWin(reward, game.title);
}

const pieceChars = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const pieceValue = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const chessAIOpeningMemory = new Map();

const chessLevelConfig = {
  1: { depth: 0, width: 5, noise: 20, quiescence: 0 },
  2: { depth: 1, width: 7, noise: 12, quiescence: 0 },
  3: { depth: 1, width: 10, noise: 8, quiescence: 0 },
  4: { depth: 2, width: 14, noise: 4, quiescence: 1 },
  5: { depth: 2, width: 18, noise: 2, quiescence: 1 },
  6: { depth: 3, width: 22, noise: 0.9, quiescence: 1 },
  7: { depth: 3, width: 26, noise: 0.4, quiescence: 2 },
  8: { depth: 4, width: 28, noise: 0.18, quiescence: 2 },
  9: { depth: 4, width: 30, noise: 0.08, quiescence: 3 },
  10: { depth: 4, width: 34, noise: 0.02, quiescence: 3 },
};

function getAiThinkDelayMs() {
  const level = chessState?.level || 1;
  const byLevel = {
    1: [1000, 1400],
    2: [1200, 1700],
    3: [1450, 2050],
    4: [1700, 2400],
    5: [2000, 2800],
    6: [2350, 3300],
    7: [2750, 3800],
    8: [3200, 4300],
    9: [3600, 4700],
    10: [4000, 5000],
  };
  const [minDelay, maxDelay] = byLevel[level] || [1800, 2600];
  return randomInt(minDelay, maxDelay);
}

function chessPositionKey(game) {
  if (!game?.board) return "";
  const boardKey = game.board
    .map((row) => row.map((cell) => cell || "__").join(""))
    .join("/");
  const castlingRaw = `${game.castling?.wK ? "K" : ""}${game.castling?.wQ ? "Q" : ""}${game.castling?.bK ? "k" : ""}${game.castling?.bQ ? "q" : ""}`;
  const castlingKey = castlingRaw || "-";
  const enPassantKey = game.enPassant ? `${game.enPassant.r}${game.enPassant.c}` : "-";
  return `${boardKey}|${game.turn}|${castlingKey}|${enPassantKey}`;
}

function chessMoveKey(move) {
  const promotion = move.promotion ? `=${move.promotion === true ? "Q" : move.promotion}` : "";
  const castle = move.castle ? `c${move.castle}` : "";
  const ep = move.enPassantCapture ? "ep" : "";
  return `${move.fr}${move.fc}-${move.tr}${move.tc}${promotion}${castle}${ep}`;
}

function rememberChessPosition(game) {
  if (!game) return;
  const key = chessPositionKey(game);
  if (!key) return;
  if (!game.positionHistory) game.positionHistory = Object.create(null);
  game.positionHistory[key] = (game.positionHistory[key] || 0) + 1;
}

function openingContextKey(game) {
  if (!game?.board || game.fullmove > 12) return "";
  return chessPositionKey(game);
}

function openingRepeatPenalty(game, move) {
  const context = openingContextKey(game);
  if (!context) return 0;
  const memory = chessAIOpeningMemory.get(context);
  if (!memory) return 0;
  const repeats = memory[chessMoveKey(move)] || 0;
  return Math.min(160, repeats * 20);
}

function localRepetitionPenalty(game, move) {
  if (!game?.positionHistory) return 0;
  const next = makeSearchGameAfterMove(game, move, opposite(game.turn));
  const nextKey = chessPositionKey(next);
  const repeats = game.positionHistory[nextKey] || 0;
  return repeats * 180;
}

function rememberAIOpeningChoice(game, move) {
  const context = openingContextKey(game);
  if (!context) return;
  const moveKey = chessMoveKey(move);
  const memory = chessAIOpeningMemory.get(context) || Object.create(null);
  memory[moveKey] = (memory[moveKey] || 0) + 1;
  chessAIOpeningMemory.set(context, memory);
  if (chessAIOpeningMemory.size > 900) {
    const oldest = chessAIOpeningMemory.keys().next().value;
    chessAIOpeningMemory.delete(oldest);
  }
}

function initialBoard() {
  return [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
  ];
}

function renderChess(options = {}) {
  const previous = chessState || {};
  chessState = {
    phase: "setup",
    board: null,
    selected: null,
    turn: "w",
    mode: options.mode || previous.mode || "ai",
    level: options.level || previous.level || 1,
    style: options.style || previous.style || "balanced",
    playerColor: options.playerColor || previous.playerColor || "w",
    status: "Выбери режим и нажми «Играть»",
  };
  drawChessSetup();
}

function startChessGame() {
  chessState = {
    ...chessState,
    phase: "playing",
    board: initialBoard(),
    selected: null,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    pendingPromotion: null,
    halfmove: 0,
    fullmove: 1,
    status: "Ход белых",
    over: false,
    lastMove: null,
    animateLastMove: false,
    positionHistory: Object.create(null),
  };
  rememberChessPosition(chessState);
  drawChess();
  if (chessState.mode === "ai" && chessState.playerColor === "b") setTimeout(aiMove, getAiThinkDelayMs());
}

function drawChessSetup() {
  $("#gameStage").innerHTML = stageShell("Шахматы", "настройка партии") + `
    <div class="chess-setup">
      <div class="chess-setup-art">
        <span>♔</span><span>♕</span><span>♘</span><span>♜</span>
      </div>
      <aside class="chess-side panel compact">
        <label class="range-label">Режим
          <select id="chessMode">
            <option value="ai" ${chessState.mode === "ai" ? "selected" : ""}>с роботом</option>
            <option value="two" ${chessState.mode === "two" ? "selected" : ""}>для двоих</option>
          </select>
        </label>
        <label class="range-label">Твоя сторона
          <select id="playerColor" ${chessState.mode === "two" ? "disabled" : ""}>
            <option value="w" ${chessState.playerColor === "w" ? "selected" : ""}>белые</option>
            <option value="b" ${chessState.playerColor === "b" ? "selected" : ""}>чёрные</option>
          </select>
        </label>
        <label class="range-label">Сила робота
          <select id="chessLevel" ${chessState.mode === "two" ? "disabled" : ""}>
            ${Object.keys(chessLevelLabels).map((level) => Number(level)).map((level) => `<option value="${level}" ${chessState.level === level ? "selected" : ""}>${chessLevelLabels[level]}</option>`).join("")}
          </select>
        </label>
        <label class="range-label">Стиль робота
          <select id="chessStyle" ${chessState.mode === "two" ? "disabled" : ""}>
            ${Object.entries(chessStyles).map(([key, style]) => `<option value="${key}" ${chessState.style === key ? "selected" : ""}>${style.label}</option>`).join("")}
          </select>
        </label>
        <button id="startChessBtn" class="primary-btn big">Играть</button>
      </aside>
    </div>
  `;
  $("#chessMode").addEventListener("change", (e) => {
    chessState.mode = e.target.value;
    drawChessSetup();
  });
  $("#playerColor").addEventListener("change", (e) => {
    chessState.playerColor = e.target.value;
  });
  $("#chessLevel").addEventListener("change", (e) => {
    chessState.level = Number(e.target.value);
  });
  $("#chessStyle").addEventListener("change", (e) => {
    chessState.style = e.target.value;
  });
  $("#startChessBtn").addEventListener("click", startChessGame);
}

function displayOrder() {
  const flip = chessState.mode === "ai" && chessState.playerColor === "b";
  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];
  return { rows: flip ? rows.reverse() : rows, cols: flip ? cols.reverse() : cols, flip };
}

function displayDelta(fr, fc, tr, tc) {
  const { flip } = displayOrder();
  const fromDisplayC = flip ? 7 - fc : fc;
  const toDisplayC = flip ? 7 - tc : tc;
  const fromDisplayR = flip ? 7 - fr : fr;
  const toDisplayR = flip ? 7 - tr : tr;
  return {
    x: `${(fromDisplayC - toDisplayC) * 100}%`,
    y: `${(fromDisplayR - toDisplayR) * 100}%`,
  };
}

function drawChess() {
  if (chessState.phase !== "playing") return drawChessSetup();
  const { rows, cols } = displayOrder();
  const hints = chessState.selected ? legalMovesFor(chessState, chessState.selected.r, chessState.selected.c) : [];
  const board = rows.map((r) => cols.map((c) => {
    const piece = chessState.board[r][c];
    const selected = chessState.selected && chessState.selected.r === r && chessState.selected.c === c;
    const hintMove = hints.find((m) => m.tr === r && m.tc === c);
    const lastFrom = chessState.lastMove && chessState.lastMove.fr === r && chessState.lastMove.fc === c;
    const lastTo = chessState.lastMove && chessState.lastMove.tr === r && chessState.lastMove.tc === c;
    const delta = lastTo ? displayDelta(chessState.lastMove.fr, chessState.lastMove.fc, r, c) : { x: "0%", y: "0%" };
    const fly = lastTo && chessState.animateLastMove;
    return `<button class="square ${(r + c) % 2 ? "dark" : "light"} ${selected ? "selected" : ""} ${hintMove ? "hint" : ""} ${hintMove && piece ? "capture-hint" : ""} ${lastFrom ? "last-from" : ""} ${lastTo ? "last-to" : ""}" data-sq="${r},${c}">
      ${piece ? `<span class="piece ${piece[0] === "w" ? "white-piece" : "black-piece"} ${fly ? "fly" : ""}" style="--from-x:${delta.x};--from-y:${delta.y}">${pieceChars[piece]}</span>` : ""}
    </button>`;
  }).join("")).join("");

  $("#gameStage").innerHTML = stageShell("Шахматы", chessState.status, `
    <button class="soft-btn" id="newChess">Новая партия</button>
  `) + `
    <div class="chess-wrap">
      <div class="chess-board">${board}</div>
      <aside class="chess-side panel compact">
        <h3>${chessState.mode === "ai" ? `${chessLevelLabels[chessState.level]} · ${chessStyles[chessState.style].label}` : "Игра для двоих"}</h3>
        <p class="muted">${chessState.mode === "ai" ? `Ты играешь за ${chessState.playerColor === "w" ? "белых" : "чёрных"}.` : "Передавайте ход друг другу на одном устройстве."}</p>
        <p class="muted">Кружочки показывают доступные ходы. Последний ход подсвечивается двумя полями.</p>
        ${chessState.pendingPromotion ? promotionMarkup() : ""}
      </aside>
    </div>
  `;
  $("#newChess").addEventListener("click", () => renderChess({ mode: chessState.mode, level: chessState.level, style: chessState.style, playerColor: chessState.playerColor }));
  $$("[data-sq]").forEach((btn) => btn.addEventListener("click", () => {
    const [r, c] = btn.dataset.sq.split(",").map(Number);
    clickSquare(r, c);
  }));
  $$("[data-promote]").forEach((btn) => btn.addEventListener("click", () => choosePromotion(btn.dataset.promote)));
  chessState.animateLastMove = false;
}

function promotionMarkup() {
  return `
    <div class="promotion-box">
      <strong>Выбери превращение</strong>
      <div class="control-row">
        ${["Q", "R", "B", "N"].map((type) => `<button class="icon-btn" data-promote="${type}">${pieceChars[chessState.pendingPromotion.color + type]}</button>`).join("")}
      </div>
    </div>
  `;
}

function humanCanMove(color) {
  return chessState.mode === "two" || color === chessState.playerColor;
}

function clickSquare(r, c) {
  if (chessState.over || chessState.pendingPromotion) return;
  const piece = chessState.board[r][c];
  if (!humanCanMove(chessState.turn)) return;
  if (!chessState.selected) {
    if (piece && piece[0] === chessState.turn) {
      chessState.selected = { r, c };
      drawChess();
    }
    return;
  }
  const moves = legalMovesFor(chessState, chessState.selected.r, chessState.selected.c);
  const move = moves.find((m) => m.tr === r && m.tc === c);
  if (move) {
    if (move.promotion) {
      chessState.pendingPromotion = { ...move, color: chessState.turn };
      drawChess();
      return;
    }
    commitChessMove(move);
  } else {
    chessState.selected = piece && piece[0] === chessState.turn ? { r, c } : null;
  }
  drawChess();
  maybeAiTurn();
}

function choosePromotion(type) {
  if (!chessState.pendingPromotion) return;
  commitChessMove({ ...chessState.pendingPromotion, promotion: type });
  chessState.pendingPromotion = null;
  drawChess();
  maybeAiTurn();
}

function maybeAiTurn() {
  if (!chessState.over && chessState.mode === "ai" && chessState.turn !== chessState.playerColor) {
    setTimeout(aiMove, getAiThinkDelayMs());
  }
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function applyMoveTo(board, move) {
  const next = cloneBoard(board);
  const moving = next[move.fr][move.fc];
  next[move.fr][move.fc] = null;
  if (move.enPassantCapture) next[move.fr][move.tc] = null;
  if (move.castle === "K") {
    next[move.fr][5] = next[move.fr][7];
    next[move.fr][7] = null;
  }
  if (move.castle === "Q") {
    next[move.fr][3] = next[move.fr][0];
    next[move.fr][0] = null;
  }
  next[move.tr][move.tc] = move.promotion ? moving[0] + (move.promotion === true ? "Q" : move.promotion) : moving;
  return next;
}

function commitChessMove(move) {
  const moving = chessState.board[move.fr][move.fc];
  const captured = chessState.board[move.tr][move.tc] || (move.enPassantCapture ? chessState.board[move.fr][move.tc] : null);
  chessState.board = applyMoveTo(chessState.board, move);
  updateCastlingRights(moving, move, captured);
  chessState.enPassant = moving[1] === "P" && Math.abs(move.tr - move.fr) === 2
    ? { r: (move.fr + move.tr) / 2, c: move.fc }
    : null;
  chessState.lastMove = move;
  chessState.animateLastMove = true;
  chessState.selected = null;
  chessState.turn = opposite(chessState.turn);
  if (chessState.turn === "w") chessState.fullmove += 1;
  rememberChessPosition(chessState);
  playChessMoveAudio();
  updateChessStatus();
}

function updateCastlingRights(piece, move, captured) {
  if (piece === "wK") chessState.castling.wK = chessState.castling.wQ = false;
  if (piece === "bK") chessState.castling.bK = chessState.castling.bQ = false;
  if (piece === "wR" && move.fr === 7 && move.fc === 0) chessState.castling.wQ = false;
  if (piece === "wR" && move.fr === 7 && move.fc === 7) chessState.castling.wK = false;
  if (piece === "bR" && move.fr === 0 && move.fc === 0) chessState.castling.bQ = false;
  if (piece === "bR" && move.fr === 0 && move.fc === 7) chessState.castling.bK = false;
  if (captured === "wR" && move.tr === 7 && move.tc === 0) chessState.castling.wQ = false;
  if (captured === "wR" && move.tr === 7 && move.tc === 7) chessState.castling.wK = false;
  if (captured === "bR" && move.tr === 0 && move.tc === 0) chessState.castling.bQ = false;
  if (captured === "bR" && move.tr === 0 && move.tc === 7) chessState.castling.bK = false;
}

function updateChessStatus() {
  const legal = allLegalMoves(chessState, chessState.turn);
  const checked = isInCheck(chessState.board, chessState.turn);
  if (!legal.length) {
    chessState.over = true;
    if (checked) {
      const winner = opposite(chessState.turn);
      chessState.status = `${winner === "w" ? "Белые" : "Чёрные"} поставили мат`;
      if (chessState.mode === "ai") {
        if (winner === chessState.playerColor) {
          const reward = [0, 120, 220, 360, 520, 720, 980, 1300, 1700, 2200, 2900][chessState.level] || 120;
          completeWin(reward, `Шахматы · ${chessLevelLabels[chessState.level]}`);
          if (chessState.level >= 5) unlockAchievement("chessHard");
        } else {
          completeLoss();
        }
      } else {
        completeWin(260, "Шахматы для двоих");
      }
    } else {
      chessState.status = "Пат. Ничья";
      addHearts(90, "шахматная ничья");
    }
    return;
  }
  chessState.status = `${chessState.turn === "w" ? "Ход белых" : "Ход чёрных"}${checked ? " · шах" : ""}`;
}

function opposite(color) {
  return color === "w" ? "b" : "w";
}

function findKing(board, color) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (board[r][c] === `${color}K`) return { r, c };
    }
  }
  return null;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  return king ? isSquareAttacked(board, king.r, king.c, opposite(color)) : false;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let rr = 0; rr < 8; rr += 1) {
    for (let cc = 0; cc < 8; cc += 1) {
      const piece = board[rr][cc];
      if (piece?.[0] === byColor && attacksSquare(board, rr, cc, r, c)) return true;
    }
  }
  return false;
}

function attacksSquare(board, fr, fc, tr, tc) {
  const piece = board[fr][fc];
  if (!piece) return false;
  const color = piece[0];
  const type = piece[1];
  const dr = tr - fr;
  const dc = tc - fc;
  if (type === "P") return dr === (color === "w" ? -1 : 1) && Math.abs(dc) === 1;
  if (type === "N") return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  if (type === "K") return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
  if (type === "B") return Math.abs(dr) === Math.abs(dc) && clearPath(board, fr, fc, tr, tc);
  if (type === "R") return (dr === 0 || dc === 0) && clearPath(board, fr, fc, tr, tc);
  if (type === "Q") return (Math.abs(dr) === Math.abs(dc) || dr === 0 || dc === 0) && clearPath(board, fr, fc, tr, tc);
  return false;
}

function clearPath(board, fr, fc, tr, tc) {
  const stepR = Math.sign(tr - fr);
  const stepC = Math.sign(tc - fc);
  let r = fr + stepR;
  let c = fc + stepC;
  while (r !== tr || c !== tc) {
    if (board[r][c]) return false;
    r += stepR;
    c += stepC;
  }
  return true;
}

function legalMovesFor(game, r, c) {
  const piece = game.board[r][c];
  if (!piece) return [];
  return pseudoMoves(game, r, c).filter((move) => !isInCheck(applyMoveTo(game.board, move), piece[0]));
}

function pseudoMoves(game, r, c) {
  const board = game.board;
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const moves = [];
  const push = (tr, tc, extra = {}) => {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    if (!board[tr][tc]) {
      moves.push({ fr: r, fc: c, tr, tc, ...extra });
      return true;
    }
    if (board[tr][tc][0] !== color) moves.push({ fr: r, fc: c, tr, tc, ...extra });
    return false;
  };
  const ray = (dr, dc) => {
    for (let i = 1; i < 8; i += 1) {
      if (!push(r + dr * i, c + dc * i)) break;
    }
  };
  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const start = color === "w" ? 6 : 1;
    const promotionRow = color === "w" ? 0 : 7;
    if (!board[r + dir]?.[c]) {
      push(r + dir, c, r + dir === promotionRow ? { promotion: true } : {});
      if (r === start && !board[r + dir * 2]?.[c]) push(r + dir * 2, c);
    }
    [c - 1, c + 1].forEach((tc) => {
      if (board[r + dir]?.[tc] && board[r + dir][tc][0] !== color) {
        push(r + dir, tc, r + dir === promotionRow ? { promotion: true } : {});
      }
      if (game.enPassant && game.enPassant.r === r + dir && game.enPassant.c === tc) {
        moves.push({ fr: r, fc: c, tr: r + dir, tc, enPassantCapture: true });
      }
    });
  }
  if (type === "N") [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dr, dc]) => push(r + dr, c + dc));
  if (type === "B" || type === "Q") [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => ray(dr, dc));
  if (type === "R" || type === "Q") [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => ray(dr, dc));
  if (type === "K") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr || dc) push(r + dr, c + dc);
      }
    }
    const homeRow = color === "w" ? 7 : 0;
    if (r === homeRow && c === 4 && !isInCheck(board, color)) {
      if (game.castling[`${color}K`] && !board[homeRow][5] && !board[homeRow][6] &&
        !isSquareAttacked(board, homeRow, 5, opposite(color)) && !isSquareAttacked(board, homeRow, 6, opposite(color))) {
        moves.push({ fr: r, fc: c, tr: homeRow, tc: 6, castle: "K" });
      }
      if (game.castling[`${color}Q`] && !board[homeRow][3] && !board[homeRow][2] && !board[homeRow][1] &&
        !isSquareAttacked(board, homeRow, 3, opposite(color)) && !isSquareAttacked(board, homeRow, 2, opposite(color))) {
        moves.push({ fr: r, fc: c, tr: homeRow, tc: 2, castle: "Q" });
      }
    }
  }
  return moves;
}

function allLegalMoves(game, color) {
  const moves = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (game.board[r][c]?.[0] === color) moves.push(...legalMovesFor(game, r, c));
    }
  }
  return moves;
}

function aiMove() {
  if (chessState.over || chessState.pendingPromotion || chessState.turn === chessState.playerColor) return;
  const moves = allLegalMoves(chessState, chessState.turn);
  if (!moves.length) return updateChessStatus();
  const move = chooseAiMove(moves);
  rememberAIOpeningChoice(chessState, move);
  commitChessMove({ ...move, promotion: move.promotion ? "Q" : move.promotion });
  drawChess();
}

function chooseAiMove(moves) {
  const style = chessStyles[chessState.style] || chessStyles.balanced;
  const config = chessLevelConfig[chessState.level] || chessLevelConfig[5];
  const ordered = [...moves].sort((a, b) => scoreMove(b, false) - scoreMove(a, false));
  const baseNoise = Math.max(0.02, config.noise + style.random * 0.12);
  if (config.depth <= 0) return pickFromTop(chessState, ordered, config.width, baseNoise);

  const depthCap = 5;
  const depth = Math.max(1, Math.min(depthCap, config.depth + style.depthBonus));
  const candidates = ordered.slice(0, Math.min(config.width, ordered.length));
  let best = candidates[0] || ordered[0];
  let bestScore = -Infinity;
  const levelNoise = chessState.level >= 8 ? baseNoise * 0.24 : chessState.level >= 5 ? baseNoise * 0.5 : baseNoise;
  for (const move of candidates) {
    const score = -searchAfterMove(chessState, move, depth - 1, -Infinity, Infinity, opposite(chessState.turn), config.quiescence);
    const strategicBonus = topMoveHeuristicBonus(chessState, move) * (chessState.level <= 3 ? 0.35 : 0.55);
    const antiRepeatPenalty = localRepetitionPenalty(chessState, move) + openingRepeatPenalty(chessState, move);
    const adjusted = score + strategicBonus - antiRepeatPenalty + Math.random() * levelNoise;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      best = move;
    }
  }
  return best;
}

function pickFromTop(game, ordered, width, noise) {
  const pool = ordered.slice(0, Math.min(width, ordered.length));
  const ranked = pool.map((move) => {
    const antiRepeatPenalty = localRepetitionPenalty(game, move) + openingRepeatPenalty(game, move);
    const score = scoreMoveForBoard(game.board, move, false)
      + topMoveHeuristicBonus(game, move) * 0.42
      - antiRepeatPenalty
      + Math.random() * noise;
    return { move, score };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.move || ordered[0];
}

function topMoveHeuristicBonus(game, move) {
  const moving = game.board[move.fr][move.fc];
  if (!moving) return 0;
  const moverColor = moving[0];
  const enemyColor = opposite(moverColor);
  const normalizedMove = { ...move, promotion: move.promotion === true ? "Q" : move.promotion };
  const nextBoard = applyMoveTo(game.board, normalizedMove);
  const givesCheck = isInCheck(nextBoard, enemyColor);
  const movedPiece = nextBoard[move.tr][move.tc];
  if (!movedPiece) return givesCheck ? 30 : 0;
  const attacked = isSquareAttacked(nextBoard, move.tr, move.tc, enemyColor);
  const defended = isSquareAttacked(nextBoard, move.tr, move.tc, moverColor);
  const dangerPenalty = attacked ? pieceValue[movedPiece[1]] * (defended ? 0.06 : 0.18) : 0;
  const center = 8 - (Math.abs(3.5 - move.tr) + Math.abs(3.5 - move.tc));
  return (givesCheck ? 42 : 0) + (move.castle ? 34 : 0) + center * 2 - dangerPenalty;
}

function searchAfterMove(game, move, depth, alpha, beta, colorToMove, quiescenceDepth = 0) {
  const next = makeSearchGameAfterMove(game, move, colorToMove);
  if (depth <= 0) {
    return quiescenceDepth > 0
      ? quiescenceSearch(next, alpha, beta, colorToMove, quiescenceDepth)
      : evaluateBoard(next.board, colorToMove);
  }
  const moves = allLegalMoves(next, colorToMove);
  if (!moves.length) return isInCheck(next.board, colorToMove) ? -999999 : 0;
  let best = -Infinity;
  const ordered = moves.sort((a, b) => scoreMoveForBoard(next.board, b, false) - scoreMoveForBoard(next.board, a, false));
  for (const child of ordered) {
    const score = -searchAfterMove(next, child, depth - 1, -beta, -alpha, opposite(colorToMove), quiescenceDepth);
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function quiescenceSearch(game, alpha, beta, colorToMove, depth) {
  const standPat = evaluateBoard(game.board, colorToMove);
  if (standPat >= beta) return beta;
  alpha = Math.max(alpha, standPat);
  if (depth <= 0) return alpha;

  const noisyMoves = allLegalMoves(game, colorToMove)
    .filter((move) => move.promotion || game.board[move.tr][move.tc] || move.enPassantCapture)
    .sort((a, b) => scoreMoveForBoard(game.board, b, false) - scoreMoveForBoard(game.board, a, false));

  for (const move of noisyMoves.slice(0, 12)) {
    const next = makeSearchGameAfterMove(game, move, opposite(colorToMove));
    const score = -quiescenceSearch(next, -beta, -alpha, opposite(colorToMove), depth - 1);
    if (score >= beta) return beta;
    alpha = Math.max(alpha, score);
  }
  return alpha;
}

function makeSearchGameAfterMove(game, move, colorToMove) {
  const moving = game.board[move.fr][move.fc];
  const normalizedMove = { ...move, promotion: move.promotion === true ? "Q" : move.promotion };
  const captured = game.board[move.tr][move.tc] || (move.enPassantCapture ? game.board[move.fr][move.tc] : null);
  return {
    ...game,
    board: applyMoveTo(game.board, normalizedMove),
    turn: colorToMove,
    enPassant: moving?.[1] === "P" && Math.abs(move.tr - move.fr) === 2
      ? { r: (move.fr + move.tr) / 2, c: move.fc }
      : null,
    castling: castlingAfterMove(game.castling, moving, move, captured),
    pendingPromotion: null,
  };
}

function castlingAfterMove(castling = {}, piece, move, captured) {
  const next = { wK: true, wQ: true, bK: true, bQ: true, ...castling };
  if (piece === "wK") next.wK = next.wQ = false;
  if (piece === "bK") next.bK = next.bQ = false;
  if (piece === "wR" && move.fr === 7 && move.fc === 0) next.wQ = false;
  if (piece === "wR" && move.fr === 7 && move.fc === 7) next.wK = false;
  if (piece === "bR" && move.fr === 0 && move.fc === 0) next.bQ = false;
  if (piece === "bR" && move.fr === 0 && move.fc === 7) next.bK = false;
  if (captured === "wR" && move.tr === 7 && move.tc === 0) next.wQ = false;
  if (captured === "wR" && move.tr === 7 && move.tc === 7) next.wK = false;
  if (captured === "bR" && move.tr === 0 && move.tc === 0) next.bQ = false;
  if (captured === "bR" && move.tr === 0 && move.tc === 7) next.bK = false;
  return next;
}

function scoreMove(move, withNoise = true) {
  return scoreMoveForBoard(chessState.board, move, withNoise);
}

function scoreMoveForBoard(board, move, withNoise = true) {
  const style = chessStyles[chessState.style] || chessStyles.balanced;
  const target = board[move.tr][move.tc] || (move.enPassantCapture ? board[move.fr][move.tc] : null);
  const promotion = move.promotion ? 500 : 0;
  const moving = board[move.fr][move.fc];
  const forward = moving?.[0] === "b" ? move.tr - move.fr : move.fr - move.tr;
  const center = 14 - (Math.abs(3.5 - move.tr) + Math.abs(3.5 - move.tc)) * 4;
  const captureScore = target ? pieceValue[target[1]] * 10 - pieceValue[moving[1]] * 0.8 : 0;
  const attackScore = (forward * 10 + center) * style.attack;
  const materialScore = captureScore * style.material;
  const castle = move.castle ? 80 * style.kingSafety : 0;
  const noise = withNoise ? Math.random() * (chessState.level >= 5 ? style.random * 0.02 : style.random) : 0;
  return materialScore + promotion + attackScore + castle + noise;
}

function evaluateBoard(board, perspective) {
  const style = chessStyles[chessState.style] || chessStyles.balanced;
  let score = 0;
  const bishops = { w: 0, b: 0 };
  const nonPawnMaterial = { w: 0, b: 0 };
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece) continue;
      const color = piece[0];
      const type = piece[1];
      if (type === "B") bishops[color] += 1;
      if (type !== "P" && type !== "K") nonPawnMaterial[color] += pieceValue[type];
      const value = pieceValue[type] * style.material + pieceSquareValue(type, r, c, color, style);
      score += color === perspective ? value : -value;
    }
  }
  score += (bishops[perspective] >= 2 ? 35 : 0) - (bishops[opposite(perspective)] >= 2 ? 35 : 0);
  score += (pawnStructureScore(board, perspective) - pawnStructureScore(board, opposite(perspective))) * style.pawn;
  score += (mobilityScore(board, perspective) - mobilityScore(board, opposite(perspective))) * style.mobility;
  score += kingSafetyScore(board, perspective, nonPawnMaterial[perspective]) * style.kingSafety;
  score -= kingSafetyScore(board, opposite(perspective), nonPawnMaterial[opposite(perspective)]) * style.kingSafety;
  return score;
}

function pieceSquareValue(type, r, c, color, style) {
  const rank = color === "w" ? 7 - r : r;
  const center = 14 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 4;
  if (type === "P") return rank * 9 * style.pawn + center * 0.8;
  if (type === "N") return center * 7 * style.mobility - (rank === 0 ? 18 : 0);
  if (type === "B") return center * 5 * style.mobility + rank * 2;
  if (type === "R") return rank * 3 + (rank >= 4 ? 10 : 0);
  if (type === "Q") return center * 2 * style.attack;
  return 0;
}

function pawnStructureScore(board, color) {
  let score = 0;
  const files = Array(8).fill(0);
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (board[r][c] === `${color}P`) files[c] += 1;
    }
  }
  files.forEach((count, file) => {
    if (count > 1) score -= (count - 1) * 18;
    if (count && !files[file - 1] && !files[file + 1]) score -= 12;
  });
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (board[r][c] !== `${color}P`) continue;
      if (isPassedPawn(board, color, r, c)) score += 22 + (color === "w" ? 6 - r : r - 1) * 12;
    }
  }
  return score;
}

function isPassedPawn(board, color, r, c) {
  const enemy = opposite(color);
  const dir = color === "w" ? -1 : 1;
  for (let rr = r + dir; rr >= 0 && rr < 8; rr += dir) {
    for (let cc = Math.max(0, c - 1); cc <= Math.min(7, c + 1); cc += 1) {
      if (board[rr][cc] === `${enemy}P`) return false;
    }
  }
  return true;
}

function mobilityScore(board, color) {
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (piece?.[0] === color && piece[1] !== "K") score += approximateMobility(board, r, c) * 3;
    }
  }
  return score;
}

function approximateMobility(board, r, c) {
  const piece = board[r][c];
  if (!piece) return 0;
  const color = piece[0];
  const type = piece[1];
  let count = 0;
  const canVisit = (tr, tc) => tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && board[tr][tc]?.[0] !== color;
  const step = (dr, dc) => {
    for (let i = 1; i < 8; i += 1) {
      const tr = r + dr * i;
      const tc = c + dc * i;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
      if (board[tr][tc]?.[0] === color) break;
      count += 1;
      if (board[tr][tc]) break;
    }
  };
  if (type === "N") {
    [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dr, dc]) => {
      if (canVisit(r + dr, c + dc)) count += 1;
    });
  }
  if (type === "B" || type === "Q") [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => step(dr, dc));
  if (type === "R" || type === "Q") [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => step(dr, dc));
  if (type === "P") count += color === "w" ? Math.max(0, 6 - r) : Math.max(0, r - 1);
  return count;
}

function kingSafetyScore(board, color, material) {
  const king = findKing(board, color);
  if (!king) return -999999;
  const endgame = material < 1400;
  const center = 14 - (Math.abs(3.5 - king.r) + Math.abs(3.5 - king.c)) * 4;
  if (endgame) return center * 5;
  let shield = 0;
  const dir = color === "w" ? -1 : 1;
  for (let dc = -1; dc <= 1; dc += 1) {
    const c = king.c + dc;
    if (board[king.r + dir]?.[c] === `${color}P`) shield += 18;
    if (board[king.r + dir * 2]?.[c] === `${color}P`) shield += 8;
  }
  const centerPenalty = Math.max(0, center) * 3;
  return shield - centerPenalty;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setupAmbient() {
  const canvas = $("#ambientCanvas");
  const ctx = canvas.getContext("2d");
  const particles = [];
  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function seed() {
    particles.length = 0;
    const count = Math.min(70, Math.floor(window.innerWidth / 18));
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 1 + Math.random() * 3,
        speed: 0.15 + Math.random() * 0.55,
        hue: Math.random() > 0.55 ? "255, 92, 141" : "246, 199, 102",
      });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += Math.sin((p.y + p.size) * 0.01) * 0.18;
      if (p.y < -10) {
        p.y = window.innerHeight + 10;
        p.x = Math.random() * window.innerWidth;
      }
      ctx.fillStyle = `rgba(${p.hue}, 0.52)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  resize();
  seed();
  frame();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });
}

init();
