import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { UserModel, BoardModel, TaskModel } from "../models";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { buildApp } from "./testApp";

describe("transitions router", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), BoardModel.deleteMany({}), TaskModel.deleteMany({})]);
  });

  it("returns the transitions table and frozen states", async () => {
    const app = buildApp();
    const actor = await request(app).post("/login").send({ email: "alice@example.com" });

    const res = await request(app).get("/transitions").set("X-User-Id", actor.body.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      transitions: {
        ToDo: ["InProgress", "Cancelled"],
        InProgress: ["Done", "Blocked", "Cancelled"],
        Done: [],
        Cancelled: [],
        Blocked: ["InProgress"],
      },
      frozenStates: ["Blocked", "Cancelled", "Done"],
    });
    expect(res.headers["cache-control"]).toContain("max-age=3600");
  });

  it("rejects an unknown actor with 401", async () => {
    const res = await request(buildApp()).get("/transitions").set("X-User-Id", "user-ghost");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unknown_actor");
  });
});
