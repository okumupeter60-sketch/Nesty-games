const { Client, Account, ID } = Appwrite;
const account = new Account(new Client().setEndpoint(CFG.endpoint).setProject(CFG.project));
const $ = s => document.querySelector(s);
const app = $("#app");
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- Sound ---------- */
let ac, beatTimer, tm, inGame = false;
let sfxOn = LS("sfx") !== "0", musicOn = LS("music") !== "0";
function tone(f, d = .1, type = "sine", v = .15, t = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime + t;
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + d);
  o.connect(g); g.connect(ac.destination); o.start(n); o.stop(n + d);
}
const sfx = {
  tap: k => sfxOn && tone(k === "O" ? 390 : 520, .1, "triangle"),
  click: () => sfxOn && tone(300, .05, "square", .06),
  win: () => sfxOn && [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, "triangle", .15, i * .12)),
  lose: () => sfxOn && [392, 330, 262].forEach((f, i) => tone(f, .22, "sawtooth", .08, i * .15)),
  draw: () => sfxOn && [440, 440].forEach((f, i) => tone(f, .15, "sine", .12, i * .18))
};
function beat(on) {
  clearInterval(beatTimer);
  if (!on || !musicOn || !ac) return;
  let s = 0;
  const bass = { 0: 110, 6: 110, 10: 147 };
  beatTimer = setInterval(() => {
    if (s % 4 === 0) tone(80, .18, "sine", .12);
    if (s % 2 === 1) tone(7000, .03, "square", .015);
    if (bass[s % 16]) tone(bass[s % 16], .22, "triangle", .07);
    s++;
  }, 170);
}
document.addEventListener("pointerdown", () => {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); beat(inGame); }
  else if (ac.state === "suspended") ac.resume();
});
const tg = () => `<button class="ic" data-t="sfx" aria-pressed="${sfxOn}" title="Sound effects">🔊</button><button class="ic" data-t="music" aria-pressed="${musicOn}" title="Music">🎵</button>`;
function bindTg() {
  document.querySelectorAll("[data-t]").forEach(b => b.onclick = () => {
    if (b.dataset.t === "sfx") { sfxOn = !sfxOn; LS("sfx", +sfxOn); }
    else { musicOn = !musicOn; LS("music", +musicOn); beat(inGame); }
    b.setAttribute("aria-pressed", b.dataset.t === "sfx" ? sfxOn : musicOn);
  });
}

/* ---------- Helpers ---------- */
function view(h) { clearInterval(tm); app.innerHTML = h; scrollTo(0, 0); }
const msg = (t, ok) => { const m = $("#msg"); if (m) { m.textContent = t; m.className = "msg" + (ok ? " ok" : ""); } };
const shell = (title, body) => view(`<section class="card"><div class="logo">◆ Gold Arcade</div><h1>${title}</h1>${body}<p id="msg" class="msg" role="alert"></p></section>`);
const sendCode = (id, em) => account.createEmailToken(id, em);

/* ---------- Sign in ---------- */
function signIn() {
  inGame = false; beat(false);
  shell("Welcome back", `<input id="e" type="email" placeholder="Email" autocomplete="email"><input id="p" type="password" placeholder="Password" autocomplete="current-password"><button id="go" class="btn">Sign in</button><button id="fg" class="link">Reset password</button><button id="su" class="link">New here? Create account</button>`);
  $("#su").onclick = signUp; $("#fg").onclick = forgot;
  $("#go").onclick = async ev => {
    const em = $("#e").value.trim(), pw = $("#p").value;
    if (!em || !pw) return msg("Enter your email and password.");
    ev.target.disabled = true;
    try {
      await account.createEmailPasswordSession(em, pw);
      const u = await account.get();
      if (!u.emailVerification) {
        await account.deleteSession("current");
        await sendCode(u.$id, em);
        return codeView(u.$id, em);
      }
      u.prefs.avatar ? home(u) : avatarView(u);
    } catch (err) { msg("Wrong email or password."); ev.target.disabled = false; }
  };
}

/* ---------- Create account ---------- */
function signUp() {
  shell("Create account", `<input id="u" placeholder="Username (3–16 letters or numbers)" maxlength="16" autocomplete="username"><input id="p" type="password" placeholder="Password (at least 8 characters)" autocomplete="new-password"><input id="c" type="password" placeholder="Confirm password" autocomplete="new-password"><input id="e" type="email" placeholder="Email" autocomplete="email"><button id="go" class="btn">Verify email</button><button id="si" class="link">I already have an account</button>`);
  $("#si").onclick = signIn;
  $("#go").onclick = async ev => {
    const un = $("#u").value.trim(), p = $("#p").value, c = $("#c").value, em = $("#e").value.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(un)) return msg("Username must be 3–16 letters, numbers or _.");
    if (p.length < 8) return msg("Password must have at least 8 characters.");
    if (p !== c) return msg("The two passwords do not match.");
    if (!/^\S+@\S+\.\S+$/.test(em)) return msg("Enter a valid email.");
    ev.target.disabled = true;
    try {
      const u = await account.create(ID.unique(), em, p, un);
      await sendCode(u.$id, em);
      codeView(u.$id, em);
    } catch (err) {
      msg(err.code === 409 ? "That email already has an account. Sign in instead." : "Could not create the account. Check your details and try again.");
      ev.target.disabled = false;
    }
  };
}

