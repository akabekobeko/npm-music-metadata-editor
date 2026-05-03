# Phase 5: Polish & Release

## 目的

Phase 1〜4 で機能が揃った CLI を、**npm に公開できる状態** まで仕上げる。具体的には UX (色付け、静粛モード、ヘルプ拡張)、ドキュメント、配布設定の 3 領域。

## スコープ

### UX 仕上げ

#### 色付け

- ANSI 色を **依存ライブラリ無し** で実装する。`tty.WriteStream.hasColors()` を見て使うかどうか判定。
- 配色の方針:
  - エラー: 赤 (stderr)
  - 警告: 黄 (stderr)
  - 情報 (`[mme] wrote: ...`): 灰 (stderr)
  - JSON 出力 / 値出力: **無色** (stdout は機械可読を維持)
  - pretty 出力のラベル: 太字 (青)、値: 標準色
- フラグ:
  - `--no-color` で完全に無効化
  - `NO_COLOR=1` 環境変数 (<https://no-color.org/>) を尊重
  - `FORCE_COLOR=1` を尊重 (CI でログを着色するパイプライン用)

#### 静粛モード / 詳細モード

- `--quiet` (`-q`): stderr の info / warning を抑止 (エラーは残す)
- `--verbose` (`-v`): debug 情報を stderr に流す。具体的には:
  - 検出した `audioFormat`
  - core 側で発生した warnings (Phase 2 で `--no-warnings` していても --verbose は表示)
  - 書き出し先パス、書き出し bytes 数
- `--quiet` と `--verbose` を同時指定したら exit code 2。

#### ヘルプ拡張

- `program.addHelpText("after", ...)` で「Examples:」節を `mme --help` の末尾に追加。
- 各サブコマンドにも代表的な使用例を 2-3 行付ける。
- `mme help <subcommand>` を慣習として案内する。

#### シェル補完 (任意)

- 需要が固まらないため Phase 5 では **見送り**。ただし将来的に commander のサードパーティ補完 (`@commander-js/extra-typings` 系) で対応する余地を README に書き残す。

### エラー / 終了コードの最終化

- Phase 1 の終了コード規約を README の `## Exit codes` セクションに転記する。
- 不明 `MmeError.code` のフォールバックを **exit code 1** に固定。CI / スクリプト利用者が `if [ $? -eq 0 ]` で判定できるようテーブルを公開する。
- `process.on("uncaughtException")` / `unhandledRejection` のハンドラを bin shim に追加し、想定外の throw も exit code 1 + stack 情報 (verbose 時のみ) を表示できるようにする。

### bin の配布

- `package.json` の `bin` を `{ "mme": "./dist/bin/mme.js" }` に確定。
- `dist/bin/mme.js` の **shebang (`#!/usr/bin/env node`)** が `tsc` の出力で確実に先頭に残ることを確認:
  - `tsconfig.build.json` で `target: "ES2024"` などにしても shebang は剥がれないが、念のため `scripts/postBuildShebang.ts` を用意して chmod +x を付与する (CI で動かす)。
- `package.json` の `files`:
  - `dist`
  - `README.md` / `README.ja.md`
  - `LICENSE`
- `publishConfig.access`: `"public"` (core と同じく `@akabeko` scope の public 配布)
- `publishConfig.registry`: 既定の npm registry を明示

### ドキュメント

- `packages/cli/README.md` (英語 / `README.ja.md` 日本語) を仕上げる。構成:
  - バッジ (npm version, license)
  - インストール方法 (`npm install -g @akabeko/music-metadata-editor-cli` / `pnpm dlx`)
  - クイック スタート (read / write / picture / lyrics の 1 例ずつ)
  - 全サブコマンドのサマリ (詳細は `mme <subcmd> --help` を案内)
  - Exit codes 表
  - 既知の制限 (ストリーム モードでの `--clear` 不可、Picture data の JSON 表現など)
  - 既存ツールとの対応表 (eyeD3 / mid3v2 / metaflac / AtomicParsley の各フラグから mme への翻訳早見表)
  - ライセンス
- リポジトリ ルートの `README.md` / `README.ja.md` の Packages 表に CLI を追記。
- `docs/README.md` / `docs/README.ja.md` の最上部に CLI のリンクを追加。

### npm publish ワークフロー

- `scripts.prepublishOnly`: `pnpm clean && pnpm build && pnpm test`
- 公開コマンドは pnpm から `pnpm --filter @akabeko/music-metadata-editor-cli publish --access public` で行う。`packages/core/package.json` の運用に合わせる。
- 初回 release は `0.1.0` から始める (semver の「機能あり、まだ stable とは言い切らない」帯)。core との version 同期は **しない** — CLI は CLI 単独で semver を回す。
- `CHANGELOG.md` (`packages/cli/`) を作成。手動運用 / 機械化は core の方針に揃える (現状は手動)。

### CI への組み込み

- 既存の `pnpm -r build` / `pnpm -r typecheck` / `pnpm -r test` が CLI も含めて回ることを最終確認。
- bin の smoke test (`node packages/cli/dist/bin/mme.js --version`) を CI ワークフローに 1 行追加する (パッケージ単独でも実行できるが、`-r build` の後に明示的に叩いておくと shebang / 実行権限の壊れに早く気付ける)。

### 任意項目 (フェーズ内で取捨選択)

- `--config <path>` で永続的な設定 (例: 既定 picture kind、既定 atomic on/off) を JSON で読み込む — 需要が見えたら別フェーズで。
- 多言語化 (`MME_LANG=ja` でメッセージを日本語化) — 日本語 README を提供する代わりに本フェーズではスキップ。
- `mme completion <shell>` 補完スクリプト出力 — 上記 (シェル補完 任意) と同じく見送り。

## 設計方針

- コードの追加は最小化し、Phase 1〜4 で作った helper を **横断的に整える** ことに集中する。
- 色付けの判定 / `--quiet` の判定 / `--verbose` の判定は **全部 1 か所** (Phase 1 の `output/` 配下) に閉じ込める。各サブコマンドが個別に `process.env.NO_COLOR` を見ない。
- README の英訳と日本語訳の二重保守は core と同じ方針 (英語が正、日本語は近い表現)。

## 主要な内部 API (案)

```ts
/** Logger that respects --quiet / --verbose / --no-color. */
export type Logger = {
  readonly info: (message: string) => void;
  readonly warn: (message: string) => void;
  readonly error: (message: string) => void;
  readonly debug: (message: string) => void;
};

/** Build a Logger from CLI flags + the current TTY. */
export const createLogger: (args: { quiet: boolean; verbose: boolean; noColor: boolean }) => Logger;
```

## 依存

- Phase 1〜4

## テスト方針

- `createLogger`: `quiet` で info / warn が抑止され、error は残ることを確認 (stderr モック経由)。
- `--no-color` / `NO_COLOR` / `FORCE_COLOR` の組み合わせで ANSI コードが含まれる / 含まれないが期待どおりになるか。
- `--quiet` / `--verbose` 同時指定で exit code 2。
- bin smoke test: ビルド済 `dist/bin/mme.js` が `node` で起動して `--version` が出ること。
- `package.json` の `bin` / `files` / `publishConfig` を schema validation (vitest 内で `JSON.parse` + 期待 shape を assert)。

## 完了条件 (DoD)

- `--no-color` / `--quiet` / `--verbose` が動く
- README (英語 / 日本語) が完成し、リポジトリ ルートの README からリンクされている
- Exit codes 表と既存ツールとの対応表が README に含まれている
- `pnpm publish --dry-run --filter @akabeko/music-metadata-editor-cli` が成功し、出力 tarball に余計なファイルが入っていない
- `pnpm typecheck` / `pnpm test` / `pnpm check` が通る
- `0.1.0` (もしくは合意したバージョン) で **実 publish が可能な状態** (実公開はリリース判断で別途実施)

## 参考資料

- NO_COLOR 規格: <https://no-color.org/>
- FORCE_COLOR 慣習: <https://force-color.org/>
- npm publish (workspace): <https://docs.npmjs.com/cli/v10/commands/npm-publish#workspace>
- pnpm filter publish: <https://pnpm.io/cli/publish>
- shebang と TypeScript: `tsc` は `#!` で始まる先頭行をそのまま出力する仕様
- core の release 周り: `packages/core/package.json` の `prepublishOnly` / `publishConfig`
