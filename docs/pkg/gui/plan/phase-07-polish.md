# Phase 7: Polish & Distribution

## 目的

機能面では Phase 6 までで「ファイルを開く → 編集する → 保存する」の往復が成立している。Phase 7 では **アプリとして配布するための仕上げ** を行う。具体的にはアプリ メニュー、ファイルの D&D、ダーク モード、エラー報告、ローカライズ、`electron-builder` での配布物生成、リリース手順を整える。

## スコープ

### アプリ メニュー

OS 標準のメニュー バー (macOS は `app` メニュー含む) を整備する。`Menu.buildFromTemplate` で構築し、`accelerator` を OS ごとに合わせる。

| メニュー         | 項目                              | 動作                                        |
| ---------------- | --------------------------------- | ------------------------------------------- |
| `<App>` (mac)    | About / Preferences / Quit        | `app.quit()` 等                             |
| File             | Open Audio Files…                 | Phase 3 の動作                              |
|                  | Open Recent ▶                     | Phase 6 の `recentFiles` を 10 件まで       |
|                  | Save (= Save Selected)            | 行選択した dirty 行のみ                     |
|                  | Save All                          | 全 dirty 行                                 |
|                  | Discard Changes                   | 全 dirty 行を origin に戻す                 |
|                  | Close All                         | 開いている行を全部閉じる                    |
|                  | Close Window / Quit               |                                             |
| Edit             | Undo / Redo / Cut / Copy / Paste  | 標準ロール                                  |
|                  | Select All                        | スプレッドシートの全セル選択                |
| View             | Columns ▶                         | Phase 6 の Dropdown と同等                  |
|                  | Toggle Dark Mode                  | Phase 7 で実装                              |
|                  | Reload / Toggle DevTools (debug)  | dev ビルドのみ                              |
| Help             | Visit Project Website / About     | 既定ブラウザで GitHub                       |

#### 行選択 (Save Selected)

- スプレッドシートの選択範囲から **行番号集合** を取り、そこに含まれる dirty 行だけ `mme:track:save` する。
- 選択範囲が無いとき (フォーカス未設定) は **Save All** にフォールバック。

### Drag & Drop

- Renderer 全体を D&D ターゲットにする。
- ファイル ドロップ:
  - 拡張子が `Audio (*.mp3 *.flac ...)` フィルタにマッチするものだけを `mme:track:loadMany` に流す。
  - フォルダ ドロップ: Main 側で再帰的に展開 (`mme:dialog:expandPaths` を新設) し、音楽ファイルのみ抽出。深さ制限は **3 階層** (= 過剰な再帰を避ける v1 の安全装置)。
- 既に開いているパスがあれば後勝ちで上書き (Phase 3 の方針と同じ)。

### ダーク モード

- shadcn/ui の `next-themes` 互換の light/dark 切替えを **手動で実装** (Phase 1 で `next-themes` は入れていない)。
- `prefers-color-scheme: dark` を既定とし、メニューで上書き可能。`AppSettings.theme` (新設、Phase 7 で v1 スキーマに追加してマイグレーション) に永続化。

### エラー / 例外の集約表示

- Main プロセスの `uncaughtException` / `unhandledRejection` をフックし、`webContents.send("mme:fatal", error)` で Renderer に通知。Renderer 側はモーダルでエラー詳細を出し、`Reload` / `Quit` を選ばせる。
- Renderer 側の `window.onerror` / `window.onunhandledrejection` も同様にエラー モーダルへ。
- 致命的でない `MmeError` はインライン (Phase 6 で実装済) のままで、エラー モーダルには出さない。

### ローカライズ (日本語 / 英語)

- 簡素な辞書方式 (`locales/en.json` / `locales/ja.json`)。i18next 等の依存は **入れない** (キー数が少ないため自前で十分)。
- 起動時に `app.getLocale()` を見て `en` / `ja` を選び、`AppSettings.locale` で上書き可能。
- 翻訳対象はメニュー / ボタン ラベル / モーダル文言のみ。エラー メッセージは英語固定 (デバッグしやすさのため)。

### About ダイアログ

- `Help → About` で表示。
- 内容: アプリ名、バージョン、core / cli / electron / chrome / node のバージョン (`mme:app:getVersions`)、ライセンス (MIT)、リポジトリ URL。

### Logging

- Main プロセスのファイル ログを `electron-log` で `userData/logs/main.log` に出力 (Phase 7 で導入)。Renderer の `console.error` も Main にフォワードして同じログに記録。
- ログ ローテーション: `electron-log` の既定 (1 MB)。

### 開発者向け設定

- 環境変数 `MME_DEV=1` で Main 起動時に DevTools を auto-open。
- `--inspect` 系は Vite + Electron の dev script で既定で対応 (Phase 1 のスクリプトを活かす)。

### electron-builder / 配布物

- `electron-builder.yml` を本リポジトリ用に確定:
  - `appId`: `net.akabekobeko.music-metadata-editor` (Phase 1 で確定)
  - `productName`: `Music Metadata Editor`
  - `directories.output`: `release`
  - `mac.target`: `dmg` + `zip` (x64 + arm64)
  - `win.target`: `nsis` + `zip` (x64)
  - `linux.target`: `AppImage` + `deb` (x64)
  - `mac.category`: `public.app-category.music`
  - 署名 / 公証 (`afterSign` フック) は **v1 では行わない** (個人用途。配布時に macOS Gatekeeper で警告が出る旨を README に明記)。
  - アイコン (`build/icon.icns` / `icon.ico` / `icon.png`) は Phase 7 で 1 セット用意。なければ仮アイコンで起動できるよう electron-builder のデフォルトを許容。
