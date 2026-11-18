(window.Games = window.Games || {}).tictactoe = {
  name: "Tic-Tac-Toe",
  start(root, { sfx }) {
    let mode = "cpu", lvl = "hard", b, turn, over, score;
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const win = s => L.find(l => s[l[0]] && s[l[0]] === s[l[1]] && s[l[0]] === s[l[2]]) || null;

    function mm(s, p, d) {
      const w = win(s);
      if (w) return s[w[0]] === "O" ? 10 - d : d - 10;
      if (s.every(Boolean)) return 0;
      let best = p === "O" ? -99 : 99;
      for (let i = 0; i < 9; i++) if (!s[i]) {
        s[i] = p;
        const v = mm(s, p === "O" ? "X" : "O", d + 1);
        s[i] = null;
        best = p === "O" ? Math.max(best, v) : Math.min(best, v);
      }
      return best;
    }
    function cpu() {
      const e = [...b.keys()].filter(i => !b[i]);
      const smart = lvl === "hard" || (lvl === "medium" && Math.random() < .6);
      if (!smart) return e[Math.random() * e.length | 0];
      let bs = -99, bm = [];
      for (const i of e) {
        b[i] = "O"; const v = mm(b, "X", 1); b[i] = null;
        if (v > bs) { bs = v; bm = [i]; } else if (v === bs) bm.push(i);
      }
      return bm[Math.random() * bm.length | 0];
    }

    function draw() {
      const w = win(b) || [];
      const status = over ? (w.length ? (mode === "cpu" ? (turn === "X" ? "You win!" : "Computer wins") : turn + " wins!") : "It’s a draw")
        : mode === "cpu" ? (turn === "X" ? "Your move" : "Computer is thinking…") : turn + "’s turn";
      const xl = mode === "cpu" ? "You (X)" : "Player X", ol = mode === "cpu" ? "Computer (O)" : "Player O";
      root.innerHTML = `
        <div class="chips">
          <button class="chip ${mode === "cpu" ? "on" : ""}" data-m="cpu">vs Computer</button>
          <button class="chip ${mode === "two" ? "on" : ""}" data-m="two">2 Players</button>
        </div>
        ${mode === "cpu" ? `<div class="chips">${["easy", "medium", "hard"].map(l => `<button class="chip ${lvl === l ? "on" : ""}" data-l="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}</div>` : ""}
        <div class="score"><div>${score.X}<small>${xl}</small></div><div>${score.D}<small>Draws</small></div><div>${score.O}<small>${ol}</small></div></div>
        <div class="status" aria-live="polite">${status}</div>
        <div class="board">${b.map((v, i) => `<button class="cell ${v || ""} ${w.includes(i) ? "w" : ""}" data-i="${i}" aria-label="Square ${i + 1} ${v || "empty"}">${v || ""}</button>`).join("")}</div>
        <button class="btn" data-r="1">${over ? "Play again" : "Restart round"}</button>`;
    }
    function reset(full) {
      b = Array(9).fill(null); turn = "X"; over = false;
      if (full) score = { X: 0, O: 0, D: 0 };
      draw();
    }
    function place(i) {
      b[i] = turn; sfx.tap(turn);
      if (win(b)) { over = true; score[turn]++; (mode === "cpu" && turn === "O" ? sfx.lose : sfx.win)(); }
      else if (b.every(Boolean)) { over = true; score.D++; sfx.draw(); }
      else turn = turn === "X" ? "O" : "X";
      draw();
      if (!over && mode === "cpu" && turn === "O") setTimeout(() => { if (!over && turn === "O") place(cpu()); }, 450);
    }

    root.onclick = e => {
      const t = e.target.closest("[data-i],[data-m],[data-l],[data-r]");
      if (!t) return;
      if (t.dataset.i !== undefined) {
        const i = +t.dataset.i;
        if (over || b[i] || (mode === "cpu" && turn === "O")) return;
        place(i);
      } else if (t.dataset.m) { sfx.click(); mode = t.dataset.m; reset(true); }
      else if (t.dataset.l) { sfx.click(); lvl = t.dataset.l; reset(true); }
      else { sfx.click(); reset(false); }
    };
    reset(true);
  }
};
           
