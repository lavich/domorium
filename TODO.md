# Domorium — Roadmap

## Priority: High

- [ ] **CI** — verify GitHub Actions pass (lint, typecheck, test).

## Priority: Low

- [ ] **`updateDocument()`** — implement partial/incremental update instead of full re-parse (currently a stub at `gedcomDocument.ts:66`).

## packages/validator

Outstanding tasks specific to the validator/schema layer (`rule-node.ts` and the GEDCOM schema data), moved here from the priority sections above.

- [ ] **Extension Tags (_XXXX)** — support custom tags via `_TAG` with optional schema from `SCHMA`. Currently any `_TAG` is reported as `Unknown tag` (e.g. `_SKYPEID`, `_JABBERID` in `maximal70.ged`), even though `_`-prefixed tags are legal application-defined extensions per the GEDCOM spec.

- [ ] **Schema: type-FilePath** — verify coverage of the `type-FilePath` URI (`type-Date#exact` is now covered, see Date/DatePeriod validation above).

- [ ] **Web link validation** — check that URL-shaped values (e.g. `OBJE.FILE`) are well-formed URLs. Dates are already validated; this is the other half of the old "Validation of Dates and Web Links" README item.

## apps/vscode

Editor-facing features for the extension (LSP capabilities and webview UI), merged here from the "Planned Features" lists in `README.md` and `apps/vscode/README.md` — those lists are now removed from both READMEs to keep a single roadmap source.

- [ ] **LSP: autocomplete** — suggest tags and enum values based on the schema (`completionProvider`).

- [ ] **File Structure Tree** — view the GEDCOM file as a hierarchical outline (`documentSymbolProvider`).

- [ ] **Hover Preview for Links** — show an image or page preview when hovering over a URL value.

- [ ] **Clickable Local File Links** — open local file paths referenced in `FILE` values directly from the editor.

- [ ] **Import/Export Gzip Archive** — compress/extract `.gdz` GEDCOM archives.

- [ ] **Customizable Configuration** — user-tweakable extension settings.

- [ ] **Command Palette Integration** — expose commands via the VS Code command palette.

- [ ] **Localization of Descriptions and Errors** — multi-language support for messages/errors.

- [ ] **Forms Page View** — editable webview forms for individuals and families, including cross-references between records.

- [ ] **Map View** — display locations of events (birth, marriage, death, ...) on a map.

- [ ] **Timeline View** — visual timeline of all events in chronological order.

- [ ] **Advanced Text Editor (Markdown)** — rich Markdown editing for notes/documentation fields.

- [ ] **Export Dates to iCalendar (.ics)** — generate calendar files from event dates for import into Google Calendar, Outlook, etc.

## Ecosystem / Future Packages

New workspace packages/apps, not fixes to existing code — each would be its own `packages/*` or `apps/*` member of this monorepo.

- [ ] **Prettier plugin** — GEDCOM formatter for Prettier, using the existing chevrotain parser/AST as the `parse` step. A shared `packages/formatter` core (see below) would let this and the native LSP formatter reuse the same printing logic instead of duplicating it.

- [ ] **Monaco editor integration** — `packages/lsp` is already a generic LSP server, and `apps/vscode` already builds a browser bundle of it (`browser` entry, `@vscode/test-web`). Wiring it up to Monaco via `monaco-languageclient` should be cheap — no validator/server rewrite needed.

- [ ] **JetBrains/IntelliJ plugin** — consider **LSP4IJ** (a generic LSP client for IntelliJ) instead of a from-scratch custom plugin. That would reduce this to LSP4IJ configuration pointing at the existing `packages/lsp` server, rather than reimplementing hover/definition/diagnostics for the JetBrains platform.

- [ ] **Family tree visualization in Excalidraw** — render a visual tree (or export an Excalidraw scene) from a parsed GEDCOM document, walking FAMC/FAMS/HUSB/WIFE/CHIL pointers already resolved via `pointers` map in the AST.

- [ ] **CLI validator/linter** — thin wrapper over `packages/validator` (e.g. `npx domorium lint file.ged`), for use in scripts/CI outside any editor.

- [ ] **GitHub Action** — wraps the CLI above to lint `.ged` files in other repositories' CI pipelines.

- [ ] **Neovim / Sublime / Zed LSP client config** — since `packages/lsp` is a generic LSP server, supporting these editors is mostly client configuration/documentation (e.g. an `nvim-lspconfig` entry), much cheaper than a bespoke editor plugin.

- [ ] **Web playground** — paste-a-GEDCOM-see-live-diagnostics demo page, reusing the same in-browser LSP bundle `apps/vscode` already produces. Good for demos/marketing; could also host the Monaco integration above.

- [ ] **`packages/formatter`** — shared GEDCOM pretty-printing core, reused by the Prettier plugin and by a native `documentFormattingProvider` capability in `packages/lsp` (not currently in the LSP capabilities list).

- [ ] **GEDCOM diff/merge tool** — compare two `.ged` files and visualize differences; pairs naturally with the Excalidraw tree visualization above (e.g. highlight conflicting FAMC across two sources for the same person).
