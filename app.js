// ===== helpers =====
function el(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === 'on') for (const ev in props.on) e.addEventListener(ev, props.on[ev]);
    else if (k === 'html') e.innerHTML = props[k];
    else if (k in e) e[k] = props[k];
    else e.setAttribute(k, props[k]);
  }
  kids.forEach(c => e.append(c));
  return e;
}
const rand = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const C = { ink: '#16181d', ivory: '#f7f4ee', paper: '#fffdf9', gold: '#a07c3f', line: '#ddd5c6', muted: '#3a3d45', sand: '#c2a878' };
const BLOCK_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];

// 画面遷移・ゲーム終了でまとめて解除するもの
let timers = [], listeners = [], gen = 0;
function clearAll() {
  timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  listeners.forEach(([t, ev, f]) => t.removeEventListener(ev, f));
  timers = []; listeners = []; gen++;
}
function listen(target, ev, f) { target.addEventListener(ev, f); listeners.push([target, ev, f]); }

const store = {
  read(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  played() { return this.read('played', []); },
  addPlayed(id) { const s = new Set(this.played()); s.add(id); this.write('played', [...s]); },
  best(id) { return this.read('best', {})[id]; },
  setBest(id, v, low) { const b = this.read('best', {}); const old = b[id]; if (old == null || (low ? v < old : v > old)) { b[id] = v; this.write('best', b); return true; } return false; },
};

// ===== SVG thumbnails =====
const R = (x, y, c, w = 12, h = 12, rx = 1.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
const T = (x, y, s, size = 14, c = 'tx') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" class="${c}">${s}</text>`;
const svg = inner => `<svg viewBox="0 0 160 100" aria-hidden="true" focusable="false">${inner}</svg>`;
const THUMB = {
  tetris: svg([[0,4,'m'],[1,4,'m'],[2,4,'g'],[3,4,'g'],[4,4,'m'],[6,4,'p'],[7,4,'p'],[0,3,'p'],[1,3,'m'],[2,3,'g'],[5,3,'m'],[6,3,'p'],[7,3,'m'],[0,2,'p'],[6,2,'m'],[3,0,'g'],[4,0,'g'],[4,1,'g'],[5,1,'g']].map(([x, y, c]) => R(28 + x * 13, 18 + y * 13, c)).join('')),
  snake: svg(`<path d="M28 72 H86 V40 H124" class="sg" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="124" cy="37" r="2" class="i"/><circle cx="58" cy="34" r="6" class="p"/>`),
  breakout: svg([0, 1, 2].map(r => [0, 1, 2, 3, 4, 5, 6].map(k => R(24 + k * 16, 16 + r * 10, r === 0 ? 'g' : r === 1 ? 'p' : 'm', 14, 7, 1)).join('')).join('') + R(64, 82, 'p', 36, 5, 2.5) + `<circle cx="96" cy="62" r="4" class="g"/>`),
  flappy: svg(R(40, 0, 'm', 20, 34, 2) + R(40, 70, 'm', 20, 30, 2) + R(112, 0, 'm', 20, 18, 2) + R(112, 54, 'm', 20, 46, 2) + `<circle cx="84" cy="50" r="9" class="g"/><circle cx="88" cy="47" r="2" class="i"/><path d="M93 51 l6 2 -6 2z" class="p"/>`),
  runner: svg(R(10, 80, 'm', 140, 2, 0) + R(40, 50, 'p', 18, 26, 3) + R(52, 54, 'i', 3, 3, 1) + R(104, 56, 'g', 8, 24, 2) + R(98, 62, 'g', 6, 4, 1) + R(112, 66, 'g', 6, 4, 1) + `<path d="M28 74 h6 M22 68 h8" class="sm" stroke-width="2" stroke-linecap="round"/>`),
  g2048: svg(R(44, 10, 'p', 34, 34, 3) + T(61, 27, '2', 16) + R(82, 10, 'm', 34, 34, 3) + T(99, 27, '8', 16, 'tp') + R(44, 50, 'g', 34, 34, 3) + T(61, 67, '64', 14, 'tp') + R(82, 50, 'p', 34, 34, 3) + T(99, 67, '2048', 10)),
  mines: svg([0, 1, 2, 3, 4].map(x => [0, 1, 2].map(y => R(42 + x * 16, 22 + y * 20, (x + y) % 3 ? 'm' : 'p', 14, 18, 2)).join('')).join('') + T(49, 31, '1', 11) + T(81, 51, '2', 11) + `<path d="M104 26 v12 M104 26 l8 3 -8 3" class="sg" stroke-width="2"/><circle cx="73" cy="71" r="5" class="g"/>`),
  mogura: svg(`<ellipse cx="80" cy="76" rx="40" ry="10" class="m"/>` + R(62, 40, 'g', 36, 38, 18) + `<circle cx="73" cy="54" r="2.5" class="i"/><circle cx="87" cy="54" r="2.5" class="i"/><ellipse cx="80" cy="61" rx="5" ry="3.5" class="p"/><path d="M40 78 a40 10 0 0 0 80 0z" class="m"/>`),
  hanno: svg(`<path d="M90 8 L58 56 H80 L70 92 L106 40 H84 Z" class="g"/><path d="M40 30 h10 M34 50 h12 M40 70 h10 M110 70 h10 M114 30 h10" class="sp" stroke-width="2.5" stroke-linecap="round"/>`),
  simon: svg(R(52, 20, 'g', 26, 26, 6) + R(82, 20, 'p', 26, 26, 6) + R(52, 50, 'm', 26, 26, 6) + R(82, 50, 'sand', 26, 26, 6)),
  memory: svg(`<g transform="rotate(-10 62 50)">${R(42, 22, 'm', 38, 54, 4)}${T(61, 49, '?', 18, 'tp')}</g><g transform="rotate(8 98 50)">${R(80, 20, 'p', 38, 54, 4)}<circle cx="99" cy="47" r="9" class="g"/></g>`),
  stop10: svg(`<circle cx="80" cy="54" r="30" class="sg" stroke-width="3"/>` + R(74, 14, 'g', 12, 6, 1.5) + `<path d="M80 54 L80 34" class="sp" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="54" r="3" class="p"/>`),
  oxgame: svg(`<path d="M68 18 v66 M92 18 v66 M48 40 h64 M48 62 h64" class="sm" stroke-width="2.5"/><circle cx="58" cy="29" r="7" class="sp" stroke-width="3"/><circle cx="80" cy="51" r="7" class="sp" stroke-width="3"/><path d="M96 66 l12 12 M108 66 l-12 12 M96 22 l12 12 M108 22 l-12 12" class="sg" stroke-width="3" stroke-linecap="round"/>`),
  lights: svg([0, 1, 2, 3].map(x => [0, 1, 2].map(y => `<circle cx="${56 + x * 16}" cy="${30 + y * 20}" r="6" class="${[1, 4, 6, 7, 10].includes(x * 3 + y) ? 'g' : 'm'}"/>`).join('')).join('')),
  puzzle8: svg([1, 2, 3, 4, 5, 0, 7, 8, 6].map((n, i) => n ? R(50 + (i % 3) * 21, 12 + Math.floor(i / 3) * 26, n === 6 ? 'g' : 'p', 19, 24, 2) + T(59.5 + (i % 3) * 21, 24 + Math.floor(i / 3) * 26, n, 11) : '').join('')),
};

const DECO = `<svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs><radialGradient id="glow" cx="78%" cy="40%" r="55%"><stop offset="0" stop-color="#a07c3f" stop-opacity=".45"/><stop offset="1" stop-color="#a07c3f" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="520" fill="url(#glow)"/>
  <g class="float f1"><rect x="640" y="60" width="34" height="34" rx="4" class="g"/><rect x="676" y="60" width="34" height="34" rx="4" class="g"/><rect x="676" y="96" width="34" height="34" rx="4" class="g"/><rect x="712" y="96" width="34" height="34" rx="4" class="g"/></g>
  <g class="float f2"><circle cx="1080" cy="110" r="38" fill="none" stroke="#f7f4ee" stroke-opacity=".5" stroke-width="3"/></g>
  <g class="float f3"><path d="M980 380 l40 40 M1020 380 l-40 40" stroke="#a07c3f" stroke-width="6" stroke-linecap="round"/></g>
  <g class="float f1"><path d="M560 420 H640 V370 H700" fill="none" stroke="#f7f4ee" stroke-opacity=".35" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>
  <g class="float f2"><path d="M1150 250 L1118 298 H1140 L1130 334 L1166 282 H1144 Z" class="g"/></g>
  <g class="float f3"><circle cx="840" cy="470" r="10" class="g"/><circle cx="880" cy="470" r="10" fill="#f7f4ee" fill-opacity=".4"/><circle cx="920" cy="470" r="10" class="g"/></g>
</svg>`;

// ===== games（刺激の強い順） =====
const CATS = { action: 'アクション', puzzle: 'パズル', brain: '頭脳・記憶', reflex: '反射・感覚' };
const GAMES = [
  {
    id: 'tetris', name: 'テトリス', cat: 'action', time: '3分〜', how: '矢印キー・スペース', best: 'high', unit: '点',
    desc: '落ちてくるブロックを揃えて消す定番。',
    rule: '←→で移動、↑で回転、↓で少し落下、スペースで一気に落とします。横一列が揃うと消えて得点。積み上がって置けなくなったら終了。',
    ad: { href: 'https://neuroi014.github.io/tetra-nova/', title: 'TETRA NOVA', text: 'もっと本格的なテトリスを遊ぶなら。演出もこだわった特別版。' },
    start(c) {
      const W = 10, H = 20, S = 24, ctx = c.canvas(W * S, H * S, 'テトリスの盤面');
      const P = [[[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]], [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]]];
      const COL = [C.gold, C.ink, '#5b6b7a', '#7d8b6a', '#8c4a4a', '#2f3e5c', C.sand];
      const g = Array.from({ length: H }, () => Array(W).fill(0));
      let cur, x, y, col, score = 0, lines = 0, acc = 0, over = false;
      const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
      const hit = (m, px, py) => m.some((r, dy) => r.some((v, dx) => v && (px + dx < 0 || px + dx >= W || py + dy >= H || (py + dy >= 0 && g[py + dy][px + dx]))));
      function spawn() { const k = rand(7); cur = P[k]; col = k + 1; x = 3; y = 0; if (hit(cur, x, y)) { over = true; c.end(`${lines}ライン・${score}点`, score); } }
      function lock() {
        cur.forEach((r, dy) => r.forEach((v, dx) => { if (v && y + dy >= 0) g[y + dy][x + dx] = col; }));
        let n = 0;
        for (let r = H - 1; r >= 0; r--) if (g[r].every(Boolean)) { g.splice(r, 1); g.unshift(Array(W).fill(0)); n++; r++; }
        if (n) { lines += n; score += [0, 100, 300, 500, 800][n]; c.say(`${lines}ライン・${score}点`); }
        spawn();
      }
      function drop() { if (!hit(cur, x, y + 1)) y++; else lock(); }
      function draw() {
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W * S, H * S);
        ctx.strokeStyle = '#efe9de'; for (let i = 1; i < W; i++) { ctx.beginPath(); ctx.moveTo(i * S, 0); ctx.lineTo(i * S, H * S); ctx.stroke(); }
        const cell = (px, py, v) => { ctx.fillStyle = COL[v - 1]; ctx.fillRect(px * S + 1, py * S + 1, S - 2, S - 2); };
        g.forEach((r, py) => r.forEach((v, px) => v && cell(px, py, v)));
        if (!over) cur.forEach((r, dy) => r.forEach((v, dx) => v && cell(x + dx, y + dy, col)));
      }
      c.keys(e => {
        if (over) return;
        const k = e.key;
        if (k === 'ArrowLeft' && !hit(cur, x - 1, y)) x--;
        else if (k === 'ArrowRight' && !hit(cur, x + 1, y)) x++;
        else if (k === 'ArrowDown') drop();
        else if (k === 'ArrowUp') { const m = rot(cur); for (const o of [0, -1, 1, -2, 2]) if (!hit(m, x + o, y)) { cur = m; x += o; break; } }
        else if (k === ' ') { while (!hit(cur, x, y + 1)) y++; lock(); }
        if (!over) draw();
      }, true);
      spawn(); draw();
      c.say('0ライン・0点');
      c.loop(k => { acc += k * 16.7; if (acc > Math.max(120, 600 - lines * 30)) { acc = 0; drop(); } if (!over) draw(); });
    },
  },
  {
    id: 'snake', name: 'スネーク', cat: 'action', time: '1〜3分', how: '矢印キー / WASD', best: 'high', unit: '個',
    desc: 'エサを食べるほど長くなるヘビ。',
    rule: '矢印キー（またはWASD）でヘビの向きを変え、金色のエサを食べます。壁や自分の体にぶつかったら終了。',
    start(c) {
      const N = 20, S = 20, ctx = c.canvas(N * S, N * S, 'スネークの盤面');
      let snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }], dir = { x: 1, y: 0 }, nd = dir, food, eaten = 0;
      const place = () => { do { food = { x: rand(N), y: rand(N) }; } while (snake.some(s => s.x === food.x && s.y === food.y)); };
      const D = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
      c.keys(e => { const v = D[e.key]; if (v && !(v[0] === -dir.x && v[1] === -dir.y)) nd = { x: v[0], y: v[1] }; }, true);
      function draw() {
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, N * S, N * S);
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(food.x * S + S / 2, food.y * S + S / 2, S / 2 - 3, 0, 7); ctx.fill();
        snake.forEach((s, i) => { ctx.fillStyle = i ? C.muted : C.ink; ctx.fillRect(s.x * S + 1, s.y * S + 1, S - 2, S - 2); });
      }
      place(); draw(); c.say('エサ 0個');
      c.interval(() => {
        dir = nd;
        const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(s => s.x === h.x && s.y === h.y)) return c.end(`エサを${eaten}個食べた`, eaten);
        snake.unshift(h);
        if (h.x === food.x && h.y === food.y) { eaten++; place(); c.say(`エサ ${eaten}個`); } else snake.pop();
        draw();
      }, 110);
    },
  },
  {
    id: 'breakout', name: 'ブロック崩し', cat: 'action', time: '2〜3分', how: '←→キー / マウス', best: 'high', unit: '個',
    desc: 'ボールを跳ね返してブロックを壊す。',
    rule: '←→キー（またはマウス）でバーを動かし、ボールを跳ね返してブロックを全部壊します。ボールを3回落とすと終了。',
    start(c) {
      const W = 480, H = 360, ctx = c.canvas(W, H, 'ブロック崩しの画面');
      const pw = 80, py = H - 24; let px = (W - pw) / 2, lives = 3, score = 0;
      const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 6 };
      const reset = () => { ball.x = W / 2; ball.y = H - 60; ball.vx = (Math.random() < .5 ? -1 : 1) * 3; ball.vy = -4; };
      const bw = 54, bh = 16, bricks = [];
      for (let r = 0; r < 5; r++) for (let k = 0; k < 8; k++) bricks.push({ x: 12 + k * 58, y: 40 + r * 22, r, alive: true });
      c.on(ctx.canvas, 'mousemove', e => { const b = ctx.canvas.getBoundingClientRect(); px = Math.max(0, Math.min(W - pw, (e.clientX - b.left) * W / b.width - pw / 2)); });
      c.keys(() => {}, true);
      reset(); c.say(`残り ${lives} ・ ${score}個`);
      c.loop(k => {
        if (c.held.has('ArrowLeft')) px = Math.max(0, px - 7 * k);
        if (c.held.has('ArrowRight')) px = Math.min(W - pw, px + 7 * k);
        ball.x += ball.vx * k; ball.y += ball.vy * k;
        if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x)); }
        if (ball.y < ball.r) { ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && ball.y + ball.r >= py && ball.y < py + 10 && ball.x > px - 4 && ball.x < px + pw + 4) {
          ball.vy = -Math.abs(ball.vy); ball.vx = ((ball.x - (px + pw / 2)) / (pw / 2)) * 5;
        }
        for (const b of bricks) if (b.alive && ball.x > b.x && ball.x < b.x + bw && ball.y - ball.r < b.y + bh && ball.y + ball.r > b.y) {
          b.alive = false; ball.vy *= -1; score++; c.say(`残り ${lives} ・ ${score}個`);
          if (score === bricks.length) return c.end(`全${score}個クリア！`, score);
          break;
        }
        if (ball.y > H + 20) { lives--; if (!lives) return c.end(`${score}個こわした`, score); c.say(`ミス！残り ${lives} ・ ${score}個`); reset(); }
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
        bricks.forEach(b => { if (b.alive) { ctx.fillStyle = [C.gold, C.sand, C.ink, C.muted, '#5b6b7a'][b.r]; ctx.fillRect(b.x, b.y, bw, bh); } });
        ctx.fillStyle = C.ink; ctx.fillRect(px, py, pw, 8);
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
      });
    },
  },
  {
    id: 'flappy', name: 'フラッピー', cat: 'action', time: '1分〜', how: 'スペース / クリック', best: 'high', unit: '本',
    desc: '羽ばたいて土管のすき間をくぐる。',
    rule: 'スペースキー（またはクリック）で羽ばたきます。土管にぶつからないように、すき間をくぐり抜けよう。最初の羽ばたきでスタート。',
    start(c) {
      const W = 400, H = 480, ctx = c.canvas(W, H, 'フラッピーの画面');
      const bx = 100; let by = H / 2, vy = 0, started = false, score = 0; const pipes = [];
      const flap = () => { started = true; vy = -7.2; };
      c.keys(e => { if (e.key === ' ' || e.key === 'ArrowUp') flap(); }, true);
      c.on(ctx.canvas, 'pointerdown', flap);
      c.say('スペースでスタート');
      c.loop(k => {
        if (started) {
          vy += .42 * k; by += vy * k;
          if (!pipes.length || pipes[pipes.length - 1].x < W - 210) pipes.push({ x: W, gap: 90 + rand(H - 280), passed: false });
          for (const p of pipes) {
            p.x -= 2.6 * k;
            if (!p.passed && p.x + 56 < bx) { p.passed = true; score++; c.say(`${score}本`); }
            if (bx + 12 > p.x && bx - 12 < p.x + 56 && (by - 12 < p.gap || by + 12 > p.gap + 150)) return c.end(`${score}本くぐった`, score);
          }
          if (pipes[0] && pipes[0].x < -60) pipes.shift();
          if (by > H - 12 || by < 12) return c.end(`${score}本くぐった`, score);
        }
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = C.muted; pipes.forEach(p => { ctx.fillRect(p.x, 0, 56, p.gap); ctx.fillRect(p.x, p.gap + 150, 56, H); });
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.fill();
        ctx.fillStyle = C.ink; ctx.font = 'italic 40px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.fillText(started ? score : 'Press Space', W / 2, 70);
      });
    },
  },
  {
    id: 'runner', name: 'ランナー', cat: 'action', time: '1分〜', how: 'スペース / ↑ / クリック', best: 'high', unit: 'm',
    desc: '障害物をジャンプでかわして走り続ける。',
    rule: 'スペースキー・↑キー・クリックでジャンプ。金色の障害物にぶつからずに、どこまで走れるか。だんだん速くなります。',
    start(c) {
      const W = 640, H = 220, G = 180, ctx = c.canvas(W, H, 'ランナーの画面');
      let y = G, vy = 0, started = false, dist = 0, speed = 5, nextGap = 300; const obs = [];
      const jump = () => { started = true; if (y >= G) vy = -11; };
      c.keys(e => { if (e.key === ' ' || e.key === 'ArrowUp') jump(); }, true);
      c.on(ctx.canvas, 'pointerdown', jump);
      c.say('スペースでスタート');
      c.loop(k => {
        if (started) {
          vy += .6 * k; y = Math.min(G, y + vy * k); if (y >= G) vy = 0;
          speed += .002 * k; dist += speed * k;
          nextGap -= speed * k;
          if (nextGap <= 0) { obs.push({ x: W, w: 14 + rand(14), h: 24 + rand(22) }); nextGap = 260 + rand(260); }
          for (const o of obs) {
            o.x -= speed * k;
            if (60 + 26 > o.x + 3 && 60 < o.x + o.w - 3 && y > G - o.h + 4) return c.end(`${Math.floor(dist / 10)}m 走った`, Math.floor(dist / 10));
          }
          if (obs[0] && obs[0].x < -40) obs.shift();
        }
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = C.line; ctx.fillRect(0, G, W, 2);
        ctx.fillStyle = C.ink; ctx.fillRect(60, y - 34, 26, 34);
        ctx.fillStyle = C.gold; obs.forEach(o => ctx.fillRect(o.x, G - o.h, o.w, o.h));
        ctx.fillStyle = C.ink; ctx.font = 'italic 28px "Cormorant Garamond", serif'; ctx.textAlign = 'right'; ctx.fillText(started ? `${Math.floor(dist / 10)} m` : 'Press Space', W - 16, 36);
      });
    },
  },
  {
    id: 'g2048', name: '2048', cat: 'puzzle', time: '3分〜', how: '矢印キー / ボタン', best: 'high', unit: '点',
    desc: '同じ数字を合体させて2048を目指す。',
    rule: '矢印キー（または画面の矢印ボタン）で全タイルを滑らせます。同じ数字がぶつかると合体。2048を作ればクリア、動かせなくなったら終了。',
    start(c) {
      const b = Array(16).fill(0); let score = 0;
      const grid = el('div', { className: 'board c4 tiles', 'aria-hidden': 'true' });
      const cells = b.map(() => el('div', { className: 'tile' }));
      cells.forEach(x => grid.append(x));
      const LINES = {
        left: [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(k => r * 4 + k)),
        right: [0, 1, 2, 3].map(r => [3, 2, 1, 0].map(k => r * 4 + k)),
        up: [0, 1, 2, 3].map(k => [0, 1, 2, 3].map(r => r * 4 + k)),
        down: [0, 1, 2, 3].map(k => [3, 2, 1, 0].map(r => r * 4 + k)),
      };
      const pad = el('div', { className: 'row' }, [['left', '← 左'], ['up', '↑ 上'], ['down', '↓ 下'], ['right', '→ 右']].map(([d, t]) => el('button', { textContent: t, on: { click: () => move(d) } })));
      c.area.append(grid, pad);
      const add = () => { const e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) b[e[rand(e.length)]] = Math.random() < .9 ? 2 : 4; };
      const canMove = () => b.includes(0) || b.some((v, i) => (i % 4 < 3 && v === b[i + 1]) || (i < 12 && v === b[i + 4]));
      function render() {
        cells.forEach((x, i) => { const v = b[i]; x.textContent = v || ''; x.dataset.v = Math.min(v, 2048); });
        c.say(`スコア ${score}・最大 ${Math.max(...b)}`);
      }
      function move(d) {
        let moved = false;
        for (const line of LINES[d]) {
          const vals = line.map(i => b[i]).filter(Boolean), out = [];
          for (let i = 0; i < vals.length; i++) { if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); score += vals[i] * 2; i++; } else out.push(vals[i]); }
          while (out.length < 4) out.push(0);
          line.forEach((idx, j) => { if (b[idx] !== out[j]) moved = true; b[idx] = out[j]; });
        }
        if (!moved) return;
        add(); render();
        if (b.includes(2048)) c.end(`2048達成！ ${score}点`, score);
        else if (!canMove()) c.end(`${score}点（最大 ${Math.max(...b)}）`, score);
      }
      c.keys(e => { const d = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]; if (d) move(d); }, true);
      add(); add(); render(); pad.children[0].focus();
    },
  },
  {
    id: 'mogura', name: 'もぐらたたき', cat: 'action', time: '20秒', how: 'クリック', timed: true, best: 'high', unit: '匹',
    desc: '出てきたもぐらを素早くたたく。',
    rule: '20秒間、穴から出てきたもぐら🐹をクリック。たたいた数がスコアです（時間制限あり）。',
    start(c) {
      let score = 0, mole = -1, left = 20;
      const timer = el('div', { className: 'bigdisplay', textContent: '20', 'aria-hidden': 'true' });
      const grid = el('div', { className: 'board c3', role: 'group', 'aria-label': '穴' });
      const holes = Array.from({ length: 9 }, (_, i) => el('button', { on: { click: () => hit(i) } }));
      holes.forEach(x => grid.append(x)); c.area.append(timer, grid);
      render(); holes[4].focus();
      c.say('スコア 0');
      function render() { holes.forEach((x, i) => { x.textContent = i === mole ? '🐹' : ''; x.setAttribute('aria-label', i === mole ? 'もぐら！' : '穴'); }); }
      function hit(i) { if (i !== mole || left <= 0) return; score++; mole = -1; render(); c.say(`スコア ${score}`); }
      c.interval(() => { let m; do { m = rand(9); } while (m === mole); mole = m; render(); }, 850);
      c.interval(() => { left--; timer.textContent = left; if (left <= 0) { mole = -1; render(); c.end(`${score}匹たたいた！`, score); } }, 1000);
    },
  },
  {
    id: 'mines', name: 'マインスイーパー', cat: 'puzzle', time: '2〜5分', how: 'クリック / 右クリック・Fで旗', best: 'low', unit: '秒',
    desc: '数字を手がかりに地雷を避けて開ける。',
    rule: 'マスを開けると、周りにある地雷の数が出ます。地雷以外をすべて開ければクリア。地雷だと思うマスには右クリック（またはFキー／旗モード）で旗を立てよう。',
    start(c) {
      const N = 9, M = 10, mine = Array(81).fill(false), open = Array(81).fill(false), flag = Array(81).fill(false);
      let placed = false, flagMode = false, opened = 0, t0 = 0;
      const nbs = i => { const r = Math.floor(i / N), k = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dk = -1; dk <= 1; dk++) { const rr = r + dr, kk = k + dk; if ((dr || dk) && rr >= 0 && rr < N && kk >= 0 && kk < N) o.push(rr * N + kk); } return o; };
      const cnt = i => nbs(i).filter(j => mine[j]).length;
      const fm = el('button', { textContent: '旗モード：OFF', 'aria-pressed': 'false', on: { click: () => { flagMode = !flagMode; fm.textContent = `旗モード：${flagMode ? 'ON' : 'OFF'}`; fm.setAttribute('aria-pressed', flagMode); } } });
      const grid = el('div', { className: 'board c9', role: 'group', 'aria-label': '地雷原' });
      const cells = mine.map((_, i) => el('button', { on: { click: () => flagMode ? toggle(i) : dig(i), contextmenu: e => { e.preventDefault(); toggle(i); } } }));
      cells.forEach(x => grid.append(x)); c.area.append(el('div', { className: 'row', style: 'margin-bottom:16px' }, [fm]), grid);
      c.keys(e => { if (e.key === 'f' || e.key === 'F') { const i = cells.indexOf(document.activeElement); if (i >= 0) toggle(i); } });
      render(); cells[40].focus(); c.say(`地雷 ${M}個・旗 0本`);
      function render() {
        cells.forEach((x, i) => {
          const n = open[i] ? (mine[i] ? '💣' : cnt(i) || '') : flag[i] ? '⚑' : '';
          x.textContent = n; x.classList.toggle('opened', open[i]); x.dataset.n = open[i] && !mine[i] ? cnt(i) : '';
          x.setAttribute('aria-label', `${Math.floor(i / N) + 1}行${i % N + 1}列 ${open[i] ? (mine[i] ? '地雷' : cnt(i) ? `周りに${cnt(i)}個` : '空') : flag[i] ? '旗' : '未開封'}`);
        });
      }
      function toggle(i) { if (open[i]) return; flag[i] = !flag[i]; render(); c.say(`地雷 ${M}個・旗 ${flag.filter(Boolean).length}本`); }
      function dig(i) {
        if (open[i] || flag[i]) return;
        if (!placed) { placed = true; t0 = performance.now(); const safe = new Set([i, ...nbs(i)]); let n = 0; while (n < M) { const j = rand(81); if (!mine[j] && !safe.has(j)) { mine[j] = true; n++; } } }
        if (mine[i]) { mine.forEach((m, j) => { if (m) open[j] = true; }); render(); return c.end('地雷を踏んでしまった…'); }
        const q = [i];
        while (q.length) { const j = q.pop(); if (open[j] || flag[j]) continue; open[j] = true; opened++; if (!cnt(j)) nbs(j).forEach(k => !open[k] && q.push(k)); }
        render();
        if (opened === 81 - M) { const s = Math.round((performance.now() - t0) / 1000); c.end(`${s}秒でクリア！`, s); }
        else c.say(`残り ${81 - M - opened}マス`);
      }
    },
  },
  {
    id: 'hanno', name: '反応速度', cat: 'reflex', time: '約15秒', how: 'クリック / スペース', best: 'low', unit: 'ms',
    desc: '合図が出た瞬間に押す。',
    rule: '大きなボタンが「今だ！」に変わったら、すぐにクリック（またはスペースキー）。早く押しすぎるとフライングです。',
    start(c) {
      let state = 'wait', t0 = 0;
      const b = el('button', { className: 'reaction', textContent: '待って…（まだ押さない）', on: { click: hit } });
      c.area.append(b); b.focus();
      c.say('合図を待ってね');
      c.timeout(() => { state = 'go'; t0 = performance.now(); b.textContent = '今だ！押す！'; b.classList.add('go'); c.say('今！'); }, 1500 + rand(2500));
      function hit() {
        if (state === 'wait') { state = 'done'; c.end('フライング！合図を待ってから押そう'); }
        else if (state === 'go') { state = 'done'; const ms = Math.round(performance.now() - t0); c.end(`${ms} ミリ秒 ${ms < 250 ? '— すごい！' : ms < 400 ? '— いいね' : '— もう一回！'}`, ms); }
      }
    },
  },
  {
    id: 'simon', name: 'サイモン', cat: 'brain', time: '約1分', how: 'クリック / 1〜4キー', best: 'high', unit: '個',
    desc: '光った順番を覚えて押す。',
    rule: 'ボタンが光る順番を覚えて、同じ順に押します。正解するたびに1つずつ増えます。光る色は文字でも表示されます。',
    start(c) {
      const cols = [['赤', '#d9776b'], ['青', '#7a9cc6'], ['黄', '#e3c065'], ['緑', '#84b08a']];
      const seq = []; let pos = 0, lock = true;
      const row = el('div', { className: 'board c4', role: 'group', 'aria-label': '色ボタン' });
      const btns = cols.map(([n, bg], i) => el('button', { textContent: `${i + 1}\n${n}`, style: `background:${bg};font-size:20px;white-space:pre;color:${C.ink}`, on: { click: () => press(i) } }));
      btns.forEach(x => row.append(x)); c.area.append(row);
      c.keys(e => { if ('1234'.includes(e.key) && e.key) press(+e.key - 1); });
      next();
      function next() {
        seq.push(rand(4)); pos = 0; lock = true;
        c.say(`見て覚えて：${seq.map(i => cols[i][0]).join('→')}`);
        seq.forEach((v, k) => {
          c.timeout(() => btns[v].classList.add('flash'), 700 + k * 650);
          c.timeout(() => btns[v].classList.remove('flash'), 700 + k * 650 + 400);
        });
        c.timeout(() => { lock = false; c.say(`あなたの番（${seq.length}個）`); btns[0].focus(); }, 700 + seq.length * 650);
      }
      function press(i) {
        if (lock) return;
        btns[i].classList.add('flash'); c.timeout(() => btns[i].classList.remove('flash'), 200);
        if (i !== seq[pos]) { lock = true; return c.end(`${seq.length - 1}個まで覚えた（正解は ${cols[seq[pos]][0]}）`, seq.length - 1); }
        pos++;
        if (pos === seq.length) { lock = true; c.say(`正解！次は${seq.length + 1}個`); c.timeout(next, 800); }
      }
    },
  },
  {
    id: 'memory', name: '神経衰弱', cat: 'brain', time: '約2分', how: 'クリック / Tabで移動', best: 'low', unit: '手',
    desc: '同じ絵のペアを探す。',
    rule: 'カードを2枚めくって同じ絵ならペア成立。6ペアすべて見つけたらクリア。',
    start(c) {
      const deck = shuffle(['🍎', '🍌', '🍇', '🍓', '🍒', '🍑'].flatMap(x => [x, x]));
      const open = Array(12).fill(false); let first = -1, lock = false, moves = 0, pairs = 0;
      const grid = el('div', { className: 'board c4', role: 'group', 'aria-label': 'カード' });
      const cards = deck.map((_, i) => el('button', { on: { click: () => flip(i) } }));
      cards.forEach(x => grid.append(x)); c.area.append(grid);
      render(); cards[0].focus();
      c.say('カードを1枚めくってね');
      function render() { cards.forEach((x, i) => { const show = open[i] || i === first; x.textContent = show ? deck[i] : '？'; x.classList.toggle('back', !show); x.setAttribute('aria-label', `カード${i + 1} ${show ? deck[i] : '裏'}`); }); }
      function flip(i) {
        if (lock || open[i] || i === first) return;
        if (first < 0) { first = i; render(); c.say(`${deck[i]}。もう1枚めくってね`); return; }
        moves++;
        const a = first; first = -1;
        if (deck[a] === deck[i]) {
          open[a] = open[i] = true; pairs++; render();
          if (pairs === 6) return c.end(`${moves}手でクリア！`, moves);
          c.say(`${deck[i]} ペア成立！（${pairs}/6）`);
        } else {
          open[a] = open[i] = true; render(); lock = true;
          c.say(`${deck[a]} と ${deck[i]}。ハズレ`);
          c.timeout(() => { open[a] = open[i] = false; lock = false; render(); }, 900);
        }
      }
    },
  },
  {
    id: 'stop10', name: '10秒ストップ', cat: 'reflex', time: '約15秒', how: 'クリック / スペース', best: 'low', unit: '秒差',
    desc: '体内時計で10秒ちょうどを当てる。',
    rule: '計測開始から10秒ちょうどだと思ったら「ストップ」。3秒を過ぎるとタイマーが隠れます。',
    start(c) {
      const t0 = performance.now();
      const d = el('div', { className: 'bigdisplay', textContent: '0.00', 'aria-hidden': 'true' });
      const b = el('button', { className: 'primary huge', textContent: 'ストップ', on: { click: () => {
        const t = (performance.now() - t0) / 1000, diff = Math.abs(t - 10);
        d.textContent = t.toFixed(2);
        c.end(`${t.toFixed(2)}秒（誤差 ${diff.toFixed(2)}秒）${diff < 0.2 ? '— 神！' : diff < 1 ? '— おしい' : ''}`, +diff.toFixed(2));
      } } });
      c.area.append(d, b); b.focus();
      c.say('計測中…10秒だと思ったらストップ');
      c.interval(() => { const t = (performance.now() - t0) / 1000; d.textContent = t < 3 ? t.toFixed(2) : '??.??'; }, 50);
    },
  },
  {
    id: 'oxgame', name: '三目並べ', cat: 'brain', time: '約1分', how: 'クリック / Tabで移動',
    desc: 'CPUと○×で対戦。',
    rule: 'あなたは○、CPUは×。縦・横・ななめのどれかに3つ並べたら勝ち。',
    start(c) {
      const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const b = Array(9).fill(''); let lock = false;
      const grid = el('div', { className: 'board c3', role: 'group', 'aria-label': '盤面' });
      const cells = b.map((_, i) => el('button', { on: { click: () => move(i) } }));
      cells.forEach(x => grid.append(x)); c.area.append(grid);
      render(); cells[4].focus();
      c.say('あなたの番（○）');
      function render() { cells.forEach((x, i) => { x.textContent = b[i]; x.setAttribute('aria-label', `${Math.floor(i / 3) + 1}行${i % 3 + 1}列 ${b[i] || '空き'}`); }); }
      const win = m => L.some(l => l.every(i => b[i] === m));
      const empty = () => b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      function finish() {
        if (win('○')) { render(); c.end('あなたの勝ち！'); return true; }
        if (win('×')) { render(); c.end('CPUの勝ち…'); return true; }
        if (!empty().length) { render(); c.end('引き分け'); return true; }
        return false;
      }
      function pick(m) { for (const i of empty()) { b[i] = m; const w = win(m); b[i] = ''; if (w) return i; } return -1; }
      function move(i) {
        if (lock || b[i]) return;
        b[i] = '○'; render();
        if (finish()) return;
        lock = true; c.say('CPUが考え中…');
        c.timeout(() => {
          let j = pick('×'); if (j < 0) j = pick('○'); if (j < 0 && !b[4]) j = 4;
          if (j < 0) { const e = empty(); j = e[rand(e.length)]; }
          b[j] = '×'; render(); lock = false;
          if (!finish()) c.say(`CPUは${Math.floor(j / 3) + 1}行${j % 3 + 1}列。あなたの番（○）`);
        }, 400);
      }
    },
  },
  {
    id: 'lights', name: 'ライツアウト', cat: 'puzzle', time: '約2分', how: 'クリック / Tabで移動', best: 'low', unit: '手',
    desc: 'ライトを全部消すひらめきパズル。',
    rule: 'マスを押すと、そのマスと上下左右のライトが反転します。すべてのライトを消したらクリア。',
    start(c) {
      const N = 4, on = Array(N * N).fill(false); let moves = 0;
      const toggle = i => { const r = Math.floor(i / N), k = i % N;
        [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dk]) => { const rr = r + dr, kk = k + dk; if (rr >= 0 && rr < N && kk >= 0 && kk < N) on[rr * N + kk] = !on[rr * N + kk]; }); };
      do { for (let t = 0; t < 5; t++) toggle(rand(N * N)); } while (!on.some(Boolean));
      const grid = el('div', { className: 'board c4', role: 'group', 'aria-label': 'ライト' });
      const cells = on.map((_, i) => el('button', { on: { click: () => { toggle(i); moves++; render(); } } }));
      cells.forEach(x => grid.append(x)); c.area.append(grid);
      render(); cells[0].focus();
      function render() {
        cells.forEach((x, i) => { x.textContent = on[i] ? '●' : ''; x.classList.toggle('on', on[i]); x.setAttribute('aria-label', `${Math.floor(i / N) + 1}行${i % N + 1}列 ${on[i] ? '点灯' : '消灯'}`); });
        const n = on.filter(Boolean).length;
        if (n === 0) c.end(`${moves}手でクリア！`, moves); else c.say(`残り ${n} 個（${moves}手）`);
      }
    },
  },
  {
    id: 'puzzle8', name: '8パズル', cat: 'puzzle', time: '約3分', how: 'クリック / Tabで移動', best: 'low', unit: '手',
    desc: '数字を1〜8の順にスライドで並べる。',
    rule: '空きマスのとなりの数字を押すと動きます。左上から 1〜8 の順に並べ、右下を空きにしたらクリア。',
    start(c) {
      const t = [1, 2, 3, 4, 5, 6, 7, 8, 0]; let moves = 0;
      const nb = z => [z - 3, z + 3, z % 3 ? z - 1 : -1, z % 3 < 2 ? z + 1 : -1].filter(i => i >= 0 && i < 9);
      const solved = () => t.every((v, i) => v === (i + 1) % 9);
      do { for (let k = 0; k < 80; k++) { const z = t.indexOf(0), n = nb(z), m = n[rand(n.length)]; [t[z], t[m]] = [t[m], t[z]]; } } while (solved());
      const grid = el('div', { className: 'board c3', role: 'group', 'aria-label': 'パズル' });
      const cells = t.map((_, i) => el('button', { on: { click: () => move(i) } }));
      cells.forEach(x => grid.append(x)); c.area.append(grid);
      render(); cells[0].focus();
      c.say('空きマスのとなりの数字を押してね');
      function render() { cells.forEach((x, i) => { x.textContent = t[i] || ''; x.classList.toggle('blank', !t[i]); x.setAttribute('aria-label', t[i] ? `${t[i]}（${nb(t.indexOf(0)).includes(i) ? '動かせる' : '動かせない'}）` : '空き'); }); }
      function move(i) {
        const z = t.indexOf(0);
        if (!nb(z).includes(i)) { c.say('そのマスは動かせません。空きマスのとなりを押してね'); return; }
        [t[z], t[i]] = [t[i], t[z]]; moves++; render();
        if (solved()) c.end(`${moves}手でクリア！`, moves); else c.say(`${t[z]} を動かした（${moves}手）`);
      }
    },
  },
];

