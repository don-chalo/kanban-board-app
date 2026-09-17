import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { UserModel } from "../models";
import { createMongoUserRepository } from "../repositories";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { createActorMiddleware } from "./actor";
import { errorHandler } from "./errorHandler";

describe("actor middleware", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  function buildApp() {
    const app = express();
    app.use(createActorMiddleware(createMongoUserRepository()));
    app.get("/whoami", (req, res) => {
      res.json({ actor: req.actorId });
    });
    app.use(errorHandler);
    return app;
  }

  it("accepts a known actor and exposes the actor id", async () => {
    await UserModel.create({ _id: "user-alice", email: "alice@example.com" });
    const res = await request(buildApp()).get("/whoami").set("X-User-Id", "user-alice");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ actor: "user-alice" });
  });

  it("rejects a request without the header with 401", async () => {
    const res = await request(buildApp()).get("/whoami");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unknown_actor");
  });

  it("rejects an unknown actor with 401 and performs no operation", async () => {
    await UserModel.create({ _id: "user-alice", email: "alice@example.com" });
    const res = await request(buildApp())
      .get("/whoami")
      .set("X-User-Id", "user-ghost");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: "unknown_actor", message: "Unknown user: user-ghost" } });
  });
});