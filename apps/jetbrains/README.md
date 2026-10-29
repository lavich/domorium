# GEDCOM for JetBrains IDEs

GEDCOM language support by Domorium. Read and edit `.ged` and `.gedcom` files
with confidence using structure-aware suggestions and diagnostics as you type.

![GEDCOM autocomplete, validation, hover, and navigation](../vscode/images/gedcom-demo.gif)

## Features

- Context-aware GEDCOM autocomplete
- Real-time structural validation
- Semantic syntax highlighting
- Hover information for GEDCOM tags
- Go to definition for cross-references
- Code folding for records and nested structures
- An XREF such as `@I1@` is one word to double-click, Extend and Shrink Selection,
  and moving or deleting by word
- Media links that follow a file renamed or moved in the IDE
- Support for `.ged` and `.gedcom` files

## Renaming a media file

Rename or move a photograph in the IDE, and every open GEDCOM document that names
it by a relative path is rewritten. A GEDCOM 7 document cannot name a file above
its own folder, so a move there leaves it unchanged and a warning names it.

Not followed: GEDCOM files that are not open, with no warning about them (#457),
renaming a folder, renaming outside the IDE, and absolute paths such as
`C:\photos\a.jpg` or `file:///…`.

## Requirements

Requires Node.js on `PATH`. The GEDCOM language server is bundled with the plugin and runs locally.

[Try Domorium in your browser](https://domorium.com/editor/) · [Source code and issue tracker](https://github.com/lavich/domorium)

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

The language server lives in `packages/language-server`. Gradle builds its standalone Node.js bundle and packages it with the plugin automatically.

## License

MIT © 2026 Andrei Lobanov

Domorium is an independent project and is not affiliated with or endorsed by
FamilySearch or Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
are trademarks of Intellectual Reserve, Inc.
