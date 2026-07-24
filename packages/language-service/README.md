# gedcom-language-service

Editor-independent GEDCOM language features built on `gedcom-validator`. It can power browser editors, IDE extensions, and note-taking plugins without depending on the Language Server Protocol runtime.

## Install

```bash
npm install gedcom-language-service
```

## Usage

```typescript
import { GedcomLanguageService } from "gedcom-language-service";

const service = new GedcomLanguageService(gedcomText);
const diagnostics = service.getDiagnostics();
```

The service also provides completion, hover, definitions, folding ranges, document symbols, semantic tokens, and indentation hints.
