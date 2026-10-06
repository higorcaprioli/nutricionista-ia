import * as store from "./store.js";
import * as calc from "./calc.js";
import { MEALS, PROTOCOL_NOTES, WORKOUT_PLAN, ACTIVITIES, FAST_PHASES } from "./data.js";

// ---------- utilidades ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n, d = 0) => (n == null || isNaN(n) ? "–" : (+n).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }));
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WD_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const STATUS_COLOR = { ok: "var(--ok)", warn: "var(--warn)", over: "var(--bad)" };

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function mealMinutes(m) { const [h, mi] = m.time.split(":").map(Number); return h * 60 + mi; }
function mealForTime(date = new Date()) {
  const t = date.getHours() * 60 + date.getMinutes();
  return MEALS.reduce((best, m) => (Math.abs(mealMinutes(m) - t) < Math.abs(mealMinutes(best) - t) ? m : best), MEALS[0]);
}
function nextMeal() {
  const d = store.peekDay(store.dateKey());
  return MEALS.find((m) => !d.foods.some((f) => f.meal === m.id) && mealMinutes(m) + 60 >= nowMinutes()) || null;
}

function weekStart(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // segunda-feira
  return x;
}

function activeFast() { return store.get().fasts.find((f) => !f.end) || null; }
function fastHours(f) { return ((f.end ? new Date(f.end) : new Date()) - new Date(f.start)) / 36e5; }