/* ---------- Verify code ---------- */
function codeView(id, em) {
  shell("Enter your code", `<p class="sub">We sent a 6-digit code to ${esc(em)}.</p><input id="k" inputmode="numeric" maxlength="6" placeholder="6-digit code" autocomplete="one-time-code"><button id="go" class="btn">Confirm</button><button id="rs" class="link" disabled></button>`);
  let left = 120; const rs = $("#rs");
  const tick = () => {
    rs.disabled = left > 0;
    rs.textContent = left > 0 ? `Resend code in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Resend code";
    if (left > 0) left--;
  };
  tick(); tm = setInterval(tick, 1000);
  rs.onclick = async () => {
    left = 120; tick();
    try { await sendCode(id, em); msg("New code sent.", true); } catch (e) { msg("Could not send a new code. Try again soon."); }
  };
  $("#go").onclick = async ev => {
    const k = $("#k").value.trim();
    if (!/^\d{6}$/.test(k)) return msg("Enter the 6-digit code.");
    ev.target.disabled = true;
    try {
      await account.createSession(id, k);
      const u = await account.get();
      u.prefs.avatar ? home(u) : avatarView(u);
    } catch (e) { msg("That code is wrong or has expired."); ev.target.disabled = false; }
  };
}

/* ---------- Profile picture ---------- */
function avatarView(u) {
  const list = ["🦁", "🐯", "🦊", "🐼", "🐸", "🦉", "🐲", "🦄", "🚀", "⚡", "🎮", "👑"];
  let pick = list[0];
  shell("Choose your picture", `<div class="avs">${list.map((a, i) => `<button data-a="${a}" class="${i ? "" : "on"}">${a}</button>`).join("")}</div><button id="go" class="btn">Save and play</button>`);
  document.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    pick = b.dataset.a; sfx.click();
    document.querySelectorAll("[data-a]").forEach(x => x.classList.toggle("on", x === b));
  });
  $("#go").onclick = async () => {
    try { await account.updatePrefs({ avatar: pick }); } catch (e) {}
    home({ ...u, prefs: { ...u.prefs, avatar: pick } });
  };
}

/* ---------- Reset password ---------- */
function forgot() {
  shell("Reset password", `<p class="sub">Enter your email and we will send a reset link if it has an account.</p><input id="e" type="email" placeholder="Email" autocomplete="email"><button id="go" class="btn">Send reset link</button><button id="si" class="link">Back to sign in</button>`);
  $("#si").onclick = signIn;
  $("#go").onclick = async ev => {
    const em = $("#e").value.trim();
    if (!em) return msg("Enter your email.");
    ev.target.disabled = true;
    try { await account.createRecovery(em, location.origin + location.pathname); } catch (e) {}
    msg("If that email has an account, a reset link is on its way.", true);
    setTimeout(() => ev.target.disabled = false, 30000);
  };
}
function resetView(userId, secret) {
  shell("New password", `<input id="p" type="password" placeholder="New password (at least 8 characters)" autocomplete="new-password"><input id="c" type="password" placeholder="Confirm new password" autocomplete="new-password"><button id="go" class="btn">Save password</button>`);
  $("#go").onclick = async ev => {
    const p = $("#p").value;
    if (p.length < 8) return msg("Password must have at least 8 characters.");
    if (p !== $("#c").value) return msg("The two passwords do not match.");
    ev.target.disabled = true;
    try {
      await account.updateRecovery(userId, secret, p);
      history.replaceState(null, "", location.pathname);
      signIn(); msg("Password changed. Sign in with your new password.", true);
    } catch (e) { msg("This reset link is invalid or has expired. Request a new one."); ev.target.disabled = false; }
  };
}

/* ---------- Home ---------- */
const CATALOG = [
  ["tictactoe", "Tic-Tac-Toe", "⭕", "vs computer or a friend"],
  ["checkers", "Checkers", "♟️", "Coming soon"],
  ["sudoku", "Sudoku", "🔢", "Coming soon"],
  ["cube", "Rubik’s Cube", "🧊", "Coming soon"],
  ["stick", "Stick Fight", "🥷", "Coming soon"]
];
function home(u) {
  inGame = false; beat(false);
  view(`<div class="top"><div class="me"><span class="av">${esc(u.prefs.avatar || "🎮")}</span><span>${esc(u.name)}</span></div>${tg()}<button id="out" class="ic" title="Sign out">⎋</button></div>
  <h1>Pick a game</h1>
  <div class="grid">${CATALOG.map(([id, n, i, s]) => `<button class="game" data-g="${id}" ${window.Games && Games[id] ? "" : "disabled"}><i>${i}</i>${n}<small>${s}</small></button>`).join("")}</div>`);
  bindTg();
  $("#out").onclick = async () => { try { await account.deleteSession("current"); } catch (e) {} signIn(); };
  document.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { sfx.click(); openGame(b.dataset.g, u); });
}
function openGame(id, u) {
  const g = Games[id];
  inGame = true;
  view(`<div class="bar"><button id="bk" class="link">← Home</button><b>${g.name}</b>${tg()}</div><div id="g"></div>`);
  bindTg(); beat(true);
  $("#bk").onclick = () => { sfx.click(); home(u); };
  g.start($("#g"), { sfx, user: u });
}

/* ---------- Start ---------- */
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get("userId") && q.get("secret")) return resetView(q.get("userId"), q.get("secret"));
  try {
    const u = await account.get();
    if (!u.emailVerification) { await account.deleteSession("current"); return signIn(); }
    u.prefs.avatar ? home(u) : avatarView(u);
  } catch (e) { signIn(); }
})();
