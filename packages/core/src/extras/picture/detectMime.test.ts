import { describe, expect, it } from "vitest";
import { detectMime } from "./detectMime.js";

it("detects JPEG from the SOI marker", () => {
  expect(detectMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
});

it("detects PNG from the 8-byte signature", () => {
  expect(detectMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
    "image/png",
  );
});

it("detects GIF from the GIF89a magic", () => {
  expect(detectMime(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
});

it("detects BMP from the BM marker", () => {
  expect(detectMime(new Uint8Array([0x42, 0x4d, 0x00, 0x00]))).toBe("image/bmp");
});

it("detects little-endian TIFF", () => {
  expect(detectMime(new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x00]))).toBe("image/tiff");
});

it("detects big-endian TIFF", () => {
  expect(detectMime(new Uint8Array([0x4d, 0x4d, 0x00, 0x2a, 0x00]))).toBe("image/tiff");
});

it("detects WebP from the RIFF/WEBP framing", () => {
  const bytes = new Uint8Array(12);
  bytes.set([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  expect(detectMime(bytes)).toBe("image/webp");
});

describe("non-matches", () => {
  it("returns undefined for empty input", () => {
    expect(detectMime(new Uint8Array(0))).toBeUndefined();
  });

  it("returns undefined for an inputs shorter than the smallest signature", () => {
    expect(detectMime(new Uint8Array([0xff, 0xd8]))).toBeUndefined();
  });

  it("returns undefined for unrelated bytes", () => {
    expect(detectMime(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeUndefined();
  });

  it("rejects a RIFF prefix that isn't WEBP", () => {
    const bytes = new Uint8Array(12);
    bytes.set([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    expect(detectMime(bytes)).toBeUndefined();
  });
});
