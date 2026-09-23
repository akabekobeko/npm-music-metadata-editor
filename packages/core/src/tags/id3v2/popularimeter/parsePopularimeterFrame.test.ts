import { expect, it } from "vitest";
import { parsePopularimeterFrame } from "./parsePopularimeterFrame.js";

it("splits email, rating byte and counter", () => {
  const body = Uint8Array.from([0x61, 0x62, 0x00, 196, 0x00, 0x00, 0x01, 0x02]);
  expect(parsePopularimeterFrame(body)).toEqual({
    email: "ab",
    rating: 196,
    counter: Uint8Array.from([0x00, 0x00, 0x01, 0x02]),
  });
});

it("accepts a frame without a counter and an empty email", () => {
  const result = parsePopularimeterFrame(Uint8Array.from([0x00, 255]));
  expect(result?.email).toBe("");
  expect(result?.rating).toBe(255);
  expect(result?.counter).toHaveLength(0);
});

it("returns undefined when the terminator or rating byte is missing", () => {
  expect(parsePopularimeterFrame(Uint8Array.from([0x61, 0x62]))).toBeUndefined();
  expect(parsePopularimeterFrame(Uint8Array.from([0x61, 0x00]))).toBeUndefined();
  expect(parsePopularimeterFrame(new Uint8Array())).toBeUndefined();
});