// ---------- navegação ----------
const TABS = [
  { id: "dieta", label: "Dieta", icon: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v6a2 2 0 0 1-2 2M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9"/>' },
  { id: "metricas", label: "Métricas", icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
  { id: "treino", label: "Treino", icon: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>' },
  { id: "jejum", label: "Jejum", icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>' },
  { id: "hoje", label: "Hoje", icon: '<path d="M12 2c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-2.5 1.2-4.5 3-6 0 2 1 3.5 2.5 4C11 8 11 5 12 2z"/>' },
];
let tab = location.hash.slice(1) || "hoje";
let tickTimer = null;

function renderNav() {
  $("#nav").innerHTML = TABS.map((t) => `
    <button class="nav-btn ${t.id === tab ? "active" : ""}" data-tab="${t.id}" aria-label="${t.label}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
      <span>${t.label}</span>
    </button>`).join("");
}

let scrollToNextMeal = true;

function go(id) {
  tab = id;
  scrollToNextMeal = true;
  history.replaceState(null, "", "#" + id);
  render();
  window.scrollTo(0, 0);
}

function render() {
  renderNav();
  clearInterval(tickTimer);
  const d = new Date();
  $("#date").textContent = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const view = $("#view");
  ({ hoje: renderHoje, dieta: renderDieta, treino: renderTreino, metricas: renderMetricas, jejum: renderJejum })[tab](view);
}

// ---------- HOJE ----------
function bar(pct, color, extraPct = 0) {
  const w = Math.min(100, pct * 100);
  return `<div class="bar"><div class="bar-fill" style="width:${w}%;background:${color}"></div>${extraPct > 0 ? `<div class="bar-mark" style="left:${Math.min(100, (1 - extraPct) * 100)}%"></div>` : ""}</div>`;
}

function macroRow(label, val, target, kind) {
  // kind: "min" (atingir), "max" (não passar), "target" (perto do alvo)
  const pct = target ? val / target : 0;
  let st = "ok", note = "";
  if (kind === "min") { st = pct >= 1 ? "ok" : "neutral"; note = pct >= 1 ? "meta batida ✓" : `faltam ${fmt(target - val)} g`; }
  if (kind === "max") { st = pct > 1 ? "over" : pct >= 0.85 ? "warn" : "ok"; note = pct > 1 ? `passou ${fmt(val - target)} g` : `resta ${fmt(target - val)} g`; }
  if (kind === "target") { st = pct > 1.2 ? "over" : pct > 1 ? "warn" : "ok"; note = pct > 1 ? `acima ${fmt(val - target)} g` : `resta ${fmt(target - val)} g`; }
  const color = st === "neutral" ? "var(--accent)" : STATUS_COLOR[st];
  return `<div class="macro">
    <div class="macro-head"><span>${label}</span><span><b>${fmt(val)}</b> / ${fmt(target)} g · <em class="st-${st}">${note}</em></span></div>
    ${bar(pct, color)}
  </div>`;
}

function buildAlerts(b) {
  const out = [];
  const h = new Date().getHours();
  const st = calc.status(b.pct);
  if (st === "over") out.push(["bad", `Você passou <b>${fmt(-b.left)} kcal</b> do limite de hoje. Pare de comer por hoje — se bater fome, água, chá ou café sem açúcar.`]);
  else if (st === "warn") out.push(["warn", `Faltam só <b>${fmt(b.left)} kcal</b>. Se ainda tem refeição, priorize proteína magra (whey, frango, claras) e salada.`]);
  if (b.eaten.c > b.t.carbsMax) out.push(["bad", `Carboidrato acima do máximo (${fmt(b.eaten.c)} / ${b.t.carbsMax} g). Corte pão, arroz e fruta no restante do dia.`]);
  if (h >= 18 && b.eaten.p < b.t.protein * 0.7) out.push(["warn", `Proteína baixa: faltam <b>${fmt(b.t.protein - b.eaten.p)} g</b>. Uma dose de whey (30 g) dá ~25 g.`]);
  if (b.eaten.f > b.t.fatMin * 1.25) out.push(["warn", `Gordura alta hoje (${fmt(b.eaten.f)} g). Evite frituras e queijos no restante do dia.`]);
  if (h >= 15 && b.water < b.t.water * 0.5) out.push(["warn", `Água: só ${fmt(b.water / 1000, 1)} L de ${fmt(b.t.water / 1000, 1)} L. Beba 500 mL agora.`]);
  if (!out.length && b.eaten.kcal > 0) out.push(["ok", "Tudo dentro do plano até agora. Continue assim! 💪"]);
  return out;
}

function suggestion(b) {
  const m = nextMeal();
  if (!m || b.left <= 0) return "";
  const fits = m.options.filter((o) => o.kcal <= b.left + 30).sort((a, z) => z.p / z.kcal - a.p / a.kcal);
  const o = fits[0];
  if (!o) return `<div class="card soft"><div class="label">Próxima: ${esc(m.name)} (${m.time})</div><p>Restam só ${fmt(b.left)} kcal — nenhuma opção cabe inteira. Faça meia porção da opção com mais proteína.</p></div>`;
  return `<div class="card soft"><div class="label">Sugestão · ${esc(m.name)} (${m.time})</div>
    <p><b>Opção ${o.id}: ${esc(o.name)}</b> — ${o.kcal} kcal · P ${o.p} g · C ${o.c} g · G ${o.f} g</p>
    <button class="btn small" data-act="log-plan" data-meal="${m.id}" data-opt="${o.id}">✓ Comi esta</button>
    <button class="btn small ghost" data-act="go" data-tab="dieta">Ver opções</button></div>`;
}

function renderHoje(view) {
  const key = store.dateKey();
  const d = store.peekDay(key);
  const b = calc.dayBudget(key);
  const st = calc.status(b.pct);
  const fast = activeFast();
  const wk = calc.weekBalance();
  const foods = [...d.foods].sort((a, z) => a.time.localeCompare(z.time));

  view.innerHTML = `
    ${fast ? `<div class="banner" data-act="go" data-tab="jejum">⏳ Em jejum há <b>${fmt(fastHours(fast), 1)} h</b> de ${fast.targetH} h — toque para ver</div>` : ""}
    <section class="card kcal-card st-${st}">
      <div class="kcal-top">
        <div>
          <div class="label">Calorias de hoje</div>
          <div class="kcal-big"><span>${fmt(b.eaten.kcal)}</span> / ${fmt(b.budget)} kcal</div>
        </div>
        <div class="kcal-left">
          <div class="big">${fmt(Math.abs(b.left))}</div>
          <div class="label">${b.left >= 0 ? "restam" : "acima"}</div>
        </div>
      </div>
      ${bar(b.pct, STATUS_COLOR[st], b.bonus / b.budget)}
      <div class="kcal-break">Meta ${fmt(b.t.kcal)} ${b.bonus ? `+ <b>${fmt(b.bonus)}</b> de exercício (${Math.round(store.get().profile.exerciseCredit * 100)}% de ${fmt(b.exNet + b.stepsKcal)} kcal)` : "· registre treino para liberar mais kcal"}</div>
    </section>

    <div class="add-row">
      <button class="btn camera" data-act="photo">📷 Foto do prato</button>
      <button class="btn ghost" data-act="describe">✍️ Descrever</button>
      <button class="btn ghost" data-act="manual">＋</button>
    </div>

    <section class="alerts">${buildAlerts(b).map(([k, t]) => `<div class="alert ${k}">${t}</div>`).join("")}</section>

    <section class="card">
      <div class="card-title">O que ainda preciso consumir</div>
      ${macroRow("Proteína", b.eaten.p, b.t.protein, "min")}
      ${macroRow("Carboidrato", b.eaten.c, b.t.carbsMax, "max")}
      ${macroRow("Gordura", b.eaten.f, b.t.fatMin, "target")}
      ${macroRow("Fibra", b.eaten.fiber, b.t.fiber, "min")}
      <div class="macro">
        <div class="macro-head"><span>Água</span><span><b>${fmt(b.water / 1000, 2)}</b> / ${fmt(b.t.water / 1000, 1)} L</span></div>
        ${bar(b.water / b.t.water, "var(--water)")}
        <div class="water-btns"><button class="chip" data-act="water" data-ml="250">+250 mL</button><button class="chip" data-act="water" data-ml="500">+500 mL</button><button class="chip" data-act="water" data-ml="-250">−250</button></div>
      </div>
    </section>

    ${suggestion(b)}

    <section class="card">
      <div class="card-title">Comi hoje <span class="muted">(${foods.length})</span></div>
      ${foods.length ? foods.map(foodRow).join("") : `<p class="muted">Nada registrado ainda. Tire uma foto do prato ou marque uma refeição do plano na aba Dieta.</p>`}
    </section>

    ${wk.days ? `<section class="card soft">
      <div class="card-title">Últimos 7 dias</div>
      <p>Déficit estimado de <b>${fmt(wk.deficit)} kcal</b> em ${wk.days} dia(s) ≈ <b>${fmt(wk.kg, 2)} kg</b> de gordura.</p>
    </section>` : ""}
  `;
}

function foodRow(f) {
  const mealName = MEALS.find((m) => m.id === f.meal)?.name || "";
  return `<div class="food">
    ${f.thumb ? `<img src="${f.thumb}" alt="">` : `<div class="food-ico">${f.source === "plan" ? "📋" : f.source === "photo" ? "📷" : "✍️"}</div>`}
    <div class="food-info">
      <div class="food-name">${esc(f.name)}</div>
      <div class="muted small">${hhmm(new Date(f.time))}${mealName ? " · " + esc(mealName) : ""} · P ${fmt(f.p)} · C ${fmt(f.c)} · G ${fmt(f.f)}</div>
    </div>
    <div class="food-kcal">${fmt(f.kcal)}<small>kcal</small></div>
    <button class="icon-btn" data-act="del-food" data-id="${f.id}" aria-label="Remover">✕</button>
  </div>`;
}

function addFood(entry) {
  const fast = activeFast();
  if (fast) {
    if (!confirm(`Você está em jejum há ${fmt(fastHours(fast), 1)} h. Registrar esta comida encerra o jejum. Continuar?`)) return false;
    store.update((s) => { s.fasts.find((f) => f.id === fast.id).end = new Date().toISOString(); });
  }
  store.update(() => {
    store.day().foods.push({ id: store.uid(), time: new Date().toISOString(), meal: mealForTime().id, ...entry });
  });
  const b = calc.dayBudget();
  const st = calc.status(b.pct);
  toast(st === "over" ? `⚠️ Passou ${fmt(-b.left)} kcal do limite!` : st === "warn" ? `Atenção: restam ${fmt(b.left)} kcal` : `Registrado. Restam ${fmt(b.left)} kcal`);
  return true;
}

// ---------- DIETA ----------
const chosenOpt = {}; // opção visível por refeição (só na sessão)

function renderDieta(view) {
  const t = calc.targets();
  const d = store.peekDay(store.dateKey());
  const nm = nextMeal();
  view.innerHTML = `
    <section class="card">
      <div class="card-title">Seu protocolo</div>
      <div class="pills">
        <div class="pill"><b>${fmt(t.kcal)}</b><span>kcal</span></div>
        <div class="pill"><b>${t.protein} g</b><span>proteína</span></div>
        <div class="pill"><b>≤ ${t.carbsMax} g</b><span>carbo</span></div>
        <div class="pill"><b>≥ ${t.fatMin} g</b><span>gordura</span></div>
        <div class="pill"><b>${t.fiber}+ g</b><span>fibra</span></div>
        <div class="pill"><b>${fmt(t.water / 1000, 1)} L</b><span>água</span></div>
      </div>
      <p class="muted small">Escolha 1 de 3 opções em cada refeição. Qualquer combinação fecha o dia entre 1.980 e 2.090 kcal.</p>
    </section>
    <div class="timeline">
      ${MEALS.map((m) => {
        const logged = d.foods.find((f) => f.meal === m.id && f.source === "plan");
        const eaten = logged || d.foods.find((f) => f.meal === m.id);
        const optId = chosenOpt[m.id] || logged?.option || "A";
        const o = m.options.find((x) => x.id === optId);
        return `<section class="card meal ${nm?.id === m.id ? "next" : ""} ${eaten ? "done" : ""}" id="meal-${m.id}">
          <div class="meal-head">
            <div class="meal-time">${m.time}</div>
            <div class="meal-title">${esc(m.name)} ${nm?.id === m.id ? '<span class="tag">próxima</span>' : ""} ${eaten ? '<span class="tag ok">✓ feito</span>' : ""}</div>
            <div class="muted small">~${m.kcal} kcal${m.water ? ` + ${m.water} mL água` : ""}${m.note ? ` · ${esc(m.note)}` : ""}</div>
          </div>
          <div class="seg">${m.options.map((x) => `<button class="${x.id === optId ? "on" : ""}" data-act="opt" data-meal="${m.id}" data-opt="${x.id}">${x.id}</button>`).join("")}</div>
          <div class="opt">
            <div class="opt-name">${esc(o.name)}</div>
            <div class="macros-line"><b>${o.kcal} kcal</b> · P ${o.p} g · G ${o.f} g · C ${o.c} g · Fibra ${o.fiber} g</div>
            <ul>${o.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
            <details><summary>Modo de preparo</summary><p>${esc(o.prep)}</p></details>
            ${logged
              ? `<button class="btn small ghost" data-act="del-food" data-id="${logged.id}">Desfazer (${esc(logged.option)})</button>`
              : `<button class="btn small" data-act="log-plan" data-meal="${m.id}" data-opt="${o.id}">✓ Comi esta opção</button>`}
          </div>
        </section>`;
      }).join("")}
    </div>
    <section class="card soft">
      <div class="card-title">Regras do protocolo</div>
      ${PROTOCOL_NOTES.map((n) => `<p><b>${esc(n.title)}.</b> ${esc(n.text)}</p>`).join("")}
    </section>`;
  if (nm && scrollToNextMeal) setTimeout(() => $(`#meal-${nm.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  scrollToNextMeal = false;
}

// ---------- TREINO ----------
function todaysWorkout() {
  const p = store.get().profile;
  const days = [...p.trainingDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const i = days.indexOf(new Date().getDay());
  return i < 0 ? null : WORKOUT_PLAN[i % WORKOUT_PLAN.length];
}

function weekSessions() {
  const ws = weekStart();
  const out = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(ws); dt.setDate(ws.getDate() + i);
    const d = store.peekDay(store.dateKey(dt));
    out.push({ dt, strength: d.workouts.some((w) => w.type === "musculacao"), any: d.workouts.length > 0 });
  }
  return out;
}

function renderTreino(view) {
  const p = store.get().profile;
  const key = store.dateKey();
  const d = store.peekDay(key);
  const w = todaysWorkout();
  const week = weekSessions();
  const sessions = week.filter((x) => x.strength).length;
  const kg = calc.currentWeight();
  const b = calc.dayBudget(key);
  const checks = d.checks || {};
  const days = [...p.trainingDays].sort((a, z) => ((a + 6) % 7) - ((z + 6) % 7));

  view.innerHTML = `
    <section class="card">
      <div class="card-title">Semana · ${sessions}/${p.trainingDays.length} treinos de musculação</div>
      <div class="week">${week.map((x, i) => `<div class="wd ${x.strength ? "done" : x.any ? "part" : ""} ${store.dateKey(x.dt) === key ? "today" : ""}">
        <span>${WD_SHORT[x.dt.getDay()]}</span><i>${x.strength ? "✓" : x.any ? "•" : ""}</i></div>`).join("")}</div>
      <p class="muted small">Musculação 3-4×/semana é condição obrigatória do protocolo — é o que preserva a massa magra no déficit.</p>
    </section>

    <section class="card">
      <div class="card-title">${w ? `Hoje: ${esc(w.name)}` : "Hoje: descanso ativo"}</div>
      ${w ? `<div class="muted small">${esc(w.focus)} · descanso 60-90 s · última série perto da falha</div>
        <ul class="checklist">${w.exercises.map(([n, s], i) => `<li><label><input type="checkbox" data-act="check" data-i="${i}" ${checks[i] ? "checked" : ""}><span>${esc(n)}</span><em>${s}</em></label></li>`).join("")}</ul>
        <p class="muted small">🏃 ${esc(w.cardio)}</p>
        <button class="btn" data-act="log-strength">✓ Treinei hoje</button>`
      : `<p>Caminhe para bater <b>${fmt(p.stepsGoal)} passos</b>. Se quiser, 30-40 min de esteira leve.</p>`}
    </section>

    <section class="card">
      <div class="card-title">Registrar atividade</div>
      <form id="act-form" class="form">
        <label>Atividade<select name="type">${ACTIVITIES.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")}</select></label>
        <label>Duração (min)<input name="minutes" type="number" inputmode="numeric" min="1" value="30" required></label>
        <div class="tm-fields grid2">
          <label>Velocidade (km/h)<input name="speed" type="number" inputmode="decimal" step="0.1" value="5.5"></label>
          <label>Inclinação (%)<input name="incline" type="number" inputmode="decimal" step="0.5" value="5"></label>
        </div>
        <label class="int-field">Intensidade<select name="intensity"><option value="leve">Leve</option><option value="moderada" selected>Moderada</option><option value="intensa">Intensa</option></select></label>
        <label>Kcal do relógio (opcional)<input name="watch" type="number" inputmode="numeric" placeholder="usa a estimativa do app"></label>
        <div class="estimate" id="estimate"></div>
        <button class="btn" type="submit">Salvar atividade</button>
      </form>
    </section>

    <section class="card">
      <div class="card-title">Passos de hoje (Galaxy Watch)</div>
      <div class="inline">
        <input id="steps" type="number" inputmode="numeric" value="${d.steps || ""}" placeholder="ex.: 9500">
        <button class="btn small" data-act="save-steps">Salvar</button>
      </div>
      ${bar((d.steps || 0) / p.stepsGoal, "var(--accent)")}
      <p class="muted small">Meta ${fmt(p.stepsGoal)} passos (já contada na meta de ${fmt(p.baseKcal)} kcal). Passos acima disso liberam kcal extra${b.stepsKcal ? `: <b>+${fmt(b.stepsKcal)} kcal</b>` : ""}.</p>
    </section>

    <section class="card">
      <div class="card-title">Atividades de hoje</div>
      ${d.workouts.length ? d.workouts.map((x) => `<div class="food">
        <div class="food-ico">${x.type === "musculacao" ? "🏋️" : x.type === "esteira" ? "🏃" : "🔥"}</div>
        <div class="food-info"><div class="food-name">${esc(x.name)}</div><div class="muted small">${x.minutes} min${x.detail ? " · " + esc(x.detail) : ""} · bruto ${fmt(x.kcalGross)} kcal</div></div>
        <div class="food-kcal">+${fmt(Math.round(x.kcalNet * p.exerciseCredit))}<small>kcal liberadas</small></div>
        <button class="icon-btn" data-act="del-workout" data-id="${x.id}">✕</button></div>`).join("")
      : `<p class="muted">Nenhuma atividade registrada.</p>`}
      <p class="muted small">Gasto líquido estimado ${fmt(b.exNet)} kcal. O app devolve ${Math.round(p.exerciseCredit * 100)}% ao seu orçamento (relógios e fórmulas costumam superestimar) — ajuste em ⚙️.</p>
    </section>

    <section class="card soft">
      <div class="card-title">Plano semanal</div>
      ${WORKOUT_PLAN.slice(0, days.length).map((x, i) => `<details><summary><b>${WEEKDAYS[days[i]]}</b> · ${esc(x.name)}</summary>
        <ul>${x.exercises.map(([n, s]) => `<li>${esc(n)} — ${s}</li>`).join("")}</ul><p class="muted small">🏃 ${esc(x.cardio)}</p></details>`).join("")}
    </section>`;

  const form = $("#act-form");
  const upd = () => {
    const f = Object.fromEntries(new FormData(form));
    const act = ACTIVITIES.find((a) => a.id === f.type);
    form.querySelector(".tm-fields").style.display = act.treadmill ? "" : "none";
    form.querySelector(".int-field").style.display = act.treadmill ? "none" : "";
    const e = estimateActivity(f, kg);
    $("#estimate").innerHTML = `Estimativa: <b>${fmt(e.gross)} kcal</b> gastas (líquido ${fmt(e.net)}) → libera <b>+${fmt(Math.round(e.net * p.exerciseCredit))} kcal</b> para comer`;
  };
  form.addEventListener("input", upd);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    saveActivity(f, kg);
  });
  upd();
}

function estimateActivity(f, kg) {
  const act = ACTIVITIES.find((a) => a.id === f.type);
  const minutes = +f.minutes || 0;
  let e = act.treadmill
    ? calc.treadmillKcal({ speed: +f.speed || 0, incline: +f.incline || 0, minutes }, kg)
    : calc.metKcal(act.met[f.intensity || "moderada"], minutes, kg);
  if (+f.watch > 0) {
    // kcal "ativas" do relógio ≈ gasto acima do repouso
    const rest = Math.round((3.5 * kg / 200) * minutes);
    e = { gross: +f.watch + rest, net: +f.watch };
  }
  return e;
}

function saveActivity(f, kg) {
  const act = ACTIVITIES.find((a) => a.id === f.type);
  const e = estimateActivity(f, kg);
  store.update(() => {
    store.day().workouts.push({
      id: store.uid(), type: act.id, name: act.name, minutes: +f.minutes,
      detail: act.treadmill ? `${f.speed} km/h · ${f.incline}%` : f.intensity,
      kcalGross: e.gross, kcalNet: e.net, fromWatch: +f.watch > 0,
    });
  });
  toast(`Atividade salva: +${fmt(Math.round(e.net * store.get().profile.exerciseCredit))} kcal liberadas`);
}

// ---------- MÉTRICAS ----------
const BIO_FIELDS = [
  ["weight", "Peso", "kg", 1],
  ["fatPct", "Gordura corporal", "%", 1],
  ["muscleKg", "Massa muscular esquelética", "kg", 1],
  ["fatKg", "Massa gorda", "kg", 1],
  ["waterKg", "Água corporal", "kg", 1],
  ["bmr", "Taxa metabólica basal", "kcal", 0],
  ["visceral", "Gordura visceral (se tiver)", "nível", 0],
];
let chartField = "weight";

function chart(field) {
  const ms = calc.sortedMetrics().filter((m) => m[field] != null && m[field] !== "");
  if (ms.length < 2) return `<p class="muted">Registre pelo menos 2 medições para ver o gráfico.</p>`;
  const W = 340, H = 170, P = { l: 34, r: 10, t: 10, b: 22 };
  const xs = ms.map((m) => new Date(m.date).getTime());
  const ys = ms.map((m) => +m[field]);
  const goal = field === "weight" ? store.get().profile.goalWeight : field === "fatPct" ? store.get().profile.goalFatPct : null;
  let lo = Math.min(...ys, goal ?? Infinity), hi = Math.max(...ys, goal ?? -Infinity);
  const padY = (hi - lo) * 0.15 || 1; lo -= padY; hi += padY;
  const x0 = xs[0], x1 = xs[xs.length - 1] || x0 + 1;
  const X = (x) => P.l + ((x - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (y) => P.t + (1 - (y - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = ms.map((m, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join("");
  const ticks = [lo + padY, (lo + hi) / 2, hi - padY];
  const dfmt = (t) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map((t) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${P.l - 4}" y="${Y(t) + 3}" text-anchor="end">${fmt(t, 1)}</text>`).join("")}
    ${goal ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(goal)}" y2="${Y(goal)}" class="goal"/><text x="${W - P.r}" y="${Y(goal) - 4}" text-anchor="end" class="goal-t">meta ${fmt(goal, 1)}</text>` : ""}
    <path d="${path}" class="line"/>
    ${ms.map((m, i) => `<circle cx="${X(xs[i])}" cy="${Y(ys[i])}" r="3" class="dot"/>`).join("")}
    <text x="${P.l}" y="${H - 6}">${dfmt(x0)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end">${dfmt(x1)}</text>
  </svg>`;
}

function renderMetricas(view) {
  const p = store.get().profile;
  const ms = calc.sortedMetrics();
  const last = ms[ms.length - 1];
  const prev = ms[ms.length - 2];
  const w = calc.currentWeight();
  const start = p.startWeight || ms.find((m) => m.weight)?.weight;
  const rate = calc.weeklyRate(28);
  const chk = calc.protocolCheck();
  const bmi = calc.bmi(w);
  let progress = null, eta = "";
  if (p.goalWeight && start && start !== p.goalWeight) {
    progress = Math.max(0, Math.min(1, (start - w) / (start - p.goalWeight)));
    if (rate && rate < 0) {
      const weeks = (w - p.goalWeight) / -rate;
      if (weeks > 0) eta = new Date(Date.now() + weeks * 7 * 864e5).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
  }
  const lean = last?.weight && last?.fatPct ? last.weight * (1 - last.fatPct / 100) : null;

  view.innerHTML = `
    <section class="card">
      <div class="card-title">Objetivo</div>
      <div class="stats">
        <div><span class="label">Peso atual</span><b>${fmt(w, 1)} kg</b></div>
        <div><span class="label">Meta</span><b>${p.goalWeight ? fmt(p.goalWeight, 1) + " kg" : "–"}</b></div>
        <div><span class="label">Já perdeu</span><b>${start ? fmt(start - w, 1) + " kg" : "–"}</b></div>
        <div><span class="label">Ritmo</span><b>${rate != null ? fmt(-rate, 2) + " kg/sem" : "–"}</b></div>
        <div><span class="label">IMC</span><b>${bmi ? fmt(bmi, 1) : "–"}</b></div>
        <div><span class="label">Massa magra</span><b>${lean ? fmt(lean, 1) + " kg" : "–"}</b></div>
      </div>
      ${progress != null ? `${bar(progress, "var(--ok)")}<p class="muted small">${Math.round(progress * 100)}% do caminho${eta ? ` · previsão de chegar à meta em <b>${eta}</b>` : ""}. Ritmo ideal: 0,4-0,6 kg/semana.</p>` : `<p class="muted small">Defina peso inicial e meta em ⚙️ para acompanhar o progresso.</p>`}
    </section>

    <section class="card ${chk.ready && chk.delta ? "highlight" : "soft"}">
      <div class="card-title">Reavaliação do protocolo</div>
      <p>${esc(chk.msg)}</p>
      ${chk.ready && chk.delta ? `<button class="btn small" data-act="apply-adj" data-delta="${chk.delta}">Aplicar: meta ${fmt(p.baseKcal)} → ${fmt(p.baseKcal + chk.delta)} kcal</button>` : ""}
      ${chk.ready && chk.delta === 0 ? `<button class="btn small ghost" data-act="apply-adj" data-delta="0">Marcar como reavaliado</button>` : ""}
    </section>

    <section class="card">
      <div class="seg wide">${[["weight", "Peso"], ["fatPct", "Gordura"], ["muscleKg", "Músculo"], ["bmr", "TMB"]].map(([k, l]) => `<button class="${k === chartField ? "on" : ""}" data-act="chart" data-f="${k}">${l}</button>`).join("")}</div>
      ${chart(chartField)}
    </section>

    <button class="btn wide" data-act="new-metric">＋ Nova medição (peso / bioimpedância)</button>

    ${last ? `<section class="card">
      <div class="card-title">Última medição · ${new Date(last.date + "T12:00").toLocaleDateString("pt-BR")}</div>
      <div class="bio">${BIO_FIELDS.filter(([k]) => last[k] != null && last[k] !== "").map(([k, l, u, dec]) => {
        const delta = prev && prev[k] != null && prev[k] !== "" ? last[k] - prev[k] : null;
        const good = delta == null ? "" : (k === "muscleKg" || k === "waterKg" || k === "bmr") ? (delta >= 0 ? "up-good" : "down-bad") : (delta <= 0 ? "down-good" : "up-bad");
        return `<div class="bio-item"><span class="label">${l}</span><b>${fmt(last[k], dec)} ${u}</b>${delta != null ? `<em class="${good}">${delta > 0 ? "+" : ""}${fmt(delta, dec)}</em>` : ""}</div>`;
      }).join("")}</div>
    </section>` : ""}

    <section class="card soft">
      <div class="card-title">Histórico</div>
      ${ms.length ? `<table class="table"><thead><tr><th>Data</th><th>Peso</th><th>%G</th><th>Músc.</th><th></th></tr></thead><tbody>
        ${[...ms].reverse().map((m) => `<tr><td>${new Date(m.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</td><td>${fmt(m.weight, 1)}</td><td>${fmt(m.fatPct, 1)}</td><td>${fmt(m.muscleKg, 1)}</td><td><button class="icon-btn" data-act="del-metric" data-id="${m.id}">✕</button></td></tr>`).join("")}
      </tbody></table>` : `<p class="muted">Sem medições. No Samsung Health: Composição corporal → copie os valores para cá. Pese-se sempre em jejum, ao acordar, depois de ir ao banheiro.</p>`}
    </section>`;
}

function metricModal() {
  openModal(`
    <h2>Nova medição</h2>
    <p class="muted small">Galaxy Watch: Samsung Health → Composição corporal. Meça sempre no mesmo horário (de manhã, em jejum).</p>
    <form id="metric-form" class="form">
      <label>Data<input name="date" type="date" value="${store.dateKey()}" required></label>
      ${BIO_FIELDS.map(([k, l, u]) => `<label>${l} (${u})<input name="${k}" type="number" inputmode="decimal" step="0.1" ${k === "weight" ? "required" : ""}></label>`).join("")}
      <div class="row-end"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button class="btn" type="submit">Salvar</button></div>
    </form>`);
  $("#metric-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    const m = { id: store.uid(), date: f.date };
    BIO_FIELDS.forEach(([k]) => { if (f[k] !== "") m[k] = +String(f[k]).replace(",", "."); });
    store.update((s) => {
      s.metrics = s.metrics.filter((x) => x.date !== m.date);
      s.metrics.push(m);
      if (!s.profile.startWeight) s.profile.startWeight = m.weight;
    });
    closeModal();
    toast("Medição salva");
  });
}

// ---------- JEJUM ----------
function renderJejum(view) {
  const p = store.get().profile;
  const fast = activeFast();
  const fasts = [...store.get().fasts].filter((f) => f.end).sort((a, b) => b.start.localeCompare(a.start));
  const ws = weekStart().getTime();
  const doneThisWeek = fasts.some((f) => new Date(f.end).getTime() >= ws && fastHours(f) >= f.targetH * 0.95);
  const h = fast ? fastHours(fast) : 0;
  const target = fast?.targetH || 24;
  const pct = Math.min(1, h / target);
  const phase = [...FAST_PHASES].reverse().find((x) => h >= x.h) || FAST_PHASES[0];
  const R = 88, C = 2 * Math.PI * R;
  const endAt = fast ? new Date(new Date(fast.start).getTime() + target * 36e5) : null;

  view.innerHTML = `
    <section class="card center">
      <div class="card-title">Jejum de ${target} horas</div>
      <svg class="ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${R}" class="ring-bg"/>
        <circle cx="100" cy="100" r="${R}" class="ring-fg ${pct >= 1 ? "full" : ""}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 100 100)"/>
        <text x="100" y="95" text-anchor="middle" class="ring-big">${fast ? `${Math.floor(h)}h${pad(Math.floor((h % 1) * 60))}` : "--"}</text>
        <text x="100" y="120" text-anchor="middle" class="ring-small">${fast ? (pct >= 1 ? "concluído! 🎉" : `faltam ${fmt(target - h, 1)} h`) : "parado"}</text>
      </svg>
      ${fast ? `<p><b>${esc(phase.label)}</b> — ${esc(phase.text)}</p>
        <p class="muted small">Começou ${new Date(fast.start).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })} · termina ${endAt.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>
        <div class="row-center"><button class="btn ${pct >= 1 ? "" : "danger"}" data-act="stop-fast">${pct >= 1 ? "Encerrar jejum ✓" : "Interromper jejum"}</button><button class="btn ghost" data-act="edit-fast">Ajustar início</button></div>`
      : `<p class="muted">Dica: comece depois do jantar (20h) e termine no jantar do dia seguinte — você dorme parte do tempo.</p>
        <div class="row-center"><button class="btn" data-act="start-fast" data-h="24">▶ Começar agora</button><button class="btn ghost" data-act="start-fast-at">Comecei mais cedo…</button></div>`}
    </section>

    <section class="card ${doneThisWeek ? "" : "highlight"}">
      <div class="card-title">Meta semanal: 1 jejum de 24 h</div>
      <p>${doneThisWeek ? "✅ Jejum desta semana feito!" : `⏳ Ainda não fez esta semana. Dia planejado: <b>${WEEKDAYS[p.fastWeekday]}</b>.`}</p>
      <p class="muted small">Um jejum de 24 h gera ~${fmt(calc.estimatedTdee())} kcal de déficit (≈ ${fmt(calc.estimatedTdee() / 7700, 2)} kg de gordura). Evite fazê-lo em dia de treino de pernas.</p>
    </section>

    <section class="card soft">
      <div class="card-title">Fases</div>
      <div class="phases">${FAST_PHASES.map((x) => `<div class="phase ${fast && h >= x.h ? "on" : ""}"><b>${x.h} h</b><span><b>${esc(x.label)}</b> — ${esc(x.text)}</span></div>`).join("")}</div>
    </section>

    <section class="card soft">
      <div class="card-title">Durante o jejum</div>
      <ul>
        <li>Liberado: água, água com gás, café preto, chá sem açúcar.</li>
        <li>Água: 3 L+ e uma pitada de sal na água ajuda contra dor de cabeça.</li>
        <li>Quebre com proteína e porção leve (ovos mexidos, iogurte) — não com um banquete.</li>
        <li>No dia seguinte volte ao plano normal; não “compense”.</li>
        <li>Pare se tiver tontura forte, palpitação ou mal-estar. Converse com seu médico, especialmente se usa medicação.</li>
      </ul>
    </section>

    <section class="card soft">
      <div class="card-title">Histórico</div>
      ${fasts.length ? fasts.slice(0, 12).map((f) => {
        const fh = fastHours(f);
        return `<div class="food"><div class="food-ico">${fh >= f.targetH * 0.95 ? "✅" : "⏹️"}</div>
          <div class="food-info"><div class="food-name">${fmt(fh, 1)} h</div><div class="muted small">${new Date(f.start).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} → ${new Date(f.end).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div></div>
          <button class="icon-btn" data-act="del-fast" data-id="${f.id}">✕</button></div>`;
      }).join("") : `<p class="muted">Nenhum jejum concluído ainda.</p>`}
    </section>`;

  if (fast) tickTimer = setInterval(() => { if (tab === "jejum") render(); }, 30000);
}

function fastStartModal(existing) {
  const d = existing ? new Date(existing.start) : new Date(Date.now() - 2 * 36e5);
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  openModal(`<h2>${existing ? "Ajustar início" : "Quando começou?"}</h2>
    <form id="fast-form" class="form">
      <label>Última refeição<input name="start" type="datetime-local" value="${local}" required></label>
      <label>Duração alvo (h)<input name="h" type="number" value="${existing?.targetH || 24}" min="12" max="72"></label>
      <div class="row-end"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button class="btn" type="submit">Salvar</button></div>
    </form>`);
  $("#fast-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    store.update((s) => {
      if (existing) { const x = s.fasts.find((y) => y.id === existing.id); x.start = new Date(f.start).toISOString(); x.targetH = +f.h; }
      else s.fasts.push({ id: store.uid(), start: new Date(f.start).toISOString(), end: null, targetH: +f.h });
    });
    closeModal();
  });
}

// ---------- modal ----------
function openModal(html) {
  const m = $("#modal");
  // Novo elemento a cada abertura: descarta listeners do modal anterior.
  const old = $("#modal-body");
  const body = old.cloneNode(false);
  body.innerHTML = html;
  old.replaceWith(body);
  m.classList.add("open");
  document.body.classList.add("noscroll");
}
function closeModal() {
  $("#modal").classList.remove("open");
  document.body.classList.remove("noscroll");
}

// ---------- registro de comida: foto / descrição / manual ----------
let pendingPhoto = null;

async function startPhoto(file) {
  const ai = await import("./ai.js");
  const dataUrl = await ai.resizeImage(file);
  pendingPhoto = { dataUrl, thumb: await ai.resizeImage(file, 120, 0.6) };
  openModal(`<h2>Analisando seu prato…</h2><img class="preview" src="${dataUrl}" alt=""><div class="spinner"></div><p class="muted center">Contando calorias e macros</p>`);
  runAnalysis({ imageDataUrl: dataUrl });
}

function describeModal() {
  pendingPhoto = null;
  openModal(`<h2>O que você comeu?</h2>
    <form id="desc-form" class="form">
      <textarea name="text" rows="4" placeholder="ex.: 2 conchas de arroz, 1 concha de feijão, 1 bife de alcatra médio e salada com azeite" required></textarea>
      <div class="row-end"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button class="btn" type="submit">Calcular</button></div>
    </form>`);
  $("#desc-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = new FormData(ev.target).get("text");
    openModal(`<h2>Calculando…</h2><div class="spinner"></div>`);
    runAnalysis({ text });
  });
}

async function runAnalysis({ imageDataUrl, text }) {
  const b = calc.dayBudget();
  try {
    const ai = await import("./ai.js");
    const res = await ai.analyzeMeal({
      imageDataUrl, text,
      context: { kcalLeft: b.left, budget: b.budget, p: b.eaten.p, pTarget: b.t.protein, c: b.eaten.c, cMax: b.t.carbsMax, f: b.eaten.f, fMin: b.t.fatMin },
    });
    reviewModal(res, imageDataUrl, text);
  } catch (e) {
    console.error(e);
    const msg = e?.status === 401 ? "Chave da API inválida. Confira em ⚙️ Ajustes." : e.message || String(e);
    openModal(`<h2>Não deu certo</h2><p>${esc(msg)}</p>
      <div class="row-end"><button class="btn ghost" data-act="close">Fechar</button><button class="btn" data-act="manual">Registrar manualmente</button></div>`);
  }
}

function reviewModal(res, imageDataUrl, text) {
  let items = res.items;
  const drawItems = () => {
    $("#review-items").innerHTML = items.map((i, n) => `<div class="ritem">
      <input class="rname" data-n="${n}" data-k="name" value="${esc(i.name)}">
      <div class="rnums">
        <label>g<input type="number" data-n="${n}" data-k="grams" value="${i.grams}"></label>
        <label>kcal<input type="number" data-n="${n}" data-k="kcal" value="${i.kcal}"></label>
        <label>P<input type="number" data-n="${n}" data-k="p" value="${i.p}"></label>
        <label>C<input type="number" data-n="${n}" data-k="c" value="${i.c}"></label>
        <label>G<input type="number" data-n="${n}" data-k="f" value="${i.f}"></label>
        <button type="button" class="icon-btn" data-rm="${n}">✕</button>
      </div></div>`).join("");
    drawTotals();
  };
  const drawTotals = () => {
    const mult = +($("#portion")?.value || 100) / 100;
    const tot = calc.sumFoods(items);
    const b = calc.dayBudget();
    const after = b.eaten.kcal + tot.kcal * mult;
    const st = calc.status(after / b.budget);
    $("#review-total").innerHTML = `<b>${fmt(tot.kcal * mult)} kcal</b> · P ${fmt(tot.p * mult)} g · C ${fmt(tot.c * mult)} g · G ${fmt(tot.f * mult)} g`;
    $("#review-after").className = `after st-${st}`;
    $("#review-after").innerHTML = `Depois desta refeição: <b>${fmt(after)} / ${fmt(b.budget)} kcal</b> (${Math.round((after / b.budget) * 100)}%)` +
      (st === "over" ? " — ⚠️ passa do limite!" : st === "warn" ? " — quase no limite" : " — ok ✓");
  };
  openModal(`<h2>Resultado</h2>
    ${imageDataUrl ? `<img class="preview small" src="${imageDataUrl}" alt="">` : ""}
    <div class="verdict v-${esc(res.verdict)}">${res.verdict === "ok" ? "✅" : res.verdict === "excesso" ? "🔴" : "🟡"} ${esc(res.comment || "")}</div>
    <p class="muted small">Confiança: ${esc(res.confidence || "–")}. Ajuste os valores se souber as quantidades exatas.</p>
    <div id="review-items"></div>
    <label class="portion">Quanto comeu do prato: <output id="portion-out">100%</output><input id="portion" type="range" min="25" max="200" step="25" value="100"></label>
    <div class="total" id="review-total"></div>
    <div id="review-after"></div>
    <div class="row-end"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" id="review-save">Adicionar</button></div>`);
  drawItems();
  const body = $("#modal-body");
  body.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.id === "portion") { $("#portion-out").textContent = el.value + "%"; drawTotals(); return; }
    if (el.dataset.n != null) {
      items[+el.dataset.n][el.dataset.k] = el.dataset.k === "name" ? el.value : +el.value || 0;
      drawTotals();
    }
  });
  body.addEventListener("click", (ev) => {
    const rm = ev.target.closest("[data-rm]");
    if (rm) { items = items.filter((_, i) => i !== +rm.dataset.rm); drawItems(); }
  });
  $("#review-save").addEventListener("click", () => {
    const mult = +$("#portion").value / 100;
    const tot = calc.sumFoods(items);
    const r = (x) => Math.round(x * mult);
    const ok = addFood({
      name: items.map((i) => i.name).join(", ") || text || "Refeição",
      kcal: r(tot.kcal), p: r(tot.p), c: r(tot.c), f: r(tot.f), fiber: r(tot.fiber),
      source: imageDataUrl ? "photo" : "text", thumb: imageDataUrl ? pendingPhoto?.thumb : undefined,
      items: items.map((i) => ({ ...i, grams: r(i.grams) })),
    });
    if (ok) closeModal();
  });
}

function manualModal() {
  openModal(`<h2>Registrar manualmente</h2>
    <form id="man-form" class="form">
      <label>O que comeu<input name="name" required placeholder="ex.: Barra de proteína"></label>
      <div class="grid2">
        <label>Kcal<input name="kcal" type="number" inputmode="numeric" required></label>
        <label>Proteína (g)<input name="p" type="number" inputmode="decimal" value="0"></label>
        <label>Carbo (g)<input name="c" type="number" inputmode="decimal" value="0"></label>
        <label>Gordura (g)<input name="f" type="number" inputmode="decimal" value="0"></label>
      </div>
      <label>Refeição<select name="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === mealForTime().id ? "selected" : ""}>${m.name}</option>`).join("")}</select></label>
      <div class="row-end"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button class="btn" type="submit">Adicionar</button></div>
    </form>`);
  $("#man-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    if (addFood({ name: f.name, kcal: +f.kcal, p: +f.p, c: +f.c, f: +f.f, fiber: 0, source: "manual", meal: f.meal })) closeModal();
  });
}

// ---------- ajustes ----------
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });

function settingsModal(first = false) {
  const { profile: p, settings: s } = store.get();
  const num = (name, label, val, step = "1", extra = "") => `<label>${label}<input name="${name}" type="number" inputmode="decimal" step="${step}" value="${val ?? ""}" ${extra}></label>`;
  openModal(`<h2>${first ? "Bem-vindo! 👋" : "Ajustes"}</h2>
    ${first ? `<p>Vamos configurar seu nutricionista. Seus dados ficam <b>só neste celular</b>.</p>` : ""}
    <form id="set-form" class="form">
      <h3>Você</h3>
      <div class="grid2">
        <label>Nome<input name="name" value="${esc(p.name)}"></label>
        <label>Sexo<select name="sex"><option value="M" ${p.sex === "M" ? "selected" : ""}>Masculino</option><option value="F" ${p.sex === "F" ? "selected" : ""}>Feminino</option></select></label>
        ${num("age", "Idade", p.age)}
        ${num("heightCm", "Altura (cm)", p.heightCm)}
        ${num("startWeight", "Peso inicial (kg)", p.startWeight, "0.1")}
        ${num("goalWeight", "Peso meta (kg)", p.goalWeight, "0.1")}
        ${num("goalFatPct", "% gordura meta", p.goalFatPct, "0.1")}
      </div>
      <h3>Metas diárias</h3>
      <div class="grid2">
        ${num("baseKcal", "Kcal/dia", p.baseKcal)}
        ${num("proteinPerKg", "Proteína (g/kg)", p.proteinPerKg, "0.1")}
        ${num("fatPerKg", "Gordura mín. (g/kg)", p.fatPerKg, "0.1")}
        ${num("carbsMax", "Carbo máx. (g)", p.carbsMax)}
        ${num("fiberMin", "Fibra mín. (g)", p.fiberMin)}
        ${num("waterMl", "Água (mL)", p.waterMl, "100")}
        ${num("stepsGoal", "Passos/dia", p.stepsGoal, "500")}
        <label>Kcal de exercício devolvidas<select name="exerciseCredit">${[0, 0.25, 0.5, 0.75, 1].map((v) => `<option value="${v}" ${p.exerciseCredit === v ? "selected" : ""}>${v * 100}%</option>`).join("")}</select></label>
      </div>
      <h3>Rotina</h3>
      <label>Dias de musculação</label>
      <div class="days">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="day"><input type="checkbox" name="td" value="${d}" ${p.trainingDays.includes(d) ? "checked" : ""}><span>${WEEKDAYS[d].slice(0, 3)}</span></label>`).join("")}</div>
      <label>Dia do jejum de 24 h<select name="fastWeekday">${WEEKDAYS.map((w, i) => `<option value="${i}" ${p.fastWeekday === i ? "selected" : ""}>${w}</option>`).join("")}</select></label>
      <h3>Análise de fotos (IA)</h3>
      <p class="muted small">Para contar calorias pela foto, crie uma chave em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> e cole abaixo. Fica salva só neste aparelho. Custo aproximado: alguns centavos por foto.</p>
      <label>Chave da API<input name="apiKey" type="password" autocomplete="off" value="${esc(s.apiKey)}" placeholder="sk-ant-..."></label>
      <label>Modelo<select name="model">
        <option value="claude-opus-5-5" ${s.model === "claude-opus-5-5" ? "selected" : ""}>Claude Opus 5.5 (mais preciso)</option>
        <option value="claude-sonnet-5-5" ${s.model === "claude-sonnet-5-5" ? "selected" : ""}>Claude Sonnet 5.5 (mais barato)</option>
      </select></label>
      <div class="row-end"><button class="btn" type="submit">Salvar</button></div>
    </form>
    ${first ? "" : `<h3>Backup</h3>
    <p class="muted small">Os dados ficam no navegador. Exporte de vez em quando para não perder.</p>
    <div class="row-center">
      <button class="btn ghost" data-act="export">⬇ Exportar</button>
      <label class="btn ghost">⬆ Importar<input type="file" accept="application/json" id="import" hidden></label>
      ${installEvt ? `<button class="btn ghost" data-act="install">📲 Instalar app</button>` : ""}
    </div>`}`);

  $("#set-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const f = Object.fromEntries(fd);
    const n = (k) => (f[k] === "" ? null : +String(f[k]).replace(",", "."));
    store.update((st) => {
      Object.assign(st.profile, {
        name: f.name, sex: f.sex, age: n("age"), heightCm: n("heightCm"), startWeight: n("startWeight"),
        goalWeight: n("goalWeight"), goalFatPct: n("goalFatPct"), baseKcal: n("baseKcal") || 2000,
        proteinPerKg: n("proteinPerKg") || 2.2, fatPerKg: n("fatPerKg") || 0.8, carbsMax: n("carbsMax") || 190,
        fiberMin: n("fiberMin") || 25, waterMl: n("waterMl") || 3000, stepsGoal: n("stepsGoal") || 8000,
        exerciseCredit: +f.exerciseCredit, fastWeekday: +f.fastWeekday,
        trainingDays: fd.getAll("td").map(Number),
      });
      st.settings.apiKey = f.apiKey.trim();
      st.settings.model = f.model;
      st.onboarded = true;
    });
    closeModal();
    toast("Ajustes salvos");
  });
  $("#import")?.addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!confirm("Substituir todos os dados deste aparelho pelo backup?")) return;
      store.replaceAll(data);
      closeModal();
      toast("Backup restaurado");
    } catch { alert("Arquivo inválido."); }
  });
}

