# Domorium

Domorium is an open, local-first ecosystem for GEDCOM editing. Its GEDCOM editor
integrations provide autocomplete, validation, navigation, and semantic
highlighting for `.ged` and `.gedcom` files.

Use GEDCOM by Domorium in your browser, Obsidian, Visual Studio Code, or a
JetBrains IDE.

[Open Domorium](https://domorium.com/) · [Install for Obsidian](https://community.obsidian.md/plugins/domorium) · [Install for VS Code](https://marketplace.visualstudio.com/items?itemName=domorium.gedcom) · [Install for JetBrains](https://plugins.jetbrains.com/plugin/index?xmlId=domorium.gedcom)

![GEDCOM autocomplete, validation, hover, and navigation](apps/vscode/images/gedcom-demo.gif)

## Features

- Context-aware GEDCOM autocomplete
- Real-time structural validation
- Semantic syntax highlighting
- Hover information for GEDCOM tags
- Go to definition for cross-references
- Find all XREF references with read/write highlights
- Safe, atomic XREF rename
- Clickable web and local-file links where the editor platform permits them
- Quick fixes for broken references and invalid levels
- Code folding for records and nested structures
- Support for `.ged` and `.gedcom` files

## Obsidian

GEDCOM by Domorium edits source files directly in an Obsidian vault without
converting records to Markdown or uploading genealogy data. The desktop and
mobile plugin is developed and released from the dedicated
[lavich/domorium-obsidian](https://github.com/lavich/domorium-obsidian)
repository.

![GEDCOM editor in Obsidian](https://raw.githubusercontent.com/lavich/domorium-obsidian/main/images/gedcom-obsidian.png)

## What is GEDCOM?

GEDCOM is a text format for exchanging genealogical data between family-history applications. This project adds editor assistance to the raw format, helping genealogists and developers read its structure and catch mistakes while editing.

## Contributing

```bash
npm install
npm run check
npm run dev -w apps/web-editor
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and the release process,
and [docs/architecture.md](docs/architecture.md) for how the packages fit together.

Product-specific build and development commands live in each app's README.

## License

MIT © 2025

Domorium is an independent project and is not affiliated with or endorsed by
FamilySearch or Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
are trademarks of Intellectual Reserve, Inc.
