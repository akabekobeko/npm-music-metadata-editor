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

### モノレポへの統合

- ルートの `pnpm-workspace.yaml` は既に `packages/*` を拾っているので変更不要。`pnpm install` で取り込まれることを確認。
- ルートの `pnpm test` / `pnpm typecheck` / `pnpm build` は `pnpm -r` でデリゲートされる。`packages/gui/` のスクリプト名を core / cli と揃えてあれば自動的に巻き込める。
  - ただし **`pnpm -r build` の途中で `electron` を落とすコストはある**ため、ルート `package.json` の `build` をどう運用するかは Phase 1 末で結論を出す:
    - 案 A: `pnpm -r build` のまま (gui の `build` も実行されるが、electron-builder は `package` で初めて呼ぶので vite build のみ。許容可)。
    - 案 B: gui の `build` をルートの一括 build から除外 (`pnpm --filter "!@akabeko/music-metadata-editor-gui" -r build`)。
  - 既定は案 A とし、CI 時間が問題になったら案 B に切り替える。
- `.mise.toml` はルートのものを共有する。electron-starter の Node バージョンが本リポジトリのものと食い違う場合は **本リポジトリ側のバージョンに合わせる** (Electron 41 系の bundled Node が古ければ `sync-targets` を Phase 7 直前に走らせる)。
- ルート `biome.json` は `packages/gui/src/**/*.{ts,tsx}` を lint / format 対象に含める (拡張子 `.tsx` を新規追加)。`pnpm check` がエラーなく通ること。

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

## 参考資料

- electron-starter: <https://github.com/akabekobeko/electron-starter> (ローカル: `/Users/akabeko/Documents/dev/akabeko/electron-starter`)
- Electron Context Isolation: <https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- shadcn/ui (Vite): <https://ui.shadcn.com/docs/installation/vite>
- Tailwind v4 + Vite: <https://tailwindcss.com/docs/installation/using-vite>
