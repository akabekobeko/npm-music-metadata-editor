# フィールド対応表

日本語 / [English](field-mapping.md)

各タグ形式と `TagData` フィールドの対応表です。`loadTrack` / `readMetadata` が返す `TagData` は、フォーマットによらず統一された名前でメタデータを公開します。

## 凡例

- `—` … そのフォーマットでは対応するキーが存在しない / 利用しない
- 値が複数キーから設定されうる場合、左から順に評価され **先勝ち** (Vorbis Comment / APE)
- 数値型 (`year` / `trackNumber` 等) は文字列を `Number.parseInt(_, 10)` で変換

## 共通フィールド

| `TagData` フィールド | ID3v2 (text frame) | ID3v1 | Vorbis Comment | APE | MP4 (iTunes atom) | RIFF (LIST INFO) | AIFF (native) | WMA (Content / Extended) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `title` | `TIT2` | `TIT` (offset 3) | `TITLE` | `TITLE` | `©nam` | `INAM` / `TITL` | `NAME` | `WM/TITLE` |
| `artist` | `TPE1` | `ART` (offset 33) | `ARTIST` | `ARTIST` | `©ART` / `©art` | `IART` | `AUTH` | `WM/AUTHOR` |
| `albumArtist` | `TPE2` | — | `ALBUMARTIST` | `ALBUMARTIST` / `ALBUM ARTIST` | `aART` | — | — | `WM/AlbumArtist` |
| `album` | `TALB` | `ALB` (offset 63) | `ALBUM` | `ALBUM` | `©alb` | `IPRD` | — | `WM/AlbumTitle` |
| `composer` | `TCOM` | — | `COMPOSER` | `COMPOSER` | `©wrt` | `IMUS` | — | `WM/Composer` |
| `conductor` | `TPE3` | — | `CONDUCTOR` | `CONDUCTOR` | `©con` | — | — | `WM/Conductor` |
| `producer` | `TIPL` (v2.4) / `IPLS` (v2.3) — involved people list の `producer` role | — | `PRODUCER` | `PRODUCER` | `----:PRODUCER` (freeform) | — | — | `WM/Producer` |
| `lyricist` | `TEXT` | — | `LYRICIST` | `LYRICIST` | — | — | — | `WM/Writer` |
| `publisher` | `TPUB` | — | `PUBLISHER` | `PUBLISHER` | `©pub` / `publ` | — | — | `WM/Publisher` |
| `copyright` | `TCOP` | — | `COPYRIGHT` | `COPYRIGHT` | `cprt` | `ICOP` | `(c) ` | `WM/COPYRIGHT` |
| `comment` | `COMM` | `COM` (offset 97, ID3v1.1: 28 byte) | `COMMENT` | `COMMENT` | `©cmt` | `ICMT` | `ANNO` (複数 chunk は改行連結) | `WM/DESCRIPTION` |
| `genre` | `TCON` | `genre` (1 byte index) | `GENRE` | `GENRE` | `©gen` / `gnre` | `IGNR` | — | `WM/Genre` |
| `group` | `TIT1` | — | — | — | `©grp` | — | — | `WM/ContentGroupDescription` |
| `description` | `TDES` | — | `DESCRIPTION` | `DESCRIPTION` | `desc` / `©des` / `ldes` | — | — | `WM/SubTitleDescription` |
| `language` | `TLAN` | — | `LANGUAGE` | `LANGUAGE` | — | `ILNG` | — | `WM/Language` |
| `isrc` | `TSRC` | — | `ISRC` | `ISRC` | `©isr` | — | — | `WM/ISRC` |
| `productId` | — | — | `CATALOGNUMBER` / `PRODUCTNUMBER` | `CATALOGNUMBER` | `prID` | — | — | — |
| `year` | `TYER` | `year` (offset 93, 4 byte) | `DATE` 先頭 4 桁 | `YEAR` | `©day` 先頭 4 桁 | `ICRD` 先頭 4 桁 | — | `WM/Year` |
| `recordingDate` | `TDRC` | — | `DATE` (full text) | `RECORDDATE` | `©day` (full text) | `ICRD` (full text) | — | — |
| `originalReleaseDate` | `TDOR` | — | `ORIGINALDATE` | `ORIGINALDATE` | — | — | — | — |
| `publishingDate` | `TDRL` | — | `RELEASEDATE` | `RELEASEDATE` | `rldt` | — | — | — |
| `trackNumber` | `TRCK` (`X[/Y]`) | byte 126 (ID3v1.1) | `TRACKNUMBER` (`X[/Y]`) | `TRACK` / `TRACKNUMBER` (`X[/Y]`) | `trkn` (number) | `TRCK` / `IPRT` / `ITRK` | — | `WM/TrackNumber` (`X[/Y]`) |
| `trackTotal` | `TRCK` の `Y` | — | `TRACKTOTAL` / `TOTALTRACKS` / `TRACKNUMBER` の `Y` | `TRACKTOTAL` / `TOTALTRACKS` / `TRACKNUMBER` の `Y` | `trkn` (total) | — | — | `WM/TrackNumber` の `Y` |
| `discNumber` | `TPOS` (`X[/Y]`) | — | `DISCNUMBER` (`X[/Y]`) | `DISC` / `DISCNUMBER` (`X[/Y]`) | `disk` (number) | — | — | `WM/PartOfSet` (`X[/Y]`) |
| `discTotal` | `TPOS` の `Y` | — | `DISCTOTAL` / `TOTALDISCS` / `DISCNUMBER` の `Y` | `DISCTOTAL` / `TOTALDISCS` / `DISCNUMBER` の `Y` | `disk` (total) | — | — | `WM/PartOfSet` の `Y` |
| `bpm` | `TBPM` | — | `BPM` | `BPM` | `tmpo` | — | — | `WM/BeatsPerMinute` |
| `rating` | `POPM` (rating byte 0–255、Windows / MediaMonkey の半星慣用値) | — | `RATING` (0–100。読み取りは 0–5 の星数も可) | `RATING` / `PREFERENCE` (0–100。読み取りは 0–5 の星数も可) | `rtng` (0–100 → `[0, 1]` に正規化) | — | — | `WM/SharedUserRating` (0–99 → `[0, 1]` に正規化) |

