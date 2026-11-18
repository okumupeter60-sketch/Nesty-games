(window.Games = window.Games || {}).stick = {
  name: "Stick Fight",
  start(root, { sfx }) {
    const W = 480, H = 240, G = 196;
    const DIF = { easy: [.7, .6], normal: [1, 1], hard: [1.5, 1.4] };
    const WP = [{ n: "Fists", d: 8, r: 36, cd: 280 }, { n: "Bat", d: 17, r: 54, cd: 460 }, { n: "Pistol", d: 15, r: 0, cd: 340 }];
    const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} };
    let diff = "normal", unlocked = +store("sf_lv") || 1, coins = +store("sf_c") || 0;
    let lvl = 1, raf = 0, state = "menu", keys = {}, last = 0, P, E, B, spawned, total, spT, ctx;

    function menu() {
      state = "menu";
      root.innerHTML = `<p class="sub">Pick a difficulty, then a level. Zombies get tougher every level.</p>
        <div class="chips">${Object.keys(DIF).map(d => `<button class="chip ${d === diff ? "on" : ""}" data-d="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join("")}</div>
        <div class="lv">${Array.from({ length: 10 }, (_, i) => { const n = i + 1, lk = n > unlocked; return `<button class="chip ${lk ? "lock" : ""}" data-n="${n}" ${lk ? "disabled" : ""}>${lk ? "🔒" : n}</button>`; }).join("")}</div>
        <p class="sub">Coins: ${coins}. Weapons: fists, bat, pistol (swap in the fight).</p>`;
    }
    function begin(n) {
      lvl = n; state = "play";
      P = { x: 70, y: G, vy: 0, hp: 100, f: 1, cd: 0, w: 0, ammo: 30, at: 0, hit: 0 };
      E = []; B = []; spawned = 0; total = 4 + lvl * 2; spT = 0; keys = {};
      root.innerHTML = `<canvas class="cv" width="${W}" height="${H}"></canvas><div id="ov"></div>
        <div class="pad"><div><button data-k="l">◀</button><button data-k="r">▶</button></div>
        <div><button data-k="w">Swap</button><button data-k="j">Jump</button><button data-k="a" class="big">Hit</button></div></div>`;
      ctx = root.querySelector("canvas").getContext("2d");
    }
    const jump = () => { if (state === "play" && P.y >= G) { P.vy = -340; sfx.jump(); } };
    const swap = () => { if (state === "play") { P.w = (P.w + 1) % 3; sfx.click(); } };
    root.onpointerdown = e => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; e.preventDefault(); keys[k] = 1; if (k === "j") jump(); if (k === "w") swap(); };
    root.onpointerup = root.onpointercancel = e => { const k = e.target.dataset && e.target.dataset.k; if (k) keys[k] = 0; };
    root.onclick = e => {
      const t = e.target.closest("[data-d],[data-n],[data-x]");
      if (!t) return;
      sfx.click();
      if (t.dataset.d) { diff = t.dataset.d; menu(); }
      else if (t.dataset.n) begin(+t.dataset.n);
      else menu();
    };
    const KM = { ArrowLeft: "l", a: "l", ArrowRight: "r", d: "r", k: "a", x: "a", " ": "j", ArrowUp: "j", w: "w", q: "w" };
    const kd = e => { const k = KM[e.key]; if (!k) return; e.preventDefault(); if (!keys[k]) { if (k === "j") jump(); if (k === "w") swap(); } keys[k] = 1; };
    const ku = e => { const k = KM[e.key]; if (k) keys[k] = 0; };
    addEventListener("keydown", kd); addEventListener("keyup", ku);

    function attack() {
      const w = WP[P.w]; P.cd = w.cd; P.at = .18;
      if (P.w === 2) {
        if (P.ammo <= 0) { P.w = 0; return; }
        P.ammo--; B.push({ x: P.x + P.f * 16, y: P.y - 30, v: P.f * 560 }); sfx.shot(); return;
      }
      sfx.hit();
      E.forEach(e => { const dx = (e.x - P.x) * P.f; if (dx > -12 && dx < w.r && Math.abs(e.y - P.y) < 50) { e.hp -= w.d; e.x += P.f * 14; } });
    }
    function end(win) {
      state = win ? "win" : "lose"; store("sf_c", coins);
      if (win && lvl >= unlocked && lvl < 10) { unlocked = lvl + 1; store("sf_lv", unlocked); }
      win ? sfx.win() : sfx.lose();
      root.querySelector("#ov").innerHTML = `<div class="status">${win ? (lvl === 10 ? "All levels cleared!" : "Level " + lvl + " cleared!") : "You were overrun"}</div>
        ${win && lvl < 10 ? `<button class="btn" data-n="${lvl + 1}">Next level</button>` : ""}
        <button class="btn" data-n="${lvl}">${win ? "Replay level" : "Try again"}</button><button class="link" data-x="1">Level list</button>`;
    }
    function update(dt) {
      if (keys.l) { P.x -= 150 * dt; P.f = -1; }
      if (keys.r) { P.x += 150 * dt; P.f = 1; }
      P.x = Math.max(16, Math.min(W - 16, P.x));
      P.vy += 900 * dt; P.y += P.vy * dt; if (P.y >= G) { P.y = G; P.vy = 0; }
      P.cd -= dt * 1000; P.at -= dt; P.hit -= dt;
      if (keys.a && P.cd <= 0) attack();
      spT -= dt;
      if (spawned < total && spT <= 0) {
        spT = Math.max(.7, 2.2 - lvl * .12); spawned++;
        const hp = (26 + lvl * 7) * DIF[diff][0];
        E.push({ x: Math.random() < .5 ? -10 : W + 10, y: G, hp, max: hp, cd: 0, sp: 34 + lvl * 4 + Math.random() * 20, f: 1 });
      }
      for (const e of E) {
        const dx = P.x - e.x; e.f = dx > 0 ? 1 : -1; e.cd -= dt * 1000;
        if (Math.abs(dx) > 24) e.x += e.f * e.sp * dt;
        else if (e.cd <= 0 && P.y > G - 30) { e.cd = 900; P.hp -= (5 + lvl * .6) * DIF[diff][1]; P.hit = .2; sfx.hit(); }
      }
      for (const b of B) {
        b.x += b.v * dt;
        for (const e of E) if (!b.dead && Math.abs(e.x - b.x) < 12 && Math.abs(e.y - 30 - b.y) < 36) { e.hp -= WP[2].d; b.dead = 1; sfx.hit(); }
        if (b.x < -20 || b.x > W + 20) b.dead = 1;
      }
      B = B.filter(b => !b.dead);
      const alive = E.filter(e => e.hp > 0), k = E.length - alive.length;
      if (k) { coins += k * 5; P.ammo = Math.min(30, P.ammo + k * 3); E = alive; }
      if (P.hp <= 0) end(false); else if (spawned === total && !E.length) end(true);
    }
    function man(x, y, f, t, c, w, at, mv, zomb) {
      ctx.strokeStyle = c; ctx.lineWidth = 3.2; ctx.lineCap = "round";
      const s = mv ? Math.sin(t * 12) * 8 : 0, ex = zomb || at > 0 ? 20 : 7;
      ctx.beginPath(); ctx.arc(x, y - 46, 7, 0, 6.3); ctx.moveTo(x, y - 39); ctx.lineTo(x, y - 18);
      ctx.moveTo(x, y - 18); ctx.lineTo(x - s, y); ctx.moveTo(x, y - 18); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - 34); ctx.lineTo(x + f * ex, y - (zomb ? 32 : 27)); ctx.moveTo(x, y - 34); ctx.lineTo(x - f * 7, y - 25); ctx.stroke();
      if (w === 1) { ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + f * 8, y - 27); ctx.lineTo(x + f * 26, y - (at > 0 ? 30 : 46)); ctx.stroke(); }
      if (w === 2) { ctx.fillStyle = "#444"; ctx.fillRect(f > 0 ? x + 8 : x - 22, y - 31, 14, 5); }
    }
    function render(t) {
      if (!ctx || state === "menu") return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fff8e1"; ctx.fillRect(0, 0, W, G);
      ctx.fillStyle = "#f3e7bd";
      [[20, 70, 40], [80, 100, 30], [150, 60, 50], [230, 90, 36], [300, 110, 28], [360, 70, 44], [420, 96, 34]].forEach(([x, h, w]) => ctx.fillRect(x, G - h, w, h));
      ctx.fillStyle = "#e9e4d4"; ctx.fillRect(0, G, W, H - G);
      ctx.fillStyle = "#1d1a12"; ctx.fillRect(0, G, W, 3);
      for (const e of E) { man(e.x, e.y, e.f, t + e.sp, "#2f9e6a", 0, 0, true, true); ctx.fillStyle = "#d9442b"; ctx.fillRect(e.x - 12, e.y - 62, 24 * Math.max(0, e.hp / e.max), 3); }
      ctx.fillStyle = "#1d1a12"; B.forEach(b => ctx.fillRect(b.x, b.y, 8, 3));
      man(P.x, P.y, P.f, t, P.hit > 0 ? "#d9442b" : "#1d1a12", P.w, P.at, keys.l || keys.r);
      ctx.fillStyle = "#f2b705"; ctx.fillRect(P.x - 8, P.y - 49, 16, 3);
      ctx.fillStyle = "#e9e4d4"; ctx.fillRect(10, 10, 120, 10);
      ctx.fillStyle = "#d9442b"; ctx.fillRect(10, 10, 120 * Math.max(0, P.hp / 100), 10);
      ctx.fillStyle = "#1d1a12"; ctx.font = "bold 13px system-ui"; ctx.fillText("Level " + lvl + "   " + WP[P.w].n + (P.w === 2 ? " " + P.ammo : "") + "   Coins " + coins, 10, 38);
    }
    function tick(t) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
      if (state === "play") update(dt);
      render(t / 1000);
    }
    Games.stick.stop = () => { cancelAnimationFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
    menu(); raf = requestAnimationFrame(tick);
  }
};
