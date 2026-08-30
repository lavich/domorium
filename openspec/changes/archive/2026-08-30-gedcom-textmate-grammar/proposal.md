## Why

A fenced block written as ` ```gedcom ` renders as plain text, and a `.ged`
file is grey for the moment between opening it and the language server
connecting. Both follow from the same fact: `apps/vscode` contributes no
TextMate grammar, so every colour it shows comes from LSP semantic tokens
([ADR-0004](../../../docs/adr/0004-standard-semantic-token-vocabulary.md)).

Semantic tokens cannot reach a Markdown fence at all. They are bound to the
language id of the whole document, and inside a `.md` file that id is
`markdown`. VS Code's own Markdown grammar carries 61 `fenced_code_block_<lang>`
rules and a `fenced_code_block_unknown` catch-all that applies no inner
highlighting; registering a language id adds nothing to that list. A third-party
extension has to contribute the injection itself, which is what the Mermaid,
Prisma and Terraform extensions do.

## What Changes

- Add `apps/vscode/syntaxes/gedcom.tmLanguage.json`, a grammar for
  `source.gedcom` covering the one line shape GEDCOM has:
  `level [@xref@] TAG [value]`. Three patterns.
- Add `apps/vscode/syntaxes/gedcom.markdown.json`, injected into
  `text.html.markdown`, so a ` ```gedcom ` fence embeds `source.gedcom`.
- Contribute both through `contributes.grammars`, the second with `injectTo` and
  an `embeddedLanguages` entry for `meta.embedded.block.gedcom`.
- Extend `apps/vscode/src/contributions.test.ts` to hold the grammar to the
  agreement below, and add a grammar test that tokenizes GEDCOM lines with
  `vscode-textmate` and asserts the scope each token carries.

**The grammar and the semantic tokens paint the same colours.** ADR-0004 fixes
the vocabulary and `contributes.semanticTokenScopes` already names the TextMate
scope each type falls back to, so the mapping is not a free choice:

| GEDCOM token             | Semantic token         | Grammar scope          |
| ------------------------ | ---------------------- | ---------------------- |
| level                    | `comment`              | `comment`              |
| record-defining `@xref@` | `variable.declaration` | `entity.name.function` |
| tag                      | `keyword`              | `keyword`              |
| `@xref@` in a payload    | `variable`             | `entity.name.type`     |
| payload                  | `string`               | `string`               |

That agreement is the constraint the issue states, and it decides two things
that would otherwise be tempting. The grammar does not colour tags by category —
record, event, attribute, linkage — because semantic tokens paint every tag
`keyword`, and a seven-colour static layer would visibly collapse to one the
moment the server connects. And it emits no `invalid.illegal` scope: a regex
guess at validity is a second, weaker validator that the real one contradicts
one keystroke later.

The cost, taken deliberately: colours will not match github.com, which renders
`.ged` through [fguitton/vscode-gedcom](https://github.com/fguitton/vscode-gedcom)
by way of Linguist, and that grammar does both of the above.

Out of scope: JetBrains, the web editor and Obsidian have the same gap and each
needs a different mechanism — a TextMate bundle for the first, a `StreamLanguage`
or Lezer grammar for the other two. No validator or language-service change.

## Capabilities

### New Capabilities

- `vscode/textmate-grammar`: a static syntax layer for GEDCOM that paints before
  and without the language server, reaches Markdown code fences, and agrees with
  the semantic tokens that refine it.

### Modified Capabilities

None. No existing spec describes the VS Code extension.

## Impact

- **Layers:** `apps/vscode` only, at the top of the stack. Two data files, a
  `contributes` block and its tests. Nothing below the adapter layer is touched,
  so the dependency direction is unchanged — the grammar has no dependencies at
  all, which is the point of it.
- **Editor hosts:** VS Code, and only VS Code. The three other hosts keep the gap.
- **Packaging:** `syntaxes/` has to reach the `.vsix`, and did not.
  `apps/vscode/.vscodeignore` ignores everything and names what to keep, so a new
  directory is excluded until it is named there — `npx vsce ls` listed neither
  grammar. `!syntaxes/**` is added, and a test reads the same file so the next
  directory added is not lost the same way.
- **Documentation:** `apps/vscode/README.md` and `CHANGELOG.md`.
