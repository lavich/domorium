# @domorium/validator

GEDCOM 5.5.1 and 7.0 parser and validator. Parses `.ged` files into an AST and validates structure, cardinality, and payload types against the official GEDCOM specification schemas.

## Install

```bash
npm install @domorium/validator
```

## Usage

```typescript
import { GedcomDocument } from "@domorium/validator";

const doc = new GedcomDocument(gedcomString);
const errors = doc.validate();
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Build library (CJS + ESM + types) |
| `npm run watch` | Build in watch mode |
| `npm test` | Run tests |
| `npm run typecheck` | Type-check without emitting |
| `npm run generate` | Regenerate `g7validation.json` from upstream GEDCOM spec |
