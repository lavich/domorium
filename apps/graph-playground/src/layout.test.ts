import { describe, expect, it } from "vitest";
import { buildGraph, type Person } from "./graph";
import { computeLayout, COLUMN } from "./layout";
import { familyGedcom } from "./fixture";
import { readGedcom } from "./gedcom";

const person = (id: string, parents: string[] = []): Person => ({
  id,
  name: id,
  lineage: id,
  parents,
  partners: [],
});

const graph = buildGraph([
  person("A"),
  person("B", ["A"]),
  person("C", ["A"]),
  person("D", ["B"]),
  person("E", ["B"]),
]);

describe("computeLayout", () => {
  it("gives each leaf its own column", () => {
    const layout = computeLayout(graph);
    expect(layout.get("D")?.x).toBe(0);
    expect(layout.get("E")?.x).toBe(COLUMN);
    expect(layout.get("C")?.x).toBe(COLUMN * 2);
  });

  it("centres a parent over its children", () => {
    const layout = computeLayout(graph);
    expect(layout.get("B")?.x).toBe(COLUMN / 2);
    expect(layout.get("A")?.x).toBe(COLUMN * 1.25);
  });

  it("puts each generation on its own row", () => {
    const layout = computeLayout(graph);
    expect(layout.get("A")?.y).toBe(0);
    expect(layout.get("B")?.y).toBe(layout.get("C")?.y);
    expect(layout.get("D")?.y).toBeGreaterThan(layout.get("B")?.y ?? 0);
  });

  it("straddles a couple around the children they share", () => {
    const layout = computeLayout(
      buildGraph([
        { id: "A", name: "A", lineage: "A", parents: [], partners: ["B"] },
        { id: "B", name: "B", lineage: "B", parents: [], partners: ["A"] },
        person("C", ["A", "B"]),
      ]),
    );
    expect(layout.get("A")?.x).toBe(-COLUMN / 2);
    expect(layout.get("B")?.x).toBe(COLUMN / 2);
    expect(layout.get("C")?.x).toBe(0);
  });

  it("pushes apart two people it would otherwise have stacked", () => {
    const layout = computeLayout(
      buildGraph([person("A"), person("B"), person("C", ["A", "B"])]),
    );
    expect(layout.get("A")?.x).toBe(0);
    expect(layout.get("B")?.x).toBe(COLUMN);
  });

  it("never places two people on the same spot", () => {
    const scale = readGedcom(familyGedcom);
    const seen = new Set(
      [...computeLayout(scale).values()].map(({ x, y }) => `${x}:${y}`),
    );
    expect(seen.size).toBe(scale.people.size);
  });
});
