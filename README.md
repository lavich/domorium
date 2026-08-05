# Domorium

**Modern editor tooling for GEDCOM** — context-aware autocomplete, real-time
validation, go to definition, and safe cross-reference rename for the plain-text
format that genealogy applications use to exchange family trees.

Domorium edits the `.ged` file you already have. Nothing is converted to another
format, and nothing is uploaded anywhere.

[![CI](https://github.com/lavich/domorium/actions/workflows/ci.yml/badge.svg)](https://github.com/lavich/domorium/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Open in your browser](https://domorium.com/)** · [Obsidian](https://community.obsidian.md/plugins/domorium) · [VS Code](https://marketplace.visualstudio.com/items?itemName=domorium.gedcom) · [JetBrains](https://plugins.jetbrains.com/plugin/index?xmlId=domorium.gedcom)

![GEDCOM autocomplete, validation, hover, and navigation](apps/vscode/images/gedcom-demo.gif)

## The problem

A GEDCOM file is a strict, line-oriented tree: every line carries a level, a tag,
and a payload, and records point at each other through cross-reference
identifiers. Get a level wrong or point at a record that no longer exists, and a
genealogy application will tell you the import failed — rarely which line caused
it.

Domorium treats `.ged` as what it is: a language. You get the diagnostic on the
line that caused it, while you type, in the editor you already use.

## Features

- Context-aware autocomplete that knows which tags are legal at this level, in
  this structure
- Real-time structural validation against the GEDCOM 5.5.1 and 7.0
  specifications — structure, cardinality, and payload types
- Semantic syntax highlighting
- Hover information for GEDCOM tags
- Go to definition for cross-references, and find all references with read/write
  highlights
- Safe, atomic cross-reference rename
- Quick fixes for broken references and invalid levels
- Code folding for records and nested structures
- Clickable web and local-file links, where the editor platform permits them
- Support for `.ged` and `.gedcom` files

## Where it runs

| Host                                                                               | Notes                                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Browser](https://domorium.com/)                                                   | No install, no upload — the editor runs on your machine                   |
| [Obsidian](https://community.obsidian.md/plugins/domorium)                         | Desktop and mobile; edits vault files without converting them to Markdown |
| [VS Code](https://marketplace.visualstudio.com/items?itemName=domorium.gedcom)     | Web extension — works in vscode.dev with no local runtime                 |
| [JetBrains IDEs](https://plugins.jetbrains.com/plugin/index?xmlId=domorium.gedcom) | Any IntelliJ-platform IDE; requires Node.js on `PATH`                     |

![GEDCOM editor in Obsidian](https://raw.githubusercontent.com/lavich/domorium-obsidian/main/images/gedcom-obsidian.png)

The Obsidian plugin is developed and released from
[lavich/domorium-obsidian](https://github.com/lavich/domorium-obsidian).

## How it is built

The interesting part is that the language intelligence exists once, and each
editor is a thin adapter over it.

- **A real parser, not regular expressions.** A Chevrotain lexer and parser turn
  `.ged` text into an AST with resolved cross-reference pointers.
- **The GEDCOM 7 schema is generated from the specification**, not transcribed by
  hand — `npm run generate -w packages/validator` derives it from the upstream
  FamilySearch GEDCOM 7 release. GEDCOM 5.5.1 is only published as prose, so that
  schema is the one exception and is maintained by hand.
- **The language service owns no editor API and no LSP dependency.** It declares
  its own protocol-shaped types, which is exactly why the same code can back a
  Language Server Protocol server, a CodeMirror 6 extension in a browser tab, and
  an Obsidian plugin.
- **Adapters, not forks.** LSP for VS Code and JetBrains, CodeMirror 6 for the
  browser and Obsidian. A feature implemented once appears in all four.

[docs/architecture.md](docs/architecture.md) has the dependency graph, the
layering rules, and the invariants that keep it honest.
[docs/adr/](docs/adr/) records why the structure is shaped this way, and
[docs/roadmap.md](docs/roadmap.md) covers where it could go.

## Build on it

The layers are published to npm, so GEDCOM tooling does not have to start from a
parser again.

Each row links to the package's own README; the badge links to npm.

| Package                                                             | Version                                                                                                                     | Use it for                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [`@domorium/validator`](packages/validator/README.md)               | [![npm](https://img.shields.io/npm/v/@domorium/validator)](https://www.npmjs.com/package/@domorium/validator)               | Parsing `.ged` into an AST and validating it      |
| [`@domorium/language-service`](packages/language-service/README.md) | [![npm](https://img.shields.io/npm/v/@domorium/language-service)](https://www.npmjs.com/package/@domorium/language-service) | Editor features, independent of any editor        |
| [`@domorium/codemirror`](packages/codemirror/README.md)             | [![npm](https://img.shields.io/npm/v/@domorium/codemirror)](https://www.npmjs.com/package/@domorium/codemirror)             | Dropping a GEDCOM editor into a CodeMirror 6 host |

`@domorium/language-server` is the LSP adapter used by the VS Code and JetBrains
plugins. It lives in [packages/language-server](packages/language-server/README.md)
and is deliberately not published — an LSP host should depend on it through this
repository, and a non-LSP host wants `@domorium/language-service` instead.

```typescript
import { GedcomDocument } from "@domorium/validator";

const document = new GedcomDocument().createDocument(
  "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n",
);
const errors = document.getErrors();
```

## What is GEDCOM?

GEDCOM is the text format family-history applications use to exchange
genealogical data — people, families, events, sources, and the links between
them. It predates most of the software that reads it, and it is usually generated
and consumed by machines rather than read by people. Domorium adds the editor
assistance that makes reading and fixing the raw format practical.

## Contributing

```bash
npm install
npm run check
npm run dev -w apps/web-editor
```

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for
setup, checks, and the release process, and [AGENTS.md](AGENTS.md) for the
conventions this repository holds itself to. Product-specific build and
development commands live in each app's README.

## License

MIT © 2025

Domorium is an independent project and is not affiliated with or endorsed by
FamilySearch or Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
are trademarks of Intellectual Reserve, Inc.