// ===== views =====
const main = document.getElementById('main');
const no = g => String(GAMES.indexOf(g) + 1).padStart(2, '0');
const bestText = g => { const v = g.best && store.best(g.id); return v != null && v !== undefined ? `ベスト ${v}${g.unit}` : ''; };
let filter = 'all';

// ===== TETRA NOVA（PR） — 目立たせるが、操作の邪魔はしない（モーダル禁止・フォーカスを奪わない・常に「PR」表記・閉じられる）
const AD = { href: 'https://neuroi014.github.io/tetra-nova/', title: 'TETRA NOVA' };
const COPIES = ['もっと本格的なテトリスを遊ぶなら。', '15ゲームに飽きたら、本気のテトリスへ。', 'いま一番アツいブロックパズル。', 'そのスコア、TETRA NOVAでも出せる？', '演出にこだわった、特別なテトリス。'];
const copy = () => COPIES[rand(COPIES.length)];
const adsOff = () => store.read('noads', false);
const closeAd = e => { const box = e.currentTarget.closest('[data-ad]'); box.remove(); main.focus(); };
const adClose = label => el('button', { className: 'ad-close', 'aria-label': label || 'この広告を閉じる', textContent: '×', on: { click: closeAd } });
const adLink = (cls, kids) => el('a', { className: cls, href: AD.href, target: '_blank', rel: 'noopener' }, kids);
const adWide = text => adsOff() ? '' : el('aside', { className: 'ad', 'aria-label': '広告', 'data-ad': '' }, [adClose(), adLink('', [
  el('span', { className: 'ad-tag', textContent: 'PR' }),
  el('span', { className: 'ad-body' }, [el('strong', { textContent: AD.title }), el('span', { textContent: text })]),
  el('span', { className: 'ad-cta', textContent: '遊んでみる ↗（新しいタブ）' }),
])]);
const adCard = () => adsOff() ? '' : el('li', { className: 'ad-li', 'data-ad': '' }, [adClose(), adLink('card ad-card', [
  el('div', { className: 'thumb cat-action', html: THUMB.tetris }),
  el('div', { className: 'card-body' }, [
    el('div', { className: 'card-head' }, [el('span', { className: 'num', textContent: 'PR' }), el('span', { className: 'cat', textContent: 'アクション' })]),
    el('h2', { textContent: 'テトラノヴァ' }),
    el('p', { textContent: copy() }),
    el('p', { className: 'meta', textContent: '3分〜　／　矢印キー・スペース' }),
    el('div', { className: 'card-foot' }, [el('span', { className: 'badge new', textContent: '外部サイト ↗' }), el('span', { className: 'best', textContent: 'NEW' })]),
  ]),
])]);
const adBand = () => adsOff() ? '' : el('li', { className: 'ad-band' }, [adWide(copy())]);
function hideToast() { document.querySelector('.ad-toast')?.remove(); }
function showToast() {
  hideToast();
  if (adsOff()) return;
  const t = el('aside', { className: 'ad-toast', 'aria-label': '広告' }, [
    adLink('ad-toast-link', [el('span', { className: 'ad-tag', textContent: 'PR' }), el('strong', { textContent: AD.title }), el('span', { textContent: copy() })]),
    el('button', { className: 'ad-close', 'aria-label': '広告を閉じる', textContent: '×', on: { click: () => { hideToast(); main.focus(); } } }),
  ]);
  document.body.append(t);
}

