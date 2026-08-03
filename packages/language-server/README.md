# @domorium/language-server

Language Server Protocol adapter for GEDCOM. Wraps
[`@domorium/language-service`](../language-service) in an LSP server so editors that
speak the protocol get GEDCOM completion, diagnostics, hover, navigation,
references, rename, folding, symbols, and semantic highlighting.

Internal to this repository and not published to npm. Editors that do not speak
LSP should depend on `@domorium/language-service` directly, or on
`@domorium/codemirror` for a CodeMirror host.

## Usage

`createServer` builds a server over any LSP connection, which lets the same code
run in a Node process, a browser worker, or a test harness:

```typescript
import { createConnection, ProposedFeatures } from "vscode-languageserver/node";
import { createServer } from "@domorium/language-server";

createServer(
  createConnection(ProposedFeatures.all, process.stdin, process.stdout),
);
```

The package re-exports the whole `@domorium/language-service` public API, so a
consumer needs only this dependency.

## Entry points

| Entry          | Build output              | Used by                                                   |
| -------------- | ------------------------- | --------------------------------------------------------- |
| `src/index.ts` | `dist/`                   | `apps/vscode`, which bundles the server into a web worker |
| `src/stdio.ts` | `dist-stdio/stdio.cjs.js` | `apps/jetbrains`, which spawns it as a process            |

The stdio bundle is self-contained, so a host can ship it without installing the
monorepo.

## Scripts

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run build`       | Build dependencies, then the library and types |
| `npm run build:stdio` | Bundle the standalone stdio server             |
| `npm run watch`       | Build in watch mode                            |
| `npm test`            | Run tests                                      |
| `npm run typecheck`   | Type-check without emitting                    |
