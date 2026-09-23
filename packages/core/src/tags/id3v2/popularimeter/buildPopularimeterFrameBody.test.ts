import { expect, it } from "vitest";
import { buildPopularimeterFrameBody } from "./buildPopularimeterFrameBody.js";
import { parsePopularimeterFrame } from "./parsePopularimeterFrame.js";

it("serializes email, NUL, rating byte and counter", () => {
  const body = buildPopularimeterFrameBody({
    email: "ab",
    rating: 128,
    counter: Uint8Array.from([0, 0, 0, 9]),
  });
  expect(Array.from(body)).toEqual([0x61, 0x62, 0x00, 128, 0, 0, 0, 9]);
});

it("strips NUL from the email and clamps the rating byte", () => {
  const body = buildPopularimeterFrameBody({
    email: "a\u0000b",
    rating: 300,
    counter: new Uint8Array(),
  });
  expect(Array.from(body)).toEqual([0x61, 0x62, 0x00, 255]);
});

it("round-trips through parsePopularimeterFrame", () => {
  const input = { email: "user@example.com", rating: 54, counter: Uint8Array.from([0, 0, 0, 1]) };
  expect(parsePopularimeterFrame(buildPopularimeterFrameBody(input))).toEqual(input);
});
