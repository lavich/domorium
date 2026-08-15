import { describe, expect, it } from "vitest";

import manifest from "../package.json";

/*
 * A peer range says what the package needs, not what it was built against. A
 * bump of the development dependency rewrote `@codemirror/view` to `^6.43.8`,
 * and a host pinned to the CodeMirror it ships — Obsidian carries 6.38.6 —
 * could not resolve the package at all.
 */
describe("what the editor asks of the host's CodeMirror", () => {
  it("is a major version and no more", () => {
    for (const [name, range] of Object.entries(manifest.peerDependencies)) {
      const expected = name.startsWith("@lezer/") ? "^1.0.0" : "^6.0.0";
      expect(range, name).toBe(expected);
    }
  });
});
