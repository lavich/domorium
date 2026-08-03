# @gedcom/language-service

Editor-independent GEDCOM language features built on `@gedcom/validator`. It can power browser editors, IDE extensions, and note-taking plugins without depending on the Language Server Protocol runtime.

## Install

```bash
npm install @gedcom/language-service
```

## Usage

```typescript
import { GedcomLanguageService } from "@gedcom/language-service";

const gedcomText = "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n";

const service = new GedcomLanguageService(gedcomText);
const diagnostics = service.getDiagnostics();
```

The service also provides completion, hover, definitions, folding ranges, document symbols, semantic tokens, and indentation hints.
