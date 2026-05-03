import type { TagData } from "../../../types.js";
import { stringifyValue } from "../../vorbisComment/tagDataToVorbisComment/stringifyValue.js";
import { ApeItemKind, ApeVersion, type ApeVersionValue } from "../constants.js";
import type { ApeItem, ApeTag } from "../types.js";
import { FIELD_KEYS } from "./constants.js";

/** Arguments for {@link tagDataToApeTag}. */
type Args = {
  /**
   * Tag fields to write. Fields left `undefined` are preserved as-is from
   * `preserveItems`; fields set to `""` are explicitly removed.
   */
  tag: Partial<TagData>;
  /**
   * Existing items to preserve (binary items, custom keys, …). Items whose
   * key clashes with a field that the caller is managing are dropped.
   */
  preserveItems?: readonly ApeItem[];
  /** Tag version to emit (defaults to {@link ApeVersion.V2}). */
  version?: ApeVersionValue;
  /** `hasHeader` value passed through to the resulting tag. */
  hasHeader?: boolean;
};

/**
 * Build an {@link ApeTag} from a {@link TagData} merged with existing items.
 *
 * Behaviour mirrors {@link tagDataToVorbisComment}:
 * - Each recognised field whose value is `undefined` is left untouched: the
 *   original items (binary blobs, multi-key duplicates, …) flow through
 *   `preserveItems`.
 * - Each recognised field whose value is set is emitted under the canonical
 *   key, and *all* aliases are dropped from `preserveItems` so we don't end
 *   up with stale duplicates.
 *
 * @returns A new {@link ApeTag} ready to encode with `writeApeTag`.
 */
export const tagDataToApeTag = ({
  tag,
  preserveItems,
  version = ApeVersion.V2,
  hasHeader = true,
}: Args): ApeTag => {
  const items: ApeItem[] = [];
  const managedKeys = new Set<string>();

  for (const [field, keys] of Object.entries(FIELD_KEYS) as [keyof TagData, readonly string[]][]) {
    const raw = tag[field];
    if (raw === undefined) {
      continue;
    }

    for (const key of keys) {
      managedKeys.add(key.toUpperCase());
    }

    const canonicalKey = keys[0];
    if (canonicalKey === undefined) {
      continue;
    }

    const text = stringifyValue(raw as string | number);
    if (text !== undefined) {
      items.push({ key: canonicalKey, value: text, kind: ApeItemKind.Text, readOnly: false });
    }
  }

  if (preserveItems !== undefined) {
    for (const item of preserveItems) {
      if (managedKeys.has(item.key.toUpperCase())) {
        continue;
      }

      items.push(item);
    }
  }

  return {
    version,
    hasHeader: version === ApeVersion.V2 ? hasHeader : false,
    items,
    totalSize: 0,
  };
};
