import { describe, it, expect } from "vitest";
import schema from "./g7validation.json";

describe("g7validation.json", () => {
  it("matches snapshot", () => {
    expect(schema).toMatchSnapshot();
  });

  it("has all required sections", () => {
    expect(schema).toHaveProperty("calendar");
    expect(schema).toHaveProperty("label");
    expect(schema).toHaveProperty("payload");
    expect(schema).toHaveProperty("set");
    expect(schema).toHaveProperty("substructure");
    expect(schema).toHaveProperty("tag");
    expect(schema).toHaveProperty("tagInContext");
  });
});
