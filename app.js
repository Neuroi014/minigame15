// ===== helpers =====
function el(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === 'on') for (const ev in props.on) e.addEventListener(ev, props.on[ev]);
    else if (k in e) e[k] = props[k];
    else e.setAttribute(k, props[k]);
  }
  kids.forEach(c => e.append(c));
  return e;
}
const rand = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let timers = [];
let keyHandler = null;
function clearAll() {
  timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  timers = [];
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = null;
}

const store = {
  get() { try { return JSON.parse(localStorage.getItem('played') || '[]'); } catch { return []; } },
  add(id) { try { const s = new Set(this.get()); s.add(id); localStorage.setItem('played', JSON.stringify([...s])); } catch {} },
};

// ===== games =====
const GAMES = [
  {
    id: 'janken', emoji: '✊', name: 'じゃんけん', time: '約30秒', how: 'クリック / 1・2・3キー',
    desc: 'CPUと3回勝負。',
    rule: 'グー・チョキ・パーから1つ選びます。3回勝負で勝ち数が多い方の勝ち。',
    start(c) {
      const names = ['グー', 'チョキ', 'パー'], em = ['✊', '✌️', '✋'];
      let w = 0, l = 0, round = 0;
      c.say('手を選んでね（1回目）');
      const row = el('div', { className: 'row' });
      names.forEach((n, i) => row.append(el('button', { className: 'huge', textContent: `${em[i]} ${n}（${i + 1}）`, on: { click: () => play(i) } })));
      c.area.append(row);
      c.keys(e => { if ('123'.includes(e.key)) play(+e.key - 1); });
      row.firstChild.focus();
      function play(i) {
        if (round >= 3) return;
        const j = rand(3), r = (i - j + 3) % 3; // 2 = 勝ち, 1 = 負け
        round++;
        if (r === 2) w++; else if (r === 1) l++;
        c.say(`${round}回目：あなた ${em[i]}${names[i]} vs CPU ${em[j]}${names[j]} → ${['あいこ', '負け', '勝ち'][r]}（${w}勝${l}敗）`);
        if (round >= 3) c.end(w > l ? `${w}勝${l}敗であなたの勝ち！🎉` : w < l ? `${w}勝${l}敗で負け…` : `${w}勝${l}敗で引き分け`);
      }
    },
  },
  {
    id: 'kazuate', emoji: '🔢', name: '数当て', time: '約1分', how: 'キーボードで数字入力',
    desc: '1〜100の数をヒントで当てる。',
    rule: 'CPUが1〜100の数を1つ決めます。数字を入れると「もっと大きい／小さい」とヒントが出ます。少ない回数で当てよう。',
    start(c) {
      const ans = 1 + rand(100); let n = 0;
      const input = el('input', { type: 'number', id: 'guess', min: 1, max: 100, inputMode: 'numeric', required: true });
      const form = el('form', { on: { submit: e => {
        e.preventDefault();
        const v = parseInt(input.value, 10);
        if (!(v >= 1 && v <= 100)) { c.say('1〜100の数字を入れてね'); input.focus(); return; }
        n++;
        if (v === ans) return c.end(`${n}回で正解！答えは ${ans} 🎉`);
        c.say(`${v} より ${v < ans ? '大きい ⬆' : '小さい ⬇'}（${n}回目）`);
        input.value = ''; input.focus();
      } } }, [
        el('label', { htmlFor: 'guess', textContent: '数字（1〜100）' }),
        el('div', { className: 'row' }, [input, el('button', { className: 'primary', type: 'submit', textContent: '答える' })]),
      ]);
      c.area.append(form);
      c.say('数字を入れて「答える」かEnter');
      input.focus();
    },
  },
  {
    id: 'hanno', emoji: '⚡', name: '反応速度', time: '約15秒', how: 'クリック / スペースキー',
    desc: '合図が出たら即押し。',
    rule: '大きなボタンが「今だ！」に変わったら、すぐにクリック（またはスペースキー）。早く押しすぎるとフライングです。',
    start(c) {
      let state = 'wait', t0 = 0;
      const b = el('button', { className: 'reaction', textContent: '待って…（まだ押さない）', on: { click: hit } });
      c.area.append(b); b.focus();
      c.say('合図を待ってね');
      c.timeout(() => { state = 'go'; t0 = performance.now(); b.textContent = '今だ！押す！'; b.classList.add('go'); c.say('今！'); }, 1500 + rand(2500));
      function hit() {
        if (state === 'wait') { state = 'done'; c.end('フライング！合図を待ってから押そう'); }
        else if (state === 'go') { state = 'done'; const ms = Math.round(performance.now() - t0); c.end(`${ms} ミリ秒 ${ms < 250 ? '⚡すごい！' : ms < 400 ? '👍 いいね' : '🐢 もう一回！'}`); }
      }
    },
  },
  {
    id: 'stop10', emoji: '⏱', name: '10秒ストップ', time: '約15秒', how: 'クリック / スペースキー',
    desc: '体内時計で10秒を当てる。',
    rule: 'スタートから10秒ちょうどだと思ったら「ストップ」。3秒を過ぎるとタイマーが隠れます。',
    start(c) {
      const t0 = performance.now();
      const d = el('div', { className: 'bigdisplay', textContent: '0.00', 'aria-hidden': 'true' });
      const b = el('button', { className: 'primary huge', textContent: '⏹ ストップ', on: { click: () => {
        const t = (performance.now() - t0) / 1000, diff = Math.abs(t - 10);
        d.textContent = t.toFixed(2);
        c.end(`${t.toFixed(2)}秒（誤差 ${diff.toFixed(2)}秒）${diff < 0.2 ? '🎯 神！' : diff < 1 ? '👍 おしい' : ''}`);
      } } });
      c.area.append(d, b); b.focus();
      c.say('計測中…10秒だと思ったらストップ');
      c.interval(() => { const t = (performance.now() - t0) / 1000; d.textContent = t < 3 ? t.toFixed(2) : '??.??'; }, 50);
    },
  },
  {
    id: 'oxgame', emoji: '⭕', name: '三目並べ', time: '約1分', how: 'クリック / Tabキーで移動',
    desc: 'CPUと○×ゲーム。',
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
        if (win('○')) { render(); c.end('あなたの勝ち！🎉'); return true; }
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
    id: 'memory', emoji: '🃏', name: '神経衰弱', time: '約2分', how: 'クリック / Tabキーで移動',
    desc: '同じ絵のペアを探す。',
    rule: 'カードを2枚めくって同じ絵ならペア成立。6ペアすべて見つけたらクリア。',
    start(c) {
      const deck = shuffle(['🍎','🍌','🍇','🍓','🍒','🍑'].flatMap(x => [x, x]));
      const open = Array(12).fill(false); let first = -1, lock = false, moves = 0, pairs = 0;
      const grid = el('div', { className: 'board c4', role: 'group', 'aria-label': 'カード' });
      const cards = deck.map((_, i) => el('button', { on: { click: () => flip(i) } }));
      cards.forEach(x => grid.append(x)); c.area.append(grid);
      render(); cards[0].focus();
      c.say('カードを1枚めくってね');
      function render() { cards.forEach((x, i) => { const show = open[i] || i === first; x.textContent = show ? deck[i] : '？'; x.setAttribute('aria-label', `カード${i + 1} ${show ? deck[i] : '裏'}`); }); }
      function flip(i) {
        if (lock || open[i] || i === first) return;
        if (first < 0) { first = i; render(); c.say(`${deck[i]}。もう1枚めくってね`); return; }
        moves++;
        const a = first; first = -1;
        if (deck[a] === deck[i]) {
          open[a] = open[i] = true; pairs++; render();
          if (pairs === 6) return c.end(`${moves}手でクリア！🎉`);
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
    id: 'mogura', emoji: '🐹', name: 'もぐらたたき', time: '20秒', how: 'クリック', timed: true,
    desc: '出てきたもぐらをたたく。',
    rule: '20秒間、穴から出てきたもぐら🐹をクリック。たたいた数がスコアです（時間制限あり）。',
    start(c) {
      let score = 0, mole = -1, left = 20;
      const timer = el('div', { className: 'bigdisplay', textContent: '20' , 'aria-hidden': 'true' });
      const grid = el('div', { className: 'board c3', role: 'group', 'aria-label': '穴' });
      const holes = Array.from({ length: 9 }, (_, i) => el('button', { on: { click: () => hit(i) } }));
      holes.forEach(x => grid.append(x)); c.area.append(timer, grid);
      render(); holes[4].focus();
      c.say('スコア 0');
      function render() { holes.forEach((x, i) => { x.textContent = i === mole ? '🐹' : ''; x.setAttribute('aria-label', i === mole ? 'もぐら！' : '穴'); }); }
      function hit(i) { if (i !== mole || left <= 0) return; score++; mole = -1; render(); c.say(`スコア ${score}`); }
      c.interval(() => { let m; do { m = rand(9); } while (m === mole); mole = m; render(); }, 850);
      c.interval(() => { left--; timer.textContent = left; if (left <= 0) { mole = -1; render(); c.end(`${score}匹たたいた！🐹`); } }, 1000);
    },
  },
  {
    id: 'simon', emoji: '🔴', name: 'サイモン', time: '約1分', how: 'クリック / 1〜4キー',
    desc: '光った順番を覚えて押す。',
    rule: 'ボタンが光る順番を覚えて、同じ順に押します。正解するたびに1つずつ増えます。光る色は文字でも表示されます。',
    start(c) {
      const cols = [['赤', '#ff6b6b'], ['青', '#6ba8ff'], ['黄', '#ffd23f'], ['緑', '#5fd38d']];
      const seq = []; let pos = 0, lock = true;
      const row = el('div', { className: 'board c4', role: 'group', 'aria-label': '色ボタン' });
      const btns = cols.map(([n, bg], i) => el('button', { textContent: `${i + 1}\n${n}`, style: `background:${bg};font-size:20px;white-space:pre`, on: { click: () => press(i) } }));
      btns.forEach(x => row.append(x)); c.area.append(row);
      c.keys(e => { if ('1234'.includes(e.key)) press(+e.key - 1); });
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
        if (i !== seq[pos]) { lock = true; return c.end(`${seq.length - 1}個まで覚えた！（正解は ${cols[seq[pos]][0]}）`); }
        pos++;
        if (pos === seq.length) { lock = true; c.say(`正解！次は${seq.length + 1}個`); c.timeout(next, 800); }
      }
    },
  },
  {
    id: 'lights', emoji: '💡', name: 'ライツアウト', time: '約2分', how: 'クリック / Tabキーで移動',
    desc: 'ライトを全部消すパズル。',
    rule: 'マスを押すと、そのマスと上下左右のライトが反転します。すべてのライト💡を消したらクリア。',
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
        cells.forEach((x, i) => { x.textContent = on[i] ? '💡' : ''; x.classList.toggle('on', on[i]); x.setAttribute('aria-label', `${Math.floor(i / N) + 1}行${i % N + 1}列 ${on[i] ? '点灯' : '消灯'}`); });
        const n = on.filter(Boolean).length;
        if (n === 0) c.end(`${moves}手でクリア！🎉`); else c.say(`残り ${n} 個（${moves}手）`);
      }
    },
  },
  {
    id: 'puzzle8', emoji: '🧩', name: '8パズル', time: '約3分', how: 'クリック / Tabキーで移動',
    desc: '数字を1〜8の順に並べる。',
    rule: '空きマスのとなりの数字を押すと動きます。左上から 1〜8 の順に並べ、右下を空きにしたらクリア。',
    start(c) {
      const t = [1,2,3,4,5,6,7,8,0]; let moves = 0;
      const nb = z => [z - 3, z + 3, z % 3 ? z - 1 : -1, z % 3 < 2 ? z + 1 : -1].filter(i => i >= 0 && i < 9);
      const solved = () => t.every((v, i) => v === (i + 1) % 9);
      do { for (let k = 0; k < 80; k++) { const z = t.indexOf(0), n = nb(z), m = n[rand(n.length)]; [t[z], t[m]] = [t[m], t[z]]; } } while (solved());
      const grid = el('div', { className: 'board c3', role: 'group', 'aria-label': 'パズル' });
      const cells = t.map((_, i) => el('button', { on: { click: () => move(i) } }));
      cells.forEach(x => grid.append(x)); c.area.append(grid);
      render(); cells[0].focus();
      c.say('空きマスのとなりの数字を押してね');
      function render() { cells.forEach((x, i) => { x.textContent = t[i] || ''; x.setAttribute('aria-label', t[i] ? `${t[i]}（${nb(t.indexOf(0)).includes(i) ? '動かせる' : '動かせない'}）` : '空き'); }); }
      function move(i) {
        const z = t.indexOf(0);
        if (!nb(z).includes(i)) { c.say('そのマスは動かせません。空きマスのとなりを押してね'); return; }
        [t[z], t[i]] = [t[i], t[z]]; moves++; render();
        if (solved()) c.end(`${moves}手でクリア！🎉`); else c.say(`${t[z]} を動かした（${moves}手）`);
      }
    },
  },
];