- `pnpm package` で `release/` 配下に成果物が出ることを確認。
- ファイル サイズの目安:
  - macOS dmg: 〜150 MB (Electron バンドルが支配的)
  - Linux AppImage: 〜150 MB
  - Windows nsis: 〜100 MB

### 配布手順 (npm 非公開)

`packages/cli/scripts/publish.mjs` のような自動化は **入れない**。手動運用:

1. `packages/gui/package.json` の `version` を bump。
2. `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` / `pnpm --filter @akabeko/music-metadata-editor-gui build` を緑にする。
3. **`/security-review` を実施し、`docs/pkg/gui/security-review/v<version>.md` に結果を残す**。
4. PR を出す (`pkg:gui` ラベル)。マージ後に `pnpm --filter @akabeko/music-metadata-editor-gui package` で成果物を生成。
5. GitHub Releases に手動アップロード。タグは `gui-v<version>` (core / cli と区別するため scope 付きタグを採用)。

### `architecture.md` の整備

- `docs/pkg/gui/architecture.md` を Phase 7 で本格整備。Mermaid 図 (3 プロセス構成 / IPC フロー / 書き込みシーケンス) は cli の architecture を踏襲。
- 取り込み時の electron-starter のコミット (= 取り込み元の SHA) を記録するセクションを設け、追従時に diff を取りやすくする。

### v1 で入れない (deferred)

- 行選択ベースの右クリック メニュー → v1.1
- 行ドラッグ並び替え → v1.1
- バッチ編集 (複数行に同じ Pictures を一括設定) → v1.1
- chapters 編集 → v1.1 (表示は Phase 3 で出すが、編集は v1.1 で本格化)
- アプリ起動時の自動更新 (`electron-updater`) → v1.1 以降
- macOS の署名・公証 → 配布頻度が増えてから検討
- 多並列 saveTrack (`Promise.all` での 4〜8 並列) → 安定運用の実績ができてから

## 設計方針

- メニュー / D&D / ダーク モードはいずれも **Renderer の状態** + **Main の永続化** の組み合わせで実装する。Phase 6 で組んだ `AppSettings` の枠組みを再利用する。
- `electron-builder.yml` は **手動で書く**。`@electron-forge` は導入しない (electron-starter と同じ運用)。
- Phase 7 のコードは「テストできる純関数」と「Electron API の薄いラッパー」に明確に分け、テストは前者に集中する。`Menu.buildFromTemplate` の引数を返す純関数 (`buildAppMenu(state, locale): MenuTemplate`) を切る。

## 主要な内部 API (案)

```ts
export const buildAppMenu: (
  state: { hasDirty: boolean; recentFiles: readonly string[]; theme: "light" | "dark" },
  locale: "en" | "ja",
) => MenuTemplate;

export const expandDroppedPaths: (
  paths: readonly string[],
  options?: { maxDepth?: number },
) => Promise<readonly string[]>;  // Main プロセス側

export const t: (key: string, locale: "en" | "ja") => string;
```

## 依存

- Phase 1〜6 すべて。
- core / cli の設計概要 (`docs/pkg/core/architecture.md` / `docs/pkg/cli/architecture.md`) と整合する `gui/architecture.md` を作る。

## テスト方針

- `buildAppMenu`:
  - 状態スナップショット (dirty あり / なし、recent 0 件 / 10 件、locale en / ja) でメニュー構造を固定。
  - menu の `accelerator` が macOS / windows で適切に切り替わること (`process.platform` を mock)。
- `expandDroppedPaths`:
  - 1 階層・3 階層・拡張子フィルタ・シンボリック リンク (= スキップ) の振る舞い。
  - 一時ディレクトリで実際にファイルを置いてテスト。
- `t(key, locale)`:
  - キー存在 / 不在の振る舞い (不在は `key` 自身を返す + 1 回だけ console.warn)。
  - 全キーが両 locale に存在すること (テストで keys の集合を比較)。
- electron-builder 出力の検証:
  - CI には組み込まない (重い)。Phase 7 末に手動で macOS / Linux 環境で 1 回ずつ作って起動確認。Windows は ローカル / GitHub Actions の windows-latest で 1 回。

## 完了条件 (DoD)

- アプリ メニュー (File / Edit / View / Help) が動く。`Cmd/Ctrl+S` / `Cmd/Ctrl+O` / `Cmd/Ctrl+Z` 等のショートカットがメニューと連動する。
- D&D でファイル / フォルダを取り込める。
- ダーク モードが切替えられ、設定が永続化される。
- About ダイアログでバージョン情報が確認できる。
- `pnpm --filter @akabeko/music-metadata-editor-gui package` で 1 つ以上のプラットフォーム向け配布物 (macOS or Linux) が生成され、起動して読み込み / 編集 / 保存が動く。
- `docs/pkg/gui/architecture.md` が整備されている。
- `docs/pkg/gui/security-review/v<version>.md` が記入され、致命的な指摘が無い (あれば修正済み)。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。

## 参考資料

- Electron Menu: <https://www.electronjs.org/docs/latest/api/menu>
- Electron Drag and Drop: <https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop>
- electron-builder: <https://www.electron.build/configuration/configuration>
- electron-log: <https://github.com/megahertz/electron-log>
- next-themes (参考): <https://github.com/pacocoursey/next-themes>
