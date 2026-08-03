# GEDCOM — Roadmap

Where this project could go. These are directions, not commitments: nothing here is
scheduled, sized, or assigned, and an item may sit untouched for a long time or be
dropped without ceremony.

Near-term work lives in [TODO.md](../TODO.md). Decisions already made live in
[docs/adr/](adr/), and the structure they produced is described in
[docs/architecture.md](architecture.md).

## Shared Semantic Model

Reusable domain layers for editor features, visualizations, automation, and AI integrations. Views should consume these packages instead of rebuilding genealogy logic in each app.

- **`packages/query`** — compact, typed queries over people, families, events, places, sources, media, and resolved XREF relationships. Include search, ancestors, descendants, spouses, siblings, and relationship paths without exposing the raw parser AST.

- **`packages/graph`** — build a semantic genealogy graph from the AST and pointer indexes. Keep layout coordinates outside GEDCOM so Tree, Graph, Timeline, Map, Excalidraw, and print renderers can share one source of truth.

- **Unified View Model** — define stable DTOs for people, families, events, evidence, diagnostics, statistics, and relationships. Use the same projection layer in VS Code, the web editor, Obsidian, JetBrains, and future packages.

- **`packages/mutations`** — semantic editing operations such as create person/family, add event, link relatives, and remove relationships. Operations must preserve reciprocal pointers, reject cycles/collisions, format the result, and revalidate it.

- **Evidence-aware Facts** — represent a genealogical claim together with its sources, conflicting values, and confidence state instead of flattening uncertain evidence into one value.

## Editor Views

Editor-facing features shared by VS Code and other LSP clients where possible.

- **Symbol Explorer** — group people, families, sources, media, notes, and places into a domain-oriented outline rather than the existing syntax-oriented document tree.

- **Relationship Explorer** — show the selected person's parents, spouses, children, siblings, ancestors, and descendants without requiring a full tree visualization.

- **Pointer Graph / Call Hierarchy** — visualize declarations, outgoing GEDCOM pointers, incoming references, and relationship paths for debugging complex records.

- **Hover Preview for Links** — show an image or page preview when hovering over a URL value.

- **Import/Export Gzip Archive** — compress/extract `.gdz` GEDCOM archives.

- **Customizable Configuration** — user-tweakable extension settings.

- **Command Palette Integration** — expose commands via the VS Code command palette.

- **Localization of Descriptions and Errors** — multi-language support for messages/errors.

- **Forms Editor** — editable forms for people, families, events, sources, and media, backed by semantic mutations and preserving GEDCOM source fidelity.

- **Family Tree Views** — render vertical, horizontal, radial, and fan-chart layouts from the shared semantic graph.

- **Map View** — display event locations and migration paths while retaining links to people, families, dates, and source evidence.

- **Timeline View** — show chronological events for one person, one family, or the whole document.

- **Graph View** — explore people, families, sources, notes, media, and their relationships in an Obsidian-style network.

- **Media Gallery** — browse `OBJE` records and linked files with navigation back to the records that use them.

- **Source Browser** — browse sources, citations, repositories, and the claims supported by each source.

- **Search Everywhere** — unified search across people, families, places, events, notes, sources, and media.

- **Statistics and Completeness Dashboard** — report record counts, missing facts, source coverage, unused records, broken links, place/name variants, and other quality metrics.

- **Validation Dashboard** — group diagnostics by category and record, summarize document health, and provide explanations and safe fixes.

- **GEDCOM Inspector** — show version, encoding, record and pointer counts, extensions, unresolved references, cycles, and other document-level metadata.

- **AST Explorer** — developer view for source text, tokens, AST nodes, ranges, diagnostics, XREF declarations, and resolved pointers.

- **Advanced Text Editor (Markdown)** — rich Markdown editing for notes/documentation fields.

- **Export Dates to iCalendar (.ics)** — generate calendar files from event dates for import into Google Calendar, Outlook, etc.

## Ecosystem / Future Packages

New workspace packages/apps, not fixes to existing code — each would be its own `packages/*` or `apps/*` member of this monorepo.

- **Prettier plugin** — GEDCOM formatter for Prettier, using the existing chevrotain parser/AST as the `parse` step. A shared `packages/formatter` core (see below) would let this and the native LSP formatter reuse the same printing logic instead of duplicating it.

- **Monaco editor integration** — `packages/language-server` is already a generic LSP server, and `apps/vscode` already builds a browser bundle of it (`browser` entry, `@vscode/test-web`). Wiring it up to Monaco via `monaco-languageclient` should be cheap — no validator/server rewrite needed.

- **Family tree visualization in Excalidraw** — render a visual tree (or export an Excalidraw scene) from a parsed GEDCOM document, walking FAMC/FAMS/HUSB/WIFE/CHIL pointers already resolved via `pointers` map in the AST. Architecture: keep GEDCOM as the read-only model layer; store layout data (node positions, edge routes) separately; Excalidraw becomes one of several possible renderers. Coordinates must never be written back into the `.ged` file — this preserves source fidelity and allows multiple views (Excalidraw, custom web, print) over the same tree without corruption.

- **CLI validator/linter** — thin wrapper over `packages/validator` (e.g. `npx @gedcom/validator file.ged`), for use in scripts/CI outside any editor.

- **GitHub Action** — wraps the CLI above to lint `.ged` files in other repositories' CI pipelines.

- **Neovim / Sublime / Zed LSP client config** — since `packages/language-server` is a generic LSP server, supporting these editors is mostly client configuration/documentation (e.g. an `nvim-lspconfig` entry), much cheaper than a bespoke editor plugin.

- **`packages/formatter`** — shared GEDCOM pretty-printing core, reused by the Prettier plugin and by a native `documentFormattingProvider` capability in `packages/language-server` (not currently in the LSP capabilities list).

- **GEDCOM diff/merge tool** — compare two `.ged` files and visualize differences; pairs naturally with the Excalidraw tree visualization above (e.g. highlight conflicting FAMC across two sources for the same person).

## AI / MCP

Keep `@gedcom/mcp` as a thin protocol adapter over `query`, `validator`, `graph`, `mutations`, and `diff`; business logic must remain usable without MCP.

- **Read-only `@gedcom/mcp` MVP** — stdio server with document info, person search, person/family lookup, relationships, ancestors, descendants, validation, and diagnostics. Return compact DTOs rather than dumping the full AST into model context.

- **MCP Resources** — expose stable URIs for document summary, statistics, diagnostics, people, families, places, sources, and the active GEDCOM schema.

- **MCP Prompts** — provide review, duplicate detection, cleanup planning, biography generation, research planning, and document comparison workflows.

- **Data-quality Analysis** — find likely duplicate people, date conflicts, impossible relationships, place/name variants, incomplete records, and missing source evidence. Results must include reasons and confidence, never silently merge records.

- **Safe MCP Mutations** — use `plan → preview → confirm → apply → validate`, return structured change sets, require user approval for writes, and support undo. Never expose arbitrary line replacement as the primary editing API.

- **Tree/Timeline/Map Data Tools** — generate renderer-neutral graph, timeline, map, and Excalidraw data through MCP after the shared semantic graph is available.
