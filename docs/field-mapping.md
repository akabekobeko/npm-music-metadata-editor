[Japanese](field-mapping.ja.md)

# Field Mapping

This document maps each tag format to the common `TagData` shape exposed by
`loadTrack` / `readMetadata`. The returned `TagData` uses the same names
regardless of the underlying container.

Legend:

- `—` … the format has no equivalent key, or the key is not used.
- When a target field can be sourced from multiple keys, the leftmost match
  wins (this applies to Vorbis Comment / APE).
- Numeric fields (`year` / `trackNumber`, etc.) are parsed from strings via
  `Number.parseInt(_, 10)`.

## Common fields

| `TagData` field | ID3v2 (text frame) | ID3v1 | Vorbis Comment | APE | MP4 (iTunes atom) | RIFF (LIST INFO) | AIFF (native) | WMA (Content / Extended) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `title` | `TIT2` | `TIT` (offset 3) | `TITLE` | `TITLE` | `©nam` | `INAM` / `TITL` | `NAME` | `WM/TITLE` |
| `artist` | `TPE1` | `ART` (offset 33) | `ARTIST` | `ARTIST` | `©ART` / `©art` | `IART` | `AUTH` | `WM/AUTHOR` |
| `albumArtist` | `TPE2` | — | `ALBUMARTIST` | `ALBUMARTIST` / `ALBUM ARTIST` | `aART` | — | — | `WM/AlbumArtist` |
| `album` | `TALB` | `ALB` (offset 63) | `ALBUM` | `ALBUM` | `©alb` | `IPRD` | — | `WM/AlbumTitle` |
| `composer` | `TCOM` | — | `COMPOSER` | `COMPOSER` | `©wrt` | `IMUS` | — | `WM/Composer` |
| `conductor` | `TPE3` | — | `CONDUCTOR` | `CONDUCTOR` | `©con` | — | — | `WM/Conductor` |
| `lyricist` | `TEXT` | — | `LYRICIST` | `LYRICIST` | — | — | — | `WM/Writer` |
| `publisher` | `TPUB` | — | `PUBLISHER` | `PUBLISHER` | `©pub` / `publ` | — | — | `WM/Publisher` |
| `copyright` | `TCOP` | — | `COPYRIGHT` | `COPYRIGHT` | `cprt` | `ICOP` | `(c) ` | `WM/COPYRIGHT` |
| `comment` | `COMM` | `COM` (offset 97; 28 bytes for ID3v1.1) | `COMMENT` | `COMMENT` | `©cmt` | `ICMT` | `ANNO` (multiple chunks joined with newline) | `WM/DESCRIPTION` |
| `genre` | `TCON` | `genre` (1-byte index) | `GENRE` | `GENRE` | `©gen` / `gnre` | `IGNR` | — | `WM/Genre` |
| `group` | `TIT1` | — | — | — | `©grp` | — | — | `WM/ContentGroupDescription` |
| `description` | `TDES` | — | `DESCRIPTION` | `DESCRIPTION` | `desc` / `©des` / `ldes` | — | — | `WM/SubTitleDescription` |
| `language` | `TLAN` | — | `LANGUAGE` | `LANGUAGE` | — | `ILNG` | — | `WM/Language` |
| `isrc` | `TSRC` | — | `ISRC` | `ISRC` | `©isr` | — | — | `WM/ISRC` |
| `productId` | — | — | `CATALOGNUMBER` / `PRODUCTNUMBER` | `CATALOGNUMBER` | `prID` | — | — | — |
| `year` | `TYER` | `year` (offset 93, 4 bytes) | leading 4 chars of `DATE` | `YEAR` | leading 4 chars of `©day` | leading 4 chars of `ICRD` | — | `WM/Year` |
| `recordingDate` | `TDRC` | — | `DATE` (full text) | `RECORDDATE` | `©day` (full text) | `ICRD` (full text) | — | — |
| `originalReleaseDate` | `TDOR` | — | `ORIGINALDATE` | `ORIGINALDATE` | — | — | — | — |
| `publishingDate` | `TDRL` | — | `RELEASEDATE` | `RELEASEDATE` | `rldt` | — | — | — |
| `trackNumber` | `TRCK` (`X[/Y]`) | byte 126 (ID3v1.1) | `TRACKNUMBER` (`X[/Y]`) | `TRACK` / `TRACKNUMBER` (`X[/Y]`) | `trkn` (number) | `TRCK` / `IPRT` / `ITRK` | — | `WM/TrackNumber` (`X[/Y]`) |
| `trackTotal` | `Y` part of `TRCK` | — | `TRACKTOTAL` / `TOTALTRACKS` / `Y` part of `TRACKNUMBER` | `TRACKTOTAL` / `TOTALTRACKS` / `Y` part of `TRACKNUMBER` | `trkn` (total) | — | — | `Y` part of `WM/TrackNumber` |
| `discNumber` | `TPOS` (`X[/Y]`) | — | `DISCNUMBER` (`X[/Y]`) | `DISC` / `DISCNUMBER` (`X[/Y]`) | `disk` (number) | — | — | `WM/PartOfSet` (`X[/Y]`) |
| `discTotal` | `Y` part of `TPOS` | — | `DISCTOTAL` / `TOTALDISCS` / `Y` part of `DISCNUMBER` | `DISCTOTAL` / `TOTALDISCS` / `Y` part of `DISCNUMBER` | `disk` (total) | — | — | `Y` part of `WM/PartOfSet` |
| `bpm` | `TBPM` | — | `BPM` | `BPM` | `tmpo` | — | — | `WM/BeatsPerMinute` |
| `rating` | — | — | — | — | `rtng` (0–100, normalized to `[0, 1]`) | — | — | `WM/SharedUserRating` (0–99, normalized to `[0, 1]`) |

