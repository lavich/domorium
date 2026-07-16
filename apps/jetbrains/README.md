# GEDCOM for JetBrains

Plugin for working with `.ged` / `.gedcom` (GEDCOM) files in JetBrains IDEs
(IntelliJ IDEA, WebStorm, PyCharm, and any other IDE built on the IntelliJ
Platform). Provides validation, hover, go-to-definition, folding and
semantic highlighting, powered by the same domorium language server used
by the VS Code extension.

---

## ✨ Features

- Real-time GEDCOM validation
- Hover info, go-to-definition and code folding
- Semantic highlighting

---

## ⚙️ Requirements

- `node` available on `PATH` — the plugin launches the bundled language
  server as a Node.js subprocess (no auto-detection/download).

---

## 🤝 Contributing

Want to contribute? Great!

1. Clone the repository
2. Run the plugin in a sandboxed IDE:

   ```bash
   ./gradlew runIde
   ```

3. Build the distributable plugin `.zip`:

   ```bash
   ./gradlew buildPlugin
   ```

The language server itself lives in `packages/lsp` (this monorepo's npm
workspace); `./gradlew` builds its standalone Node bundle and packages it
into the plugin automatically.

---

## 📜 License

MIT © 2026
