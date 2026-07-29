import { describe, expect, it } from "vitest";

import * as packageApi from "./index";

describe("@gedcom/codemirror public API", () => {
  it("does not expose a second GEDCOM parser", () => {
    expect("gedcomLanguage" in packageApi).toBe(false);
    expect("classifyGedcomLine" in packageApi).toBe(false);
  });
});