## Notes

### ID3v1 / ID3v1.1

- ID3v1.1 takes byte 127 as `trackNumber` when byte 126 is `0x00`, shortening
  the trailing comment field to 28 bytes.
- The `genre` byte resolves only the original 80 entries from the fixed table;
  any other index returns `undefined`.
- The `year` field is a 4-byte string. Empty / non-numeric values are not
  written to `tag.year`.

### Vorbis Comment / APE

- `TRACKNUMBER` (`DISCNUMBER`) accepts both `"X"` and `"X/Y"` form; the `/Y`
  portion populates `trackTotal` (`discTotal`).
- For multi-value entries (the same key appearing more than once), **the first
  value wins**, because `TagData` is a single-value model.
- Unrecognised keys never reach `TagData`, but the writer round-trips them via
  the original tag block.

### MP4 / iTunes atoms

- `©lyr` (lyrics) does not flow into `TagData`; the Phase 9 logic puts it under
  `Track.lyrics` instead.
- `gnre` is the 1-based ID3v1 genre index. When both `©gen` (text) and `gnre`
  are present, the value seen later in the read order wins.
- `covr` flows into `Track.pictures` (Phase 9), never into `TagData`.

### RIFF (WAV) / AIFF native

- Only the recognised `LIST INFO` keys reach `TagData`. Unknown INFO keys are
  not yet exposed via `Track.additionalFields`, but the writer preserves them
  by reading from the original chunk payload.
- AIFF allows multiple `ANNO` chunks; they are joined with newlines (`\n`)
  into a single `comment`.

### WMA / ASF

- The four Content Description fields (`title` / `author` / `copyright` /
  `description`) take precedence over their Extended Content Description
  counterparts (Content Description wins on conflict). This matches the
  behaviour of Windows Media Player and ATL.NET.
- `WM/SharedUserRating` is a 0–99 integer that is normalized into `[0, 1]`
  before landing on `rating`.

## Fields not mapped to TagData

- `Track.pictures` (`PictureInfo[]`) — APIC (ID3v2), METADATA_BLOCK_PICTURE
  (Vorbis Comment), `covr` (MP4), APIC inside the WAV `id3 ` chunk, etc.
- `Track.chapters` (`ChapterInfo[]`) — primarily `CHAP` / `CTOC` (ID3v2).
- `Track.lyrics` (`LyricsInfo`) — `USLT` / `SYLT` (ID3v2). Vorbis Comment
  `LYRICS` is planned for a future release.
- `Track.additionalFields` (`Record<string, string>`) — format-native fields
  that do not belong in the `TagData` namespace.
- `Track.warnings` (`Warning[]`) — non-fatal diagnostics raised for partial
  corruption or unsupported features.

These live alongside `TagData` on `Track` as independent fields.