// ===== views =====
const main = document.getElementById('main');

function showHome() {
  document.title = 'ミニゲーム10';
  const played = store.get();
  const next = GAMES.find(g => !played.includes(g.id)) || GAMES[0];
  main.innerHTML = '';
  const h1 = el('h1', { textContent: '遊びたいゲームを選ぼう', tabIndex: -1 });
  main.append(
    el('section', { className: 'hero' }, [
      h1,
      el('p', { textContent: '10個のミニゲーム。どれも1〜3分で遊べます。' }),
      el('a', { className: 'btn primary huge', href: '#' + next.id, textContent: `▶ ${played.length ? '次は' : 'まずは'}「${next.name}」を遊ぶ` }),
      el('p', { className: 'progress', textContent: `プレイ済み ${played.length} / ${GAMES.length}` }),
    ]),
    el('ul', { className: 'grid' }, GAMES.map(g => el('li', {}, [
      el('a', { className: 'card', href: '#' + g.id }, [
        el('div', { className: 'emoji', textContent: g.emoji, 'aria-hidden': 'true' }),
        el('h2', { textContent: g.name }),
        el('p', { textContent: g.desc }),
        el('p', { className: 'meta', textContent: `⏱ ${g.time}${g.timed ? '（時間制限あり）' : ''} ・ ${g.how}` }),
        played.includes(g.id) ? el('span', { className: 'badge', textContent: '✓ プレイ済み' }) : '',
      ]),
    ]))),
  );
  h1.focus();
}

