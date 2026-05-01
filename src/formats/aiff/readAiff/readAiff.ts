import { id3v2TagToTagData } from "../../../tags/id3v2/id3v2TagToTagData/id3v2TagToTagData.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { MetadataReadResult, TagData } from "../../../types.js";
import { decodeText } from "../../../utils/encoding/decodeText.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import {
  AIFF_CHUNK_ANNO,
  AIFF_CHUNK_AUTH,
  AIFF_CHUNK_COPYRIGHT,
  AIFF_CHUNK_ID3,
  AIFF_CHUNK_NAME,
  AIFF_HEADER_SIZE,
} from "../constants.js";
import { detectAiffSignature } from "../detectAiff.js";
import { nativeTagsToTagData } from "../nativeTagsToTagData.js";
import type { AiffNativeTags } from "../types.js";

/**
 * Read AIFF (`.aiff` / `.aif` / `.aifc`) metadata.
 *
 * The reader iterates the top-level chunks following the `FORM ... AIFF` /
 * `FORM ... AIFC` header. Native chunks (`NAME`, `AUTH`, `(c) `, `ANNO`)
 * are decoded as latin1 (per the AIFF spec); any embedded `ID3 ` chunk is
 * also decoded. When both kinds are present the ID3v2 fields take
 * precedence — same convention as our WAV reader.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the merged tag data.
 * @throws when the leading bytes do not spell `FORM ... AIFF` / `AIFC`.
 */
export const readAiff = async (input: Uint8Array): Promise<MetadataReadResult> => {
  if (!detectAiffSignature(input)) {
    throw new Error("readAiff: input is not a FORM/AIFF/AIFC file");
  }

  const body = input.subarray(AIFF_HEADER_SIZE);
  const chunks = parseChunks({ buffer: body, endianness: "big" });

  const native: AiffNativeTags = { annotations: [] };
  const annotations: string[] = [];
  let id3Tag: TagData = {};
  for (const chunk of chunks) {
    const payload = body.subarray(chunk.payloadOffset, chunk.payloadOffset + chunk.payloadSize);
    switch (chunk.id) {
      case AIFF_CHUNK_NAME:
        native.name = decodeText(payload, "latin1");
        break;
      case AIFF_CHUNK_AUTH:
        native.author = decodeText(payload, "latin1");
        break;
      case AIFF_CHUNK_COPYRIGHT:
        native.copyright = decodeText(payload, "latin1");
        break;
      case AIFF_CHUNK_ANNO:
        annotations.push(decodeText(payload, "latin1"));
        break;
      case AIFF_CHUNK_ID3: {
        const parsed = parseId3v2(payload);
        if (parsed !== undefined) {
          id3Tag = id3v2TagToTagData(parsed);
        }

        break;
      }
    }
  }

  const nativeTag = nativeTagsToTagData({ ...native, annotations });
  return {
    audioFormat: "aiff",
    tag: { ...nativeTag, ...id3Tag },
    pictures: [],
    chapters: [],
  };
};
