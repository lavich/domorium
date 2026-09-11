import { describe, expect, it } from "vitest";

import {
  abilitiesOf,
  DISTINCT_ABILITIES,
  PLACES,
  SHARED_ABILITIES,
} from "./abilities";
import { PATHS } from "./paths";

const declared = Object.values(PATHS) as string[];

describe("the abilities the places differ by", () => {
  it("names a place for every row", () => {
    for (const ability of DISTINCT_ABILITIES) {
      expect(Object.keys(ability.where).length, ability.label).toBeGreaterThan(
        0,
      );
    }
  });

  // A row true of every place is not a difference; it belongs among the shared
  // rows, where the reason for it is stated once.
  it("keeps what is true everywhere out of the table", () => {
    for (const ability of DISTINCT_ABILITIES) {
      expect(Object.keys(ability.where).length, ability.label).toBeLessThan(
        PLACES.length,
      );
    }
  });

  it("names only places the site publishes", () => {
    for (const place of PLACES) {
      expect(declared).toContain(place.path);
    }
    for (const ability of DISTINCT_ABILITIES) {
      for (const path of Object.keys(ability.where)) {
        expect(
          PLACES.map((place) => place.path as string),
          ability.label,
        ).toContain(path);
      }
    }
  });

  it("marks every place somewhere in the table", () => {
    for (const place of PLACES) {
      const marks = SHARED_ABILITIES.length + abilitiesOf(place.path).length;
      expect(marks, place.label).toBeGreaterThan(0);
    }
  });

  it("says nothing twice", () => {
    const shared = new Set<string>(SHARED_ABILITIES);
    for (const ability of DISTINCT_ABILITIES) {
      expect(shared.has(ability.label), ability.label).toBe(false);
    }
    const labels = DISTINCT_ABILITIES.map((ability) => ability.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
