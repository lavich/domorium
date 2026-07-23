# Domorium

Domorium makes GEDCOM files easier to understand and edit. It highlights their structure, suggests valid entries, and reports errors as you type—so you can work with genealogical data without memorizing the GEDCOM format.

Use Domorium in your browser, Obsidian, Visual Studio Code, or a JetBrains IDE.

[Open the web editor](https://lavich.github.io/domorium/) · [Obsidian plugin](https://github.com/lavich/domorium-obsidian) · [Install for VS Code](https://marketplace.visualstudio.com/items?itemName=lavich.gedcom-vscode) · [JetBrains plugin details](apps/jetbrains/README.md)

![Domorium autocomplete, validation, hover, and navigation](apps/vscode/images/domorium-demo.gif)

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

Domorium edits source GEDCOM files directly in an Obsidian vault without
converting records to Markdown or uploading genealogy data. The desktop and
mobile plugin is developed and released from the dedicated
[lavich/domorium-obsidian](https://github.com/lavich/domorium-obsidian)
repository.

![Domorium GEDCOM editor in Obsidian](https://raw.githubusercontent.com/lavich/domorium-obsidian/main/images/domorium-obsidian.png)

## What is GEDCOM?

GEDCOM is a text format for exchanging genealogical data between family-history applications. Domorium adds editor assistance to the raw format, helping genealogists and developers read its structure and catch mistakes while editing.

## Contributing

```bash
npm install
npm run check
npm run dev -w apps/web-editor
```

Product-specific build and development commands live in each app's README.

## License

MIT © 2025
