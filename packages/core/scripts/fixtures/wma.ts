import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { encodeGuid } from "../../src/formats/wma/asf/guid.js";
import {
  ASF_DESCRIPTOR_TYPE,
  ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET,
  ASF_GUID,
  ASF_HEADER_OBJECT_PREAMBLE_SIZE,
} from "../../src/formats/wma/constants.js";
import type { ExtendedDescriptor } from "../../src/formats/wma/metadata/types.js";
import { writeContentDescription } from "../../src/formats/wma/metadata/writeContentDescription.js";
import { writeExtendedContentDescription } from "../../src/formats/wma/metadata/writeExtendedContentDescription.js";
import { buildAsfObject } from "../../src/formats/wma/writeWma/buildAsfObject.js";
import { buildHeaderObject } from "../../src/formats/wma/writeWma/buildHeaderObject.js";

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/wma");

/**
 * Build a minimal File Properties Object payload.
 *
 * The values inside don't have to be realistic — we just need the object to
 * exist so the writer can patch the `File Size` field, and so detection /
 * parsing tests cover the common ASF layout. Only Channels (>= 1) and the
 * sample rate (8 kHz–96 kHz) are validated by ATL.NET-style consumers.
 *
 * @returns The 80-byte payload (no object header).
 */
const buildFilePropertiesPayload = (): Uint8Array => {
  const out = Buffer.alloc(80);
  // File ID GUID — arbitrary but stable for reproducible fixtures.
  out.set(encodeGuid("11223344-5566-7788-9900-AABBCCDDEEFF"), 0);
  // File Size placeholder; the writer (or buildWmaFixture below) patches this.
  out.writeBigUInt64LE(0n, 16);
  // Creation Date / Data Packets Count / Play Duration / Send Duration / Preroll
  out.writeBigUInt64LE(0n, 24);
  out.writeBigUInt64LE(0n, 32);
  out.writeBigUInt64LE(10_000_000n, 40); // 1 second (100ns units)
  out.writeBigUInt64LE(0n, 48);
  out.writeBigUInt64LE(0n, 56);
  // Flags / min packet / max packet / max bitrate
  out.writeUInt32LE(0, 64);
  out.writeUInt32LE(64, 68);
  out.writeUInt32LE(64, 72);
  out.writeUInt32LE(64_000, 76);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Build a minimal Stream Properties Object payload (audio stream, 1 channel,
 * 44.1 kHz). Sufficient for the parser to compute basic sample rate /
 * channel diagnostics without a real audio bitstream behind it.
 *
 * @returns The 78-byte payload (no object header).
 */
const buildStreamPropertiesPayload = (): Uint8Array => {
  // 78 bytes of header + a 16-byte type-specific area. We only fill the
  // minimum the WMA reader and downstream consumers may inspect.
  const out = Buffer.alloc(78);
  // Stream Type GUID (Audio Media). Stored at offset 0 of the payload.
  out.set(encodeGuid("F8699E40-5B4D-1CF0-A8FD-00805F5C442B"), 0);
  // Error Correction Type GUID (No Error Correction).
  out.set(encodeGuid("20FB5700-5B55-11CF-A8FD-00805F5C442B"), 16);
  // Time Offset (8) / Type-Specific Data Length (4) / Error Correction Data Length (4)
  out.writeBigUInt64LE(0n, 32);
  out.writeUInt32LE(18, 40);
  out.writeUInt32LE(0, 44);
  out.writeUInt16LE(1, 48); // Flags (stream number 1)
  out.writeUInt32LE(0, 50); // Reserved
  // Type-Specific Data — WAVEFORMATEX-style mini header. ATL.NET reads
  // FormatTag, Channels, SampleRate from offset 54 within the object payload.
  out.writeUInt16LE(0x161, 54); // FormatTag (WMA v9)
  out.writeUInt16LE(1, 56); // Channels
  out.writeUInt32LE(44_100, 58); // Sample rate
  out.writeUInt32LE(64_000 / 8, 62); // Avg bytes/sec
  out.writeUInt16LE(2, 66); // Block align
  out.writeUInt16LE(16, 68); // Bits/sample
  out.writeUInt16LE(0, 70); // cbSize
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Wrap the audio packet area in a Data Object envelope.
 *
 * @returns The full Data Object bytes including the 24-byte ASF object header.
 */
const buildDataObject = (): Uint8Array => {
  const payload = Buffer.alloc(40);
  // File ID (must match File Properties; we keep the placeholder GUID).
  payload.set(encodeGuid("11223344-5566-7788-9900-AABBCCDDEEFF"), 0);
  // Total Data Packets / Reserved
  payload.writeBigUInt64LE(0n, 16);
  payload.writeUInt16LE(0x0101, 24);
  return buildAsfObject({
    guid: ASF_GUID.DataObject,
    payload: new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength),
  });
};

type FixtureSpec = {
  filename: string;
  description: string;
  contentDescription:
    | { title: string; author: string; copyright: string; description: string; rating: string }
    | undefined;
  extended: readonly ExtendedDescriptor[];
};

/**
 * Build a complete WMA fixture from its high-level metadata description.
 *
 * Includes File Properties + Stream Properties (so detection / sanity tests
 * have something realistic to inspect), plus optional Content Description
 * and Extended Content Description Objects.
 *
 * @param spec - High-level description of which objects to emit.
 * @returns The full WMA file bytes ready to write to disk.
 */
const buildWmaFixture = (spec: FixtureSpec): Uint8Array => {
  const children: Uint8Array[] = [
    buildAsfObject({
      guid: ASF_GUID.FilePropertiesObject,
      payload: buildFilePropertiesPayload(),
    }),
    buildAsfObject({
      guid: ASF_GUID.StreamPropertiesObject,
      payload: buildStreamPropertiesPayload(),
    }),
  ];

  if (spec.contentDescription !== undefined) {
    children.push(
      buildAsfObject({
        guid: ASF_GUID.ContentDescriptionObject,
        payload: writeContentDescription(spec.contentDescription),
      }),
    );
  }

  if (spec.extended.length > 0) {
    children.push(
      buildAsfObject({
        guid: ASF_GUID.ExtendedContentDescriptionObject,
        payload: writeExtendedContentDescription(spec.extended),
      }),
    );
  }

  const headerObject = buildHeaderObject({
    children: Buffer.concat(children.map((c) => Buffer.from(c))),
    childCount: children.length,
  });
  const dataObject = buildDataObject();
  const out = Buffer.concat([Buffer.from(headerObject), Buffer.from(dataObject)]);

  // Patch the File Size field (offset is identical to what the writer uses).
  // The File Properties Object sits at offset 30 (Header Object preamble).
  const filePropertiesOffset = ASF_HEADER_OBJECT_PREAMBLE_SIZE;
  out.writeBigUInt64LE(
    BigInt(out.length),
    filePropertiesOffset + ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET,
  );
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "content-only.wma",
    description: "ASF with Content Description only (no extended descriptors)",
    contentDescription: {
      title: "WMA basic title",
      author: "WMA basic artist",
      copyright: "© 2026 fixtures",
      description: "Phase 8 fixture",
      rating: "",
    },
    extended: [],
  },
  {
    filename: "extended-only.wma",
    description: "ASF with Extended Content Description only (no Content Description)",
    contentDescription: undefined,
    extended: [
      {
        name: "WM/AlbumTitle",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Extended only album",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/TrackNumber",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "5/13",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/Genre",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Test",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/Year",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "2025",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/SharedUserRating",
        type: ASF_DESCRIPTOR_TYPE.Dword,
        value: 75,
        rawValue: new Uint8Array(),
      },
    ],
  },
  {
    filename: "both-descriptions.wma",
    description: "ASF with both Content Description and Extended Content Description",
    contentDescription: {
      title: "Both title",
      author: "Both author",
      copyright: "",
      description: "Stored in Content Description",
      rating: "",
    },
    extended: [
      {
        name: "WM/AlbumTitle",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Both album",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/Composer",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Composer X",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/Mood",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Calm",
        rawValue: new Uint8Array(),
      },
    ],
  },
];

const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const bytes = buildWmaFixture(spec);
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, bytes);
    process.stdout.write(`wrote ${spec.filename} — ${bytes.length} bytes (${spec.description})\n`);
  }
};

await main();
