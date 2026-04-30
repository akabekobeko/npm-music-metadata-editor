import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ITUNES_HDLR_PAYLOAD, ItunesDataType } from "../../src/formats/mp4/constants.js";
import { writeIlstPayload } from "../../src/formats/mp4/itunes/writeIlst.js";
import type { ItunesAtom } from "../../src/formats/mp4/types.js";

/**
 * Build a single atom (`size + type + payload`).
 *
 * @param type - 4-character atom type (Latin-1).
 * @param payload - Atom payload bytes.
 * @returns The encoded box including its 8-byte header.
 */
const atom = (type: string, payload: Uint8Array | Buffer = Buffer.alloc(0)): Buffer => {
  const out = Buffer.alloc(8 + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return out;
};

/** Concatenate one or more buffers. */
const join_ = (...parts: (Uint8Array | Buffer)[]): Buffer =>
  Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));

/**
 * Build a minimal `ftyp` atom with the given major brand and a few
 * compatible brands. The resulting box is 8 (header) + 8 + 8 = 24 bytes.
 */
const buildFtyp = (majorBrand: string): Buffer => {
  const payload = Buffer.alloc(8 + 4 * 2);
  payload.write(majorBrand, 0, 4, "latin1");
  payload.writeUInt32BE(0, 4); // minor_version
  payload.write("isom", 8, 4, "latin1");
  payload.write("mp42", 12, 4, "latin1");
  return atom("ftyp", payload);
};

/**
 * Build the contents of the `mvhd` atom (movie header).
 *
 * Uses version 0 with placeholder timescale / duration values so the file
 * parses cleanly — the audio data inside mdat is dummy bytes anyway.
 */
const buildMvhd = (): Buffer => {
  const payload = Buffer.alloc(100);
  // version + flags
  payload.writeUInt32BE(0, 0);
  // creation_time + modification_time
  payload.writeUInt32BE(0, 4);
  payload.writeUInt32BE(0, 8);
  // timescale = 600
  payload.writeUInt32BE(600, 12);
  // duration = 0
  payload.writeUInt32BE(0, 16);
  // rate = 1.0 (16.16 fixed)
  payload.writeUInt32BE(0x00010000, 20);
  // volume = 1.0 (8.8 fixed)
  payload.writeUInt16BE(0x0100, 24);
  // reserved (10 bytes) zero
  // matrix (36 bytes) — identity
  let pos = 36;
  payload.writeUInt32BE(0x00010000, pos);
  pos += 4 * 3;
  payload.writeUInt32BE(0x00010000, pos);
  pos += 4 * 3;
  payload.writeUInt32BE(0x40000000, pos);
  // pre_defined (24 bytes) zero
  // next_track_ID = 2
  payload.writeUInt32BE(2, 96);
  return atom("mvhd", payload);
};

/** Build a stub `tkhd` (track header) — version 0, 92 bytes including header. */
const buildTkhd = (): Buffer => {
  const payload = Buffer.alloc(84);
  // version + flags = 0x000007 (track_enabled | in_movie | in_preview)
  payload.writeUInt32BE(0x00000007, 0);
  // creation_time + modification_time
  payload.writeUInt32BE(0, 4);
  payload.writeUInt32BE(0, 8);
  // track_ID = 1
  payload.writeUInt32BE(1, 12);
  // reserved
  payload.writeUInt32BE(0, 16);
  // duration = 0
  payload.writeUInt32BE(0, 20);
  // reserved (8) + layer (2) + alternate_group (2) zero
  // volume = 1.0
  payload.writeUInt16BE(0x0100, 36);
  // reserved (2)
  // matrix (36 bytes) identity
  let pos = 40;
  payload.writeUInt32BE(0x00010000, pos);
  pos += 4 * 3;
  payload.writeUInt32BE(0x00010000, pos);
  pos += 4 * 3;
  payload.writeUInt32BE(0x40000000, pos);
  // width / height (0)
  return atom("tkhd", payload);
};

/** Build a stub `mdhd` (media header) — version 0. */
const buildMdhd = (): Buffer => {
  const payload = Buffer.alloc(24);
  payload.writeUInt32BE(0, 0); // version + flags
  payload.writeUInt32BE(0, 4); // creation_time
  payload.writeUInt32BE(0, 8); // modification_time
  payload.writeUInt32BE(44100, 12); // timescale
  payload.writeUInt32BE(0, 16); // duration
  // language = "und" packed into 15 bits + reserved
  payload.writeUInt16BE(0x55c4, 20);
  // pre_defined = 0
  return atom("mdhd", payload);
};

