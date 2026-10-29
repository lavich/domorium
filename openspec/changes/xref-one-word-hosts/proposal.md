## Why

#159 made `@I1@` one word in VS Code. The web editor, the Obsidian plugin and
the JetBrains plugin still split it at its at-signs (#467): double-clicking
`@I1@` selects `I1`, and word movement and word deletion stop at each `@`. All
four hosts should treat an xref the same way.

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
   `extendWordSelectionHandler` in the plugin. The part about word movement was
   answered on a wrong premise — the platform does offer a hook — and is
   replaced by decision 3; the selection part stands.
3. Asked again the same day, "#467, JetBrains: я ошибся, перемещение по словам
   перенастроить можно. Через точку расширения editorActionHandler оборачиваются
   около 12 действий: Alt/⌥+←/→, то же с Shift, удаление слова
   Alt+Backspace/Delete и их варианты CamelHumps. В GEDCOM-файле они
   перепрыгивают @I1@ целиком, всё остальное передают стандартному обработчику.
   Делать?", the user chose **"Да, и перемещение тоже"**.

## What Changes

- `@domorium/codemirror`: `createGedcomExtensions` declares `@` a word
  character. CodeMirror's double-click, word movement, word deletion, `wordAt`,
  select-next-occurrence and whole-word search then take `@I1@` as one word. An
  at-sign in a payload joins words too: `john@example.com` double-clicks as
  `john@example`, `@#DJULIAN@` as `DJULIAN@`, and a whole-word search for `I1`
  no longer matches inside `@I1@`. Completion is unaffected.
- `apps/jetbrains`: in a GEDCOM file, double-click, Extend Selection and Shrink
  Selection take an xref (`@[A-Za-z0-9_]+@`) whole, without the narrower `I1`
  step.
- `apps/jetbrains`: in a GEDCOM file, moving by word (with and without
  selection, CamelHumps or not) never stops inside an xref, and deleting by
  word removes the part of the xref on that side of the caret. Everywhere else
  each action does what the platform does. Text that is not an xref — an
  e-mail address, a 5.5.1 calendar escape — is untouched.
- VS Code is unchanged.

## Capabilities

### New Capabilities

- `codemirror/word-characters`: which characters the CodeMirror preset counts
  as part of a word, and so what CodeMirror's own word handling takes as a word
  in a GEDCOM document.
- `jetbrains/xref-word`: how double-click, Extend and Shrink Selection, word
  movement and word deletion treat an xref in a GEDCOM file in a JetBrains IDE.

### Modified Capabilities

None. `codemirror/completion-apply` keeps its requirements; a test re-checks
one of its scenarios under the preset.

## Impact

- Layers: `packages/codemirror` (the CodeMirror adapter) and `apps/jetbrains`
  (a host). No shared package below the adapters changes, and no genealogy
  logic moves into an app: what an xref is to a word selector is editor text
  handling, as in `apps/vscode/language-configuration.json`. Dependencies still
  point down.
- Hosts: the web editor and the Obsidian plugin (through `@domorium/codemirror`;
  Obsidian once it depends on the release that carries it), and JetBrains IDEs.
  VS Code: none.
- Release: a new version of `@domorium/codemirror`, its changelog entry under
  `## Unreleased` until then; a new version of the JetBrains plugin, whose
  `<change-notes>` entry is written at release, as `plugin.xml` keeps no
  unreleased section. Neither is tagged by this change.
