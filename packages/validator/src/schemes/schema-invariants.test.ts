import { describe, expect, it } from "vitest";
import { parseCardinality } from "../validator/validate";
import g551validationJson from "./g551validation.json";
import g7validationJson from "./g7validation.json";
import { GedcomScheme } from "./schema-types";

const schemes: [string, GedcomScheme][] = [
  ["g7validation.json", g7validationJson],
  ["g551validation.json", g551validationJson],
];

describe.each(schemes)("%s", (_name, scheme) => {
  it("has all required sections", () => {
    // g551 declares `calendar` empty until #207 fills it, so a section holds
    // by being present, not by being populated.
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
});
