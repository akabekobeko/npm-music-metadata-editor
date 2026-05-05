/**
 * Shape returned by {@link createSemaphore}.
 *
 * `run` schedules a thunk and resolves with whatever the thunk returns; queued
 * thunks start running as soon as the in-flight count drops below `limit`.
 */
export type Semaphore = {
  readonly run: <T>(task: () => Promise<T>) => Promise<T>;
};

/**
 * Build a small async semaphore that caps the number of in-flight Promises.
 *
 * Used by `onLoadMany` to bound the parallelism of `loadTrack` calls so a
 * batch of hundreds of files cannot exhaust the OS file-descriptor budget. The
 * implementation is a FIFO queue plus a counter — no external dependency.
 *
 * @param limit - Maximum concurrent tasks. Must be a positive integer.
 * @returns A semaphore handle exposing `run`.
 * @throws `RangeError` when `limit` is not a positive integer.
 */
export const createSemaphore = (limit: number): Semaphore => {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`createSemaphore: limit must be a positive integer (got ${limit})`);
  }

  let active = 0;
  const waiters: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (active < limit) {
      active += 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      waiters.push(() => {
        active += 1;
        resolve();
      });
    });
  };

  const release = (): void => {
    active -= 1;
    const next = waiters.shift();
    if (next !== undefined) {
      next();
    }
  };

  const run = async <T>(task: () => Promise<T>): Promise<T> => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };

  return { run };
};
