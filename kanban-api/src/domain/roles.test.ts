import { describe, expect, it } from "vitest";
import { isBoardManager, isMember, resolveRole } from "./roles";
import { alice, bob, carol, makeBoard } from "./fixtures";

describe("resolveRole", () => {
  it("resolves the creator", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
    expect(resolveRole(board, alice)).toBe("creator");
  });

  it("resolves the owner", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
    expect(resolveRole(board, bob)).toBe("owner");
  });

  it("resolves an associated member", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
    expect(resolveRole(board, carol)).toBe("associated");
  });

  it("resolves a non-member as none", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
    expect(resolveRole(board, "user-outsider")).toBe("none");
  });

  it("returns creator when creator and owner are the same user", () => {
    const board = makeBoard({ creator: alice, owner: alice });
    expect(resolveRole(board, alice)).toBe("creator");
  });

  it("never reports the creator or owner as associated", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [bob, alice, carol] });
    expect(resolveRole(board, alice)).toBe("creator");
    expect(resolveRole(board, bob)).toBe("owner");
  });
});

describe("isMember", () => {
  it("returns true for every role and false for outsiders", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
    expect(isMember(board, alice)).toBe(true);
    expect(isMember(board, bob)).toBe(true);
    expect(isMember(board, carol)).toBe(true);
    expect(isMember(board, "user-outsider")).toBe(false);
  });
});

describe("isBoardManager", () => {
  it("returns true only for creator or owner", () => {
    const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
    expect(isBoardManager(board, alice)).toBe(true);
    expect(isBoardManager(board, bob)).toBe(true);
    expect(isBoardManager(board, carol)).toBe(false);
    expect(isBoardManager(board, "user-outsider")).toBe(false);
  });
});