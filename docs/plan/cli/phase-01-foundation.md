# Phase 1: Foundation

## 目的

`packages/cli/` を **pnpm workspace パッケージ** として立ち上げ、commander v12 系で動く最小の CLI 骨格を揃える。Phase 2 以降が「コマンドを追加するだけで動く」状態を作るのが目的で、このフェーズの完了時点では `mme --version` と `mme --help` が出るだけでよい。

## スコープ

### パッケージの作成

- `packages/cli/` を新設 (`pnpm-workspace.yaml` の `packages/*` glob で自動的に拾われる)
- `package.json`
  - `name`: `@akabeko/music-metadata-editor-cli`
  - `version`: `0.0.0` (リリースは Phase 5 で実施)
  - `private`: `true` (Phase 5 で `false` に切り替え + `publishConfig.access = "public"`)
  - `type`: `"module"`
  - `bin`: `{ "mme": "./dist/bin/mme.js" }`
  - `main` / `types`: 提供しない (CLI 専用パッケージのため、ライブラリ API は export しない)
  - `dependencies`:
    - `@akabeko/music-metadata-editor`: `workspace:*`
    - `commander`: `^12` (記述時点の最新メジャーを採用。リリース日は調査して反映)
  - `devDependencies`: core と同じ tsx / vitest / `@types/node` / typescript / `@tsconfig/node24`
  - `scripts`:
    - `build`: `tsc -p tsconfig.build.json`
    - `clean`: `rm -rf dist coverage`
    - `typecheck`: `tsc --noEmit`
    - `test`: `vitest run`
    - `test:watch`: `vitest`
    - `test:coverage`: `vitest run --coverage`
    - `prepublishOnly`: Phase 5 で追加
- `tsconfig.json` / `tsconfig.build.json` は core を踏襲する。`outDir` は `dist/`。

### ディレクトリ構成

`docs/rules/directory-structure.md` の規約に従い、`packages/cli/` 配下に同じレイアウトを敷く。

```
packages/cli/
  package.json
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  README.md             # 利用者向け (Phase 5 で本格化)
  README.ja.md
  src/
    cli.ts              # CLI エントリ ポイント (createProgram + run)
    bin/
      mme.ts            # bin shim (createProgram → parseAsync → process.exit)
    commands/           # サブコマンドはここに 1 ファイル/コマンドで置く
      registerVersionAndHelp.ts  # Phase 1 で配置 (具体的な read/write 等は Phase 2 以降)
    output/
      writeJson.ts      # JSON 出力 (機械可読)
      writePretty.ts    # 人間可読出力 (Phase 2 で本実装)
      printWarning.ts   # warnings → stderr
    errors/
      formatMmeError.ts # MmeError → 表示文字列 + 終了コード
      exitCodes.ts      # 終了コード定数
    types.ts            # CLI 内部で共有する type
  tests/
    fixtures/           # core の tests/fixtures をシンボリック参照しない (後述)
```

### CLI エントリ ポイントの 2 段構成

- **`src/bin/mme.ts`** — `#!/usr/bin/env node` shebang を持つ、bin から呼ばれる薄いラッパー。`createProgram()` を呼んで `parseAsync(process.argv)` し、catch したエラーを `formatMmeError` 経由で stderr に流して `process.exit(code)` する。
- **`src/cli.ts`** — `createProgram(): Command` をエクスポートする本体。テストからはこれを直接呼べるようにする (子プロセスを起こさない)。
- ファイル分割の根拠は `docs/rules/code-style.md` の「1 ファイル 1 関数 (代表 + helper)」方針。

### commander の使い方

- v12 系の `Command` を採用。`program.action(async ...)` で非同期ハンドラを書ける点を活用する。
- 既定で `--version` (`-V`) / `--help` (`-h`) が有効になる。`-V` は `package.json` から取り込み (`createRequire` で `package.json` を読む)。
- グローバル オプション (Phase 1 では `--no-color`、`--quiet` のみ宣言。動作実装は Phase 5 で本格化)。
- `program.exitOverride()` を使い、commander 自身が `process.exit` を呼ばないようにする。終了コードは bin 側で一元管理する。

### 出力ユーティリティ

- `writeJson(value)` — `JSON.stringify(value, null, 2)` を `process.stdout.write` に流す。末尾改行 1 つを付与。
- `writePretty(value)` — Phase 1 では JSON フォールバック。実装は Phase 2 で TUI 表のような体裁を入れる。
- `printWarning(warning)` — `[warn] ${message}` の体裁で stderr。Phase 2 以降で `severity` ごとに色分け予定 (Phase 5 で配色完成)。
- 出力経路は **stdout** (CLI の正規結果) と **stderr** (進捗 / 警告 / エラー) のみで、`console.log` を直接使わない。

### エラー戦略

- core の `MmeError` (`{ name, code, message, cause }`) はそのまま投げられて bin 層で捕捉する。
- `formatMmeError(error)` が次の責務を持つ:
  - `MmeError` → `[mme:${code}] ${message}` の文字列を返す
  - `Error` (それ以外) → `[mme] ${message}` の文字列を返す
  - 不明値は `String(error)` でフォールバック
