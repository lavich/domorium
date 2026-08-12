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

Text that is part of a document rather than one of its own — a fenced block in a
note, an example in documentation, a selection — is missing a header and a
trailer by nature, and should not be told so.

```typescript
const block = new GedcomDocument().createDocument(text, {
  fragment: true,
  dialect: "7.0",
});
```

`dialect` is required in practice: a fragment carries no `HEAD.GEDC.VERS`, and
without one there are no rules to read it by. What goes quiet is what the
boundary caused — the header and trailer it cannot have, a pointer leaving the
text, an extension tag with no `HEAD.SCHMA` to declare it in. Everything else
still applies: an unknown tag, a payload of the wrong type, a level that cannot
follow the line above.

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

`data` carries the facts a quick fix is built from — which xref failed to
resolve, and what record tag it needed.

Match on `code` rather than on `message`; messages are written for people and
change. `GedcomErrorCode` is exported for this:

```typescript
import { GedcomErrorCode } from "@domorium/validator";

const unresolved = errors.filter(
  (error) => error.code === GedcomErrorCode.UnresolvedXref,
);
```

| Code              | Member                 | Reported when                                               |
| ----------------- | ---------------------- | ----------------------------------------------------------- |
| `VAL001`          | `UnknownTag`           | a tag the schema does not define in this position           |
| `VAL002`          | `MissingTag`           | a structure the schema requires is absent                   |
| `VAL003`          | `MissingValue`         | the payload is absent where one is required                 |
| `VAL004`          | `IncorrectValue`       | the payload does not match its data type                    |
| `VAL005`          | `ShouldBeSetValue`     | the payload is not one of the permitted values              |
| `VAL006`          | `MissingRef`           | a pointer payload that is not written as a pointer          |
| `VAL007`          | `ManyOccurrences`      | more occurrences than the cardinality allows                |
| `VAL008`          | `UndocumentedTag`      | a GEDCOM 7 extension tag with no `HEAD`.`SCHMA` declaration |
| `VAL009`          | `DuplicateDeclaration` | a tag declared more than once in `HEAD`.`SCHMA`             |
| `VAL010`          | `EmptyEvent`           | an event with neither a payload nor substructures           |
| `unresolved-xref` | `UnresolvedXref`       | an xref naming no record of the required type               |
| `invalid-level`   | `InvalidLevel`         | a level that cannot follow the line above it                |
| `LEXER`           | `Lexer`                | the text could not be tokenized                             |
| `PARSER`          | `Parser`               | the tokens could not be assembled into a tree               |

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run build`     | Build library (CJS + ESM + types)                        |
| `npm run watch`     | Build in watch mode                                      |
| `npm test`          | Run tests                                                |
| `npm run typecheck` | Type-check without emitting                              |
| `npm run generate`  | Regenerate `g7validation.json` from upstream GEDCOM spec |
