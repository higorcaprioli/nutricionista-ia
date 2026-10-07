// Login local: senha/PIN (PBKDF2) e, se o aparelho suportar, digital (WebAuthn).
// Protege o acesso ao app neste celular; os dados continuam no localStorage.
import * as store from "./store.js";

const SESSION_KEY = "nutri.unlocked";
const LOCK_AFTER_MS = 5 * 60 * 1000; // bloqueia de novo após 5 min em segundo plano

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

let failures = 0, blockedUntil = 0;

export function hasAccount() { return !!store.get().auth?.hash; }

export function isUnlocked() {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

function setUnlocked(v) {
  try { v ? sessionStorage.setItem(SESSION_KEY, "1") : sessionStorage.removeItem(SESSION_KEY); } catch {}
}

export function lock() { setUnlocked(false); }

async function hashPassword(password, saltB64) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64(saltB64), iterations: 150000 }, key, 256);
  return toB64(bits);
}

export async function setPassword(password) {
  const salt = toB64(randomBytes(16));
  const hash = await hashPassword(password, salt);
  store.update((s) => { s.auth = { ...(s.auth || {}), salt, hash }; });
}

export async function checkPassword(password) {
  const a = store.get().auth;
  return !!a?.hash && (await hashPassword(password, a.salt)) === a.hash;
}

// ---------- digital (WebAuthn, autenticador do próprio aparelho) ----------
export async function biometricAvailable() {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch { return false; }
}

export async function enableBiometric() {
  const name = store.get().auth?.name || "usuario";
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "Nutri IA", id: location.hostname },
      user: { id: randomBytes(16), name, displayName: name },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
    },
  });
  store.update((s) => { s.auth.credId = toB64(cred.rawId); });
}

export function disableBiometric() {
  store.update((s) => { delete s.auth.credId; });
}

async function biometricUnlock() {
  const id = store.get().auth?.credId;
  if (!id) return false;
  await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: fromB64(id) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return true;
}

// ---------- tela ----------
function screen() {
  let el = document.getElementById("login");
  if (!el) {
    el = document.createElement("div");
    el.id = "login";
    el.className = "login";
    document.body.appendChild(el);
  }
  document.body.classList.add("locked");
  return el;
}

function close(el, onDone) {
  el.remove();
  document.body.classList.remove("locked");
  setUnlocked(true);
  onDone();
}

export async function showLogin(onDone) {
  const el = screen();
  const bio = await biometricAvailable();
  hasAccount() ? renderUnlock(el, bio, onDone) : renderCreate(el, bio, onDone);
}

function renderCreate(el, bio, onDone) {
  el.innerHTML = `<div class="login-box">
    <img class="login-logo" src="icons/icon-192.png" alt="">
    <h1>Nutri IA</h1>
    <p class="muted">Crie seu acesso. Ele protege seus dados neste celular.</p>
    <form id="create-form" class="form">
      <label>Seu nome<input name="name" autocomplete="name" required value="${esc(store.get().profile.name)}"></label>
      <label>Senha ou PIN (mín. 4 caracteres)<input name="pw" type="password" autocomplete="new-password" minlength="4" required></label>
      <label>Confirme a senha<input name="pw2" type="password" autocomplete="new-password" minlength="4" required></label>
      ${bio ? `<label class="check"><input type="checkbox" name="bio" checked><span>Entrar também com a digital</span></label>` : ""}
      <div class="login-err" id="login-err"></div>
      <button class="btn wide" type="submit">Criar acesso</button>
    </form>
  </div>`;
  el.querySelector("#create-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    const err = el.querySelector("#login-err");
    if (f.pw !== f.pw2) { err.textContent = "As senhas não conferem."; return; }
    store.update((s) => { s.auth = { name: f.name.trim() }; if (!s.profile.name) s.profile.name = f.name.trim(); });
    await setPassword(f.pw);
    if (f.bio) {
      try { await enableBiometric(); } catch { /* usuário cancelou: segue só com senha */ }
    }
    close(el, onDone);
  });
}

function renderUnlock(el, bio, onDone) {
  const a = store.get().auth;
  const canBio = bio && a.credId;
  el.innerHTML = `<div class="login-box">
    <img class="login-logo" src="icons/icon-192.png" alt="">
    <h1>Olá, ${esc(a.name || "")}!</h1>
    <p class="muted">Digite sua senha para entrar.</p>
    <form id="unlock-form" class="form">
      <input name="pw" type="password" autocomplete="current-password" placeholder="Senha ou PIN" required autofocus>
      <div class="login-err" id="login-err"></div>
      <button class="btn wide" type="submit">Entrar</button>
    </form>
    ${canBio ? `<button class="btn ghost wide" id="bio-btn">👆 Entrar com a digital</button>` : ""}
    <button class="link" id="forgot">Esqueci a senha</button>
  </div>`;
  const err = el.querySelector("#login-err");

  el.querySelector("#unlock-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (Date.now() < blockedUntil) { err.textContent = `Muitas tentativas. Aguarde ${Math.ceil((blockedUntil - Date.now()) / 1000)} s.`; return; }
    const input = ev.target.pw;
    if (await checkPassword(input.value)) { failures = 0; close(el, onDone); return; }
    failures++;
    input.value = "";
    if (failures >= 5) { blockedUntil = Date.now() + 30000; failures = 0; err.textContent = "Senha incorreta 5 vezes. Aguarde 30 s."; }
    else err.textContent = "Senha incorreta.";
  });

  const tryBio = async () => {
    try { if (await biometricUnlock()) close(el, onDone); }
    catch { err.textContent = "Digital não reconhecida. Use a senha."; }
  };
  el.querySelector("#bio-btn")?.addEventListener("click", tryBio);
  if (canBio) tryBio();

  el.querySelector("#forgot").addEventListener("click", () => {
    if (!confirm("Como os dados ficam só neste celular, não dá para recuperar a senha.\n\nQuer APAGAR todos os dados do app e começar de novo?")) return;
    if (!confirm("Tem certeza? Peso, refeições, treinos e jejuns serão apagados.")) return;
    localStorage.removeItem("nutri.v1");
    setUnlocked(false);
    location.reload();
  });
}

// Bloqueia de novo quando o app fica muito tempo em segundo plano.
export function watchBackground(onLock) {
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hasAccount() && hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MS) { lock(); onLock(); }
  });
}
