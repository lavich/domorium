import { describe, expect, it } from "vitest";

import { INTEGRATIONS } from "./integrations";
import { ALL_CARDS, ALL_SHOTS, cardOf, EDITOR_POSTER, shotsOf } from "./shots";

// Read through Vite rather than `node:fs`: the app's tsconfig has no node types.
const published = new Set(
  Object.keys(import.meta.glob("../../public/shots/*")).map((path) =>
    path.slice(path.lastIndexOf("/") + 1),
  ),
);

describe("the photographs of each place", () => {
  it("gives every published place a series of its own", () => {
    for (const integration of INTEGRATIONS) {
      expect(shotsOf(integration.path), integration.name).toHaveLength(3);
    }
  });

  it("names a file that exists, in every format the markup asks for", () => {
    for (const { shot } of ALL_SHOTS) {
      const formats = shot.motion ? ["webp", "mp4", "webm"] : ["webp"];
      for (const format of formats) {
        expect([...published], shot.name).toContain(`${shot.name}.${format}`);
      }
    }
  });

  it("gives every published place a crop for the slots drawn small", () => {
    for (const integration of INTEGRATIONS) {
      const card = cardOf(integration.path);
      expect(card, integration.name).not.toBeNull();
      expect([...published], integration.name).toContain(`${card?.name}.webp`);
      expect(card?.alt.length, integration.name).toBeGreaterThan(0);
    }
  });

  it("photographs the editor it offers to run, in either theme", () => {
    expect([...published]).toContain(`${EDITOR_POSTER.name}.webp`);
    expect([...published]).toContain(`${EDITOR_POSTER.dark}.webp`);
    expect(EDITOR_POSTER.alt.length).toBeGreaterThan(0);
  });

  it("ships no picture no page asks for", () => {
    const asked = new Set([
      `${EDITOR_POSTER.name}.webp`,
      `${EDITOR_POSTER.dark}.webp`,
      ...ALL_CARDS.map(({ card }) => `${card.name}.webp`),
      ...ALL_SHOTS.flatMap(({ shot }) =>
        (shot.motion ? ["webp", "mp4", "webm"] : ["webp"]).map(
          (format) => `${shot.name}.${format}`,
        ),
      ),
    ]);
    expect([...published].filter((file) => !asked.has(file))).toEqual([]);
  });

  it("moves once per series, and only at the front of it", () => {
    for (const integration of INTEGRATIONS) {
      const moving = shotsOf(integration.path).map((shot) =>
        Boolean(shot.motion),
      );
      expect(moving, integration.name).toEqual([true, false, false]);
    }
  });

  it("describes a frame twice over, in two different ways", () => {
    for (const { shot } of ALL_SHOTS) {
      expect(shot.caption.length, shot.name).toBeGreaterThan(0);
      expect(shot.alt, shot.name).not.toBe(shot.caption);
      expect(shot.alt.length, shot.name).toBeGreaterThan(shot.caption.length);
      expect(shot.alt.trimEnd(), shot.name).toMatch(/\.$/);
    }
  });

  it("names every frame once across the whole site", () => {
    const names = ALL_SHOTS.map(({ shot }) => shot.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("photographs nowhere the site does not publish", () => {
    const paths = INTEGRATIONS.map((integration) => integration.path);
    for (const { path } of ALL_SHOTS) {
      expect(paths, path).toContain(path);
    }
  });
});
