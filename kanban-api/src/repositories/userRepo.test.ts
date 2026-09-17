import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UserModel } from "../models";
import { stopTestMongo, startTestMongo } from "../test/mongo";
import { createMongoUserRepository } from "./userRepo";

describe("userRepo", () => {
  let repo: ReturnType<typeof createMongoUserRepository>;

  beforeAll(async () => {
    await startTestMongo();
    repo = createMongoUserRepository();
  });

  afterAll(stopTestMongo);

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it("creates a user and finds it by id", async () => {
    await repo.create({ id: "user-1", email: "alice@example.com" });
    const found = await repo.findById("user-1");
    expect(found).toEqual({ id: "user-1", email: "alice@example.com" });
  });

  it("creates several distinct users", async () => {
    await repo.create({ id: "user-1", email: "alice@example.com" });
    await repo.create({ id: "user-2", email: "bob@example.com" });
    expect(await repo.findById("user-2")).toEqual({
      id: "user-2",
      email: "bob@example.com",
    });
  });

  it("returns null for a missing user", async () => {
    expect(await repo.findById("user-ghost")).toBeNull();
  });

  it("finds an existing user by email", async () => {
    await repo.create({ id: "user-1", email: "alice@example.com" });
    expect(await repo.findByEmail("alice@example.com")).toEqual({
      id: "user-1",
      email: "alice@example.com",
    });
  });

  it("returns null when no user matches an email", async () => {
    expect(await repo.findByEmail("nobody@example.com")).toBeNull();
  });

  it("resolveUserByEmail creates an identity for a new email", async () => {
    const user = await repo.resolveUserByEmail("carol@example.com");
    expect(user.email).toBe("carol@example.com");
    expect(await repo.findById(user.id)).toEqual(user);
  });

  it("resolveUserByEmail returns the existing identity for a known email", async () => {
    const first = await repo.resolveUserByEmail("carol@example.com");
    const second = await repo.resolveUserByEmail("carol@example.com");
    expect(second).toEqual(first);
  });

  it("resolveUserByEmail normalizes case and surrounding whitespace", async () => {
    const first = await repo.resolveUserByEmail("  Chase@Example.com  ");
    expect(first.email).toBe("chase@example.com");
    const second = await repo.resolveUserByEmail("chase@example.com");
    expect(second).toEqual(first);
  });

  it("resolveUserByEmail handles concurrent creation of the same email", async () => {
    const results = await Promise.all([
      repo.resolveUserByEmail("race@example.com"),
      repo.resolveUserByEmail("race@example.com"),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(results[0].email).toBe("race@example.com");
  });

  it("searchByEmailPrefix returns matching identities with exact match first", async () => {
    await repo.create({ id: "u-1", email: "alice@example.com" });
    await repo.create({ id: "u-2", email: "bob@example.com" });
    await repo.create({ id: "u-3", email: "bobby@example.com" });

    const result = await repo.searchByEmailPrefix("bob");
    expect(result).toEqual([
      { id: "u-2", email: "bob@example.com" },
      { id: "u-3", email: "bobby@example.com" },
    ]);
  });

  it("searchByEmailPrefix matches case-insensitively against normalized emails", async () => {
    await repo.create({ id: "u-1", email: "alice@example.com" });
    const result = await repo.searchByEmailPrefix("ALICE");
    expect(result).toEqual([{ id: "u-1", email: "alice@example.com" }]);
  });

  it("searchByEmailPrefix caps results at the limit", async () => {
    for (let i = 1; i <= 9; i += 1) {
      await repo.create({ id: `cap-${i}`, email: `cap${i}@example.com` });
    }
    const result = await repo.searchByEmailPrefix("cap");
    expect(result).toHaveLength(8);
  });

  it("searchByEmailPrefix returns an empty list when nothing matches", async () => {
    expect(await repo.searchByEmailPrefix("zzz")).toEqual([]);
  });

  it("searchByEmailPrefix returns an empty list for a blank prefix", async () => {
    expect(await repo.searchByEmailPrefix("   ")).toEqual([]);
  });
});