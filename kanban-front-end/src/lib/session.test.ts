import { beforeEach, describe, expect, it } from "vitest";
import { clearIdentity, readIdentity, saveIdentity } from "./session";

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores an identity and reads it back", () => {
    saveIdentity({ id: "user-1", email: "alice@example.com" });
    expect(readIdentity()).toEqual({ id: "user-1", email: "alice@example.com" });
  });

  it("returns null when nothing is stored", () => {
    expect(readIdentity()).toBeNull();
  });

  it("clears the stored identity", () => {
    saveIdentity({ id: "user-1", email: "alice@example.com" });
    clearIdentity();
    expect(readIdentity()).toBeNull();
  });

  it("returns null when the stored value is not valid JSON", () => {
    localStorage.setItem("todo.identity", "not-json");
    expect(readIdentity()).toBeNull();
  });
});