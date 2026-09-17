import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { UserModel, BoardModel, TaskModel } from "../models";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { buildApp } from "./testApp";

describe("users router (http-api user scenarios)", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), BoardModel.deleteMany({}), TaskModel.deleteMany({})]);
  });

  it("creates an identity on first login with an email", async () => {
    const res = await request(buildApp()).post("/login").send({ email: "alice@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.email).toBe("alice@example.com");
  });

  it("returns the same identity on repeat login with the same email", async () => {
    const app = buildApp();
    const first = await request(app).post("/login").send({ email: "alice@example.com" });
    const second = await request(app).post("/login").send({ email: "alice@example.com" });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it("normalizes email case and surrounding whitespace", async () => {
    const app = buildApp();
    const first = await request(app).post("/login").send({ email: "  Alice@Example.com  " });
    const second = await request(app).post("/login").send({ email: "alice@example.com" });
    expect(first.body.email).toBe("alice@example.com");
    expect(second.body).toEqual(first.body);
  });

  it("rejects a login without an email", async () => {
    const res = await request(buildApp()).post("/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("returns a known user's identity", async () => {
    const app = buildApp();
    const created = await request(app).post("/login").send({ email: "bob@example.com" });
    const id = created.body.id;

    const res = await request(app).get(`/users/${id}`).set("X-User-Id", id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, email: "bob@example.com" });
  });

  it("rejects identity lookup from an unknown actor", async () => {
    const app = buildApp();
    const created = await request(app).post("/login").send({ email: "bob@example.com" });
    const id = created.body.id;

    const res = await request(app).get(`/users/${id}`).set("X-User-Id", "user-ghost");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unknown_actor");
  });

  it("returns 404 for an unknown userId", async () => {
    const app = buildApp();
    const created = await request(app).post("/login").send({ email: "bob@example.com" });
    const actorId = created.body.id;

    const res = await request(app).get("/users/user-ghost").set("X-User-Id", actorId);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("resolves a new email by creating an identity", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const res = await request(app)
      .post("/users/resolve")
      .set("X-User-Id", actor.body.id)
      .send({ email: "  Carol@Example.com  " });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.email).toBe("carol@example.com");
  });

  it("resolves an existing email to the same identity", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });
    const first = await request(app)
      .post("/users/resolve")
      .set("X-User-Id", actor.body.id)
      .send({ email: "carol@example.com" });
    const second = await request(app)
      .post("/users/resolve")
      .set("X-User-Id", actor.body.id)
      .send({ email: "carol@example.com" });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it("rejects resolve without an email body", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const res = await request(app).post("/users/resolve").set("X-User-Id", actor.body.id).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("searches matching identities with exact match first", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });
    await request(app).post("/login").send({ email: "bob@example.com" });
    await request(app).post("/login").send({ email: "bobby@example.com" });

    const res = await request(app).get("/users?email=bob").set("X-User-Id", actor.body.id);
    expect(res.status).toBe(200);
    expect(res.body.map((u: { email: string }) => u.email)).toEqual([
      "bob@example.com",
      "bobby@example.com",
    ]);
  });

  it("returns an empty search result when nothing matches", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const res = await request(app).get("/users?email=zzz").set("X-User-Id", actor.body.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects search without an email query", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const res = await request(app).get("/users").set("X-User-Id", actor.body.id);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("rejects search, resolve, and lookup from an unknown actor", async () => {
    const app = buildApp();

    const search = await request(app).get("/users?email=bob").set("X-User-Id", "user-ghost");
    expect(search.status).toBe(401);

    const resolve = await request(app)
      .post("/users/resolve")
      .set("X-User-Id", "user-ghost")
      .send({ email: "x@y.com" });
    expect(resolve.status).toBe(401);

    const lookup = await request(app).get("/users/someone").set("X-User-Id", "user-ghost");
    expect(lookup.status).toBe(401);
  });

  it("rejects search and resolve without an actor header", async () => {
    const app = buildApp();

    const search = await request(app).get("/users?email=bob");
    expect(search.status).toBe(401);

    const resolve = await request(app).post("/users/resolve").send({ email: "x@y.com" });
    expect(resolve.status).toBe(401);
  });

  it("resolves a batch of ids to found identities only", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });
    const bob = await request(app).post("/login").send({ email: "bob@example.com" });

    const res = await request(app)
      .post("/users/batch")
      .set("X-User-Id", actor.body.id)
      .send({ ids: [actor.body.id, bob.body.id, bob.body.id, "user-ghost"] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: actor.body.id, email: "alice@example.com" },
      { id: bob.body.id, email: "bob@example.com" },
    ]);
  });

  it("returns an empty batch for empty ids", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const res = await request(app)
      .post("/users/batch")
      .set("X-User-Id", actor.body.id)
      .send({ ids: [] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects a batch without an ids array or over the limit", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const missing = await request(app)
      .post("/users/batch")
      .set("X-User-Id", actor.body.id)
      .send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("validation");

    const over = await request(app)
      .post("/users/batch")
      .set("X-User-Id", actor.body.id)
      .send({ ids: Array.from({ length: 101 }, (_, i) => `user-${i}`) });
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe("validation");
  });

  it("rejects a batch from an unknown actor", async () => {
    const res = await request(buildApp())
      .post("/users/batch")
      .set("X-User-Id", "user-ghost")
      .send({ ids: ["user-ghost"] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unknown_actor");
  });
})