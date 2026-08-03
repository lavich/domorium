# Domorium — TODO

Near-term work. Longer-range directions live in [docs/roadmap.md](docs/roadmap.md).

## Priority: Low

- [ ] **`updateDocument()`** — implement partial/incremental update instead of full re-parse (currently a stub at `gedcomDocument.ts:66`).

## packages/validator

Outstanding tasks specific to the validator/schema layer (`rule-node.ts` and the GEDCOM schema data), moved here from the priority sections above.

- [ ] **Extension Tags (\_XXXX)** — support custom tags via `_TAG` with optional schema from `SCHMA`. Currently any `_TAG` is reported as `Unknown tag` (e.g. `_SKYPEID`, `_JABBERID` in `maximal70.ged`), even though `_`-prefixed tags are legal application-defined extensions per the GEDCOM spec.

- [ ] **Schema: type-FilePath** — verify coverage of the `type-FilePath` URI (`type-Date#exact` is now covered, see Date/DatePeriod validation above).

- [ ] **Web link validation** — check that URL-shaped values (e.g. `OBJE.FILE`) are well-formed URLs. Dates are already validated; this is the other half of the old "Validation of Dates and Web Links" README item.
