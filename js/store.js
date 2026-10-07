// Persistência local (tudo fica no aparelho — nada vai para o GitHub).

const KEY = "nutri.v1";

const DEFAULTS = {
  profile: {
    name: "",
    sex: "M",
    age: null,
    heightCm: null,
    startWeight: null,
    goalWeight: null,
    goalFatPct: null,
    baseKcal: 2000,
    proteinPerKg: 2.2,
    fatPerKg: 0.8,
    carbsMax: 190,
    fiberMin: 25,
    waterMl: 3000,
    stepsGoal: 8000,
    exerciseCredit: 0.5,   // fração das kcal de exercício devolvida ao orçamento
    fastWeekday: 0,        // dia preferido para o jejum de 24h (0 = domingo)
    trainingDays: [1, 2, 4, 5],
  },
  settings: { apiKey: "", model: "claude-opus-5-5" },
  metrics: [],   // {id, date, weight, fatPct, muscleKg, fatKg, waterKg, bmr, visceral}
  days: {},      // "YYYY-MM-DD": {foods:[], workouts:[], water:0, steps:0}
  fasts: [],     // {id, start, end, targetH}
  kcalAdjustments: [], // {date, delta, reason}
  auth: null,    // {name, salt, hash, credId} — ver auth.js
  onboarded: false,
};

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const s = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS), ...s,
      profile: { ...DEFAULTS.profile, ...s.profile },
      settings: { ...DEFAULTS.settings, ...s.settings },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function get() { return state; }

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Quota estourada: remove fotos antigas e tenta de novo.
    pruneThumbs(3);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { alert("Armazenamento cheio. Exporte um backup em Ajustes."); }
  }
  listeners.forEach((fn) => fn(state));
}

export function update(fn) { fn(state); save(); }
export function subscribe(fn) { listeners.add(fn); }

// Restaura um backup mantendo o login e a chave da API deste aparelho.
export function replaceAll(data) {
  const { auth } = state;
  const { apiKey } = state.settings;
  state = { ...structuredClone(DEFAULTS), ...data, profile: { ...DEFAULTS.profile, ...data.profile }, settings: { ...DEFAULTS.settings, ...data.settings } };
  state.auth = auth;
  if (!state.settings.apiKey) state.settings.apiKey = apiKey;
  save();
}

export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

export function dateKey(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function day(key = dateKey()) {
  if (!state.days[key]) state.days[key] = { foods: [], workouts: [], water: 0, steps: 0 };
  return state.days[key];
}

export function peekDay(key) {
  return state.days[key] || { foods: [], workouts: [], water: 0, steps: 0 };
}

// Mantém miniaturas de fotos só dos últimos N dias para não lotar o localStorage.
export function pruneThumbs(keepDays = 14) {
  const cutoff = dateKey(new Date(Date.now() - keepDays * 864e5));
  for (const [k, d] of Object.entries(state.days)) {
    if (k < cutoff) d.foods.forEach((f) => delete f.thumb);
  }
}
