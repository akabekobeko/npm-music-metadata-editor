import { chmod, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Shebang line that the bin script must start with after build. */
const SHEBANG = "#!/usr/bin/env node";

/**
 * Ensure the compiled bin script starts with a `#!/usr/bin/env node` shebang
 * and is marked executable.
 *
 * `tsc` preserves the leading shebang in the source TypeScript file, but
 * (a) some downstream tooling has been observed to strip it, so we re-prepend
 *     defensively when missing, and
 * (b) the emitted file inherits the umask permissions, which on most systems
 *     does not include the executable bit. `npm install -g` works around this,
 *     but local execution via `node ./dist/bin/mme.js` and direct `./mme` from
 *     a checkout both want the bit set, so we apply chmod 0o755 explicitly.
 *
 * The script is intentionally minimal — it only operates on the single bin
 * file the package ships, so there is no glob / discovery layer.
 */
const main = async (): Promise<void> => {
  const here = dirname(fileURLToPath(import.meta.url));
  const binPath = resolve(here, "../dist/bin/mme.js");
  const original = await readFile(binPath, "utf8");
  if (!original.startsWith(`${SHEBANG}\n`)) {
    const next = original.startsWith("#!") ? original : `${SHEBANG}\n${original}`;
    await writeFile(binPath, next, "utf8");
  }

  await chmod(binPath, 0o755);
};

await main();
