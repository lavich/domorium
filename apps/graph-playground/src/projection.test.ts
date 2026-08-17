import { describe, expect, it } from "vitest";
import {
  buildGraph,
  childrenOf,
  childrenOfCouple,
  rootsOf,
  subgraph,
  type Person,
} from "./graph";
import { relatives } from "./projection";

const person = (
  id: string,
  parents: string[] = [],
  partners: string[] = [],
): Person => ({ id, name: id, lineage: id, parents, partners });

//   A   B        M   N      two founding couples,
//    \ /          \ /       their children C and P marry,
//     C —— P       P         and D is the child of that marriage
//        \ /
//         D
const graph = buildGraph([
  person("A", [], ["B"]),
  person("B", [], ["A"]),
  person("M", [], ["N"]),
  person("N", [], ["M"]),
  person("C", ["A", "B"], ["P"]),
  person("S", ["A", "B"]),
  person("P", ["M", "N"], ["C"]),
  person("D", ["C", "P"]),
]);

const shown = (focus: string): string[] => [...relatives(graph, focus)].sort();

describe("relatives", () => {
  it("follows both parents up, not just one", () => {
    expect(shown("D")).toEqual(expect.arrayContaining(["A", "B", "M", "N"]));
  });

  it("shows the partner but not the family the partner came from", () => {
    expect(shown("C")).toEqual(["A", "B", "C", "D", "P", "S"]);
  });

  it("shows the partners of the rest of the branch, to point at next", () => {
    expect(shown("S")).toContain("P");
  });

  it("keeps a partner's parents once they are the focus", () => {
    expect(shown("P")).toEqual(expect.arrayContaining(["M", "N"]));
  });
});

describe("childrenOfCouple", () => {
  it("is what the two had together", () => {
    expect(childrenOfCouple(graph, "C", "P")).toEqual(["D"]);
  });

  it("leaves out a child only one of them has", () => {
    expect(childrenOfCouple(graph, "A", "M")).toEqual([]);
  });
});

describe("subgraph", () => {
  it("forgets parents that were left out", () => {
    const branch = subgraph(graph, new Set(["C", "D"]));
    expect(rootsOf(branch)).toEqual(["C"]);
    expect(childrenOf(branch, "C")).toEqual(["D"]);
  });

  it("forgets partners that were left out", () => {
    const branch = subgraph(graph, new Set(["C", "D"]));
    expect(branch.people.get("C")?.partners).toEqual([]);
  });
});
