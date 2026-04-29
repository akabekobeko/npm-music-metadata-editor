# ディレクトリ規約

```
src/
  index.ts              # 公開 API のエントリ ポイント (readMetadata / writeMetadata)
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

`tags/` 配下は Phase 2 以降 (ID3v1/v2、APE、Vorbis Comment など) で各タグ形式の実装が追加された時点で作成します。Phase 1 完了時点では未配置です。

ディレクトリ構成は Phase 1 でファイナライズしました。[`../plan/phase-01-foundation.md`](../plan/phase-01-foundation.md) の決定事項を正とし、本ファイルとずれが生じた場合は本ファイルを更新します。
