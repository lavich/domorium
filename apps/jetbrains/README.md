# Domorium for JetBrains IDEs

Domorium helps you read and edit `.ged` and `.gedcom` files with confidence. It understands the GEDCOM structure, suggests valid entries, and reports problems as you type.

![Domorium autocomplete, validation, hover, and navigation](../vscode/images/domorium-demo.gif)

## Features

- Context-aware GEDCOM autocomplete
- Real-time structural validation
- Semantic syntax highlighting
- Hover information for GEDCOM tags
- Go to definition for cross-references
- Code folding for records and nested structures
- Support for `.ged` and `.gedcom` files

## Requirements

Requires Node.js on `PATH`. The GEDCOM language server is bundled with the plugin and runs locally.

[Try Domorium in your browser](https://lavich.github.io/domorium/) · [Source code and issue tracker](https://github.com/lavich/domorium)

## Roadmap

- TODO: Check spelling only in natural-language GEDCOM values while excluding levels, tags, structure, and XREF identifiers.

## Development

Run the plugin in a sandboxed IDE:

```bash
./gradlew runIde
```

Build the distributable plugin ZIP:

```bash
./gradlew buildPlugin
```

The language server lives in `packages/lsp`. Gradle builds its standalone Node.js bundle and packages it with the plugin automatically.

## License

MIT © 2026 Andrei Lobanov
