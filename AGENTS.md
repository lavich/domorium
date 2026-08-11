# Agent instructions

GEDCOM tooling for `.ged` files — VS Code, JetBrains IDEs, Obsidian, the browser.
TypeScript npm workspace, plus a Kotlin/Gradle plugin in `apps/jetbrains`. These
are the canonical instructions for all coding assistants; `CLAUDE.md` and its kin
are pointers carrying no content. Read this file in full.

## Layout

```text
validator → language-service → language-server (LSP adapter, internal)
                             → codemirror (CodeMirror 6)
apps/vscode, apps/jetbrains → language-server;  apps/web-editor → codemirror
```

Dependencies point one way; everything but `language-server` publishes as
`@domorium/*`. Read [docs/architecture.md](docs/architecture.md) before crossing a
package boundary, [docs/adr/](docs/adr/) for decisions already taken.

## Commands

From the repository root: `npm install`, `npm run test:run`, `npm run build:libs`,
`npm run dev -w apps/web-editor`.

- `npm run check` is the full gate and must pass before any commit is proposed;
  [lefthook.yml](lefthook.yml) enforces it on pre-push and runs Prettier and ESLint
  on staged files.
- Its `check:jetbrains` stage needs a JDK and is skipped without one. Say so in the
  commit proposal — skipped is not passed.
- After changing a lower-layer package, rebuild it; consumers import from `dist`.
- `npm run check:conformance` runs the validator against the official GEDCOM files.
  It needs the network, so it sits outside `check` and is its own CI job. After
  changing a diagnostic, re-record with `-- --update` and read the diff.

## Invariants

Violating one means the change is at the wrong layer. Move the code instead.

- No package below the adapter layer imports an editor API or an LSP type.
- `@domorium/language-service` declares its own protocol-shaped types in
  `src/types.ts` and never depends on `vscode-languageserver-protocol`.
- Genealogy logic lives in a shared package, never duplicated across apps.
- `@codemirror/*` and `@lezer/*` stay peer dependencies, single-instanced.
- Semantic edits preserve reciprocal GEDCOM pointers and revalidate the result.
- Never hand-edit `dist` or `schemes/g7validation.json` (regenerate with
  `npm run generate -w packages/validator`); `g551validation.json` is hand-maintained.

## Conventions

- Prettier owns formatting and has no config file; do not hand-format.
- Tests are Vitest, colocated as `*.test.ts`. New behavior ships with tests.
- Commit messages follow Conventional Commits with an optional scope.
- Never sign a commit or a pull request for the tool that wrote it: no
  `Co-Authored-By` trailer naming an assistant, no "generated with" line.
- Work lands through pull requests. Do not commit or push to `main` unless asked.
- Prefer focused commits at meaningful checkpoints over one large commit.
- Never discard uncommitted work you did not write, in any worktree.
- Match the surrounding code; a change that reads as foreign is one to redo.

### Comments

- A comment earns its place only as a rule from outside the code, or as a trap —
  why the obvious simplification is wrong. Otherwise delete it.
- History belongs in the commit message, measurements in the changelog or issue,
  a restatement of the code nowhere. `used to`, `previously`, `was`, `now` and any
  number are tells that it is one of those.
- Keep it as short as the rule it states. In tests, name the bug it catches.

## Releases

- **Never create or push a release tag without explicit approval**, however green
  the checks are. Publishing is irreversible.
- One deliberate act: version bump, changelog entry, then tag. The workflow rejects
  a tag whose version does not match `package.json`.
- Validate a release from a real `npm pack` tarball in a clean consumer, not `npm link`.

## Documentation

Updated in the same change as the code it describes.

- Public API changed → that package's `README.md` and its usage example. Nothing
  checks examples mechanically; read it and confirm every name still exists.
- Layers or dependency direction changed → [docs/architecture.md](docs/architecture.md).
- A decision expensive to reverse → an ADR from [the template](docs/adr/template.md)
  and its row in [the index](docs/adr/README.md). Records are immutable; supersede.
- A version changed → its changelog by hand: `CHANGELOG.md`, or `<change-notes>` in
  the JetBrains `plugin.xml`.
- A [TODO.md](TODO.md) item completed → mark it there.
  [docs/roadmap.md](docs/roadmap.md) holds directions, not commitments.
- Plans, designs and notes are temporary and not committed; durable decisions become
  ADRs. Assistant session memory is not project documentation.

`npm run check:docs` covers the mechanical half — formatting, links, a README per
package, a changelog entry per release unit, a complete ADR index — but cannot judge
whether prose is true and never reads code examples.
[docs/prompts/docs-sync.md](docs/prompts/docs-sync.md) is the pass before a PR.
