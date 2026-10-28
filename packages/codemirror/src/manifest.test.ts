import { describe, expect, it } from "vitest";

import manifest from "../package.json";

/*
 * A peer range says what the package needs, not what it was built against. A
 * bump of the development dependency rewrote `@codemirror/view` to `^6.43.8`,
 * and a host pinned to the CodeMirror it ships — Obsidian carries 6.38.6 —
 * could not resolve the package at all.
 */
const NEEDED: Record<string, string> = {
  // Before 6.6.0 `insertCompletionText` replaced the wrong range when `to` fell
  // after the cursor; before 6.6.1 `apply` got positions the document had moved past.
  "@codemirror/autocomplete": "^6.6.1",
};

describe("what the editor asks of the host's CodeMirror", () => {
  it("is a major version, unless a feature it uses needs a later minor", () => {
    for (const [name, range] of Object.entries(manifest.peerDependencies)) {
      const expected =
        NEEDED[name] ?? (name.startsWith("@lezer/") ? "^1.0.0" : "^6.0.0");
      expect(range, name).toBe(expected);
    }
  });
});