/** Build the soun handler `hdlr` atom (track-level). */
const buildSounHdlr = (): Buffer => {
  const name = Buffer.from("SoundHandler\0", "latin1");
  const payload = Buffer.alloc(24 + name.length);
  payload.writeUInt32BE(0, 0); // version + flags
  payload.writeUInt32BE(0, 4); // pre_defined
  payload.write("soun", 8, 4, "latin1");
  // 12 bytes reserved
  name.copy(payload, 24);
  return atom("hdlr", payload);
};

/** Build a stub `smhd` (sound media header). */
const buildSmhd = (): Buffer => {
  const payload = Buffer.alloc(8);
  // version + flags = 0
  payload.writeUInt32BE(0, 0);
  // balance + reserved = 0
  return atom("smhd", payload);
};

/** Build a stub `dinf/dref` with one self-contained `url ` entry. */
const buildDinf = (): Buffer => {
  const url = atom(
    "url ",
    Buffer.from([0x00, 0x00, 0x00, 0x01]), // version 0, flags = self-contained
  );
  const drefPayload = Buffer.alloc(8 + url.length);
  drefPayload.writeUInt32BE(0, 0); // version + flags
  drefPayload.writeUInt32BE(1, 4); // entry_count
  url.copy(drefPayload, 8);
  const dref = atom("dref", drefPayload);
  return atom("dinf", dref);
};

/** Build a stub `stsd` (sample description box) with one minimal mp4a entry. */
const buildStsd = (): Buffer => {
  // 8 bytes version+flags + entry_count
  const sampleEntryHeader = Buffer.alloc(28);
  // 6 bytes reserved + 2 bytes data_reference_index
  sampleEntryHeader.writeUInt16BE(1, 6);
  // 8 bytes reserved + 2 bytes channel_count + 2 bytes sample_size + 4 bytes pre_defined+reserved + 4 bytes sample_rate
  sampleEntryHeader.writeUInt16BE(2, 16); // channels
  sampleEntryHeader.writeUInt16BE(16, 18); // bits per sample
  sampleEntryHeader.writeUInt32BE(44100 * 0x10000, 24); // sample rate (16.16)
  const mp4a = atom("mp4a", sampleEntryHeader);

  const stsdPayload = Buffer.alloc(8 + mp4a.length);
  stsdPayload.writeUInt32BE(0, 0); // version + flags
  stsdPayload.writeUInt32BE(1, 4); // entry_count
  mp4a.copy(stsdPayload, 8);
  return atom("stsd", stsdPayload);
};

/** Build an empty `stts` (time-to-sample). */
const buildStts = (): Buffer => {
  const payload = Buffer.alloc(8);
  // version+flags = 0, entry_count = 0
  return atom("stts", payload);
};

/** Build an empty `stsc` (sample-to-chunk). */
const buildStsc = (): Buffer => {
  const payload = Buffer.alloc(8);
  return atom("stsc", payload);
};

/** Build a `stsz` with `sample_size = 0`, `sample_count = 0` (no entries). */
const buildStsz = (): Buffer => {
  const payload = Buffer.alloc(12);
  // version+flags = 0, sample_size = 0, sample_count = 0
  return atom("stsz", payload);
};

/**
 * Build an `stco` atom carrying a single chunk offset that the caller will
 * later patch in to point at the start of the mdat audio payload.
 */
const buildStcoPlaceholder = (): Buffer => {
  const payload = Buffer.alloc(8 + 4);
  // version+flags = 0
  payload.writeUInt32BE(0, 0);
  // entry_count = 1
  payload.writeUInt32BE(1, 4);
  // chunk_offset placeholder (filled in once we know where mdat sits)
  payload.writeUInt32BE(0, 8);
  return atom("stco", payload);
};

/** Build the `udta/meta/ilst` block carrying the requested iTunes metadata. */
const buildUdtaMeta = (atoms: readonly ItunesAtom[]): Buffer => {
  const ilstPayload = writeIlstPayload(atoms);
  const ilst = atom("ilst", ilstPayload);
  const hdlr = atom("hdlr", ITUNES_HDLR_PAYLOAD);
  const versionFlags = Buffer.alloc(4);
  const meta = atom("meta", join_(versionFlags, hdlr, ilst));
  return atom("udta", meta);
};

/**
 * Build the entire `moov` atom (mvhd + trak + udta) plus the mdat payload.
 *
 * Returns the bytes ready to be concatenated with `ftyp` to form a complete
 * fixture file. The caller passes in the iTunes atoms to embed and the
 * desired audio payload bytes.
 *
 * Patches the `stco` placeholder so the chunk offset points at the first
 * byte of the mdat payload (i.e. just past the mdat box header).
 */
