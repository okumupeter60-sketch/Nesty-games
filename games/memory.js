(window.Games = window.Games || {}).memory = {
  name: "Memory Match",
  start(root, { sfx }) {
    const LV = { easy: [4, 3], medium: [4, 4], hard: [6, 4] };
    const E = ["🦁", "🐯", "🦊", "🐼", "🐸", "🦉", "🐲", "🦄", "🚀", "⚡", "🎮", "👑"];
    let lvl = "easy", cards, open, moves, done, lock, best = {};
    function reset() {
      const [c, r] = LV[lvl], n = c * r / 2;
      cards = [...E.slice(0, n), ...E.slice(0, n)].sort(() => Math.random() - .5).map(e => ({ e, f: false, m: false }));
      open = []; moves = 0; done = 0; lock = false; draw();
    }
    function draw() {
      const [c] = LV[lvl];
      root.innerHTML = `<div class="chips">${Object.keys(LV).map(l => `<button class="chip ${l === lvl ? "on" : ""}" data-l="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}</div>
        <div class="score"><div>${moves}<small>Moves</small></div><div>${best[lvl] || "–"}<small>Best</small></div></div>
        <div class="mem" style="grid-template-columns:repeat(${c},1fr)">${cards.map((k, i) => `<button class="mc ${k.f || k.m ? "up" : ""} ${k.m ? "ok" : ""}" data-i="${i}" aria-label="Card ${i + 1}">${k.f || k.m ? k.e : ""}</button>`).join("")}</div>
        ${done === cards.length / 2 ? `<div class="status">Cleared in ${moves} moves!</div>` : ""}
        <button class="btn" data-r="1">New game</button>`;
    }
    root.onclick = e => {
      const t = e.target.closest("[data-i],[data-l],[data-r]");
      if (!t) return;
      if (t.dataset.l) { sfx.click(); lvl = t.dataset.l; return reset(); }
      if (t.dataset.r) { sfx.click(); return reset(); }
      const k = cards[+t.dataset.i];
      if (lock || k.f || k.m) return;
      k.f = true; open.push(k); sfx.tap("X"); draw();
      if (open.length === 2) {
        moves++; lock = true;
        const [a, b] = open, hit = a.e === b.e;
        setTimeout(() => {
          if (hit) {
            a.m = b.m = true; done++; sfx.tap("O");
            if (done === cards.length / 2) { sfx.win(); if (!best[lvl] || moves < best[lvl]) best[lvl] = moves; }
          }
          a.f = b.f = false; open = []; lock = false; draw();
        }, hit ? 300 : 700);
      }
    };
    reset();
  }
};