- 終了コードは `errors/exitCodes.ts` の Object lookup table で決定的に解決する:
  - `0` 成功
  - `1` 一般失敗 (未分類エラー)
  - `2` 引数不正 (commander が投げる `CommanderError`)
  - `3` フォーマット未対応 (`MmeError.code === "unsupported-format"`)
  - `4` ファイル I/O 失敗 (`MmeError.code === "io-error"` 想定。core 側にコードが無い場合は Phase 1 内で core にコード追加するか、CLI 側で `Error.code === "ENOENT"` 等を識別)
  - `5` 不正なタグ (`MmeError.code === "invalid-tag"`)
  - その他の `MmeError.code` は将来追加に備えて `1` にフォールバック

> 終了コード規約は **本ファイルが正**。Phase 5 で `README.md` の「Exit codes」セクションに転記する。

### 終了コードと `process.exit`

- bin 層で `try / catch` を用意し、CLI 層は throw のみ行う。
- 成功時も `process.exitCode = 0` を明示し、未終了の async リソースが残っていても確実に 0 終了する。
- commander の `--help` / `--version` は exit code 0 で抜ける扱い (`exitOverride` のハンドリング)。

### E2E テスト基盤

- `tests/cliRunner.ts` (helper) を用意し、テストから CLI を呼び出すための関数を export する。実装は **子プロセスではなく `createProgram()` を直接 `parseAsync` する** 形にして、起動コストとプラットフォーム差を吸収する。
  - `runCli(argv: readonly string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>`
  - 内部で `process.stdout.write` / `process.stderr.write` を一時的にフックし、`process.exit` は throw に置き換える (`exitOverride` と同じ手法)。
- bin の shebang 経由を 1 ケースだけ「smoke test」として残す (CI で `node dist/bin/mme.js --version` を起動)。
- core の fixtures は **CLI のテストから直接 import しない**。代わりに `tests/fixtures/` 配下に **必要な物だけ生成スクリプトで再構築** する (Phase 2 で本格化)。Phase 1 では fixtures は不要。

### 依存しないと決めるもの

- `chalk` 等の色付けライブラリは導入しない。色付けは Node.js の `tty.WriteStream.hasColors()` を見て ANSI コードを直書きする (Phase 5)。
- `yargs` / `oclif` は不採用。commander の方が依存が軽く、サブコマンド + アクション ハンドラの API が要求にちょうど合う。
- 既定では `inquirer` 等の対話 UI を入れない。常に非対話で動かす想定。

## 設計方針

- CLI 専用 module は `class` を使わず、core と同じ「factory function + Plain Object」スタイルで書く (`docs/rules/code-style.md`)。
- commander の `Command` は class だが **ライブラリ提供のため例外として直接利用**する。プロジェクト独自のラッパーで包む必要はない。
- `process` / `console` への直書きは bin 層と output 層に閉じ込める。コマンド実装内では受け渡された `Logger` インターフェースを介して呼ぶ (テスト時に差し替えやすくする)。

## 主要な内部 API (案)

```ts
/** Create a configured commander Program for the CLI. */
export const createProgram: () => Command;

/** Run the CLI with the given argv (test-friendly entry). */
export const runCli: (argv: readonly string[]) => Promise<RunResult>;

/** Resolved exit code + captured streams. */
export type RunResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

/** Convert any thrown error into the user-facing string + exit code. */
export const formatMmeError: (error: unknown) => { readonly message: string; readonly exitCode: number };
```

## 依存

- core は `loadTrack` / `saveTrack` / `readMetadata` / `writeMetadata` がリリース済み (`@akabeko/music-metadata-editor` v1.x) であることを前提とする。
- `commander` v12 系の最新版を install。

## テスト方針

- `formatMmeError` は (a) 各 `MmeError.code` から正しい exit code が返るか / (b) 非 `MmeError` の throw を捌けるか / (c) 不明値 (`null`、`123`) を `String()` でフォールバックできるかを網羅。
- `runCli(["--version"])` が `package.json` の version を出力し、exit code 0 を返すことを確認。
- `runCli(["--help"])` が usage を含む文字列を出すことを確認 (具体的な usage 文言は assert しない)。
- `runCli(["unknown"])` が exit code 2 で終わることを確認 (commander が `unknown command` エラー)。
- bin shim の smoke test を 1 ケースだけ追加: `node dist/bin/mme.js --version` を子プロセスで起動し、stdout を assert。
- 単体テストは vitest、子プロセス系も vitest の `it` で完結させる (CI に追加機構を増やさない)。

## 完了条件 (DoD)

- `packages/cli/` が pnpm workspace に組み込まれ、`pnpm install` でローカル依存が解決する
- `pnpm --filter @akabeko/music-metadata-editor-cli build` が成功し、`packages/cli/dist/bin/mme.js` が生成される
- `node packages/cli/dist/bin/mme.js --version` / `--help` がエラー無く動く
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` がワークスペース全体で緑
- 終了コード規約 (本ファイルの「エラー戦略」節) が CLI 内に反映され、テストで担保されている

## 参考資料

- commander v12: <https://github.com/tj/commander.js>
- Node.js `tty.WriteStream.hasColors`: <https://nodejs.org/api/tty.html#writestreamhascolorscount-env>
- 終了コード慣習: <https://tldp.org/LDP/abs/html/exitcodes.html> (POSIX 慣習: 2 = misuse of shell builtins / 引数不正に転用)
- 既存 CLI のフラグ命名: eyeD3 (`--title`, `--artist`)、AtomicParsley (`--artist`, `--album`) — Phase 1 では命名検討の予告のみ、本格的な flag 設計は Phase 3