## 補足

### ID3v2

- `producer` は専用のテキスト フレームを持たず、involved people list (v2.4 は `TIPL`、v2.3 は `IPLS`、v2.2 の `IPL` はパース時に `TIPL` へ昇格) の中に role / name のペアとして格納される。読み取り時の role 照合は大文字小文字を区別せず、書き込み時は小文字の `producer` role を出力する。
- 書き込みでは involved people frame 内の `producer` エントリーのみを置換し、同じフレームに格納された他の role (engineer、mixer など) は保持する。`producer` に `""` を指定すると role を削除し、エントリーが残らない場合はフレーム自体を出力しない。
- `rating` は最初の `POPM` フレームから取得する。rating byte は Windows Explorer / MediaMonkey / MusicBee の慣用値 (ATL.NET と同じ) に従い、1〜5 つ星が `1` / `64` / `128` / `196` / `255`、半星が `13` / `54` / `118` / `186` / `242`。読み取りでは `1`〜`5` を星数、`6`〜`10` を 0–10 スケールとして扱い、その他の値は最も近い半星に丸める。書き込みでは正規化値を最も近い半星に丸めて出力する。既存フレームの e-mail と再生カウンターは保持し、新規フレームの e-mail は `Windows Media Player 9 Series` とする。

### ID3v1 / ID3v1.1

- ID3v1.1 では byte 126 = `0x00` のとき byte 127 を `trackNumber` に使う (元の comment 末尾を 28 byte に短縮)。
- `genre` byte は最初の 80 件 (固定テーブル) のみ名前解決し、それ以外は `undefined` を返す。
- `year` フィールドは 4 byte の文字列で、空文字 / 非数値の場合は `tag.year` に書き出さない。

### Vorbis Comment / APE

- `TRACKNUMBER` (`DISCNUMBER`) は `"X"` または `"X/Y"` の両形式を受け付け、`/Y` 部分は `trackTotal` (`discTotal`) に降ろす。
- 同一キーが複数回現れる multi-value については **最初の値が勝つ**。`TagData` は単一値モデルのため。
- 認識されないキーは `TagData` には現れないが、書き戻し時は元のタグ ブロック側で round-trip される。
- `RATING` (APE は `RATING` / `PREFERENCE`) は 0–100 の整数 (`Math.round(rating * 100)`) で書き込む。読み取りでは 5 以下を 0–5 の星数 (`2.5` のような半星も可)、それより大きい値を 100 で頭打ちしたパーセントとして扱う (ATL.NET と同じ)。

### MP4 / iTunes atoms

- `©lyr` (lyrics) は `TagData` には載せず、`Track.lyrics` に Phase 9 のロジックで降ろす。
- `gnre` は 1-based の ID3v1 ジャンル インデックス。`©gen` (テキスト) と両方ある場合は読み順で最後勝ち。
- `covr` は `Track.pictures` (Phase 9) に流れ、`TagData` には載せない。

### RIFF (WAV) / AIFF native

- `LIST INFO` の認識キーのみ `TagData` に載る。未知の INFO キーは `Track.additionalFields` 側にも現状出していないが、書き戻し時は writer が元の chunk から保持する。
- AIFF の `ANNO` は **複数 chunk が許可されている** ため、改行 (`\n`) で連結して `comment` にする。

### WMA / ASF

- Content Description Object の 4 フィールド (`title` / `author` / `copyright` / `description`) は Extended Content Description Object の同名フィールドより **後勝ち** (= Content Description が最終的に上書き)。これは Windows Media Player / ATL.NET の挙動に揃えた。
- `WM/SharedUserRating` は 0..99 整数を `[0, 1]` に正規化して `rating` に格納。

## TagData にマップされない情報

- `Track.pictures` (`PictureInfo[]`) … APIC (ID3v2) / METADATA_BLOCK_PICTURE (Vorbis Comment) / `covr` (MP4) / WAV `id3 ` chunk 内 APIC 等
- `Track.chapters` (`ChapterInfo[]`) … `CHAP` / `CTOC` (ID3v2) を中心に処理
- `Track.lyrics` (`LyricsInfo`) … `USLT` / `SYLT` (ID3v2)、Vorbis Comment の `LYRICS` (将来対応予定)
- `Track.additionalFields` (`Record<string, string>`) … format-native だが `TagData` 名前空間に載せない値を保持する場所
- `Track.warnings` (`Warning[]`) … 部分的破損や未対応フィーチャーの非致命的な diagnostics

これらは `TagData` の項目とは独立した別フィールドとして `Track` に並びます。