function exportData() {
  const data = structuredClone(store.get());
  data.settings.apiKey = ""; // nunca exporta a chave
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nutri-backup-${store.dateKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- ações ----------
const actions = {
  go: (el) => go(el.dataset.tab),
  close: closeModal,
  photo: () => $("#camera").click(),
  describe: describeModal,
  manual: manualModal,
  water: (el) => store.update(() => { const d = store.day(); d.water = Math.max(0, d.water + +el.dataset.ml); }),
  "del-food": (el) => {
    if (!confirm("Remover este registro?")) return;
    store.update((s) => { for (const d of Object.values(s.days)) d.foods = d.foods.filter((f) => f.id !== el.dataset.id); });
  },
  "log-plan": (el) => {
    const m = MEALS.find((x) => x.id === el.dataset.meal);
    const o = m.options.find((x) => x.id === el.dataset.opt);
    addFood({ name: `${m.name}: ${o.name}`, meal: m.id, option: o.id, kcal: o.kcal, p: o.p, c: o.c, f: o.f, fiber: o.fiber, source: "plan" });
  },
  opt: (el) => { chosenOpt[el.dataset.meal] = el.dataset.opt; render(); },
  check: (el) => store.update(() => { const d = store.day(); d.checks = { ...(d.checks || {}), [el.dataset.i]: el.checked }; }),
  "log-strength": () => saveActivity({ type: "musculacao", minutes: 60, intensity: "moderada" }, calc.currentWeight()),
  "save-steps": () => { store.update(() => { store.day().steps = +$("#steps").value || 0; }); toast("Passos salvos"); },
  "del-workout": (el) => store.update(() => { const d = store.day(); d.workouts = d.workouts.filter((w) => w.id !== el.dataset.id); }),
  chart: (el) => { chartField = el.dataset.f; render(); },
  "new-metric": metricModal,
  "del-metric": (el) => { if (confirm("Apagar esta medição?")) store.update((s) => { s.metrics = s.metrics.filter((m) => m.id !== el.dataset.id); }); },
  "apply-adj": (el) => {
    const delta = +el.dataset.delta;
    store.update((s) => {
      s.profile.baseKcal += delta;
      s.kcalAdjustments.push({ date: store.dateKey(), delta, reason: "reavaliação 4 semanas" });
    });
    toast(delta ? `Nova meta: ${fmt(store.get().profile.baseKcal)} kcal` : "Reavaliação registrada");
  },
  "start-fast": (el) => store.update((s) => { s.fasts.push({ id: store.uid(), start: new Date().toISOString(), end: null, targetH: +el.dataset.h || 24 }); }),
  "start-fast-at": () => fastStartModal(null),
  "edit-fast": () => fastStartModal(activeFast()),
  "stop-fast": () => {
    const f = activeFast();
    if (fastHours(f) < f.targetH * 0.95 && !confirm("Interromper o jejum antes da meta?")) return;
    store.update((s) => { s.fasts.find((x) => x.id === f.id).end = new Date().toISOString(); });
    toast(`Jejum encerrado: ${fmt(fastHours(f), 1)} h`);
  },
  "del-fast": (el) => { if (confirm("Apagar este jejum?")) store.update((s) => { s.fasts = s.fasts.filter((f) => f.id !== el.dataset.id); }); },
  settings: () => settingsModal(false),
  export: exportData,
  install: async () => { if (installEvt) { installEvt.prompt(); installEvt = null; closeModal(); } },
};

document.addEventListener("click", (ev) => {
  const nav = ev.target.closest(".nav-btn");
  if (nav) return go(nav.dataset.tab);
  const el = ev.target.closest("[data-act]");
  if (!el || (el.tagName === "INPUT" && el.type === "checkbox" && el.dataset.act !== "check")) return;
  const fn = actions[el.dataset.act];
  if (fn) { if (el.tagName !== "INPUT") ev.preventDefault(); fn(el); }
});
$("#modal").addEventListener("click", (ev) => { if (ev.target.id === "modal") closeModal(); });
$("#camera").addEventListener("change", (ev) => {
  const file = ev.target.files[0];
  ev.target.value = "";
  if (file) startPhoto(file).catch((e) => { alert("Erro ao ler a foto: " + e.message); });
});
$("#gear").addEventListener("click", () => settingsModal(false));
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (t && t !== tab && TABS.some((x) => x.id === t)) { tab = t; render(); } });
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

store.subscribe(() => render());
store.pruneThumbs();
if (!TABS.some((t) => t.id === tab)) tab = "hoje";
render();
if (!store.get().onboarded) settingsModal(true);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