function buildSitemap() {
  const f = document.getElementById('sitemap');
  const col = (h, items) => el('div', { className: 'sm-col' }, [el('h3', { textContent: h }), el('ul', {}, items.map(([href, t, ext]) => el('li', {}, [el('a', ext ? { href, textContent: t, target: '_blank', rel: 'noopener' } : { href, textContent: t })])))]);
  f.append(
    el('div', { className: 'sm-inner' }, [
      el('div', { className: 'sm-brand' }, [el('p', { className: 'logo', html: 'ミニゲーム<span>15</span>' }), el('p', { textContent: 'ブラウザですぐ遊べる15のミニゲーム。' })]),
      el('nav', { className: 'sm-nav', 'aria-label': 'サイトマップ' }, [
        col('サイト', [['#', 'ホーム（ゲーム一覧）']]),
        ...Object.entries(CATS).map(([k, v]) => col(v, GAMES.filter(g => g.cat === k).map(g => ['#' + g.id, g.name]))),
        col('PR', [[AD.href, `${AD.title} ↗`, true]]),
      ]),
    ]),
    el('div', { className: 'sm-copy' }, [
      el('span', { textContent: '© 2026 ミニゲーム15' }),
      el('button', { className: 'ad-toggle', 'aria-pressed': String(adsOff()), textContent: adsOff() ? '広告を表示する' : '広告をすべて非表示にする', on: { click: e => {
        store.write('noads', !adsOff());
        e.currentTarget.setAttribute('aria-pressed', String(adsOff()));
        e.currentTarget.textContent = adsOff() ? '広告を表示する' : '広告をすべて非表示にする';
        applyStrip(); route();
      } } }),
    ]),
  );
}
function applyStrip() {
  const w = document.querySelector('.ad-strip-wrap');
  w.hidden = adsOff();
  if (!w.querySelector('.ad-close')) w.append(adClose('上部の広告を閉じる'));
}


