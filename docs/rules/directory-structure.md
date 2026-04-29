# ディレクトリ規約

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
  tags/                 # タグ形式ごとの read/write (id3v1, id3v2, ape, vorbisComment, ...)
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

## ファイル命名

- **`index.ts` は使わない**。Barrel File (再 export 専用ファイル) と混同しやすいため、エントリ ポイントは中身を表すファイル名 (例: 公開 API は `mme.ts`、サブモジュールは `parseId3v2.ts` など) を付けます。
- サブモジュールを束ねる「サブモジュールの名称」のファイル名 (例: `formats/mp3/mp3.ts`) を採用し、コロケーションした補助関数を同階層に並べます ([`code-style.md`](code-style.md) のサブルーチン分割方針を参照)。

## テスト フィクスチャ

- 音声ファイル系のテスト フィクスチャは **`tests/fixtures/<format>/`** に配置し、生成スクリプトを **`scripts/fixtures/<format>.ts`** として 1 ファイル/フォーマットで管理します。
- スクリプトは無音 (またはそれに準ずる最小サイズ) の音声 + ダミー メタデータを書き出し、生成された **バイナリは commit** します。これにより CI でも生成器を実行する必要がありません。
- 後続フェーズで新しいメタデータの本実装が入ったら、対応する生成スクリプトも更新してダミーを織り込み直します (例: Phase 9 で APIC/USLT/CHAP の構造化が入った時点で `scripts/fixtures/mp3.ts` を更新)。
- 実行コマンドは `pnpm fixtures:<format>` (例: `pnpm fixtures:mp3`)。詳細は [`scripts/fixtures/README.md`](../../scripts/fixtures/README.md) を参照。

`tags/` 配下は Phase 2 以降 (ID3v1/v2、APE、Vorbis Comment など) で各タグ形式の実装が追加された時点で作成します。Phase 1 完了時点では未配置です。

ディレクトリ構成は Phase 1 でファイナライズしました。[`../plan/phase-01-foundation.md`](../plan/phase-01-foundation.md) の決定事項を正とし、本ファイルとずれが生じた場合は本ファイルを更新します。
