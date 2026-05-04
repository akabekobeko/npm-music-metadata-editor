# Phase 1: Foundation

## 目的

`packages/gui/` を **pnpm workspace パッケージ**として立ち上げ、[`akabekobeko/electron-starter`](https://github.com/akabekobeko/electron-starter) を踏襲した Electron + Vite + React 19 + shadcn/ui の最小スケルトンを動かす。Phase 2 以降が「IPC を生やすだけで動く」状態を作るのが目的で、このフェーズの完了時点では起動して空の `App.tsx` (タイトル + Electron / Chrome / Node のバージョン表示程度) が出れば良い。

## スコープ

### パッケージの作成

- `packages/gui/` を新設 (`pnpm-workspace.yaml` の `packages/*` glob で自動的に拾われる)。
- `package.json`
  - `name`: `@akabeko/music-metadata-editor-gui`
  - `version`: `0.0.0` (リリースは Phase 7 で初版判断)
  - `private`: `true` (今後も `true` のまま。npm 公開はしない)
  - `type`: `"module"`
  - `main`: `dist/main/main.js`
  - `dependencies`:
    - `@akabeko/music-metadata-editor`: `workspace:*`
  - `devDependencies` (electron-starter と同じバージョンを基本に揃える):
    - `electron`, `electron-builder`
    - `vite`, `@vitejs/plugin-react`
    - `react`, `react-dom`, `@types/react`, `@types/react-dom`
    - `@tailwindcss/vite`, `tailwindcss`, `tw-animate-css`
    - `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
    - `shadcn`
    - `vitest`, `@types/node`, `typescript`
  - `scripts`:
    - `dev`: `node scripts/dev.mjs`
    - `build`: `pnpm build:main && pnpm build:preload && pnpm build:renderer`
    - `build:main`: `vite build --config src/main/vite.config.ts`
    - `build:preload`: `vite build --config src/preload/vite.config.ts`
    - `build:renderer`: `vite build --config src/renderer/vite.config.ts`
    - `clean`: `rm -rf dist release coverage`
    - `typecheck`: `tsc --build`
    - `test`: `vitest run`
    - `test:watch`: `vitest`
    - `test:coverage`: `vitest run --coverage`
    - `package`: `pnpm build && electron-builder`
    - `sync-targets`: `node scripts/sync-electron-targets.mjs`
    - `shadcn`: `node scripts/shadcn.mjs`

### electron-starter からの取り込み方針

- **コピー対象** (内容を本リポジトリ向けに最小化して取り込む):
  - `.mise.toml` (gui パッケージ専用の Node / pnpm バージョンとして取り込む。詳細は「モノレポへの統合」節を参照)
  - `scripts/dev.mjs` / `scripts/sync-electron-targets.mjs` / `scripts/shadcn.mjs` / `scripts/get-electron-target-env.mjs`
  - `src/main/main.ts`、`src/main/vite.config.ts`
  - `src/preload/preload.ts`、`src/preload/vite.config.ts`
  - `src/renderer/{App.tsx,App.css,index.html,renderer.tsx,vite-env.d.ts,vite.config.ts}`
  - `src/renderer/components/ui/*` (shadcn/ui の生成物。Button のみ Phase 1 で取り込む)
  - `src/renderer/libs/utils.ts`
  - `tsconfig.json` / `tsconfig.node.json` / `tsconfig.web.json`
  - `electron-builder.yml` (`appId` / `productName` のみ書き換え)
  - `components.json`
- **コピーしないもの**:
  - electron-starter ルート専用の `lefthook.yml`、`biome.json`、`vitest.config.ts` のうち、本リポジトリのルート設定でカバーできるもの。
  - `scripts/init.mjs` (テンプレ初期化用なので不要)。
- **取り込み後の改変**:
  - `package.json` の `name` / `description` などはこのパッケージ用に設定。
  - `tsconfig.web.json` の `paths` で `@/*` → `src/renderer/*` を維持。
  - `electron-builder.yml` の `appId` / `productName` を確定値に書き換え (例: `appId: net.akabekobeko.music-metadata-editor`、`productName: Music Metadata Editor`)。
  - 開発時 dev server は **5174** ポートに変更 (5173 は core / cli の future use や他の Electron アプリと衝突しがちなため、本リポジトリ専用に変える)。`scripts/dev.mjs` の `VITE_DEV_SERVER_URL` と `server.port` を併せて修正。
  - `scripts/sync-electron-targets.mjs` は electron-starter (= リポジトリ ルート) で `.mise.toml` を更新する前提のコードになっているので、本リポジトリでは **`packages/gui/.mise.toml`** を更新するよう書き換える。`tsconfig.node.json` / `tsconfig.web.json` / `src/{main,preload,renderer}/vite.config.ts` への書き込みは相対パスのまま動く。

### モノレポへの統合

- ルートの `pnpm-workspace.yaml` は既に `packages/*` を拾っているので変更不要。`pnpm install` で取り込まれることを確認。
- ルートの `pnpm test` / `pnpm typecheck` / `pnpm build` は `pnpm -r` でデリゲートされる。`packages/gui/` のスクリプト名を core / cli と揃えてあれば自動的に巻き込める。
  - ただし **`pnpm -r build` の途中で `electron` を落とすコストはある**ため、ルート `package.json` の `build` をどう運用するかは Phase 1 末で結論を出す:
    - 案 A: `pnpm -r build` のまま (gui の `build` も実行されるが、electron-builder は `package` で初めて呼ぶので vite build のみ。許容可)。
    - 案 B: gui の `build` をルートの一括 build から除外 (`pnpm --filter "!@akabeko/music-metadata-editor-gui" -r build`)。
  - 既定は案 A とし、CI 時間が問題になったら案 B に切り替える。
- ルート `biome.json` は `packages/gui/src/**/*.{ts,tsx}` を lint / format 対象に含める (拡張子 `.tsx` を新規追加)。`pnpm check` がエラーなく通ること。

#### Node バージョンの分離 (mise の二段構成)

- **方針**: ルートの `.mise.toml` は core / cli が動く Node に固定し、**`packages/gui/.mise.toml` は Electron がバンドルする Node メジャーに追従させる**。`scripts/sync-electron-targets.mjs` を gui ディレクトリ内で走らせて `.mise.toml` の `node` を Electron バージョンに合わせて自動更新する。
- **Electron アプリは bundled Node で動く**ため、本来ホスト Node のバージョンは関係ない。が、`scripts/dev.mjs` 等の **ビルド ホスト**は OS の Node で動くので、Electron 公式が前提とする Node メジャー (= bundled Node と同じ系) で開発・パッケージングしたい。これを mise の階層解決で実現する。
- **mise の階層解決**: mise は cwd から親方向に `.mise.toml` を探索して **深い設定で浅い設定を上書き** する。`packages/gui/.mise.toml` の `[tools] node` がルートと違っていれば、`cd packages/gui` 配下のシェルでは gui の Node が使われる。ルート直下では従来通りルートの Node。
- **取り込み手順**:
  1. electron-starter の `.mise.toml` をそのまま `packages/gui/.mise.toml` にコピー (Phase 1 着手時点では現にルートと同値の場合もあるが、ファイルとして別管理することに意味がある)。
  2. ルートの `.mise.toml` は **触らない** (core / cli への影響を遮断)。
  3. `mise install` を `packages/gui/` で 1 回実行し、Node が解決できることを確認。

##### モノレポ運用としての含意 (調査結果)

| 観点                                  | 結論 / 注意点                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install` をどの Node で走らせるか | **ルート Node** で問題ない。レジストリ解決とロックファイル更新はホスト Node に依存しない (近年の pnpm は Node 18+ で動作)。                |
| `pnpm --filter <gui> dev` をルート cwd で実行 | **ルート Node** が使われる (mise は cwd で解決するため)。Electron 自体は spawn 内で bundled Node を使うので動作上は問題なし。とはいえ「Electron が要求する Node で開発する」運用を貫くなら **`cd packages/gui && pnpm dev`** を推奨ルートにする。 |
| `pnpm -r typecheck` / `pnpm -r build` | ルート Node で全パッケージを実行する。TypeScript / Vite / Biome / Vitest は Node ABI に強く依存しないため、ルート Node と gui 期待 Node のメジャーが 1〜2 違う程度なら壊れない (実害は出ない)。 |
| ネイティブ依存 (better-sqlite3 等)    | gui 配下に native 依存が増えた場合は **N-API ABI のバージョン差**でリビルドが必要になることがある。Phase 1 の依存集合 (electron / vite / react 系) はすべて prebuilt で済むため影響なし。Phase 7 までに native 依存を追加するときは `electron-rebuild` の導入を再検討する。 |
| Electron のバンドル変更 (`sync-targets`) | gui の `.mise.toml` を書き換える運用に固定すれば、ルートには波及しない。ルートのチームが core / cli の都合で Node を上げ下げするタイミングと完全に独立する。 |
| CI                                    | 1 つの GHA ジョブで `pnpm -r build` を回すなら **ルート Node 1 種類で全部ビルド** する (実害なし)。Electron 公式の Node で gui だけビルドしたい場合は `working-directory: packages/gui` のジョブを切り、その内側で `mise install --quiet` を呼んで gui Node を有効にする (Phase 7 で本格設計)。 |
| `engines` 制約                        | gui の `package.json` に `engines.node` を **書かない**。書くと workspace 全体の install で警告が出てしまう。Node メジャー要件は `.mise.toml` で表現する。 |

> **判定: モノレポ運用として問題なし**。ルート Node と gui Node の二段運用は mise の階層解決で素直に実現でき、`pnpm install` / `pnpm -r ...` の挙動も壊れない。注意点は (a) gui の dev / build はパッケージ ディレクトリで実行する、(b) `sync-targets` の書き換え対象を gui の `.mise.toml` に固定する、の 2 点のみ。

##### CLAUDE.md への影響 (フォロー アップ)

- ルート `CLAUDE.md` の「環境とコマンド」節は現状「Node.js 24 / pnpm 10 (`.mise.toml` でバージョン固定)」とだけ書かれている。Phase 1 完了時に **「gui パッケージは `packages/gui/.mise.toml` で別管理」** の 1 行を追記する (この PR には含めない。Phase 1 着手 PR で対応)。
- ユーザーの私的な `~/.claude/CLAUDE.md` には踏み込まない。

### 3 プロセス スケルトン

- **Main (`src/main/main.ts`)**: electron-starter のコードを踏襲。1 つの `BrowserWindow` を 1280×800 で開き、dev は `VITE_DEV_SERVER_URL`、本番は `dist/renderer/index.html` をロード。`webPreferences.preload` は `dist/preload/preload.cjs`、`contextIsolation: true`、`nodeIntegration: false`。
- **Preload (`src/preload/preload.ts`)**: Phase 1 では `contextBridge.exposeInMainWorld("mme", { versions: {...} })` のみ (Electron / Chrome / Node のバージョン表示用)。実際の IPC API は Phase 2 で増やす。**`window.electronAPI` ではなく `window.mme` の名前空間に揃える**ことに注意 (CLI / core と同じ識別子)。
- **Renderer (`src/renderer/App.tsx`)**: shadcn の Button + バージョン表示の最小画面。Phase 3 で本格的なスプレッドシート画面に置き換える。

### shadcn/ui 初期セット

- `components.json` を Phase 1 でそのまま取り込み、`button` のみ生成済みで commit (`pnpm shadcn add button`)。
- 以降のフェーズで必要なコンポーネント (`dialog`, `tabs`, `tooltip`, `select`, `checkbox`, `dropdown-menu`, `progress`, `toast`, `input`, `textarea`, `scroll-area`) は **そのフェーズで追加**して同じ PR に含める。Phase 1 で先回りしない。

### tsconfig

- ルートの `tsconfig.json` は Phase 1 では変更しない。`packages/gui/tsconfig.json` は composite 構成で、`tsconfig.node.json` (main / preload) と `tsconfig.web.json` (renderer) を `references` で繋ぐ。
- `pnpm -r typecheck` で `tsc --build` が走り、3 プロセスすべての型チェックが通ること。
- 各 tsconfig は electron-starter の `target` / `module` をそのまま受け継ぐ。

### vitest

- `packages/gui/vitest.config.ts` を作り、`src/**/*.test.ts(x)` を対象に。Phase 1 では `src/renderer/libs/utils.test.ts` 相当のスモーク テスト (`cn` の最小ケース) を 1 つ commit してチェーン全体が動くことを担保。
- React Testing Library は **入れない** (Phase 4 以降で必要になったタイミングで導入)。
- ルートの `pnpm -r test` で gui のテストも実行されること。

### `pnpm dev` の動作確認

- `pnpm --filter @akabeko/music-metadata-editor-gui dev` で:
  1. Renderer の Vite dev server が起動 (`http://localhost:5174`)
  2. Preload + Main を watch ビルド
  3. 初回ビルド完了後に Electron を spawn し、ウィンドウが表示される
- ホットリロード (Renderer) と再ビルド時の Electron 再起動 (Main / Preload) が動くこと。

## 設計方針

- `class` を使わず Plain Object + factory function を維持 (`docs/rules/code-style.md`)。Electron / React コンポーネントは関数で書く (React class component は使わない)。
- Main プロセスでは **`process.exit` を直接呼ばない**。エラーは `app.quit()` または `BrowserWindow` 上の Toast で見せる。
- shadcn/ui の生成物は手で書き換えない (基本)。書き換える場合はファイル先頭に `// CUSTOMIZED:` コメントを付け、`pnpm shadcn add` で再生成しても上書きされる前提で diff を残せるようにする。
- Renderer / Main / Preload で共有する型は **`src/shared/`** に集約する。Phase 1 では `src/shared/index.ts` を空のスタブで作成し、Phase 2 から本格的に増やす。

## 主要な内部 API (案)

```ts
// src/preload/preload.ts (抜粋。Phase 2 で IPC API を生やす)
contextBridge.exposeInMainWorld("mme", {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
} satisfies MmeBridge);

// src/shared/bridge.ts (Phase 1 で型のみ。Phase 2 で IPC を追加していく)
export type MmeBridge = {
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
};

declare global {
  interface Window {
    readonly mme?: MmeBridge;
  }
}
```

## 依存

- core (`@akabeko/music-metadata-editor`) v1.x がリリース済み (Phase 1 では `loadTrack` 等を呼ばないが、`workspace:*` 依存で取り込めることだけ確認する)。
- electron-starter のリポジトリは参考実装。**コードを丸ごと submodule で取り込まず**、必要ファイルをコピーする方針 (electron-starter は今後も独立に進化するため、追従はパッケージ単位の手動同期で行う)。

## テスト方針

- ユニット テスト: `src/renderer/libs/utils.test.ts` の `cn` ヘルパに対する最小ケース 1 つ。Phase 1 では UI コンポーネントの DOM テストは入れない。
- スモーク チェック (CI で自動化はしないが、Phase 1 のレビュー時に手動で確認):
  - `pnpm install` が成功する。
  - `pnpm --filter @akabeko/music-metadata-editor-gui dev` で Electron のウィンドウが立ち上がる。
  - ウィンドウに Electron / Chrome / Node のバージョンが表示される。
  - `pnpm --filter @akabeko/music-metadata-editor-gui build` が成功し、`dist/{main,preload,renderer}/` が生成される。
  - `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が全パッケージで緑。

## 完了条件 (DoD)

- `packages/gui/` が pnpm workspace に組み込まれ、`pnpm install` でローカル依存が解決する。
- `pnpm --filter @akabeko/music-metadata-editor-gui dev` で Electron アプリが起動し、Renderer に Electron / Chrome / Node のバージョンが表示される。
- `pnpm --filter @akabeko/music-metadata-editor-gui build` が成功し、`dist/main/main.js` / `dist/preload/preload.cjs` / `dist/renderer/index.html` が生成される。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` がワークスペース全体で緑。
- `electron-builder.yml` の `appId` / `productName` が確定値で commit されている (Phase 7 で再調整しない値にする)。
- `package.json` が `private: true`。
- `packages/gui/.mise.toml` が **gui 専用の Node / pnpm バージョン**として commit されている。`cd packages/gui && mise current` で gui 用 Node が解決され、リポジトリ ルートでは従来通りのルート Node が解決される (動作確認はレビュー時に手動)。
- `scripts/sync-electron-targets.mjs` の書き換え対象が **`packages/gui/.mise.toml`** になっており、`pnpm --filter @akabeko/music-metadata-editor-gui sync-targets` で gui の `.mise.toml` だけが更新される (ルートの `.mise.toml` は変化しない)。

## 参考資料

- electron-starter: <https://github.com/akabekobeko/electron-starter> (ローカル: `/Users/akabeko/Documents/dev/akabeko/electron-starter`)
- Electron Context Isolation: <https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- shadcn/ui (Vite): <https://ui.shadcn.com/docs/installation/vite>
- Tailwind v4 + Vite: <https://tailwindcss.com/docs/installation/using-vite>
