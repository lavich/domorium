import { describe, expect, it } from "vitest";

import * as packageApi from "./index";

describe("@domorium/codemirror public API", () => {
  it("does not expose a second GEDCOM parser", () => {
    expect("gedcomLanguage" in packageApi).toBe(false);
    expect("classifyGedcomLine" in packageApi).toBe(false);
  });

  it("exposes explicit CodeMirror coordinate conversion names", () => {
    expect("positionToOffset" in packageApi).toBe(true);
    expect("offsetToPosition" in packageApi).toBe(true);
    expect("rangeToOffsets" in packageApi).toBe(true);
    expect("toOffset" in packageApi).toBe(false);
    expect("toPosition" in packageApi).toBe(false);
    expect("toOffsets" in packageApi).toBe(false);
  });

  it("exposes reference commands needed by editor hosts", () => {
    expect("canRenameReference" in packageApi).toBe(true);
    expect("renameReference" in packageApi).toBe(true);
    expect("goToDefinition" in packageApi).toBe(true);
    expect("goToNextReference" in packageApi).toBe(true);
  });
});
