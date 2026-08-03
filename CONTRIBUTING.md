# Contributing

Thanks for looking at Domorium. This document covers getting set up, the checks a
change has to pass, and how releases are made.

Before changing anything that crosses a package boundary, read
[docs/architecture.md](docs/architecture.md) — the layering is the point of this
repository, and the invariants listed there are what keep one implementation of
GEDCOM behavior serving four editors.

## Setup

Node.js 22 or newer, plus a JDK if you work on the JetBrains plugin.

```bash
npm install
```

`postinstall` builds the shared libraries, so a fresh clone is immediately usable.

## Checks

```bash
npm run check
```

That is the full gate — lint, type-check, and tests across the TypeScript
workspaces, the documentation checks, plus Kotlin formatting and tests for the
JetBrains plugin. It runs automatically on pre-push via [lefthook](lefthook.yml),
which also formats and lints staged files on commit. The last stage needs a JDK; if
you do not have one the hook skips it, says so, and runs the rest — CI covers the
JetBrains plugin on every pull request either way.

Narrower commands while iterating:

| Command                    | Scope                                        |
| -------------------------- | -------------------------------------------- |
| `npm run check:typescript` | Lint, type-check, tests                      |
| `npm run check:docs`       | Markdown formatting, lint, links, references |
| `npm run check:jetbrains`  | Kotlin formatting and tests                  |
| `npm test`                 | Vitest in watch mode                         |
| `npm run typecheck`        | Types only, all workspaces                   |

`check:docs` verifies that Markdown is Prettier-formatted and passes markdownlint,
that every relative link and `#fragment` resolves, that every package and app has a
README, that all five release units have a changelog entry for their current version,
and that the ADR index is complete. Code examples in READMEs are not checked —
keeping those honest is on whoever changes the API.

Formatting failures reported by `check:docs` are fixed with
`npx prettier --write <files>`; everything else it reports is a real edit to make.

Tests are Vitest, colocated as `*.test.ts` beside the code they cover. New
behavior in a package ships with tests in that package.

## Running the apps

```bash
npm run dev -w apps/web-editor   # browser editor
npm run open -w apps/vscode      # VS Code with the extension loaded
```

Each app's README has its platform-specific details:
[web editor](apps/web-editor/README.md), [VS Code](apps/vscode/README.md),
[JetBrains](apps/jetbrains/README.md).

After changing a shared package, rebuild it — consumers import from `dist`, so
they otherwise keep using stale output:

```bash
npm run build:libs
```

## Making a change

Work on a branch and open a pull request; `main` is protected by CI. Commit
messages follow [Conventional Commits](https://www.conventionalcommits.org/) with
an optional scope, matching the existing history:

```text
feat(jetbrains): restore LSP and suppress spellcheck
fix(web-editor): reject unsafe reference edits
docs: describe reference editing features
```

Prefer focused commits at meaningful checkpoints over one large commit.

Documentation is part of the change, not a follow-up. The obligations are listed
in [AGENTS.md](AGENTS.md#documentation) — they apply to human contributors
identically — and the reasoning is in
[ADR 0002](docs/adr/0002-documentation-in-repository.md). In short: a changed
public API means an updated package README, a changed boundary means an updated
architecture document, and a decision that would be expensive to reverse means a
new ADR plus its row in [the index](docs/adr/README.md).

## Releases

Every releasable unit has its own version, changelog, and tag family. Pushing the
tag is what triggers publication — see the table in
[docs/architecture.md](docs/architecture.md) and the reasoning in
[ADR 0003](docs/adr/0003-independent-package-publishing.md).

A release is a deliberate three-step act:

1. Bump the version — `package.json` for npm packages and the VS Code extension,
   `version` in [apps/jetbrains/build.gradle.kts](apps/jetbrains/build.gradle.kts)
   for the JetBrains plugin.
2. Add the matching changelog entry — `CHANGELOG.md` for the npm packages and the VS
   Code extension, the `<change-notes>` block in the JetBrains plugin's `plugin.xml`.
   Changelogs are written by hand, aimed at the people who use the release.
3. Tag and push: `validator-vX.Y.Z`, `language-service-vX.Y.Z`,
   `codemirror-vX.Y.Z`, `vscode-vX.Y.Z`, or `jetbrains-vX.Y.Z`.

The workflow refuses to publish if the tag version and the package version
disagree, or if any check fails. Publication is irreversible — npm versions are
immutable and a marketplace release is immediately public — so a bad release is
corrected by shipping a new version, never by replacing one.

Before publishing an npm package, validate it the way a consumer receives it: a
real `npm pack` tarball installed into a clean project, not `npm link` and not a
source-directory dependency.

The web editor has no release tag; merging to `main` deploys it.

## License

Contributions are made under the [MIT license](LICENSE).
