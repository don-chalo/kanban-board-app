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

  function makeApp() {
    return buildApp({
      userRepo: createMongoUserRepository(),
      boardRepo: createMongoBoardRepository(),
    });
  }

  it("returns Access-Control-Allow-Origin for a request carrying an Origin header", async () => {
    const app = makeApp();
    const res = await request(app).post("/login").set("Origin", "http://localhost:5173").send({ email: "alice@example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("answers a preflight OPTIONS for the methods and headers the client requests", async () => {
    const app = makeApp();
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

  it("keeps existing route behavior unchanged when CORS headers are present", async () => {
    const app = makeApp();
    const res = await request(app).post("/login").set("Origin", "http://localhost:5173").send({ email: "bob@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: "bob@example.com",
    });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});