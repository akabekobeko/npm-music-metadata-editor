import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the WMA format as a side effect.
import { readMetadata, writeMetadata } from "../../../mme.js";
import { parseAsfTree } from "../asf/parseAsfTree.js";
import { ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET, ASF_GUID } from "../constants.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/wma",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("rebuilds the file when no descriptions are present yet", async () => {
  const bytes = await loadFixture("content-only.wma");
  const result = await writeMetadata(bytes, {
    tag: { album: "Brand new album", trackNumber: 4, trackTotal: 12, year: 2027 },
  });

  const reread = await readMetadata(result);
  expect(reread.tag).toMatchObject({
    title: "WMA basic title",
    artist: "WMA basic artist",
    album: "Brand new album",
    trackNumber: 4,
    trackTotal: 12,
    year: 2027,
  });
});

it("preserves descriptors that are not managed by the writer", async () => {
  const bytes = await loadFixture("both-descriptions.wma");
  const result = await writeMetadata(bytes, { tag: { album: "Replaced album" } });
  const reread = await readMetadata(result);
  expect(reread.tag.album).toBe("Replaced album");
  // Composer was only in the Extended Content Description and is not
  // currently mapped onto our managed list — it must round-trip verbatim.
  expect(reread.tag.composer).toBe("Composer X");
});

it("syncs the File Properties Object's File Size after rewriting", async () => {
  const bytes = await loadFixture("extended-only.wma");
  const result = await writeMetadata(bytes, { tag: { album: "Re-sized album", title: "Title" } });
  const tree = parseAsfTree(result);
  const header = tree.find((object) => object.guid === ASF_GUID.HeaderObject);
  const fileProps = header?.children?.find((c) => c.guid === ASF_GUID.FilePropertiesObject);
  expect(fileProps).toBeDefined();
  const view = Buffer.from(result.buffer, result.byteOffset, result.byteLength);
  const recordedSize = view.readBigUInt64LE(
    (fileProps?.offset ?? 0) + ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET,
  );
  expect(recordedSize).toBe(BigInt(result.length));
});

it("round-trips through write -> read with size variation", async () => {
  const bytes = await loadFixture("content-only.wma");
  const grown = await writeMetadata(bytes, {
    tag: {
      title: "A much longer title than before to grow the header object",
      artist: "Another artist",
      album: "Album that did not exist on the source",
      genre: "Phase8",
      year: 2030,
      trackNumber: 1,
      trackTotal: 10,
    },
  });
  expect(grown.length).toBeGreaterThan(bytes.length);

  const shrunk = await writeMetadata(grown, { tag: { title: "S" } });
  const reread = await readMetadata(shrunk);
  expect(reread.tag.title).toBe("S");
  expect(reread.tag.album).toBe("Album that did not exist on the source");
});
