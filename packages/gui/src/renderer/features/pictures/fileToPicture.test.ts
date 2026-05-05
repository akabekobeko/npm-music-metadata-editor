// @vitest-environment jsdom

import { expect, it } from "vitest";
import { fileToPicture } from "./fileToPicture.js";

const buildFile = (bytes: ArrayLike<number>, name: string): File =>
  new File([new Uint8Array(bytes)], name);

it("detects JPEG via the magic number", async () => {
  const file = buildFile([0xff, 0xd8, 0xff, 0xe0, 0x00], "cover.jpg");

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("image/jpeg");
});

it("detects PNG via the magic number", async () => {
  const file = buildFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00], "cover.png");

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("image/png");
});

it("detects WebP via the magic number with arbitrary file size bytes", async () => {
  const file = buildFile(
    [0x52, 0x49, 0x46, 0x46, 0xab, 0xcd, 0xef, 0x01, 0x57, 0x45, 0x42, 0x50],
    "cover.webp",
  );

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("image/webp");
});

it("detects GIF via the magic number", async () => {
  const file = buildFile([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], "cover.gif");

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("image/gif");
});

it("prefers magic number when extension and bytes disagree", async () => {
  const file = buildFile([0xff, 0xd8, 0xff, 0xe0], "cover.png");

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("image/jpeg");
});

it("falls back to extension when no signature matches", async () => {
  const file = buildFile([0x00, 0x01, 0x02, 0x03], "cover.gif");

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("image/gif");
});

it("falls back to application/octet-stream as a last resort", async () => {
  const file = buildFile([0x00, 0x01], "cover.unknown");

  const picture = await fileToPicture(file);

  expect(picture.mimeType).toBe("application/octet-stream");
});

it("populates id, default kind, and copies the file bytes", async () => {
  const bytes = [0xff, 0xd8, 0xff, 0xe0];
  const file = buildFile(bytes, "front.jpg");

  const picture = await fileToPicture(file);

  expect(picture.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  expect(picture.kind).toBe(3);
  expect(picture.description).toBe("");
  expect(Array.from(picture.data)).toEqual(bytes);
});
