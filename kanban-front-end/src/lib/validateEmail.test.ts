import { describe, expect, it } from "vitest";
import { validateEmail } from "./validateEmail";

describe("validateEmail", () => {
  it("rejects a blank email", () => {
    expect(validateEmail("")).toEqual({ ok: false, error: "Email is required." });
    expect(validateEmail("   ")).toEqual({ ok: false, error: "Email is required." });
  });

  it("rejects a malformed email", () => {
    expect(validateEmail("not-an-email")).toEqual({ ok: false, error: "Enter a valid email." });
    expect(validateEmail("missing@tld")).toEqual({ ok: false, error: "Enter a valid email." });
    expect(validateEmail("spaces in@email.com")).toEqual({ ok: false, error: "Enter a valid email." });
  });

  it("normalizes a valid email with surrounding whitespace and mixed case", () => {
    const result = validateEmail("  Ada@Example.COM  ");
    if (!result.ok) {
      throw new Error("expected a valid email");
    }
    expect(result.value).toBe("ada@example.com");
  });

  it("accepts a plain valid email", () => {
    const result = validateEmail("alice@example.com");
    if (!result.ok) {
      throw new Error("expected a valid email");
    }
    expect(result.value).toBe("alice@example.com");
  });
});