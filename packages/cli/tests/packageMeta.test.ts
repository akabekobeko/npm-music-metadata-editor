import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Schema-light validation of `packages/cli/package.json`.
 *
 * The bin / files / publishConfig surface is what we publish to npm.
 * Asserting the shape from a test catches accidental edits (e.g. flipping
 * `private` back to `true`, removing `dist` from `files`) before they ship.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(here, "../package.json");

type PackageJson = {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly bin?: Readonly<Record<string, string>>;
  readonly files?: readonly string[];
  readonly publishConfig?: {
    readonly access?: string;
    readonly registry?: string;
  };
  readonly scripts?: Readonly<Record<string, string>>;
};

const loadPackageJson = async (): Promise<PackageJson> => {
  const text = await readFile(packageJsonPath, "utf8");
  return JSON.parse(text) as PackageJson;
};

describe("packages/cli/package.json", () => {
  it("is not marked private (so `npm publish` can run)", async () => {
    const pkg = await loadPackageJson();
    expect(pkg.private).toBeUndefined();
  });

  it("exposes mme via bin → ./dist/bin/mme.js", async () => {
    const pkg = await loadPackageJson();
    expect(pkg.bin).toEqual({ mme: "./dist/bin/mme.js" });
  });

  it("ships dist and excludes tsbuildinfo (READMEs / LICENSE are auto-included by npm)", async () => {
    const pkg = await loadPackageJson();
    expect(pkg.files).toBeDefined();
    const files = pkg.files ?? [];
    expect(files).toContain("dist");
    expect(files).toContain("!dist/**/*.tsbuildinfo");
  });

  it("declares public access under publishConfig", async () => {
    const pkg = await loadPackageJson();
    expect(pkg.publishConfig?.access).toBe("public");
  });

  it("wires prepublishOnly through clean + build + test", async () => {
    const pkg = await loadPackageJson();
    const command = pkg.scripts?.prepublishOnly ?? "";
    expect(command).toContain("clean");
    expect(command).toContain("build");
    expect(command).toContain("test");
  });
});
