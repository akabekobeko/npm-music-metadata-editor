/**
 * Write a value to stdout as pretty-printed JSON.
 *
 * The output is the canonical machine-readable channel of the CLI. The value
 * is encoded with `JSON.stringify(value, null, 2)` and terminated by a single
 * newline so downstream tools can pipe / append safely.
 *
 * @param value - Any JSON-serializable value to emit.
 */
export const writeJson = (value: unknown): void =>
  void process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
