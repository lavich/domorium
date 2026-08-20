import { describe, expect, it } from "vitest";
import { parseCardinality } from "../validator/validate";
import g551validationJson from "./g551validation.json";
import g7validationJson from "./g7validation.json";
import { GedcomScheme, GedcomTag } from "./schema-types";

const schemes: [string, GedcomScheme][] = [
  ["g7validation.json", g7validationJson],
  ["g551validation.json", g551validationJson],
];

describe.each(schemes)("%s", (_name, scheme) => {
  it("has all required sections", () => {
    expect(scheme).toHaveProperty("calendar");
    expect(scheme).toHaveProperty("label");
    expect(scheme).toHaveProperty("payload");
    expect(scheme).toHaveProperty("set");
    expect(scheme).toHaveProperty("substructure");
    expect(scheme).toHaveProperty("tag");
    expect(scheme).toHaveProperty("tagInContext");
  });

  it("writes every substructure cardinality in the form the validator reads", () => {
    const unreadable = Object.entries(scheme.substructure).flatMap(
      ([parent, tags]) =>
        Object.entries(tags)
          .filter(([, rule]) => parseCardinality(rule.cardinality) === null)
          .map(([tag, rule]) => `${parent} > ${tag}: ${rule.cardinality}`),
    );
    expect(unreadable).toEqual([]);
  });

  it("describes the payload of every substructure it permits", () => {
    const undescribed = Object.entries(scheme.substructure).flatMap(
      ([parent, tags]) =>
        Object.entries(tags)
          .filter(([, rule]) => !(rule.type in scheme.payload))
          .map(([tag, rule]) => `${parent} > ${tag}: ${rule.type}`),
    );
    expect(undescribed).toEqual([]);
  });

  it("points every payload target at a described type", () => {
    const dangling = Object.entries(scheme.payload)
      .filter(
        ([, payload]) =>
          payload.to !== undefined && !(payload.to in scheme.payload),
      )
      .map(([type, payload]) => `${type} to ${payload.to}`);
    expect(dangling).toEqual([]);
  });

  it("points every payload set at a declared set", () => {
    const dangling = Object.entries(scheme.payload)
      .filter(
        ([, payload]) =>
          payload.set !== undefined && !(payload.set in scheme.set),
      )
      .map(([type, payload]) => `${type} set ${payload.set}`);
    expect(dangling).toEqual([]);
  });

  it("names the tag of every payload type", () => {
    const untagged = Object.keys(scheme.payload).filter(
      (type) => !(type in scheme.tag),
    );
    expect(untagged).toEqual([]);
  });

  it("labels every payload type", () => {
    const unlabelled = Object.keys(scheme.payload).filter(
      (type) => !(type in scheme.label),
    );
    expect(unlabelled).toEqual([]);
  });

  it("resolves every type in tagInContext.struct against payload", () => {
    const unresolved = Object.entries(scheme.tagInContext.struct).flatMap(
      ([context, children]) => [
        // Both schemes key the document root as "", which names no structure.
        ...(context === "" || context in scheme.payload ? [] : [context]),
        ...Object.keys(children)
          .filter((child) => !(child in scheme.payload))
          .map((child) => `${context} > ${child}`),
      ],
    );
    expect(unresolved).toEqual([]);
  });

  it("gives every calendar a type of its own and a month tag once", () => {
    const calendars = Object.entries(scheme.calendar);
    const types = calendars.map(([, calendar]) => calendar.type);

    expect(new Set(types).size).toBe(types.length);
    expect(calendars.filter(([, calendar]) => !calendar.type)).toEqual([]);
    for (const [, calendar] of calendars) {
      const months = Object.values(calendar.months);
      expect(new Set(months).size).toBe(months.length);
    }
  });
});

// #207 asked whether 5.5.1 and 7.0 really share their month vocabularies before
// anything read one table for both. They share every month of every calendar
// both describe; what they do not share is the spelling of the French
// Republican calendar itself — `FRENCH R` in 5.5.1, `FRENCH_R` in 7.0 — and
// 5.5.1's ROMAN and UNKNOWN, which 7.0 dropped.
describe("the calendars the two schemes share", () => {
  const shared = Object.keys(g551validationJson.calendar).filter(
    (name) => name in g7validationJson.calendar,
  );

  it("is every 5.5.1 calendar but FRENCH R, ROMAN and UNKNOWN", () => {
    expect(shared).toEqual(["GREGORIAN", "HEBREW", "JULIAN"]);
  });

  it.each(["GREGORIAN", "HEBREW", "JULIAN", "FRENCH R"])(
    "gives %s the months 7.0 gives it",
    (name) => {
      const scheme: GedcomScheme = g551validationJson;
      const in7 = name === "FRENCH R" ? "FRENCH_R" : name;

      expect(Object.keys(scheme.calendar[GedcomTag(name)].months)).toEqual(
        Object.keys(g7validationJson.calendar[GedcomTag(in7)].months),
      );
    },
  );
});
