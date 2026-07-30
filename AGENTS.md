# Agent instructions

GEDCOM editing tools — parser, validator, and language features for `.ged` files,
adapted to VS Code, JetBrains IDEs, the browser, and Obsidian. npm workspace
monorepo, TypeScript, with a Kotlin/Gradle plugin under `apps/jetbrains`.

This file is the canonical instruction set for all coding assistants. Files such
as `CLAUDE.md` are pointers to it and must not carry content of their own.

## Layout

```text
packages/validator          @gedcom/validator        parser + schema validation   (npm)
packages/language-service   @gedcom/language-service editor-independent features (npm)
packages/language-server    @gedcom/language-server  LSP adapter                 (internal)
packages/codemirror         @gedcom/codemirror       CodeMirror 6 adapter        (internal)
apps/vscode                 VS Code extension        → language-server
apps/jetbrains              JetBrains plugin         → language-server (bundled stdio build)
apps/web-editor             Vite app, GitHub Pages   → codemirror
```

Dependencies point one way: apps → adapter → language service → validator. Read
[docs/architecture.md](docs/architecture.md) before changing anything that
crosses a package boundary.

## Commands

Run from the repository root.

| Command                          | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `npm install`                    | Install and build libraries (`postinstall`) |
| `npm run check`                  | Full gate: TypeScript, docs, JetBrains      |
| `npm run check:typescript`       | Lint, typecheck, tests                      |
| `npm run check:docs`             | Documentation checks (see below)            |
| `npm run test:run`               | Vitest, single run                          |
| `npm run build:libs`             | Rebuild `language-server` and `codemirror`  |
| `npm run dev -w apps/web-editor` | Web editor dev server                       |

`npm run check` must pass before any commit is proposed. It is also enforced on
pre-push by [lefthook.yml](lefthook.yml), which additionally runs Prettier and
ESLint with `--fix` on staged files at pre-commit.

After changing a lower-layer package, rebuild it — consumers import from `dist`
and will otherwise use stale output.

## Invariants

Violating one of these means the change is at the wrong layer. Do not work around
them; move the code instead.

- No package below the adapter layer imports an editor API or an LSP type.
- `@gedcom/language-service` declares its own protocol-shaped types in
  `src/types.ts` and never depends on `vscode-languageserver-protocol`.
- Genealogy logic lives in a shared package, never duplicated across apps.
- `@codemirror/*` and `@lezer/*` stay peer dependencies, single-instanced.
- Semantic edits preserve reciprocal GEDCOM pointers and revalidate the result.
- Never hand-edit generated files: `packages/validator/src/schemes/g7validation.json`
  (regenerate with `npm run generate -w packages/validator`) or any `dist` output.
  `g551validation.json` is the exception — GEDCOM 5.5.1 has no machine-readable
  spec, so that schema is maintained by hand.

## Conventions

- Prettier owns formatting and has no config file — do not hand-format, and do
  not add one without a reason.
- Tests are Vitest, colocated as `*.test.ts` next to the code under test. New
  behavior in a package ships with tests in that package.
- Commit messages follow Conventional Commits, with an optional scope:
  `feat(jetbrains): …`, `fix(web-editor): …`, `docs: …`, `refactor: …`.
- Work happens on branches and lands through pull requests. Do not commit or push
  to `main` unless explicitly asked.
- Prefer focused commits at meaningful checkpoints over one large commit.
- Never discard uncommitted work you did not write. Several worktrees may hold
  work in progress; preserve local changes in all of them.
- Match the surrounding code. This repository has consistent naming and comment
  density; a change that reads as foreign is a change to redo.

## Releases

Every releasable unit has its own version, changelog, and tag family — see
[docs/architecture.md](docs/architecture.md) for the table and
[docs/adr/0003](docs/adr/0003-independent-package-publishing.md) for why.

- **Never create or push a release tag without explicit approval, even when every
  check passes.** Publishing is irreversible: npm versions are immutable, and a
  marketplace release is visible the moment it lands. A mistake is corrected by
  publishing a new version, never by replacing one.
- A release is one deliberate act: version bump, changelog entry, then tag. The
  workflow rejects a tag whose version does not match the package's
  `package.json`.
- Validate a package release with a real `npm pack` tarball installed into a clean
  consumer — not `npm link`, not a source-directory dependency. The tarball is
  what users actually get, and only it exercises the real exports, declarations,
  and peer dependency boundaries.

## Documentation

Documentation lives in this repository and is updated in the same change as the
code it describes. See [docs/adr/0002](docs/adr/0002-documentation-in-repository.md)
for the reasoning.

Obligations when making a change:

- Public API of a package changed → update that package's `README.md`, including its
  usage example. `npm run check:docs` verifies that every name an example imports is
  really exported; call signatures are not checked mechanically, so read the example
  and confirm it is still how you would actually use the API.
- Layer boundaries or dependency direction changed → update
  [docs/architecture.md](docs/architecture.md).
- A decision was made that would be expensive to reverse → add an ADR in
  [docs/adr/](docs/adr/) using [the template](docs/adr/template.md). Existing
  records are immutable; supersede rather than edit.
- A released package's version changed → add the matching `CHANGELOG.md` entry by
  hand. Changelogs are curated, not generated.
- An item in [TODO.md](TODO.md) was completed → mark it there. Do not silently
  promote items out of [docs/roadmap.md](docs/roadmap.md); that document holds
  directions, not commitments.
- Work described by a document in [docs/design/](docs/design/) shipped → drain the
  document before deleting it: durable decisions become an ADR, structural facts
  go into `docs/architecture.md`, user-visible changes go into a changelog. Never
  delete a design document without extracting its reasoning first.

Assistant session memory is not project documentation. A durable decision that
surfaced in conversation belongs in an ADR or it does not exist.

## Where to look

- [docs/architecture.md](docs/architecture.md) — layers, build order, release
  topology, invariants in full
- [docs/adr/](docs/adr/) — recorded decisions and rejected alternatives
- [docs/design/](docs/design/) — designs for in-flight work, with their lifecycle
  rules
- [TODO.md](TODO.md) — near-term work
- [docs/roadmap.md](docs/roadmap.md) — longer-range directions
- Per-app READMEs — platform-specific build and debug instructions
