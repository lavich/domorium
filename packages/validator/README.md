# @domorium/validator

[![npm](https://img.shields.io/npm/v/@domorium/validator)](https://www.npmjs.com/package/@domorium/validator)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lavich/domorium/blob/main/LICENSE)

GEDCOM 5.5.1 and 7.0 parser and validator. Parses `.ged` files into an AST and validates structure, cardinality, and payload types against the official GEDCOM specification schemas.

Part of [Domorium](https://github.com/lavich/domorium) — GEDCOM editor tooling for
the browser, Obsidian, VS Code, and JetBrains IDEs.

## Install

```bash
npm install @domorium/validator
```

## Usage

```typescript
import { GedcomDocument } from "@domorium/validator";

const gedcomString = "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n";

const document = new GedcomDocument().createDocument(gedcomString);
const errors = document.getErrors();
```

## Fragments

A fenced block in a note, an example in documentation, a selection: text that is
part of a document rather than one of its own.

```typescript
const block = new GedcomDocument().createDocument(text, {
  fragment: true,
  dialect: "7.0",
});
```

What goes quiet is what the boundary caused — the header and trailer, a pointer
leaving the text, an extension tag with no `HEAD.SCHMA` to declare it in.
Everything else is still read. `dialect` is needed because a fragment carries no
`HEAD.GEDC.VERS`.

## Diagnostics

`getErrors()` returns `GedcomError[]`:

```typescript
import type { GedcomError, Position, Range } from "@domorium/validator";

interface GedcomError {
  code: string;
  message: string;
  hint?: string;
  data?: { xref?: string; requiredRecordTag?: string; expectedLevel?: number };
  range: Range;
  level: "error" | "warning" | "info";
}
```

| Field     | Type                             | What it holds                                                                                                     |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `code`    | `string`, a `GedcomErrorCode`    | What kind of problem this is. Match on this.                                                                      |
| `message` | `string`                         | Written for a person to read, and rewritten when a clearer wording is found. Do not match on it.                  |
| `hint`    | `string?`                        | Declared for advice alongside the message. Nothing in this package sets it yet, so treat it as absent.            |
| `data`    | object?                          | The structured facts a quick fix is built from, where the diagnostic has any.                                     |
| `range`   | `Range`                          | Zero-based line and character, `end` exclusive, over the smallest text that is wrong — the payload, not the line. |
| `level`   | `"error" \| "warning" \| "info"` | How much it matters.                                                                                              |

`data` is what makes a fix offerable rather than merely reportable: an
unresolved pointer reports the xref that failed and the record tag it needed, so
a host can offer to create that record.

For this file, where `SEX` carries a value its schema does not permit and `FAMC`
points at a record that is not there:

```gedcom
0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Lisa /Simpson/
1 SEX Q
1 FAMC @F9@
0 TRLR
```

`getErrors()` answers:

```json
[
  {
    "code": "VAL005",
    "message": "Value for SEX should be in set [F, M, U, X]",
    "range": {
      "start": { "line": 5, "character": 6 },
      "end": { "line": 5, "character": 7 }
    },
    "level": "error"
  },
  {
    "code": "unresolved-xref",
    "message": "No FAM record carries @F9@",
    "data": { "xref": "@F9@", "requiredRecordTag": "FAM" },
    "range": {
      "start": { "line": 6, "character": 7 },
      "end": { "line": 6, "character": 11 }
    },
    "level": "error"
  }
]
```

Match on `code` rather than on `message`; messages are written for people and
change. `GedcomErrorCode` is exported for this:

```typescript
import { GedcomErrorCode } from "@domorium/validator";

const unresolved = errors.filter(
  (error) => error.code === GedcomErrorCode.UnresolvedXref,
);
```

| Code              | Member                  | Reported when                                                                  |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `VAL001`          | `UnknownTag`            | a tag the schema does not define in this position                              |
| `VAL002`          | `MissingTag`            | a structure the schema requires is absent                                      |
| `VAL003`          | `MissingValue`          | the payload is absent where one is required                                    |
| `VAL004`          | `IncorrectValue`        | the payload does not match its data type                                       |
| `VAL005`          | `ShouldBeSetValue`      | the payload is not one of the permitted values                                 |
| `VAL006`          | `MissingRef`            | a pointer payload that is not written as a pointer                             |
| `VAL007`          | `ManyOccurrences`       | more occurrences than the cardinality allows                                   |
| `VAL008`          | `UndocumentedTag`       | a GEDCOM 7 extension tag with no `HEAD`.`SCHMA` declaration                    |
| `VAL009`          | `DuplicateDeclaration`  | a tag declared more than once in `HEAD`.`SCHMA`                                |
| `VAL010`          | `EmptyEvent`            | an event with neither a payload nor substructures                              |
| `VAL011`          | `UnsupportedVersion`    | the version is one no schema in this package describes                         |
| `VAL012`          | `UndeterminedVersion`   | no version could be read from `HEAD`.`GEDC`.`VERS`                             |
| `VAL013`          | `SubstitutedVersion`    | a version checked against a different version's schema                         |
| `VAL014`          | `ImpossibleDay`         | a date naming a day its calendar does not have, such as `31 FEB`               |
| `VAL015`          | `PersonalAncestralFile` | a header naming `SYST` before `GEDC`, so the file is a Personal Ancestral File |
| `unresolved-xref` | `UnresolvedXref`        | an xref naming no record of the required type                                  |
| `invalid-level`   | `InvalidLevel`          | a level that cannot follow the line above it                                   |
| `LEXER`           | `Lexer`                 | the text could not be tokenized                                                |
| `PARSER`          | `Parser`                | the tokens could not be assembled into a tree                                  |

## Reading the tree

`getNodes()` returns the records — the level-0 nodes — each holding its
substructures in `children`. A node carries its line's tokens in a `tokens` map
keyed by `TokenNames`, and which key holds the text is the thing to get right:

| Token     | Written as    | Holds                                  |
| --------- | ------------- | -------------------------------------- |
| `LEVEL`   | `1`           | The level, as it was written.          |
| `POINTER` | `0 @I1@ INDI` | The xref a record declares for itself. |
| `TAG`     | `1 NAME`      | The tag.                               |
| `XREF`    | `1 FAMC @F1@` | An xref a line points at.              |
| `VALUE`   | `1 NAME Lisa` | A payload that is not a pointer.       |

`POINTER` and `XREF` are the pair worth reading twice: a record's own xref is
never in `XREF`, and a pointer payload is never in `VALUE`.

Pulling every person's name out of a file:

```typescript
import { GedcomDocument, TokenNames } from "@domorium/validator";
import type { ASTNode } from "@domorium/validator";

const document = new GedcomDocument().createDocument(gedcomString);

const payload = (node: ASTNode, tag: string): string | undefined =>
  node.children.find((child) => child.tokens[TokenNames.TAG]?.value === tag)
    ?.tokens[TokenNames.VALUE]?.value;

for (const record of document.getNodes()) {
  if (record.tokens[TokenNames.TAG]?.value !== "INDI") continue;
  console.log({
    xref: record.tokens[TokenNames.POINTER]?.value,
    name: payload(record, "NAME"),
    line: record.range.start.line,
  });
}
```

```text
{ xref: '@I1@', name: 'Lisa /Simpson/', line: 3 }
```

`range` on a node or a token is computed from the offsets on every access, not
stored: a large file has millions of tokens and a stored range costs three
objects apiece. Read it freely at the edges, and use `startOffset` and
`endOffset` inside a loop over the whole document.

## What a document answers

Every method reads the document last given to `createDocument`, which returns
the same instance so the two can be chained.

| Method                               | Answers                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDocument(text, options?)`     | Parses and validates, and returns the document itself.                                                                                                         |
| `getErrors()`                        | Every diagnostic, in the order found.                                                                                                                          |
| `getNodes()`                         | The records, each with its substructures.                                                                                                                      |
| `getVersion()`                       | The version read from `HEAD`.`GEDC`.`VERS`, as written.                                                                                                        |
| `getDialect()`                       | Which rules were applied: `"5.5.1"` or `"7.0"`.                                                                                                                |
| `getVersionResolution()`             | How that was decided — `supported`, `substituted`, `unsupported`, `undetermined`, or `paf` for a file whose header names a writing program before its version. |
| `getLabel(node)`                     | The specification's name for a structure, for a UI to show instead of the tag: `HEAD` answers `Header`.                                                        |
| `getPointerTargetTag(node)`          | The record tag a pointer line must name: `FAMC` answers `FAM`.                                                                                                 |
| `isRecordDeclaration(node)`          | Whether the node declares a record other lines can point at.                                                                                                   |
| `getCompletions(position, lineText)` | What may be written at a position — `{ label, kind: "tag" \| "enum" \| "pointer", detail? }`.                                                                  |

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run build`     | Build library (CJS + ESM + types)                        |
| `npm run watch`     | Build in watch mode                                      |
| `npm test`          | Run tests                                                |
| `npm run typecheck` | Type-check without emitting                              |
| `npm run generate`  | Regenerate `g7validation.json` from upstream GEDCOM spec |