function showHome() {
  document.title = 'ミニゲーム15 — 今日はどれで遊ぶ？';
  const played = store.played();
  const next = GAMES.find(g => !played.includes(g.id)) || GAMES[0];
  main.innerHTML = '';
  const h1 = el('h1', { textContent: '今日は、どれで遊ぶ？', tabIndex: -1 });
  const pct = Math.round(played.length / GAMES.length * 100);
  const grid = el('ul', { className: 'grid', id: 'games' });
  const chips = el('div', { className: 'chips', role: 'group', 'aria-label': 'ジャンルで絞り込み' });
  const renderGrid = () => {
    grid.innerHTML = '';
    GAMES.filter(g => filter === 'all' || g.cat === filter).forEach((g, i) => { if (i === 2 || i === 7 || i === 12) grid.append(adCard()); if (i === 6 || i === 12) grid.append(adBand()); grid.append(el('li', {}, [
      el('a', { className: 'card', href: '#' + g.id }, [
        el('div', { className: `thumb cat-${g.cat}`, html: THUMB[g.id] }),
        el('div', { className: 'card-body' }, [
          el('div', { className: 'card-head' }, [el('span', { className: 'num', textContent: no(g), 'aria-hidden': 'true' }), el('span', { className: 'cat', textContent: CATS[g.cat] })]),
          el('h2', { textContent: g.name }),
          el('p', { textContent: g.desc }),
          el('p', { className: 'meta', textContent: `${g.time}${g.timed ? '・時間制限あり' : ''}　／　${g.how}` }),
          el('div', { className: 'card-foot' }, [
            played.includes(g.id) ? el('span', { className: 'badge', textContent: 'プレイ済み' }) : el('span', { className: 'badge new', textContent: '未プレイ' }),
            el('span', { className: 'best', textContent: bestText(g) }),
          ]),
        ]),
      ]),
    ])); });
  };
  [['all', 'すべて'], ...Object.entries(CATS)].forEach(([k, v]) => chips.append(el('button', {
    className: 'chip', textContent: `${v}（${k === 'all' ? GAMES.length : GAMES.filter(g => g.cat === k).length}）`, 'aria-pressed': String(filter === k),
    on: { click: e => { filter = k; chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); renderGrid(); } },
  })));
  main.append(
    el('section', { className: 'hero' }, [
      el('div', { className: 'hero-deco', html: DECO }),
      el('div', { className: 'hero-text' }, [
        el('p', { className: 'eyebrow', textContent: 'Fifteen Little Games' }),
        h1,
        el('p', { className: 'lead', textContent: 'ブラウザですぐ遊べる15のミニゲーム。登録もダウンロードも不要です。' }),
        el('a', { className: 'btn primary huge', href: '#' + next.id, textContent: `${played.length ? '次は' : 'まずは'}「${next.name}」で遊ぶ　→` }),
        el('div', { className: 'meter', 'aria-hidden': 'true' }, [el('span', { style: `width:${pct}%` })]),
        el('p', { className: 'progress', textContent: `プレイ済み ${played.length} / ${GAMES.length}` }),
      ]),
      el('a', { className: 'feature', href: '#' + next.id, 'aria-label': `おすすめ：${next.name}` }, [
        el('div', { className: `thumb cat-${next.cat}`, html: THUMB[next.id] }),
        el('p', { className: 'feature-cap' }, [el('span', { className: 'eyebrow', textContent: 'Pick Up' }), el('span', { textContent: `No.${no(next)}　${next.name}` })]),
      ]),
    ]),
    adWide(copy()),
    el('section', { className: 'list', 'aria-labelledby': 'list-h' }, [
      el('div', { className: 'list-head' }, [el('h2', { id: 'list-h', className: 'section-h', textContent: 'ゲーム一覧' }), chips]),
      grid,
    ]),
    adWide(copy()), adWide(copy()),
  );
  renderGrid();
  if (focusOnRoute) h1.focus();
}

