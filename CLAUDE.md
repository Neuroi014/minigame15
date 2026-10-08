# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

「ミニゲーム15」— 講義（Webデザインとマネジメント）用の、15個のシングルプレイミニゲーム集サイト。PC向け。評価は成果物重視で、デザイン性より **アクセシビリティと UI/UX（ユーザーが次の行動に迷わないこと）** を優先する。見た目は「高級感（Ink/Ivory/Gold・明朝見出し）× ワクワク感（ジャンル別の宝石色SVGサムネイル）」。デザイン原則は `style.css` 冒頭に記載、変更はそれに従う。GAMES の並びは刺激（ドーパミン）の強い順。制作時間は厳しく制限されているので、変更は小さく確実に。

## Commands

ビルド・依存関係・テストなし（素の HTML/CSS/JS）。

- ローカル確認: `python3 -m http.server 8765` → http://localhost:8765
- 構文チェック: `node --check app.js`
- 公開: GitHub Pages（`main` ブランチの `/` root）。push すれば反映。`.nojekyll` は消さないこと。

## Architecture

- `index.html` は空の `<main id="main">` を持つシェルだけ。画面はすべて `app.js` が DOM で生成する。
- ルーティングはハッシュ（`#tetris` 等）。`route()` が `#` なし→`showHome()`、ゲーム id→`showGame()`。GitHub Pages で 404 にならないようハッシュ方式を維持する。
- ゲームは `GAMES` 配列の1オブジェクト = 1ゲーム: `{ id, name, cat, time, how, desc, rule, timed?, best?: 'high'|'low', unit?, ad?, start(c) }`。サムネイルは `THUMB[id]`（160×100 の SVG、色は `.thumb .g/.p/.m` 等の CSS クラスで指定）。TETRA NOVA の PR は上部帯・一覧カード（4・10番目）・横長バナー（連続させない）・結果画面・右下トースト（プレイ中は非表示）・サイトマップに出す。モーダル化やフォーカス奪取はしない。広告は全て `[data-ad]` 内に × ボタン（閉じたら `main` にフォーカス）、サイトマップの「広告をすべて非表示」で `localStorage(noads)` に保存。一覧の広告カードはゲームカードと同じ見た目だが「PR」表記は必須（ステマ規制）。`ad.text` はテトリス用の固定コピー。サイトマップは `buildSitemap()` が GAMES から生成。追加・削除はここだけで一覧・「次のゲーム」・進捗表示に反映される。
- `start(c)` が受け取るコンテキスト `c`（`showGame` 内で生成）:
  - `c.area` — ゲームの描画先
  - `c.say(text)` — `aria-live` のステータス表示（状態変化は必ずこれで伝える）
  - `c.timeout` / `c.interval` / `c.keys(f, blockArrows)` / `c.on` / `c.loop(k => …)`（rAF、k はフレーム比）/ `c.held`（押下中キー）/ `c.canvas(w, h, label)` — 画面遷移・終了時に `clearAll()` で自動解除される。生の `setTimeout`/`addEventListener`/`requestAnimationFrame` は使わない
  - `c.end(resultText, score?)` — 結果表示、プレイ済み・自己ベスト記録、「もう一度 / 次のゲーム / 一覧へ」ボタン表示、フォーカス移動を行う。二重呼び出しは無視される
- 共通フロー: 遊び方 → スタート → プレイ → 結果 → 次のアクション。この流れとボタン配置は全ゲームで統一する。
- プレイ済みは `localStorage('played')`、自己ベストは `localStorage('best')`（try/catch で保護）。ホームの主ボタンは未プレイの最初のゲームを案内する。

## Accessibility conventions

- 操作要素は `<button>` / `<a>`。Canvas はアクション系のみ（`c.canvas` で `role="img"`＋ラベル、キーボード操作必須、状況は `c.say` で伝える）。盤面マスには `aria-label`（例「2行3列 空き」）を付ける。
- 色だけで情報を伝えない（サイモンは色名を表示）。時間制限ありは `timed: true` で一覧に明記。
- ハッシュ遷移時のみ `h1` に、結果時は結果要素にフォーカスを移す（初回表示では移さない＝光る枠を出さない）。フォーカス表示は `:focus-visible` の細い線のみ。
- タップ領域 48px 以上、`:focus-visible` を目立たせる、`prefers-reduced-motion` に対応済み。色は `style.css` の `:root` トークンで管理。
