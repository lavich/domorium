import { describe, expect, it } from "vitest";

import { detectWorkspaceSupport } from "./support";

describe("what the editor can offer", () => {
  it("offers folders where the picker exists", () => {
    const support = detectWorkspaceSupport({ showDirectoryPicker: () => {} });

    expect(support.folders).toBe(true);
    expect(support.reason).toBeNull();
  });

  // Safari and Firefox: the reader is told which browsers can, and what is left.
  it("names what is missing and what remains where it does not", () => {
    const support = detectWorkspaceSupport({});

    expect(support.folders).toBe(false);
    expect(support.reason).toMatch(/Chromium/);
    expect(support.reason).toMatch(/one file/);
  });
});
