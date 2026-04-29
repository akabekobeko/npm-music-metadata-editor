import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectFormat, detectFormatByExtension, detectFormatBySignature } from "./detect.js";
import { clearRegistrations, registerFormat } from "./registry.js";

const registerSamples = (): void => {
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (header) =>
      header.length >= 3 && header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33, // "ID3"
  });
  registerFormat({
    format: "flac",
    extensions: [".flac"],
    detectSignature: (header) =>
      header.length >= 4 &&
      header[0] === 0x66 &&
      header[1] === 0x4c &&
      header[2] === 0x61 &&
      header[3] === 0x43, // "fLaC"
  });
};

beforeEach(() => {
  clearRegistrations();
  registerSamples();
});

afterEach(() => {
  clearRegistrations();
});

describe("detectFormatByExtension", () => {
  it("matches a registered extension", () => {
    expect(detectFormatByExtension("/tmp/song.mp3")).toBe("mp3");
    expect(detectFormatByExtension("song.FLAC")).toBe("flac");
  });

  it("returns undefined for unknown extensions", () => {
    expect(detectFormatByExtension("song.xyz")).toBeUndefined();
  });

  it("returns undefined when there is no extension", () => {
    expect(detectFormatByExtension("README")).toBeUndefined();
  });
});

describe("detectFormatBySignature", () => {
  it("matches the ID3 signature", () => {
    const header = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
    expect(detectFormatBySignature(header)).toBe("mp3");
  });

  it("matches the fLaC signature", () => {
    const header = new Uint8Array([0x66, 0x4c, 0x61, 0x43]);
    expect(detectFormatBySignature(header)).toBe("flac");
  });

  it("rejects near-miss bytes", () => {
    // Same first three bytes as fLaC but the last byte is wrong.
    const header = new Uint8Array([0x66, 0x4c, 0x61, 0x44]);
    expect(detectFormatBySignature(header)).toBeUndefined();
  });

  it("returns undefined on empty input", () => {
    expect(detectFormatBySignature(new Uint8Array())).toBeUndefined();
  });
});

describe("detectFormat", () => {
  it("prefers signature over extension", () => {
    // File is named .mp3 but actually carries an fLaC signature.
    const header = new Uint8Array([0x66, 0x4c, 0x61, 0x43]);
    expect(detectFormat({ filePath: "fake.mp3", header })).toBe("flac");
  });

  it("falls back to the extension when the signature does not match", () => {
    const header = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    expect(detectFormat({ filePath: "song.mp3", header })).toBe("mp3");
  });

  it("returns undefined when both checks fail", () => {
    const header = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    expect(detectFormat({ filePath: "song.xyz", header })).toBeUndefined();
  });

  it("works without a file path", () => {
    const header = new Uint8Array([0x49, 0x44, 0x33]);
    expect(detectFormat({ header })).toBe("mp3");
  });
});
