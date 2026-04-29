import { describe, expect, it } from "vitest";
import { ID3V1_NO_GENRE, ID3V1_TAG_SIZE } from "../constants.js";
import { writeId3v1 } from "./writeId3v1.js";

describe("writeId3v1", () => {
  it("emits exactly 128 bytes starting with TAG", () => {
    const bytes = writeId3v1({
      minorVersion: 0,
      title: "",
      artist: "",
      album: "",
      year: "",
      comment: "",
      genreCode: ID3V1_NO_GENRE,
    });
    expect(bytes.length).toBe(ID3V1_TAG_SIZE);
    expect(Array.from(bytes.subarray(0, 3))).toEqual([0x54, 0x41, 0x47]);
    expect(bytes[127]).toBe(ID3V1_NO_GENRE);
  });

  it("truncates strings that exceed the field length", () => {
    const longTitle = "A".repeat(100);
    const bytes = writeId3v1({
      minorVersion: 0,
      title: longTitle,
      artist: "",
      album: "",
      year: "",
      comment: "",
      genreCode: ID3V1_NO_GENRE,
    });
    expect(Array.from(bytes.subarray(3, 33))).toEqual(Array.from({ length: 30 }, () => 0x41));
    expect(bytes[33]).toBe(0);
  });

  it("clamps the track number into a single byte", () => {
    const bytes = writeId3v1({
      minorVersion: 1,
      title: "",
      artist: "",
      album: "",
      year: "",
      comment: "",
      trackNumber: 999,
      genreCode: ID3V1_NO_GENRE,
    });
    expect(bytes[125]).toBe(0x00);
    expect(bytes[126]).toBe(0xff);
  });

  it("resolves a known genre name when no code is provided", () => {
    const bytes = writeId3v1({
      minorVersion: 0,
      title: "",
      artist: "",
      album: "",
      year: "",
      comment: "",
      genre: "Rock",
      genreCode: -1,
    });
    expect(bytes[127]).toBe(17);
  });

  it("falls back to NO_GENRE when neither code nor name resolves", () => {
    const bytes = writeId3v1({
      minorVersion: 0,
      title: "",
      artist: "",
      album: "",
      year: "",
      comment: "",
      genre: "Imaginary",
      genreCode: -1,
    });
    expect(bytes[127]).toBe(ID3V1_NO_GENRE);
  });
});
