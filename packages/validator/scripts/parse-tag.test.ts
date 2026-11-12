import { describe, expect, it } from "vitest";
import { parseTagLabel } from "./parse-tag.js";

describe("parseTagLabel", () => {
  it("reads the uri and the single-quoted label", () => {
    const yaml = [
      "%YAML 1.2",
      "---",
      "lang: en-US",
      "",
      "type: structure",
      "",
      "uri: https://gedcom.io/terms/v7/HEAD-SOUR-DATA",
      "",
      "standard tag: 'DATA'",
      "",
      "label: '(deprecated) Data'",
    ].join("\n");
    expect(parseTagLabel(yaml)).toEqual({
      uri: "https://gedcom.io/terms/v7/HEAD-SOUR-DATA",
      label: "(deprecated) Data",
    });
  });

  it("unescapes a doubled quote inside the label", () => {
    const yaml = "uri: https://example.com/X\nlabel: 'Father''s Name'\n";
    expect(parseTagLabel(yaml)?.label).toBe("Father's Name");
  });

  it("returns nothing for a tag the specification leaves unlabelled", () => {
    const yaml = "uri: https://gedcom.io/terms/v7/AFN\nstandard tag: 'AFN'\n";
    expect(parseTagLabel(yaml)).toBeUndefined();
  });
});
