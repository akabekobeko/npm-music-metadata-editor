# 実装計画

`music-metadata-editor` の実装計画をフェーズ単位で分割したドキュメント群です。
各フェーズはおおむね独立した PR (または小さな PR の連なり) として進められる粒度を目安にしています。

## フェーズ一覧

| #  | フェーズ                       | 主なスコープ                                            | 状態   |
| -- | ----------------------------- | ----------------------------------------------------- | ----- |
| 01 | [Foundation](phase-01-foundation.md)            | 共通型、バイナリ I/O、フォーマット検出、公開 API 骨格   | DONE |
| 02 | [ID3v1 / ID3v2 + MP3](phase-02-id3-mp3.md)     | ID3v1/v2 read & write、MP3 ヘッダ最低限解析             | DONE |
| 03 | [FLAC + Vorbis Comment](phase-03-flac-vorbis.md)| FLAC メタデータ ブロック、Vorbis Comment 共通実装        | DONE |
| 04 | [MP4 / M4A Atoms](phase-04-mp4.md)              | atom ツリー パース、iTunes アトム、read/write           | DONE |
| 05 | [OGG Container](phase-05-ogg.md)                | OGG ページ、Vorbis/Opus、Phase 3 との連携                | TODO |
| 06 | [APE Tag + Monkey's Audio](phase-06-ape.md)     | APE Tag v1/v2、APE オーディオ ヘッダ                    | DONE |
| 07 | [RIFF (WAV) + AIFF](phase-07-riff-aiff.md)      | RIFF/AIFF チャンク パース、LIST INFO、BEXT、ID3 chunk    | DONE |
| 08 | [WMA / ASF](phase-08-wma-asf.md)                | ASF ヘッダ、WM/* プロパティ                              | DONE |
| 09 | [Lyrics / Chapters / Pictures](phase-09-extras.md) | 拡張メタデータ (歌詞、章、埋め込み画像)                  | DONE |
| 10 | [Public API & Polish](phase-10-public-api.md)   | Track 相当の高レベル API、エラー戦略、ドキュメント整備   | TODO |

## 進め方

- 各フェーズは **完了条件 (DoD)** を満たすことをもって完了とします。
- フェーズをまたぐ依存は「依存」セクションで明示します。前提となるフェーズが TODO のまま着手しないこと。
- ATL.NET ([Zeugma440/atldotnet](https://github.com/Zeugma440/atldotnet)) は **挙動の参考実装**です。コードをそのまま移植するのではなく、Node.js + TypeScript として最適な形に再設計します (開発ルールは `../rules/README.md` を参照)。
- ATL.NET のソースが必要になった場合は、ローカルへの clone パスを Claude Code がユーザーに確認します (`../../CLAUDE.md` の「プロジェクト概要」を参照)。
