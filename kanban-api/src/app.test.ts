import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { BoardModel, TaskModel, UserModel } from "./models";
import { startTestMongo, stopTestMongo } from "./test/mongo";
import { createMongoBoardRepository, createMongoUserRepository } from "./repositories";
import { buildApp } from "./app";

describe("buildApp", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), BoardModel.deleteMany({}), TaskModel.deleteMany({})]);
  });

  it("returns a wired Express app that serves the API without listening", async () => {
    const app = buildApp({
      userRepo: createMongoUserRepository(),
      boardRepo: createMongoBoardRepository(),
    });
    const created = await request(app).post("/login").send({ email: "alice@example.com" });
    expect(created.status).toBe(200);
    expect(created.body.email).toBe("alice@example.com");

    expect(typeof app.listen).toBe("function");
  });

  it("applies the actor middleware and error handler", async () => {
    const app = buildApp({
      userRepo: createMongoUserRepository(),
      boardRepo: createMongoBoardRepository(),
    });
    const res = await request(app).get("/boards").set("X-User-Id", "user-ghost");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: "unknown_actor", message: "Unknown user: user-ghost" },
    });
  });
})