import { describe, expect, it } from "vitest";
import { ConfigurableLexer } from "../parser/lexer";
import { buildAst } from "../parser/ast";
import { GedcomTag } from "../schemes/schema-types";
import {
  collectExtensions,
  isExtensionTag,
  parseTagDef,
  ExtensionErrorCode,
} from "./extensions";

const astBuilder = (text: string) => {
  const lexingResult = new ConfigurableLexer({ zeroBased: true }).tokenize(
    text,
  );
  return buildAst(lexingResult.tokens, text);
};

describe("isExtensionTag", () => {
  it("recognizes the underscore prefix", () => {
    expect(isExtensionTag("_SKYPEID")).toBe(true);
    expect(isExtensionTag("NAME")).toBe(false);
  });
});

describe("parseTagDef", () => {
  it("splits a declaration into tag and URI", () => {
    expect(parseTagDef("_SKYPEID http://xmlns.com/foaf/0.1/skypeID")).toEqual({
      tag: "_SKYPEID",
      uri: "http://xmlns.com/foaf/0.1/skypeID",
    });
  });

  it("rejects a tag without the underscore prefix", () => {
    expect(parseTagDef("SKYPEID http://example.com/x")).toBeNull();
  });

  it("rejects a lowercase tag", () => {
    expect(parseTagDef("_skypeid http://example.com/x")).toBeNull();
  });

  it("rejects a declaration with no URI", () => {
    expect(parseTagDef("_SKYPEID")).toBeNull();
  });

  it("rejects a relative URI", () => {
    expect(parseTagDef("_SKYPEID /terms/skypeID")).toBeNull();
  });

  it("rejects a bare underscore", () => {
    expect(parseTagDef("_ http://example.com/x")).toBeNull();
  });
});

describe("collectExtensions", () => {
  it("maps every tag declared in HEAD.SCHMA to its URI", () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID
2 TAG _JABBERID http://xmlns.com/foaf/0.1/jabberID
0 TRLR
`);

    const { context, errors } = collectExtensions(nodes, true);

    expect(errors).toEqual([]);
    expect(context.requireDeclaration).toBe(true);
    expect(context.tags.get(GedcomTag("_SKYPEID"))).toBe(
      "http://xmlns.com/foaf/0.1/skypeID",
    );
    expect(context.tags.get(GedcomTag("_JABBERID"))).toBe(
      "http://xmlns.com/foaf/0.1/jabberID",
    );
  });

  it("returns an empty registry when the document has no SCHMA", () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
0 TRLR
`);

    const { context, errors } = collectExtensions(nodes, true);

    expect(errors).toEqual([]);
    expect(context.tags.size).toBe(0);
  });

  it("reports a tag declared twice and keeps the first URI", () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG _X http://example.com/first
2 TAG _X http://example.com/second
0 TRLR
`);

    const { context, errors } = collectExtensions(nodes, true);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(ExtensionErrorCode.DuplicateDeclaration);
    expect(errors[0].level).toBe("warning");
    expect(context.tags.get(GedcomTag("_X"))).toBe("http://example.com/first");
  });

  it("skips a malformed declaration without reporting it", () => {
    const { nodes } = astBuilder(`0 HEAD
1 GEDC
2 VERS 7.0
1 SCHMA
2 TAG nonsense
0 TRLR
`);

    const { context, errors } = collectExtensions(nodes, true);

    expect(errors).toEqual([]);
    expect(context.tags.size).toBe(0);
  });
});
