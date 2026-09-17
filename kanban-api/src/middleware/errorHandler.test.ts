import { describe, expect, it } from "vitest";
import express, { Express } from "express";
import request from "supertest";
import mongoose from "mongoose";
import { DomainError, DomainErrorCode } from "../domain/errors";
import { ApiError, ApiErrorCode, errorHandler } from "./errorHandler";

function buildApp(): Express {
  const app = express();
  app.get("/domain/:code", (req, res) => {
    const code = req.params.code as DomainErrorCode;
    throw new DomainError(code, `message for ${code}`);
  });
  app.get("/api/:code", (req, res) => {
    const code = req.params.code as ApiErrorCode;
    throw new ApiError(code, `message for ${code}`);
  });
  app.post("/json", express.json(), (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/validation", (_req, _res) => {
    throw new mongoose.Error.ValidationError({} as never);
  });
  app.get("/boom", () => {
    throw new Error("boom");
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler mapping", () => {
  const domainTable: Array<[DomainErrorCode, number]> = [
    ["unauthorized", 403],
    ["not_found", 404],
    ["invalid_transition", 409],
    ["board_not_done", 409],
    ["read_only", 409],
    ["member_required", 400],
    ["duplicate_member", 400],
    ["not_associated", 400],
    ["cannot_modify_creator", 400],
  ];

  for (const [code, status] of domainTable) {
    it(`maps domain code ${code} to ${status}`, async () => {
      const res = await request(buildApp()).get(`/domain/${code}`);
      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: { code, message: `message for ${code}` } });
    });
  }

  it("maps the API code unknown_actor to 401", async () => {
    const res = await request(buildApp()).get("/api/unknown_actor");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: "unknown_actor", message: "message for unknown_actor" },
    });
  });

  it("maps a malformed JSON body to 400", async () => {
    const res = await request(buildApp())
      .post("/json")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("bad_json");
  });

  it("maps a mongoose validation failure to 400", async () => {
    const res = await request(buildApp()).get("/validation");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("falls back to 500 for unknown errors", async () => {
    const res = await request(buildApp()).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "internal_error", message: "Internal server error" },
    });
  });
})