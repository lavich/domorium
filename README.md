# Domorium

Domorium makes GEDCOM files easier to understand and edit. It highlights their structure, suggests valid entries, and reports errors as you type—so you can work with genealogical data without memorizing the GEDCOM format.

Use Domorium in your browser, Visual Studio Code, or a JetBrains IDE.

[Open the web editor](https://lavich.github.io/domorium/) · [Install for VS Code](https://marketplace.visualstudio.com/items?itemName=lavich.gedcom-vscode) · [JetBrains plugin details](apps/jetbrains/README.md)

![Domorium autocomplete, validation, hover, and navigation](apps/vscode/images/domorium-demo.gif)

## Features

- Context-aware GEDCOM autocomplete
- Real-time structural validation
- Semantic syntax highlighting
- Hover information for GEDCOM tags
- Go to definition for cross-references
- Code folding for records and nested structures
- Support for `.ged` and `.gedcom` files

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
