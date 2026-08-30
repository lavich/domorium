# Domorium — TODO

Near-term work. Longer-range directions live in [docs/roadmap.md](docs/roadmap.md).

## Priority: Low

- [ ] **Incremental re-parse** — an edit re-parses and revalidates the whole
      document, which is what makes a large file freeze the CodeMirror hosts.
      See [#210](https://github.com/lavich/domorium/issues/210).

## packages/validator

Outstanding tasks specific to the validator/schema layer (`rule-node.ts` and the GEDCOM schema data), moved here from the priority sections above.

- [ ] **Schema: type-FilePath** — verify coverage of the `type-FilePath` URI (`type-Date#exact` is now covered, see Date/DatePeriod validation above).

- [ ] **Web link validation** — check that URL-shaped values (e.g. `OBJE.FILE`) are well-formed URLs. Dates are already validated; this is the other half of the old "Validation of Dates and Web Links" README item.
