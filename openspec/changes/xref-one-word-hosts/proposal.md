## Why

#159 made `@I1@` one word in VS Code. The web editor, the Obsidian plugin and
the JetBrains plugin still split it at its at-signs (#467): double-clicking
`@I1@` selects `I1`, and in CodeMirror word movement and word deletion stop at
each `@`. All four hosts should treat an xref the same way.

## The requirement, as the user decided it

Recorded 2026-10-29:

1. Asked "#467: как сделать xref одним словом в веб-редакторе и Obsidian (общий
   пакет @domorium/codemirror)?", the user chose **"@ как буква"**: add `@` to
   the language's `wordChars`, as VS Code does — `@I1@` selects whole, and
   `john@example.com` then selects as `john@example`. Same trade as VS Code;
   all hosts behave alike.
2. Asked "В JetBrains двойной клик и Ctrl+W будут выделять xref целиком (только
   @…@, адреса почты не затрагиваются). Перемещение по словам Alt+←/→ так
   перенастроить нельзя: платформа решает это по символам, без точки расширения
   для языка TEXT. Устраивает?", the user chose **"Да"**: an
   `extendWordSelectionHandler` in the plugin; word movement stays a known gap,
   named in the issue and the README.

## What Changes

- `@domorium/codemirror`: `createGedcomExtensions` declares `@` a word
  character through `EditorState.languageData`. CodeMirror's double-click, word
  movement (`cursorGroup*`), word deletion (`deleteGroup*`), `wordAt` and
  `selectNextOccurrence` then take `@I1@` whole. An at-sign in a payload joins
  words too: `john@example.com` double-clicks as `john@example`, and
  `@#DJULIAN@` as `DJULIAN@` — what VS Code's `editor.wordSeparators` gives.
  Completion is unaffected: it matches with its own expression and replaces the
  range the language service names.
- `apps/jetbrains`: an extend-word-selection handler for GEDCOM files makes
  double-click and Extend Selection (Ctrl+W / ⌥↑) select an xref
  (`@[A-Za-z0-9_]+@`) whole, without the narrower `I1` step. Text that is not an
  xref — an e-mail address, a 5.5.1 calendar escape — selects as before.
- JetBrains word movement and word deletion (Alt/Ctrl+←/→, Alt/Ctrl+Backspace)
  still stop at each `@`. The platform decides them by character and by the
  editor highlighter's lexemes, and offers no hook for a file type on the TEXT
  language; the README names it as a known gap.
- VS Code is unchanged.

## Capabilities

### New Capabilities

- `codemirror/word-characters`: which characters the CodeMirror preset counts
  as part of a word, and so what double-click, word movement and word deletion
  take as a word in a GEDCOM document.
- `jetbrains/xref-selection`: what double-click and Extend Selection select on
  an xref in a GEDCOM file in a JetBrains IDE, and the word movement it leaves
  to the platform.

### Modified Capabilities

None. `codemirror/completion-apply` keeps its requirements; its scenarios are
checked again, not changed.

## Impact

- Layers: `packages/codemirror` (the CodeMirror adapter) and `apps/jetbrains`
  (a host). No shared package below the adapters changes, and no genealogy
  logic moves into an app: what an xref is to a word selector is editor text
  handling, as it is in `apps/vscode/language-configuration.json`. Dependencies
  still point down.
- Hosts: the web editor and the Obsidian plugin (through `@domorium/codemirror`;
  Obsidian picks it up once it depends on the release that carries it), and
  JetBrains IDEs. VS Code: none.
- Release: a new version of `@domorium/codemirror`, its changelog entry under
  `## Unreleased` until then; a new version of the JetBrains plugin, whose
  `<change-notes>` entry is written at release, as `plugin.xml` keeps no
  unreleased section. Neither is tagged by this change.
