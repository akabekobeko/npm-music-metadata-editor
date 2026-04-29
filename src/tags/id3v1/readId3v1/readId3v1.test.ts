import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { writeId3v1 } from "../writeId3v1/writeId3v1.js";
import { readId3v1 } from "./readId3v1.js";

const buildTrailer = (parts: { offset: number; bytes: Uint8Array }[]): Uint8Array => {
  const out = Buffer.alloc(128, 0);
  out.set([0x54, 0x41, 0x47], 0); // "TAG"
  for (const part of parts) {
    out.set(part.bytes, part.offset);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

const ascii = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "latin1"));

it("returns undefined when the buffer is too short", () => {
  expect(readId3v1(new Uint8Array(127))).toBeUndefined();
});

it("returns undefined when the magic does not match", () => {
  const trailer = new Uint8Array(128);
  trailer[0] = 0x46; // 'F'
  expect(readId3v1(trailer)).toBeUndefined();
});

it("parses an ID3v1.0 trailer", () => {
  const trailer = buildTrailer([
    { offset: 3, bytes: ascii("Title") },
    { offset: 33, bytes: ascii("Artist") },
    { offset: 63, bytes: ascii("Album") },
    { offset: 93, bytes: ascii("2024") },
    { offset: 97, bytes: ascii("Comment fits 30 bytes here") },
    { offset: 127, bytes: new Uint8Array([13]) }, // Pop
  ]);
  const tag = readId3v1(trailer);
  expect(tag).toMatchObject({
    minorVersion: 0,
    title: "Title",
    artist: "Artist",
    album: "Album",
    year: "2024",
    comment: "Comment fits 30 bytes here",
    genre: "Pop",
    genreCode: 13,
  });
  expect(tag?.trackNumber).toBeUndefined();
});

it("parses an ID3v1.1 trailer with track number", () => {
  const trailer = buildTrailer([
    { offset: 3, bytes: ascii("Song") },
    { offset: 97, bytes: ascii("Note") },
    { offset: 125, bytes: new Uint8Array([0x00, 7]) },
    { offset: 127, bytes: new Uint8Array([0xff]) },
  ]);
  const tag = readId3v1(trailer);
  expect(tag?.minorVersion).toBe(1);
  expect(tag?.comment).toBe("Note");
  expect(tag?.trackNumber).toBe(7);
  expect(tag?.genre).toBeUndefined();
  expect(tag?.genreCode).toBe(0xff);
});

it("ignores leading bytes before the trailing 128 bytes", () => {
  const trailer = buildTrailer([{ offset: 3, bytes: ascii("only-trailer") }]);
  const buffer = new Uint8Array(1024);
  buffer.set(trailer, 1024 - 128);
  const tag = readId3v1(buffer);
  expect(tag?.title).toBe("only-trailer");
});

it("round-trips through writeId3v1", () => {
  const original = {
    minorVersion: 1 as const,
    title: "T",
    artist: "A",
    album: "B",
    year: "1999",
    comment: "C",
    trackNumber: 12,
    genre: "Pop",
    genreCode: 13,
  };
  const bytes = writeId3v1(original);
  expect(bytes.length).toBe(128);
  const round = readId3v1(bytes);
  expect(round).toEqual(original);
});
