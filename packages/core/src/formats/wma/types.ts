/**
 * One ASF object located inside a source buffer.
 *
 * Like the MP4 atom representation, payload bytes are not eagerly sliced —
 * callers `subarray` from the source when they need them, which keeps the
 * Data Object (the actual audio packets) cheap to skip.
 */
export type AsfObject = {
  /** Canonical uppercase GUID of the object (e.g. `"75B22630-668E-11CF-A6D9-00AA0062CE6C"`). */
  guid: string;
  /** Absolute offset of the object header (its GUID) in the source buffer. */
  offset: number;
  /** Total size of the object including its 24-byte header. */
  size: bigint;
  /** Absolute offset where the payload starts (header excluded). */
  payloadOffset: number;
  /** Payload size in bytes (size minus the 24-byte header). */
  payloadSize: bigint;
  /** Parsed children for the Header Object; `undefined` for every other object. */
  children?: readonly AsfObject[];
};
