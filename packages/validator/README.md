# @domorium/validator

[![npm](https://img.shields.io/npm/v/@domorium/validator)](https://www.npmjs.com/package/@domorium/validator)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lavich/domorium/blob/main/LICENSE)

GEDCOM 5.5.1 and 7.0 parser and validator. Parses `.ged` files into an AST and validates structure, cardinality, and payload types against the official GEDCOM specification schemas. Application-defined extension tags (`_XXXX`) are accepted, and GEDCOM 7 documents that declare them in `HEAD.SCHMA` get their URIs resolved for tooling.

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

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run build`     | Build library (CJS + ESM + types)                        |
| `npm run watch`     | Build in watch mode                                      |
| `npm test`          | Run tests                                                |
| `npm run typecheck` | Type-check without emitting                              |
| `npm run generate`  | Regenerate `g7validation.json` from upstream GEDCOM spec |
