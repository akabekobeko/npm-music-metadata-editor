# テスト

- **なるべくテストを実装する**。新規関数を書いた時点で対応する `*.test.ts` を同じディレクトリに置くのを基本とする。
- 仕様の境界 (空入力、最大長、エラー値、エンディアンの境界など) を Vitest で網羅する。
- フィクスチャとなる音源ファイルが必要な場合は `tests/fixtures/<format>/` に配置し、生成スクリプト `scripts/fixtures/<format>.ts` から再生成できる状態を保つ ([`directory-structure.md`](directory-structure.md) 参照)。

## ファイル分割

- **テスト ファイルは対象ソース ファイルと 1 対 1 対応**。`foo.ts` の隣に `foo.test.ts` を置く。ソースが `foo/foo.ts` ならテストも `foo/foo.test.ts`。
- **対象ソースが 1 関数 1 ファイル** (例: `decodeText.ts`) の場合、外側の `describe` を省いて `it` を**フラットに並べる**。ファイル名そのものが describe の役割を果たす。
- **対象ソースが複数ピア関数を持つ** (例: `formats/detect.ts`) 場合は、関数ごとに `describe("<関数名>", ...)` を分けて 1 ファイル内にまとめる。
- ヘルパー関数 (private) は対応するメイン関数のテストから間接的に検証する。private helper 単体のテスト ファイルは作らない。
- 統合テスト (E2E / 複数モジュールをまたぐ) も「主に検証している関数」のテスト ファイルに置く。例: `readMetadata` 経由でフィクスチャを読む E2E は `formats/mp3/readMp3/readMp3.test.ts` に置く。
