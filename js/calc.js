// Cálculos: metas, gasto de exercício, orçamento do dia e tendência de peso.
import * as store from "./store.js";

export function currentWeight() {
  const s = store.get();
  const m = [...s.metrics].filter((x) => x.weight).sort((a, b) => a.date.localeCompare(b.date));
  return m.length ? m[m.length - 1].weight : (s.profile.startWeight || 80);
}

export function targets() {
  const p = store.get().profile;
  const w = currentWeight();
  return {
    kcal: p.baseKcal,
    protein: Math.round(p.proteinPerKg * w),
    fatMin: Math.round(p.fatPerKg * w),
    carbsMax: p.carbsMax,
    fiber: p.fiberMin,
    water: p.waterMl,
  };
}

// --- Gasto calórico ---
// kcal/min = VO2 (mL/kg/min) × kg / 200. "Líquido" desconta o repouso (3,5 mL/kg/min = 1 MET),
// que já está embutido na meta diária.
export function treadmillKcal({ speed, incline, minutes }, kg) {
  const s = (speed * 1000) / 60;      // m/min
  const g = (incline || 0) / 100;
  const running = speed >= 6.5;
  const vo2 = running ? 3.5 + 0.2 * s + 0.9 * s * g : 3.5 + 0.1 * s + 1.8 * s * g;
  return { gross: Math.round((vo2 * kg / 200) * minutes), net: Math.round(((vo2 - 3.5) * kg / 200) * minutes) };
}

export function metKcal(met, minutes, kg) {
  return { gross: Math.round((met * 3.5 * kg / 200) * minutes), net: Math.round(((met - 1) * 3.5 * kg / 200) * minutes) };
}

export function stepsBonus(steps) {
  const p = store.get().profile;
  const extra = Math.max(0, (steps || 0) - p.stepsGoal);
  return Math.round(extra * 0.0005 * currentWeight());
}

// --- Dia ---
export function sumFoods(foods) {
  return foods.reduce((a, f) => ({
    kcal: a.kcal + (+f.kcal || 0), p: a.p + (+f.p || 0), c: a.c + (+f.c || 0),
    f: a.f + (+f.f || 0), fiber: a.fiber + (+f.fiber || 0),
  }), { kcal: 0, p: 0, c: 0, f: 0, fiber: 0 });
}

export function dayBudget(key = store.dateKey()) {
  const s = store.get();
  const d = store.peekDay(key);
  const t = targets();
  const exNet = d.workouts.reduce((a, w) => a + (w.kcalNet || 0), 0);
  const exGross = d.workouts.reduce((a, w) => a + (w.kcalGross || 0), 0);
  const steps = stepsBonus(d.steps);
  const bonus = Math.round((exNet + steps) * s.profile.exerciseCredit);
  const eaten = sumFoods(d.foods);
  const budget = t.kcal + bonus;
  return { t, budget, bonus, exNet, exGross, stepsKcal: steps, eaten, left: budget - eaten.kcal, pct: eaten.kcal / budget, water: d.water, steps: d.steps };
}

export function status(pct) {
  if (pct > 1) return "over";
  if (pct >= 0.85) return "warn";
  return "ok";
}

// Saldo dos últimos 7 dias (dias com registro).
export function weekBalance() {
  const out = { deficit: 0, days: 0 };
  const tdee = estimatedTdee();
  for (let i = 1; i <= 7; i++) { // a partir de ontem: hoje ainda está em andamento
    const k = store.dateKey(new Date(Date.now() - i * 864e5));
    const d = store.peekDay(k);
    if (!d.foods.length && !isFastDay(k)) continue;
    const b = dayBudget(k);
    out.deficit += tdee + b.exNet + b.stepsKcal - b.eaten.kcal;
    out.days++;
  }
  out.kg = out.deficit / 7700;
  return out;
}

// A meta do protocolo é ~16,5% abaixo do gasto de manutenção.
export function estimatedTdee() {
  return Math.round(store.get().profile.baseKcal / 0.835);
}

export function isFastDay(key) {
  return store.get().fasts.some((f) => f.end && store.dateKey(new Date(f.start)) <= key && store.dateKey(new Date(f.end)) >= key);
}

// --- Peso ---
export function sortedMetrics() {
  return [...store.get().metrics].sort((a, b) => a.date.localeCompare(b.date));
}

// Regressão linear (kg/semana) nos últimos `days` dias.
export function weeklyRate(days = 28) {
  const cutoff = store.dateKey(new Date(Date.now() - days * 864e5));
  const pts = sortedMetrics().filter((m) => m.weight && m.date >= cutoff);
  if (pts.length < 2) return null;
  const t0 = new Date(pts[0].date).getTime();
  const xs = pts.map((m) => (new Date(m.date).getTime() - t0) / (7 * 864e5));
  if (xs[xs.length - 1] < 5 / 7) return null;
  const ys = pts.map((m) => m.weight);
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? num / den : null; // negativo = perdendo
}

// Regra do protocolo: reavaliar a cada 4 semanas.
export function protocolCheck() {
  const s = store.get();
  const ms = sortedMetrics().filter((m) => m.weight);
  if (ms.length < 2) return { ready: false, msg: "Registre o peso pelo menos 1x por semana. A reavaliação acontece a cada 4 semanas." };
  const lastAdj = s.kcalAdjustments.length ? s.kcalAdjustments[s.kcalAdjustments.length - 1].date : ms[0].date;
  const since = (Date.now() - new Date(lastAdj).getTime()) / 864e5;
  const rate = weeklyRate(28);
  if (since < 28 || rate == null) {
    return { ready: false, rate, msg: `Próxima reavaliação em ${Math.max(1, Math.ceil(28 - since))} dia(s).` };
  }
  const loss = -rate;
  if (loss < 0.3) return { ready: true, rate, delta: -175, msg: `Perda de ${loss.toFixed(2)} kg/sem (< 0,3). Protocolo: cortar 150-200 kcal só de carboidrato.` };
  if (loss > 0.8) return { ready: true, rate, delta: +150, msg: `Perda de ${loss.toFixed(2)} kg/sem (> 0,8). Protocolo: acrescentar 150 kcal.` };
  return { ready: true, rate, delta: 0, msg: `Perda de ${loss.toFixed(2)} kg/sem — dentro da faixa ideal (0,4-0,6). Mantenha!` };
}

export function bmi(w) {
  const h = store.get().profile.heightCm;
  return h ? w / ((h / 100) ** 2) : null;
}
