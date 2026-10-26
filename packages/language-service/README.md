# @domorium/language-service

[![npm](https://img.shields.io/npm/v/@domorium/language-service)](https://www.npmjs.com/package/@domorium/language-service)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lavich/domorium/blob/main/LICENSE)

Editor-independent GEDCOM language features built on `@domorium/validator`. It can power browser editors, IDE extensions, and note-taking plugins without depending on the Language Server Protocol runtime.

Part of [Domorium](https://github.com/lavich/domorium) — GEDCOM editor tooling for
the browser, Obsidian, VS Code, and JetBrains IDEs.

## Install

```bash
npm install @domorium/language-service
```

## Usage

```typescript
import { GedcomLanguageService } from "@domorium/language-service";

const gedcomText = "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n";

const service = new GedcomLanguageService(gedcomText);
const diagnostics = service.getDiagnostics();
```

The service also provides completion, hover, definitions, folding ranges,
document symbols, semantic tokens, indentation hints, and the edits that retarget
a file a document points at. `getDocument()` returns the parse behind all of it.

## The quick fixes for a pointer that names nothing

`getCodeActions` answers what a reader can do about a diagnostic. For an XREF that
names no record, it offers in this order:

```typescript
const service = new GedcomLanguageService(
  "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 NAME Ada\n0 @F1@ FAM\n1 WIFE @I9@\n0 TRLR\n",
);
const [unresolved] = service
  .getDiagnostics()
  .filter(({ code }) => code === "unresolved-xref");

service.getCodeActions(unresolved.range, [unresolved], 0);
// "Create INDI record @I9@"      — the record the author named, first
// "Replace with @I1@ — Ada"      — only where one candidate is plausibly meant
// "Point at nothing (@VOID@)"    — GEDCOM 7 only, last
```

A replacement appears only where one candidate is nearer to the XREF than every
other and within two edits of it. Where two are equally near, none is offered:
applying the wrong one attaches a record to an unrelated one and the document then
validates clean. Every record of the required type is reachable through completion
inside `@…@` instead, filtered as the reader types.

## The record a pointer names

`getRecordPreview` answers what an XREF points at, so a host can show it where
the reader points — a tooltip, a popover, an LSP hover.

```typescript
const family = new GedcomLanguageService(
  "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 FAMS @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n0 TRLR\n",
);

// Character 9 of line 4 is inside the `@F1@` of `1 FAMS @F1@`.
const preview = family.getRecordPreview(
  { line: 4, character: 9 },
  { maxLines: 24 },
);
// preview.range   — line 5 character 0 through line 6 character 11, the FAM record
// preview.pointer — line 4 characters 7 to 11, the pointer pointed at
// preview.truncated — false; the record fitted in the lines asked for
```

It answers `null` where the position is not on a pointer, where the pointer names
no record in this document, and where the record is declared on the line being
pointed at — there, showing it would tell the reader nothing.

Ranges rather than text: the caller already holds the document, and slicing it is
cheaper than a second copy of the same bytes. `maxLines` is what the host has room
for, and `truncated` says whether the record outran it.

## The date a payload names

`readDate` reads a date payload with the grammar the diagnostics apply, in the
document's own dialect, so a caller that wants a year need not parse the text
again.

```typescript
const service = new GedcomLanguageService("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR");

const date = service.readDate("ABT HEBREW 5761");
// date?.modifier — "ABT"; also CAL, EST, BEF, AFT, BET, FROM, TO, and 5.5.1's INT
// date?.dates   — [{ calendar: "HEBREW", year: 5761 }]
// date?.text    — "ABT HEBREW 5761"

service.readDate("FROM JULIAN 1670 TO 1800")?.dates;
// [{ calendar: "JULIAN", year: 1670 }, { calendar: "GREGORIAN", year: 1800 }]

service.readDate("12 AUG 1401 BCE")?.dates;
// [{ calendar: "GREGORIAN", day: 12, month: "AUG", year: 1401, epoch: "BCE" }]
```

A year is counted in its own calendar and epoch, and is never converted. Each
end of a range or period names its own calendar, as both specifications bind a
calendar to the date after it. A 5.5.1 document answers with the GEDCOM 7
spelling of a calendar, `BCE` for every spelling of its epoch, the later year of
a dual year as `dualYear`, and the text of a phrase as `phrase`.

The payload is read as a date value, whichever field it came from. It answers
`null` wherever `getDiagnostics()` would reject it as one — `32 FEB 2020` among
them — for an empty payload, for a 5.5.1 date in a calendar its schema gives no
months, and for a document that is not checked against a specification: one
whose header names no version, an unsupported version, or a Personal Ancestral
File. A field that takes only an exact date or a period may still be rejected
where `readDate` reads its payload.

## The media a line refers to

`getMediaAt` answers, for one position, the file that line refers to — the
payload as written, how to read it, what the format says the file is, the caption
the author gave it, and the rectangle a multimedia link asks for.

```typescript
const album = new GedcomLanguageService(
  [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "0 @I1@ INDI",
    "1 OBJE @O1@",
    "2 CROP",
    "3 TOP 10",
    "3 LEFT 20",
    "3 HEIGHT 100",
    "3 WIDTH 200",
    "0 @O1@ OBJE",
    "1 FILE media/family.jpg",
    "2 FORM image/jpeg",
    "2 TITL The Simpson family",
    "0 TRLR",
  ].join("\n"),
);

// Character 9 of line 4 is inside the `@O1@` of `1 OBJE @O1@`.
const media = album.getMediaAt({ line: 4, character: 9 });
// media.targetText — "media/family.jpg", as the document wrote it
// media.kind       — "file-relative"; also "http" and "file-absolute"
// media.mediaKind  — "image"; also "audio", "video", "document", "unknown"
// media.title      — "The Simpson family", the caption
// media.crop       — { top: 10, left: 20, height: 100, width: 200 }
// media.range      — line 11 characters 7 to 23, the file's own payload
```

GEDCOM 7 puts `CROP` on the multimedia _link_, so one group photograph
referenced by five people carries five different rectangles and each position
answers with its own. A rectangle is named only where it can be applied: one with
no extent, one written in GEDCOM 5.5.1 — whose specification describes none — and
one on a link to a record carrying several files all answer with the file and no
rectangle, so a host shows the whole image rather than nothing.

It answers `null` where the position names no media, where a pointer resolves to
no record or to a record that is not multimedia, and where a multimedia record
carries no file. `HEAD.FILE` names the transmission rather than media, so it
answers nothing there either.

The answer describes and does not fetch: reading the file, resolving it against a
workspace, reaching the network, and measuring the image stay with the caller. A
rectangle is carried as written even where it names an extent larger than its
image, because the extent of an image is not knowable from the document.