function showGame(g) {
  const idx = GAMES.indexOf(g), next = GAMES[(idx + 1) % GAMES.length];
  document.title = `${g.name} | ミニゲーム10`;
  main.innerHTML = '';
  const h1 = el('h1', { textContent: `${g.emoji} ${g.name}`, tabIndex: -1 });
  const status = el('div', { className: 'status', role: 'status', 'aria-live': 'polite' });
  const area = el('div', { className: 'area' });
  const actions = el('div', { className: 'actions' });
  main.append(
    el('div', { className: 'crumb' }, [el('a', { href: '#', textContent: '← ゲーム一覧へ' }), el('span', { textContent: `${idx + 1} / ${GAMES.length}` })]),
    h1,
    el('p', { className: 'rule' }, [el('strong', { textContent: 'あそびかた：' }), g.rule]),
    status, area, actions,
  );
  const startBtn = el('button', { className: 'primary huge', textContent: '▶ スタート', on: { click: begin } });
  actions.append(startBtn);
  h1.focus();

  function begin() {
    clearAll();
    area.innerHTML = ''; actions.innerHTML = ''; status.textContent = '';
    let ended = false;
    g.start({
      area,
      say: t => { status.textContent = t; },
      timeout: (f, ms) => timers.push(setTimeout(f, ms)),
      interval: (f, ms) => timers.push(setInterval(f, ms)),
      keys: f => { keyHandler = f; document.addEventListener('keydown', f); },
      end: text => {
        if (ended) return; ended = true;
        clearAll(); store.add(g.id);
        area.querySelectorAll('button, input').forEach(b => b.disabled = true);
        status.textContent = '';
        const res = el('p', { className: 'result', tabIndex: -1, role: 'status', textContent: `結果：${text}` });
        actions.append(
          res,
          el('div', { className: 'row' }, [
            el('button', { className: 'primary', textContent: '↻ もう一度', on: { click: begin } }),
            el('a', { className: 'btn', href: '#' + next.id, textContent: `次のゲーム「${next.name}」→` }),
            el('a', { className: 'btn', href: '#', textContent: '一覧へ戻る' }),
          ]),
        );
        res.focus();
      },
    });
  }
}

function route() {
  clearAll();
  const g = GAMES.find(x => x.id === location.hash.slice(1));
  g ? showGame(g) : showHome();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
