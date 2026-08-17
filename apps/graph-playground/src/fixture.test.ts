import { describe, expect, it } from "vitest";
import { familyGedcom } from "./fixture";
import { readGedcom } from "./gedcom";
import { parentsOf, partnersOf } from "./graph";

const graph = readGedcom(familyGedcom);

describe("the generated family", () => {
  // Without this the collision test in layout.test.ts passes on a graph too small to
  // collide, and stops meaning anything the day the generator breaks.
  it("is big enough for a layout to fall apart on", () => {
    expect(graph.people.size).toBeGreaterThanOrEqual(70);
  });

  it("spans five generations", () => {
    const depth = (id: string): number => {
      const parents = parentsOf(graph, id);
      return parents.length === 0 ? 0 : 1 + Math.max(...parents.map(depth));
    };
    expect(
      Math.max(...[...graph.people.keys()].map(depth)),
    ).toBeGreaterThanOrEqual(4);
  });

  // The layout draws a pedigree as a tree. Two lines running into one ancestor make it
  // a DAG, which cannot be drawn without crossings — so the fixture must not contain
  // one, or the layout tests would be measuring an impossible case.
  it("marries nobody to their own kin", () => {
    const paths = (id: string, seen = new Map<string, number>()) => {
      for (const parent of parentsOf(graph, id)) {
        seen.set(parent, (seen.get(parent) ?? 0) + 1);
        paths(parent, seen);
      }
      return seen;
    };
    const shared = [...graph.people.keys()].filter((id) =>
      [...paths(id).values()].some((count) => count > 1),
    );
    expect(shared).toEqual([]);
  });

  it("puts both spouses of every couple on record", () => {
    const lonely = [...graph.people.keys()].filter((id) =>
      partnersOf(graph, id).some((partner) => !graph.people.has(partner)),
    );
    expect(lonely).toEqual([]);
  });
});
