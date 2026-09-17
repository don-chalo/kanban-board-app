import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("reads DATABASE_URL and DEFAULT_PORT from the environment", () => {
    const config = loadConfig({
      DATABASE_URL: "mongodb://example.com:27017/todo",
      DEFAULT_PORT: "8080",
    });
    expect(config.mongodbUri).toBe("mongodb://example.com:27017/todo");
    expect(config.port).toBe(8080);
  });

  it("throws when DATABASE_URL is missing or blank", () => {
    expect(() => loadConfig({ DEFAULT_PORT: "3000" })).toThrow("DATABASE_URL is required");
    expect(() => loadConfig({ DATABASE_URL: "   ", DEFAULT_PORT: "3000" })).toThrow(
      "DATABASE_URL is required",
    );
  });

  it("throws when DEFAULT_PORT is missing or invalid", () => {
    const uri = { DATABASE_URL: "mongodb://example.com:27017/todo" };
    expect(() => loadConfig(uri)).toThrow("DEFAULT_PORT");
    for (const port of ["abc", "-1", "0", "3.5"]) {
      expect(() => loadConfig({ ...uri, DEFAULT_PORT: port })).toThrow("DEFAULT_PORT");
    }
  });
});
