# Domorium — Roadmap

## Priority: High

- [ ] **Date/DatePeriod validation** — implement format checks for dates (exact: `1 APR 1911`, `GREGORIAN 1 APR 1911 BCE`), ranges (`FROM 1900 TO 1910`, `BET 1900 AND 1910`), modifiers (`AFT`, `BEF`, `ABT`, `CAL`, `EST`). Currently `case "date"` and `case "date-period"` in `rule-node.ts:192-194` are empty stubs.

- [x] **XREF pointer resolution** — verify all `@XREF@` point to existing records (detect dangling pointers). Implemented in `rule-node.ts` (`case "pointer"`).

- [x] **Continuation (CONC/CONT)** — support multi-line values. Added `resolveValue()` in `visitor.ts` which follows `CONT`/`CONC` children (new line / direct concatenation) and is used by `rule-node.ts` for value validation; `validate.ts` no longer reports `CONT`/`CONC` as unknown tags.

- [ ] **Tests for Date, Age, PersonalName, MediaType, CONC/CONT** — expand coverage.

- [ ] **CI** — verify GitHub Actions pass (lint, typecheck, test).

## Priority: Medium

- [x] **Age validation** — format `35y 11m 8w 21d` with ageBound (`<`, `>`). Implemented in `rule-node.ts` (`case "age"`, `AGE_REGEXP`), covers v7 `type-Age` and v5.5.1 `type-AGE_AT_EVENT`.

- [ ] **PersonalName validation** — format `John /Doe/` (nameStr with slashes for surname).

- [ ] **MediaType validation** — MIME type `type/subtype; parameters=` from ABNF.

- [ ] **Extension Tags (_XXXX)** — support custom tags via `_TAG` with optional schema from `SCHMA`.

- [ ] **Schema: type-Age URI** — add `https://gedcom.io/terms/v7/type-Age` to `g7validation.json` and implement validation.

- [ ] **LSP: autocomplete** — suggest tags and enum values based on the schema (`completionProvider`).

- [x] **LSP: go-to-definition** — jump from `@XREF@` to the record definition (`definitionProvider`). Implemented in `packages/lsp/src/libs/definition/definition.ts` + wired up in `createServer.ts`.

- [ ] **LSP: hover** — show label/tooltip from the schema when hovering over a TAG (e.g., `BIRT` → "Birth").

## Priority: Low

- [ ] **Latitude/Longitude validation** — formats `N90.0000` / `E180.0000` from ABNF.

- [ ] **Language-Tag validation** — RFC 5646 (language tags).

- [ ] **Schema: type-FilePath, type-Date#exact** — verify coverage of all URIs.

- [ ] **`updateDocument()`** — implement partial/incremental update instead of full re-parse (currently a stub at `gedcomDocument.ts:66`).
