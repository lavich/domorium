## Why

The VS Code extension contributes the `gedcom` language with no language
configuration and no editor defaults (#159), so the editor treats `@` as a word
separator everywhere. Double-clicking `@I1@` selects `I1`, Ctrl+←/→ stops at
each `@`, word-based suggestions offer `I1`, and a completion that replaces the
word under the cursor replaces only the part of an xref between its at-signs.

## User's decision

Recorded 2026-10-27:

- On scope: **"wordPattern + comments"** — `@I1@` is one word, and the language
  declares no comment syntax. No auto-closing of `@`, and no Enter rules.
- Once review showed that `wordPattern` does not reach double-click or word
  movement, which VS Code drives from `editor.wordSeparators`:
  **"wordPattern + wordSeparators"** — also default `editor.wordSeparators`
  for GEDCOM to VS Code's set without `@`, accepting that double-clicking
  `john@example.com` in a payload then selects `john@example`.

Out of scope, found in code review: completion inserts at the cursor by default
and the server's items carry no range, so typing a new pointer (`@I`) and
accepting `@I1@` still writes `@@I1@`. The fix is for the server to send the
range an xref completion replaces, a change of its own.

## What Changes

- The extension contributes a language configuration for `gedcom`, and
  packages it. Its word pattern makes an xref one word and otherwise matches VS
  Code's default; this governs word-based suggestions and the text a completion
  replaces.
- The extension defaults `editor.wordSeparators` for `[gedcom]` to VS Code's
  default set without `@`; this governs double-click, word movement and word
  deletion. A user setting overrides it.
- The configuration declares an empty `comments`, recording that GEDCOM has no
  comment syntax. VS Code already does nothing on Toggle Comment without one;
  this documents the absence rather than changing behaviour.
- No auto-closing or surrounding pairs, indentation or Enter rules, or folding
  markers.

## Capabilities

### New Capabilities

- `vscode/language-configuration`: how VS Code's own text handling — words,
  word-based selection and movement, completion's replace range, comments —
  treats a GEDCOM document.

### Modified Capabilities

None.

## Impact

- Layers: `apps/vscode` only — its manifest, a new `language-configuration.json`,
  `.vscodeignore`, tests, README and changelog. No package changes.
- Hosts: VS Code only. The web editor (CodeMirror) and JetBrains split words at
  `@` too; that is outside this change and worth an issue of its own.
- Release: a patch of the VS Code extension with a changelog entry, when
  released.
