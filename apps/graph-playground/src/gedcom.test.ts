import { describe, expect, it } from "vitest";
import { readGedcom } from "./gedcom";
import { childrenOf, parentsOf, partnersOf, rootsOf } from "./graph";

const file = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Abraham /Simpson/",
  "0 @I2@ INDI",
  "1 NAME Mona /Simpson/",
  "0 @I3@ INDI",
  "1 NAME Homer /Simpson/",
  "0 @I4@ INDI",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 CHIL @I3@",
  "0 TRLR",
  "",
].join("\n");

describe("readGedcom", () => {
  const graph = readGedcom(file);

  it("takes one person per INDI record and no one else", () => {
    expect([...graph.people.keys()]).toEqual(["@I1@", "@I2@", "@I3@", "@I4@"]);
  });

  it("reads the marriage off the family, since the people do not state it", () => {
    expect(partnersOf(graph, "@I1@")).toEqual(["@I2@"]);
    expect(partnersOf(graph, "@I2@")).toEqual(["@I1@"]);
  });

  it("gives a child both of the parents the family names", () => {
    expect(parentsOf(graph, "@I3@")).toEqual(["@I1@", "@I2@"]);
    expect(childrenOf(graph, "@I1@")).toEqual(["@I3@"]);
  });

  it("strips the slashes GEDCOM marks a surname with", () => {
    expect(graph.people.get("@I1@")?.name).toBe("Abraham Simpson");
  });

  it("colours by surname, which is what the slashes were marking", () => {
    expect(graph.people.get("@I1@")?.lineage).toBe("Simpson");
  });

  it("keeps a record that has no NAME, under its xref", () => {
    expect(graph.people.get("@I4@")?.name).toBe("@I4@");
  });

  it("leaves someone no family mentions as a root of their own", () => {
    expect(rootsOf(graph)).toContain("@I4@");
  });
});

describe("readGedcom on a file with nothing to draw", () => {
  it("is empty rather than a failure", () => {
    expect(readGedcom("0 HEAD\n0 TRLR\n").people.size).toBe(0);
  });
});
