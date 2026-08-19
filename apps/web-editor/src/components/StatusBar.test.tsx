// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StatusBar } from "./StatusBar";
import type { VersionResolution } from "@domorium/language-service";

import type { DocumentReport } from "@/editor/types";

afterEach(cleanup);

const bar = () => screen.getByRole("contentinfo").textContent ?? "";

// A resolution carries the schema it chose, which the bar never reads.
const supported = {
  kind: "supported",
  version: "5.5.1",
  dialect: "5.5.1",
} as VersionResolution;

const gedcom: DocumentReport = {
  kind: "gedcom",
  status: { line: 11, character: 4, resolution: supported },
  diagnostics: [],
};

describe("what the bar says about the file in front", () => {
  it("states the version, the place in the document and the count", () => {
    render(<StatusBar report={gedcom} />);

    expect(bar()).toContain("GEDCOM 5.5.1");
    expect(bar()).toContain("supported");
    expect(bar()).toContain("Ln 12, Col 5");
    expect(bar()).toContain("0 issues");
  });

  it("says a note is a note and cannot be written", () => {
    render(<StatusBar report={{ kind: "markdown" }} />);

    expect(bar()).toContain("Markdown");
    expect(bar()).toContain("read-only");
    expect(bar()).not.toContain("GEDCOM 5.5.1");
    expect(bar()).not.toContain("issue");
  });

  it("states a photograph's format, its pixels and its size", () => {
    render(
      <StatusBar
        report={{
          kind: "image",
          format: "JPEG",
          bytes: 215_040,
          width: 1024,
          height: 768,
        }}
      />,
    );

    expect(bar()).toContain("JPEG");
    expect(bar()).toContain("1024 × 768");
    expect(bar()).toContain("210 KB");
  });

  // The bytes are read before the browser decodes them.
  it("claims no pixels until the photograph has been decoded", () => {
    render(
      <StatusBar
        report={{
          kind: "image",
          format: "PNG",
          bytes: 2048,
          width: null,
          height: null,
        }}
      />,
    );

    expect(bar()).toContain("PNG");
    expect(bar()).toContain("2 KB");
    expect(bar()).not.toContain("×");
  });

  // A stale version and a stale count are what this bar was reading before.
  it("states only what is true of the window when nothing is open", () => {
    render(<StatusBar report={null} />);

    expect(bar()).toBe("read locally — nothing is uploaded");
  });
});
