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

The service also provides completion, hover, definitions, folding ranges, document symbols, semantic tokens, and indentation hints.

`getDocumentSymbols()` labels a record with what a reader would call it — the
name of a person, the title of a source — where the format gives it one.
`name` stays the tag, so a consumer rendering it is unaffected.

`getDocument()` returns the parsed `GedcomDocument` the answers above are derived
from, for a question this package does not answer — its nodes, its errors, its
version, its labels. Reading it costs nothing; the parse has already happened.
