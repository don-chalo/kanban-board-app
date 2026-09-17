import { describe, expect, it } from "vitest";
import * as domain from "./index";

describe("domain module", () => {
  it("imports cleanly from the barrel", () => {
    expect(domain).toBeDefined();
  });
});