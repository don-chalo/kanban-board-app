import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMemberEmails } from "./members";

const STORE: Record<string, string> = {
  "user-1": "alice@example.com",
  "user-2": "bob@example.com",
  "user-3": "carol@example.com",
};

function mockBatch() {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const ids = JSON.parse(String(init?.body ?? "{}")).ids as string[];
    return {
      ok: true,
      status: 200,
      json: async () =>
        [...new Set(ids)]
          .filter((id) => STORE[id] !== undefined)
          .map((id) => ({ id, email: STORE[id] })),
    };
  });
}

beforeEach(() => {
  localStorage.setItem("todo.identity", JSON.stringify({ id: "user-1", email: "alice@example.com" }));
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("resolveMemberEmails", () => {
  it("resolves member emails with a single batch call, deduping ids", async () => {
    const fetchMock = mockBatch();
    vi.stubGlobal("fetch", fetchMock);

    const map = await resolveMemberEmails([
      "user-1",
      "user-1",
      "user-1",
      "user-2",
      "user-3",
    ]);

    expect(map).toEqual(
      new Map([
        ["user-1", "alice@example.com"],
        ["user-2", "bob@example.com"],
        ["user-3", "carol@example.com"],
      ]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      ids: ["user-1", "user-2", "user-3"],
    });
  });

  it("falls back to the raw id when a user is not found", async () => {
    vi.stubGlobal("fetch", mockBatch());

    const map = await resolveMemberEmails(["user-1", "ghost"]);

    expect(map.get("user-1")).toBe("alice@example.com");
    expect(map.get("ghost")).toBe("ghost");
  });

  it("falls back to the raw id when the batch lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const map = await resolveMemberEmails(["user-1"]);

    expect(map.get("user-1")).toBe("user-1");
  });
});
