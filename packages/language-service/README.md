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