const buildMoovAndMdat = (args: {
  ftypSize: number;
  itunes: readonly ItunesAtom[];
  audioBytes: Uint8Array;
}): Buffer => {
  const stbl = atom(
    "stbl",
    join_(buildStsd(), buildStts(), buildStsc(), buildStsz(), buildStcoPlaceholder()),
  );
  const minf = atom("minf", join_(buildSmhd(), buildDinf(), stbl));
  const mdia = atom("mdia", join_(buildMdhd(), buildSounHdlr(), minf));
  const trak = atom("trak", join_(buildTkhd(), mdia));
  const udta = buildUdtaMeta(args.itunes);
  const moov = atom("moov", join_(buildMvhd(), trak, udta));
  const mdat = atom("mdat", Buffer.from(args.audioBytes));

  // Patch the stco entry to point at the first byte of mdat's payload.
  // File layout: ftyp + moov + mdat. stco lives inside moov; we therefore
  // need to locate it inside `moov` and write the absolute file offset.
  const moovOffset = args.ftypSize;
  const mdatOffset = moovOffset + moov.length;
  const audioOffset = mdatOffset + 8; // skip mdat header

  // Find the stco atom inside the rebuilt moov by scanning for the type.
  const stcoIndex = moov.indexOf("stco", 0, "latin1");
  if (stcoIndex < 0) {
    throw new Error("fixture: stco atom missing from moov");
  }

  // The stco header sits 4 bytes before its type, and entries start 8 bytes
  // past the header (size+type) plus 8 bytes of (version+flags+entry_count).
  const entriesStart = stcoIndex - 4 + 8 + 8;
  moov.writeUInt32BE(audioOffset, entriesStart);

  return join_(moov, mdat);
};

/** A minimal blue PNG used as the dummy picture payload (1×1 px). */
const BLUE_PNG: Uint8Array = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077533" +
    "de0000000c4944415478da6360000200000005000147bd31070000000049454e44ae426082",
  "hex",
);

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/mp4");

/** Build the bytes of one fixture, given the iTunes metadata to embed. */
const buildFixture = (args: {
  brand: string;
  itunes: readonly ItunesAtom[];
  audioBytes?: Uint8Array;
}): Uint8Array => {
  const ftyp = buildFtyp(args.brand);
  const audioBytes = args.audioBytes ?? new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const moovAndMdat = buildMoovAndMdat({
    ftypSize: ftyp.length,
    itunes: args.itunes,
    audioBytes,
  });
  const out = join_(ftyp, moovAndMdat);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Encode a simple UTF-8 `data` value for an `ItunesAtom`. */
const utf8 = (text: string): ItunesAtom["values"][number] => ({
  typeIndicator: ItunesDataType.Utf8,
  locale: 0,
  data: new Uint8Array(Buffer.from(text, "utf8")),
});

/** Encode a `trkn`-style number+total payload. */
const trkn = (number: number, total: number): ItunesAtom["values"][number] => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16BE(0, 0);
  buf.writeUInt16BE(number, 2);
  buf.writeUInt16BE(total, 4);
  return { typeIndicator: ItunesDataType.Implicit, locale: 0, data: new Uint8Array(buf) };
};

/** Encode a PNG `data` value for the `covr` atom. */
const png = (data: Uint8Array): ItunesAtom["values"][number] => ({
  typeIndicator: ItunesDataType.Png,
  locale: 0,
  data,
});

type FixtureSpec = {
  filename: string;
  bytes: Uint8Array;
  description: string;
};

const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "basic.m4a",
    description: "M4A with iTunes metadata (©nam / ©ART / ©alb / trkn)",
    bytes: buildFixture({
      brand: "M4A ",
      itunes: [
        { name: "©nam", values: [utf8("MP4 basic")] },
        { name: "©ART", values: [utf8("Tester")] },
        { name: "©alb", values: [utf8("Phase4 Album")] },
        { name: "trkn", values: [trkn(2, 10)] },
        { name: "©day", values: [utf8("2026")] },
      ],
    }),
  },
  {
    filename: "with-picture.m4a",
    description: "M4A with iTunes metadata + an embedded PNG cover",
    bytes: buildFixture({
      brand: "M4A ",
      itunes: [
        { name: "©nam", values: [utf8("MP4 with picture")] },
        { name: "©ART", values: [utf8("Tester")] },
        { name: "covr", values: [png(BLUE_PNG)] },
      ],
    }),
  },
];

const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, spec.bytes);
    process.stdout.write(
      `wrote ${spec.filename} — ${spec.bytes.length} bytes (${spec.description})\n`,
    );
  }
};

await main();
