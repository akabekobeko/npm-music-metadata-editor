# GUI 実装計画

`@akabeko/music-metadata-editor-gui` (`packages/gui/`) の実装計画をフェーズ単位で分割したドキュメント群です。core (`@akabeko/music-metadata-editor`) のリリース済み機能を **Electron 製のデスクトップ アプリ** として提供することを目的とします。

## 全体像

- **形態**: Electron アプリ (Main + Preload + Renderer の 3 プロセス構成)。
- **ベース**: [`akabekobeko/electron-starter`](https://github.com/akabekobeko/electron-starter) を踏襲。Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui。
- **モノレポ統合**: ルートの `mise` / `pnpm` をそのまま利用。`pnpm-workspace.yaml` の `packages/*` glob で取り込み、ルート スクリプト (`pnpm typecheck` / `pnpm test` / `pnpm check` / `pnpm build`) にデリゲートさせる。
- **UI**: スプレッドシート形式 (列 = メタデータ、行 = 音楽ファイル)。先頭列はファイル名 (編集不可、フルパスを tooltip で表示)、列単位のクリップボード ペーストをサポート。
- **メタデータ書き込み**: core (`loadTrack` / `saveTrack`) を **Main プロセス側で実行**し、Renderer は IPC でリクエスト。書き込み中は Renderer 側のモーダル インジケーターで完了を待つ。
- **画像 / 歌詞**: Pictures と Lyrics は専用モーダル ダイアログで編集する (スプレッドシート上では「件数」「present/none」などの要約表示にとどめる)。
- **設定**: 列表示 ON/OFF や直近開いたファイルなどのユーザー設定は Main プロセスから `app.getPath("userData")` 配下の JSON に保存する。
- **配布**: npm には公開しない (`package.json` も `private: true`)。配布物としては electron-builder 出力 (mac dmg / win nsis / linux AppImage) を想定するが、利用者は自前ビルドが基本。

非ゴール:

- core の機能拡張 (フォーマット追加、新しいタグ フィールド追加など) は core 側で実施。GUI 側はあくまで core の API シェイプで完結する。
- 大規模なバッチ処理 / 自動タグ付け (将来検討。最初の v1 では「複数ファイルを開いてセル単位で編集」が中心)。
- Web 版の提供 (Renderer は Electron 前提で書く)。

## レイヤー構成 (予定)

```
packages/gui/
  package.json                # private: true、@akabeko/music-metadata-editor-gui
  electron-builder.yml
  components.json             # shadcn/ui 設定 (renderer 配下に展開)
  scripts/
    dev.mjs                   # vite renderer + watch build (preload + main) → spawn electron
    sync-electron-targets.mjs # electron-starter から踏襲
    shadcn.mjs
  src/
    main/                     # Electron Main プロセス
      main.ts
      ipc/                    # IPC ハンドラ + IpcKeys / 型定義 / 共通 utils
        ipcKeys.ts            # channel 名定数
        types.ts              # MmeBridge / IpcResult 等。core 型もここで集約
        ipcHandler.ts         # initializeIpcEvents / releaseIpcEvents
        on*.ts                # 1 channel 1 ファイル
        formatSupport/        # 対応マトリックス (純関数)
        utils/                # toIpcError / semaphore など
      core/                   # core wrapper (loadTrack / saveTrack 呼び出し)
      settings/               # JSON 永続化 (userData)
      vite.config.ts
    preload/
      preload.ts              # IpcKeys を import + contextBridge で window.mme を expose
      vite.config.ts
    renderer/
      App.tsx
      renderer.tsx
      components/
        app/                  # スプレッドシート、モーダル、設定 UI
        ui/                   # shadcn/ui (生成物)
      features/               # ドメイン単位の hooks / state (tracks / pictures / lyrics / settings)
      libs/                   # Renderer 内ユーティリティ
      vite-env.d.ts           # window.mme 型 (`MmeBridge`) を declare global
      vite.config.ts
  tsconfig.json               # composite root (project references)
  tsconfig.node.json          # main / preload
  tsconfig.web.json           # renderer
  vitest.config.ts
```

## フェーズ一覧

| #  | フェーズ                                                  | 主なスコープ                                                                 | 状態 |
| -- | -------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| 01 | [Foundation](phase-01-foundation.md)                     | パッケージ骨格、electron-starter からの取り込み、3 プロセス起動、shadcn/ui 初期化 | TODO |
| 02 | [Main & IPC Foundation](phase-02-ipc.md)                 | core wrapper、IPC contract、preload API、エラー / Warnings 伝搬               | TODO |
| 03 | [Spreadsheet UI & Read](phase-03-spreadsheet.md)         | スプレッドシート ライブラリ選定、ファイル オープン / 読み込み、未対応セル disabled | TODO |
| 04 | [Cell Edit & Clipboard](phase-04-edit.md)                | セル編集、列選択 + ペースト、dirty 管理、未対応セルへの空振り処理              | TODO |
| 05 | [Pictures & Lyrics Modal](phase-05-extras.md)            | Pictures (画像 import/export/プレビュー) / Lyrics (text + LRC) モーダル        | TODO |
| 06 | [Settings & Write](phase-06-settings-write.md)           | 列表示 ON/OFF 設定の永続化、saveTrack 呼び出し、書き込み中インジケーター        | TODO |
| 07 | [Polish & Distribution](phase-07-polish.md)              | メニュー / D&D / 多言語 / electron-builder 配布物 / リリース手順              | TODO |

## 進め方

- 各フェーズは **完了条件 (DoD)** を満たした時点で完了。`pnpm -r typecheck` / `pnpm -r test` / `pnpm check` がワークスペース全体で緑である必要がある。
- core の API シグネチャに変更が必要になった場合は、**先に core 側にフェーズを追加**してリリースし、GUI はそれを前提に進める (GUI 側で core を破壊的に変更しない)。
- electron-starter のバージョン アップに追従する必要が出たら、`scripts/sync-electron-targets.mjs` を踏襲して同じ仕組みで吸収する (`tsconfig.node.json` / `tsconfig.web.json` の target、Vite の `build.target`、`.mise.toml` の Node)。
- ディレクトリ規約・コード スタイル・テスト方針は core / cli と共通の [`../../../rules/README.md`](../../../rules/README.md) に従う。
- フェーズ進行に合わせて `packages/gui/README.md` (利用者向け) と `docs/pkg/gui/architecture.md` を更新する。

## ライブラリ選定の方針

- **UI コンポーネント**: shadcn/ui (electron-starter と同じ。`pnpm shadcn add ...` で追加)。
- **スプレッドシート**: Phase 03 で評価し決定する。要件は **(a) セルのインライン編集、(b) セルごとに input type を切り替え (列ごとに任意の React コンポーネントを editor として置ける)、(c) 列範囲選択 → クリップボード ペースト**。第一候補は **TanStack Table v8 + `@tanstack/react-virtual`** (ヘッドレス、editor が完全に React、shadcn/ui の `Input` / `Select` / `Textarea` をそのまま editor に使える、MIT)。対抗馬として **react-data-grid (adazzle)** (`renderEditCell` で React editor が素直、列固定や仮想スクロールが標準で内蔵)、スケール保険として **Glide Data Grid** (Canvas ベース、10k 行超で前 2 つが詰まった場合のフォールバック)。Phase 03 で PoC して 1 つ採用し、以降のフェーズはそれを前提に書く。
- **状態管理**: 当面は React の `useReducer` + Context で済ます。スプレッドシート × ファイル数で状態が爆発する兆候が見えたら **Zustand** を検討 (Phase 04 までに結論)。
- **IPC 型安全化**: 別ライブラリは入れず、`src/main/ipc/types.ts` に `MmeBridge` 等の型を集約し、`src/main/ipc/ipcKeys.ts` に channel 名定数を置く。Preload と Renderer は `import type` で main/ipc/ を参照する (Renderer の `window.mme` 型は `src/renderer/vite-env.d.ts` で `declare global` する)。`src/shared/` のような共有レイヤーは作らず、ライブラリーや Electron への value 依存は **Main プロセスのみ** に閉じる。
- **ロギング**: 当面は `console`。Main プロセスのファイル ログが必要になったら Phase 07 で `electron-log` を検討。

## ライセンスと公開方針

- ライセンスは core / cli と同じ MIT。
- **npm へは公開しない** (`package.json` は `private: true`)。
- 配布物は electron-builder の出力 (`packages/gui/release/`) を、必要に応じて GitHub Releases に手動アップロードする運用を Phase 07 で確立する。
- アプリの `appId` / `productName` は Phase 01 で確定 (例: `appId: net.akabekobeko.music-metadata-editor` / `productName: Music Metadata Editor`)。

## 参考にする先行 GUI

| ツール             | 種別                | 注目点                                                                 |
| ------------------ | ------------------- | ---------------------------------------------------------------------- |
| Mp3tag             | Windows (Win32)     | スプレッドシート編集 / 列ペースト / 拡張フィールド一括書き換え         |
| MusicBrainz Picard | Cross / Python+Qt   | 行単位ファイル + 右ペインで詳細フィールド (本ツールは詳細をモーダル化) |
| kid3               | Cross / Qt          | フォーマット差を UI で見せる方針 (未対応フィールドの disabled 表示)    |
| Meta               | macOS / Swift       | 1 ファイル単位の詳細編集 + Pictures プレビューの体験設計                |
| Tag Editor         | Cross / Qt          | ID3v2 / FLAC / MP4 を統合的に扱う UI 構成                              |
