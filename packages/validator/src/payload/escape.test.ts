import { describe, expect, it } from "vitest";

import { escapePayload, unescapePayload } from "./escape";

describe("escaping a text payload", () => {
  it("doubles every at sign in 5.5.1", () => {
    expect(escapePayload("a@b", "5.5.1", "text")).toBe("a@@b");
    expect(unescapePayload("a@@b", "5.5.1", "text")).toBe("a@b");
  });

  it("doubles only a leading at sign in 7.0", () => {
    expect(escapePayload("a@b", "7.0", "text")).toBe("a@b");
    expect(escapePayload("@home", "7.0", "text")).toBe("@@home");
    expect(unescapePayload("@@home", "7.0", "text")).toBe("@home");
  });

  it("doubles the leading at sign of every line in 7.0", () => {
    expect(escapePayload("me@x\n@me and @I", "7.0", "text")).toBe(
      "me@x\n@@me and @I",
    );
    expect(unescapePayload("me@x\n@@me and @I", "7.0", "text")).toBe(
      "me@x\n@me and @I",
    );
  });

  it.each(["7.0", "5.5.1"] as const)(
    "reads back what it wrote in %s",
    (dialect) => {
      for (const value of ["@", "@@", "@@x", "a@", "@a@b@", "x\n@y\n@@z", ""]) {
        expect(
          unescapePayload(
            escapePayload(value, dialect, "text"),
            dialect,
            "text",
          ),
        ).toBe(value);
      }
    },
  );
});

describe("a payload whose own grammar uses the at sign", () => {
  it.each(["pointer", "date", "date-period", "date-exact", "age"] as const)(
    "is written as given for %s",
    (kind) => {
      for (const dialect of ["5.5.1", "7.0"] as const) {
        expect(escapePayload("@S1@", dialect, kind)).toBe("@S1@");
        expect(escapePayload("@#DJULIAN@ 3 MAR 1721", dialect, kind)).toBe(
          "@#DJULIAN@ 3 MAR 1721",
        );
        expect(unescapePayload("@#DJULIAN@ 3 MAR 1721", dialect, kind)).toBe(
          "@#DJULIAN@ 3 MAR 1721",
        );
      }
    },
  );

  it("reads a 5.5.1 text-or-pointer as a pointer when it is one", () => {
    expect(unescapePayload("@N1@", "5.5.1", "text-or-pointer")).toBe("@N1@");
    expect(unescapePayload("a@@b", "5.5.1", "text-or-pointer")).toBe("a@b");
  });
});