function showGame(g) {
  const idx = GAMES.indexOf(g), next = GAMES[(idx + 1) % GAMES.length];
  document.title = `${g.name} | ミニゲーム15`;
  main.innerHTML = '';
  const h1 = el('h1', { textContent: g.name, tabIndex: -1 });
  const status = el('div', { className: 'status', role: 'status', 'aria-live': 'polite' });
  const area = el('div', { className: 'area' });
  const actions = el('div', { className: 'actions' });
  const best = el('p', { className: 'best', textContent: bestText(g) });
  main.append(
    el('nav', { className: 'crumb', 'aria-label': 'パンくず' }, [el('a', { href: '#', textContent: '← ゲーム一覧へ' }), el('span', { className: 'count', textContent: `No.${no(g)} / ${GAMES.length}` })]),
    el('header', { className: 'game-head' }, [
      el('div', { className: `thumb small cat-${g.cat}`, html: THUMB[g.id] }),
      el('div', {}, [el('p', { className: 'cat', textContent: CATS[g.cat] }), h1, best]),
    ]),
    el('div', { className: 'rule' }, [el('p', { className: 'label', textContent: 'あそびかた' }), el('p', { textContent: g.rule })]),
    adWide(g.ad ? g.ad.text : copy()),
    status, area, actions,
  );
  main.append(adWide(copy()), adWide(copy()), adWide(copy()));
  const startBtn = el('button', { className: 'primary huge', textContent: 'スタート　→', on: { click: begin } });
  actions.append(startBtn);
  if (focusOnRoute) h1.focus();

  function begin() {
    clearAll();
    area.innerHTML = ''; actions.innerHTML = ''; status.textContent = '';
    hideToast();
    let ended = false;
    const held = new Set();
    listen(document, 'keydown', e => held.add(e.key));
    listen(document, 'keyup', e => held.delete(e.key));
    g.start({
      area, held,
      say: t => { status.textContent = t; },
      timeout: (f, ms) => timers.push(setTimeout(f, ms)),
      interval: (f, ms) => timers.push(setInterval(f, ms)),
      on: listen,
      keys: (f, block) => listen(document, 'keydown', e => { if (block && BLOCK_KEYS.includes(e.key)) e.preventDefault(); f(e); }),
      canvas: (w, h, label) => {
        const cv = el('canvas', { width: w, height: h, tabIndex: 0, className: 'cv', role: 'img', 'aria-label': label });
        area.append(cv); cv.focus(); return cv.getContext('2d');
      },
      loop: f => {
        const my = gen; let last = performance.now();
        const step = t => { if (my !== gen) return; f(Math.min(50, t - last) / 16.67); last = t; if (my === gen) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      },
      end: (text, score) => {
        if (ended) return; ended = true;
        clearAll(); store.addPlayed(g.id);
        const rec = score != null && g.best && store.setBest(g.id, score, g.best === 'low');
        best.textContent = bestText(g);
        area.querySelectorAll('button, input').forEach(b => b.disabled = true);
        status.textContent = '';
        const res = el('div', { className: 'result', tabIndex: -1, role: 'status' }, [
          el('p', { className: 'label', textContent: rec ? '結果 — 自己ベスト更新！' : '結果' }),
          el('p', { className: 'result-text', textContent: text }),
        ]);
        actions.append(
          res,
          el('div', { className: 'row' }, [
            el('button', { className: 'primary', textContent: 'もう一度', on: { click: begin } }),
            el('a', { className: 'btn', href: '#' + next.id, textContent: `次のゲーム「${next.name}」　→` }),
            el('a', { className: 'btn', href: '#', textContent: '一覧へ戻る' }),
          ]),
          adsOff() ? '' : adLink('ad-inline', [el('span', { className: 'ad-tag', textContent: 'PR' }), el('span', { textContent: `スコアを伸ばしたいなら ${AD.title} ↗` })]),
        );
        timers.push(setTimeout(showToast, 1500));
        res.focus();
      },
    });
  }
}

let focusOnRoute = false;
function route() {
  clearAll();
  const g = GAMES.find(x => x.id === location.hash.slice(1));
  hideToast();
  g ? showGame(g) : showHome();
  window.scrollTo(0, 0);
  timers.push(setTimeout(showToast, 2500));
}
window.addEventListener('hashchange', () => { focusOnRoute = true; route(); });
buildSitemap();
applyStrip();
route();
