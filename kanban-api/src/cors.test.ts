import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { BoardModel, TaskModel, UserModel } from "./models";
import { startTestMongo, stopTestMongo } from "./test/mongo";
import { createMongoBoardRepository, createMongoUserRepository } from "./repositories";
import { buildApp } from "./app";

describe("CORS", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), BoardModel.deleteMany({}), TaskModel.deleteMany({})]);
  });

  function makeApp(corsOrigin: string[] = []) {
    return buildApp(
      {
        userRepo: createMongoUserRepository(),
        boardRepo: createMongoBoardRepository(),
      },
      { corsOrigin },
    );
  }

  it("echoes a listed origin with Vary", async () => {
    const app = makeApp(["http://localhost:5173", "https://app.example.com"]);
    const res = await request(app).post("/login").set("Origin", "https://app.example.com").send({ email: "alice@example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.example.com");
    expect(res.headers["vary"]).toContain("Origin");
  });

  it("omits the allow header for an unlisted origin", async () => {
    const app = makeApp(["https://app.example.com"]);
    const res = await request(app).post("/login").set("Origin", "http://evil.example.com").send({ email: "alice@example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("omits the allow header when no origins are configured", async () => {
    const app = makeApp();
    const res = await request(app).post("/login").set("Origin", "http://localhost:5173").send({ email: "alice@example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("lets requests without an Origin header through", async () => {
    const app = makeApp(["https://app.example.com"]);
    const res = await request(app).post("/login").send({ email: "bob@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: "bob@example.com",
    });
  });

  it("answers a preflight OPTIONS for the methods and headers the client requests", async () => {
    const app = makeApp(["http://localhost:5173"]);
    const res = await request(app)
      .options("/login")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type, X-User-Id");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-headers"]).toContain("Content-Type");
    expect(res.headers["access-control-allow-headers"]).toContain("X-User-Id");
  });

  it("denies preflight from an unlisted origin", async () => {
    const app = makeApp(["https://app.example.com"]);
    const res = await request(app)
      .options("/login")
      .set("Origin", "http://evil.example.com")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type, X-User-Id");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("keeps existing route behavior unchanged when CORS headers are present", async () => {
    const app = makeApp(["http://localhost:5173"]);
    const res = await request(app).post("/login").set("Origin", "http://localhost:5173").send({ email: "bob@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: "bob@example.com",
    });
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
