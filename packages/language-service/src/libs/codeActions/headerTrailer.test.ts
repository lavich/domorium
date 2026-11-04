import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type { Diagnostic, Position, TextEdit } from "../../types";

const HEADER = "0 HEAD\n1 GEDC\n2 VERS 7.0\n";

function offsetOf(text: string, position: Position): number {
  const parts = text.split(/(\r\n|\n\r|\r|\n)/u);
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    offset += parts[line * 2].length + parts[line * 2 + 1].length;
  }
  return offset + position.character;
}

function apply(text: string, edit: TextEdit): string {
  return (
    text.slice(0, offsetOf(text, edit.range.start)) +
    edit.newText +
    text.slice(offsetOf(text, edit.range.end))
  );
}

function actionsFor(text: string, wanted: (diagnostic: Diagnostic) => boolean) {
  const service = new GedcomLanguageService(text, 1);
  const diagnostic = service.getDiagnostics().find(wanted)!;
  const actions = service.getCodeActions(diagnostic.range, [diagnostic], 1);
  return {
    diagnostic,
    service,
    actions: Array.isArray(actions) ? actions : [],
  };
}

const lacksTrailer = (diagnostic: Diagnostic) =>
  diagnostic.data?.missingTag === "TRLR";
const lacksHeader = (diagnostic: Diagnostic) =>
  diagnostic.data?.missingHeader === true;

describe("Add trailer", () => {
  it("writes the trailer after the last line", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 NAME A /B/\n`;
    const { actions } = actionsFor(text, lacksTrailer);

    expect(actions.map(({ title }) => title)).toEqual(["Add trailer"]);
    expect(actions[0].edit).toEqual({
      version: 1,
      edits: [
        {
          range: {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 0 },
          },
          newText: "0 TRLR\n",
        },
      ],
    });
  });

  it("starts a new line first when the last line has no terminator", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 NAME A /B/`;
    const { actions } = actionsFor(text, lacksTrailer);

    expect(actions[0].edit?.edits[0]).toEqual({
      range: {
        start: { line: 4, character: 12 },
        end: { line: 4, character: 12 },
      },
      newText: "\n0 TRLR\n",
    });
  });

  it("writes it after blank lines at the end of the text", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 NAME A /B/\n\n\n`;
    const { actions } = actionsFor(text, lacksTrailer);

    expect(actions[0].edit?.edits[0]).toEqual({
      range: {
        start: { line: 7, character: 0 },
        end: { line: 7, character: 0 },
      },
      newText: "0 TRLR\n",
    });
  });

  it("uses the terminator the document uses", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 NAME A /B/`.replaceAll("\n", "\r\n");
    const { actions } = actionsFor(text, lacksTrailer);

    expect(actions[0].edit?.edits[0].newText).toBe("\r\n0 TRLR\r\n");
  });

  it("writes only the trailer after a last line that has its terminator", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 NAME A /B/\n`.replaceAll(
      "\n",
      "\r\n",
    );
    const { actions } = actionsFor(text, lacksTrailer);

    expect(actions[0].edit?.edits[0].newText).toBe("0 TRLR\r\n");
  });

  it("is not offered for a diagnostic the document no longer has", () => {
    const text = `${HEADER}0 TRLR\n`;
    const service = new GedcomLanguageService(text, 1);
    const stale: Diagnostic = {
      code: "VAL002",
      message: "Missing required tag TRLR in root",
      data: { missingTag: "TRLR" },
      range: {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 10 },
      },
      severity: "error",
    };

    expect(service.getCodeActions(stale.range, [stale], 1)).toEqual([]);
  });
});

describe("Add a GEDCOM 7.0 header", () => {
  const noHeader = "0 @I1@ INDI\n0 TRLR\n";

  it("writes the header before the first record", () => {
    const { actions } = actionsFor(noHeader, lacksHeader);

    expect(actions.map(({ title }) => title)).toEqual([
      "Add a GEDCOM 7.0 header",
    ]);
    expect(actions[0].edit?.edits).toEqual([
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        newText: HEADER,
      },
    ]);
  });

  it("is offered to a request the host widened to the first character", () => {
    const { diagnostic, service } = actionsFor(noHeader, lacksHeader);
    const widened = {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 },
    };

    expect(service.getCodeActions(widened, [diagnostic], 1)).toHaveLength(1);
  });

  it("is not offered to a request on another line", () => {
    const { diagnostic, service } = actionsFor(noHeader, lacksHeader);
    const elsewhere = {
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
    };

    expect(service.getCodeActions(elsewhere, [diagnostic], 1)).toEqual([]);
  });

  it("uses the terminator the document uses", () => {
    const { actions } = actionsFor(
      noHeader.replaceAll("\n", "\r\n"),
      lacksHeader,
    );

    expect(actions[0].edit?.edits[0].newText).toBe(
      HEADER.replaceAll("\n", "\r\n"),
    );
  });

  it("is not offered for a header that names no version", () => {
    const service = new GedcomLanguageService("0 HEAD\n0 TRLR\n", 1);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "VAL012")!;

    expect(service.getCodeActions(diagnostic.range, [diagnostic], 1)).toEqual(
      [],
    );
  });
});

describe("an empty document", () => {
  it("becomes a valid file by applying the header action, then the trailer action", () => {
    let text = "";

    const header = actionsFor(text, lacksHeader).actions;
    text = apply(text, header[0].edit!.edits[0]);
    const trailer = actionsFor(text, lacksTrailer).actions;
    text = apply(text, trailer[0].edit!.edits[0]);

    expect(text).toBe(`${HEADER}0 TRLR\n`);
    expect(new GedcomLanguageService(text, 1).getDiagnostics()).toEqual([]);
  });
});

describe("a request at the edge of an xref", () => {
  it("still gets nothing at its end", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 FAMS @F9@\n0 TRLR\n`;
    const service = new GedcomLanguageService(text, 1);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const atEnd = { start: diagnostic.range.end, end: diagnostic.range.end };

    expect(service.getCodeActions(atEnd, [diagnostic], 1)).toEqual([]);
  });

  it("still gets nothing at its start", () => {
    const text = `${HEADER}0 @I1@ INDI\n1 FAMS @F9@\n0 TRLR\n`;
    const service = new GedcomLanguageService(text, 1);
    const diagnostic = service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const atStart = {
      start: diagnostic.range.start,
      end: diagnostic.range.start,
    };

    expect(service.getCodeActions(atStart, [diagnostic], 1)).toEqual([]);
  });
});
