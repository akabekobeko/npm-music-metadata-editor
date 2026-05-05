import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should merge conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
