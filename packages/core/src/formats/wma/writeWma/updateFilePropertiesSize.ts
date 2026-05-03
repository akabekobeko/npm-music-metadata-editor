import { Buffer } from "node:buffer";
import { parseAsfTree } from "../asf/parseAsfTree.js";
import { ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET, ASF_GUID } from "../constants.js";

/**
 * Patch the `File Size` field inside the File Properties Object (a child of
 * the Header Object) to match the rebuilt file's actual length.
 *
 * Keeping this field in sync matters because Windows Media Player and
 * DirectShow filters cross-check it against the on-disk file size and
 * reject files that disagree.
 *
 * `bytes` is mutated in place and also returned for chaining convenience.
 *
 * @param bytes - The freshly assembled WMA file bytes.
 * @returns The same buffer with its File Properties size field updated. When
 *   no File Properties Object is present, `bytes` is returned unchanged.
 */
export const updateFilePropertiesSize = (bytes: Uint8Array): Uint8Array => {
  const tree = parseAsfTree(bytes);
  const header = tree.find((object) => object.guid === ASF_GUID.HeaderObject);
  const fileProps = header?.children?.find(
    (object) => object.guid === ASF_GUID.FilePropertiesObject,
  );
  if (fileProps === undefined) {
    return bytes;
  }

  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.writeBigUInt64LE(
    BigInt(bytes.length),
    fileProps.offset + ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET,
  );
  return bytes;
};
