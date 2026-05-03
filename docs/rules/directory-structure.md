# ディレクトリ規約

以下のレイアウトは **`packages/core/` 配下** を起点とした相対構成です (リポジトリ全体は pnpm workspace で `packages/*` を束ねています)。新しいパッケージを追加する場合も同じ規約を `packages/<name>/` 配下で適用します。

```
src/
  mme.ts                # 公開 API のエントリ ポイント (readMetadata / writeMetadata)
                        # ※ `index` は Barrel File と混同するため命名に使わない
  types.ts              # 全モジュール共用の type 定義 (TagData, AudioFormat, PictureInfo, ...)
  constants.ts          # 全モジュール共用の定数 (必要が生じたタイミングで作成)
  io/                   # バイナリ I/O ユーティリティ
    bufferCursor.ts     # 読み取りカーソル (factory function + Plain Object)
    bufferWriter.ts     # 可変サイズ書き込み (factory function + Plain Object)
    file.ts             # fs/promises の薄いラッパー (readFileBuffer)
  formats/              # コンテナ形式ごとの read/write (mp3, flac, mp4, ogg, wav, ...)
    detect.ts           # 拡張子 / 署名によるフォーマット検出
    registry.ts         # format -> { detectSignature, read, write } のマッピング
  tags/                 # **複数 container で再利用される** タグ形式の純粋実装
                        # (id3v1, id3v2, ape, vorbisComment, ...)
  utils/                # 汎用ユーティリティ
    encoding.ts         # TextDecoder / Buffer を組み合わせた文字エンコーディング
    syncSafeInt.ts      # ID3v2 同期安全整数の encode / decode
scripts/
  fixtures/             # フィクスチャ生成スクリプト (フォーマット単位で 1 ファイル)
    README.md
    mp3.ts              # tests/fixtures/mp3/ を生成 (`pnpm fixtures:mp3`)
tests/
  fixtures/
    mp3/                # 生成された .mp3 (commit する。再生成は scripts/fixtures/ を実行)
docs/
  README.md             # docs/ 配下のサブディレクトリ案内
  plan/                 # 実装計画 (フェーズ別)
    README.md
    phase-XX-*.md
  rules/                # 開発ルール (トピック別)
    README.md
    code-style.md
    language-runtime.md
    testing.md
    types-and-constants.md
    git.md
    directory-structure.md
```

サブディレクトリ (`tags/id3v2/` など) 内でも、複数ファイルで共有する型は同階層の `types.ts`、定数は `constants.ts` に集約します ([`types-and-constants.md`](types-and-constants.md) を参照)。

## `formats/` と `tags/` の住み分け

タグ形式の実装は、**そのタグが複数のコンテナで再利用されるか否か**で配置先を決めます。

### `src/tags/<tagName>/` に置く (= 複数 container で共有されるタグ)

| Tag | 利用 container | 根拠 |
| --- | --- | --- |
| `id3v1` | MP3 (主)、WAV / AIFF (一部) | [phase-02](../plan/core/phase-02-id3-mp3.md) 設計方針 |
| `id3v2` | MP3 + WAV + AIFF | [phase-02](../plan/core/phase-02-id3-mp3.md) / [phase-07](../plan/core/phase-07-riff-aiff.md) (`id3 ` chunk 経由で再利用) |
| `vorbisComment` | FLAC + OGG Vorbis + Opus | [phase-03](../plan/core/phase-03-flac-vorbis.md) / [phase-05](../plan/core/phase-05-ogg.md) |
| `ape` | APE + MP3 (+ FLAC / MPC / WV) | [phase-06](../plan/core/phase-06-ape.md) |

これらは **純粋なバイナリ ↔ オブジェクト変換のみ** を担い、ファイル位置の決定 (head / tail / chunk 内など) は呼び出し元のコンテナに委ねます。

### `src/formats/<container>/` 内に直接置く (= そのコンテナ専用のタグ)

| Tag / 構造 | 配置 | 根拠 |
| --- | --- | --- |
| MP4 atoms (iTunes アトム等) | `formats/mp4/` 配下 | [phase-04](../plan/core/phase-04-mp4.md) (MP4/M4A 専用) |
| WMA / ASF プロパティ | `formats/wma/` 配下 | [phase-08](../plan/core/phase-08-wma-asf.md) (WMA 専用) |
| RIFF `LIST INFO` / `BEXT` chunk | `formats/wav/` 配下 | [phase-07](../plan/core/phase-07-riff-aiff.md) (WAV 専用) |
| AIFF native annotation 等 | `formats/aiff/` 配下 | [phase-07](../plan/core/phase-07-riff-aiff.md) (AIFF 専用) |

### 判断フロー

新しいタグ実装を追加するときは:

1. **2 つ以上のコンテナがそのタグを使うか?** → Yes なら `src/tags/<tagName>/`
2. 1 つのコンテナでしか使わないか? → Yes なら `src/formats/<container>/` 配下にコロケート
3. **横方向 import (例: `formats/wav/` から `formats/mp3/` へ) は禁止**。共通化が必要になった時点で `src/tags/` へ昇格させる。

クロス フォーマットで動く拡張メタデータ (`PictureInfo` / `LyricsInfo` / `ChapterInfo`) のマッピング ロジックも、複数 tag 形式から `src/types.ts` の共通中間表現へ写像する位置に置きます ([phase-09](../plan/core/phase-09-extras.md) で本格化)。

## ファイル命名

- **`index.ts` は使わない**。Barrel File (再 export 専用ファイル) と混同しやすいため、エントリ ポイントは中身を表すファイル名 (例: 公開 API は `mme.ts`、サブモジュールは `parseId3v2.ts` など) を付けます。
- サブモジュールを束ねる「サブモジュールの名称」のファイル名 (例: `formats/mp3/mp3.ts`) を採用し、コロケーションした補助関数を同階層に並べます ([`code-style.md`](code-style.md) のサブルーチン分割方針を参照)。

## テスト フィクスチャ

- 音声ファイル系のテスト フィクスチャは **`tests/fixtures/<format>/`** に配置し、生成スクリプトを **`scripts/fixtures/<format>.ts`** として 1 ファイル/フォーマットで管理します。
- スクリプトは無音 (またはそれに準ずる最小サイズ) の音声 + ダミー メタデータを書き出し、生成された **バイナリは commit** します。これにより CI でも生成器を実行する必要がありません。
- 後続フェーズで新しいメタデータの本実装が入ったら、対応する生成スクリプトも更新してダミーを織り込み直します (例: Phase 9 で APIC/USLT/CHAP の構造化が入った時点で `scripts/fixtures/mp3.ts` を更新)。
- 実行コマンドは `pnpm --filter @akabeko/music-metadata-editor fixtures:<format>` (例: `pnpm --filter @akabeko/music-metadata-editor fixtures:mp3`)、または `packages/core/` で `pnpm fixtures:<format>`。詳細は [`scripts/fixtures/README.md`](../../packages/core/scripts/fixtures/README.md) を参照。

`tags/` 配下は Phase 2 以降 (ID3v1/v2、APE、Vorbis Comment など) で各タグ形式の実装が追加された時点で作成します。Phase 1 完了時点では未配置です。

ディレクトリ構成は Phase 1 でファイナライズしました。[`../plan/core/phase-01-foundation.md`](../plan/core/phase-01-foundation.md) の決定事項を正とし、本ファイルとずれが生じた場合は本ファイルを更新します。
