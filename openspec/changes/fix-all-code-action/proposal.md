## Why

A file with four hundred broken levels, or one that lacks both a header and a trailer, is
four hundred lightbulb invocations, or two. The editor's "Fix all auto-fixable problems"
command and fix-on-save (`editor.codeActionsOnSave: source.fixAll` in VS Code) look for a
code action of kind `source.fixAll`; the server declares only `quickfix`, so neither finds
anything. This is the first of three consequences listed in issue #155.

The user's requirement, 2026-11-05: take #155 and do `source.fixAll` only — one action
that applies every unambiguous, safe fix in the document.

## What Changes

- The language service offers one action of a new kind, `source.fixAll`, **Fix all safe
  problems**, whose single edit applies every fix that needs no choice by the author: the
  missing trailer, the missing 7.0 header, and a wrong level where the quick fix already
  considers the change safe.
- The service revalidates the combined result and keeps the level fixes only if no wrong
  level is left; when they interact, it drops them and offers the header and trailer alone.
- The language server declares `source.fixAll` and answers a request by the `only` filter
  of the request context: `quickfix` actions only when the filter allows `quickfix`, the
  fix-all action only when it allows `source.fixAll`. Without a filter the fix-all action
  is added to the quick fixes only when the request names a diagnostic it would fix.
- No fix that needs a choice is part of it: replacing, creating or voiding an unresolved
  pointer stay one-by-one quick fixes.

### Proposed scope

Only `source.fixAll`. Refactor actions (`refactor.rewrite`), `executeCommand` and
`codeAction/resolve`, the other two consequences in #155, are not part of this change;
#155 stays open for them.

## Capabilities

### New Capabilities

- `language-service/fix-all`: which fixes the action combines, how the combined edit is
  checked, when nothing is offered.
- `language-server/fix-all-code-action`: the declared kind and how `only` selects the
  actions of a request.

### Modified Capabilities

None.

## Impact

- Layers: `language-service` (new method and kind), `language-server` (declared kind,
  `only` handling). `codemirror` is untouched: its lint actions go through
  `getCodeActions`, which keeps returning quick fixes only. The dependency direction still
  points down.
- Hosts: VS Code gains "Fix all" and fix-on-save with no extension change; JetBrains
  (LSP4IJ) receives a `source.fixAll` action in its code action list. Obsidian and the web
  editor are unaffected.
- No new dependency, no version of any package decided here.
