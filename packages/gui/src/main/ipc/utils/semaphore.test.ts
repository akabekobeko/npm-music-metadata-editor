import { expect, it } from "vitest";
import { createSemaphore } from "./semaphore.js";

it("rejects non-positive limits", () => {
  expect(() => createSemaphore(0)).toThrow(RangeError);
  expect(() => createSemaphore(-1)).toThrow(RangeError);
  expect(() => createSemaphore(1.5)).toThrow(RangeError);
});

it("never exceeds the configured limit", async () => {
  const sem = createSemaphore(2);
  let active = 0;
  let peak = 0;

  const observe = async (): Promise<void> => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
  };

  const tasks = Array.from({ length: 10 }, () => sem.run(observe));
  await Promise.all(tasks);

  expect(peak).toBeLessThanOrEqual(2);
});

it("forwards the task return value", async () => {
  const sem = createSemaphore(1);
  const result = await sem.run(async () => 42);
  expect(result).toBe(42);
});

it("releases the slot when the task throws", async () => {
  const sem = createSemaphore(1);

  await expect(
    sem.run(async () => {
      throw new Error("boom");
    }),
  ).rejects.toThrow("boom");

  const result = await sem.run(async () => "ok");
  expect(result).toBe("ok");
});
