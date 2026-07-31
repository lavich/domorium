# 0002. Documentation lives in the repository, with `AGENTS.md` as canonical agent instructions

- **Status:** Accepted
- **Date:** 2026-07-30

## Context

Documentation in this repository is thin and unevenly distributed. The root
`README.md` and the per-app READMEs are accurate and maintained. Two of the four
packages have a README; the other two have none. Three changelogs are maintained by
hand in a consistent format. `TODO.md` carries a detailed roadmap. There is no
description of how the layers fit together, no contributor guide, and no
instructions of any kind for coding assistants.

Two forces make this worth deciding deliberately rather than letting it accrete.

The repository is a monorepo with a layered dependency chain — a parser and
validator, an editor-independent language service, a Language Server Protocol
adapter, a server runtime, and four consumers (VS Code, JetBrains, a web editor,
and a CodeMirror package used by a separate Obsidian repository). The
relationships between these layers are load-bearing, not obvious from any single
file, and the most expensive thing to reconstruct for anyone new to the project.

Development uses several different LLM coding tools, not one. Each tool has its
own convention for project instructions — `CLAUDE.md`, `.cursor/rules/`,
`.github/copilot-instructions.md`, and others. Writing the same instructions
into each is guaranteed to produce divergence, and divergent instructions are
worse than none: different tools then hold different beliefs about how the
project works.

Documentation for assistants and documentation for humans are largely the same
content. Package boundaries, invariants, and the check commands do not change
based on who is reading them. Maintaining two parallel bodies of text would
double the drift surface for no benefit.

## Decision

All project documentation lives in the repository as Markdown, versioned and
reviewed in the same pull request as the code it describes.

Documentation is organized by audience, with no content duplicated between
layers:

- **Users** — root `README.md` for the product, per-app READMEs for
  platform-specific installation and usage.
- **Consumers of published packages** — one README per package in `packages/*`,
  covering purpose, public API, and boundaries.
- **Contributors** — `CONTRIBUTING.md` for setup, checks, and the release
  process; `docs/architecture.md` for the layer map and dependency direction.
- **Decisions** — `docs/adr/`, per [0001](0001-record-architecture-decisions.md).
- **History** — a hand-written `CHANGELOG.md` per released package.

Brainstorming notes, feature designs, and implementation plans are temporary
working material, not repository documentation. Before a change is merged, any
reasoning that outlives the task is recorded in the durable destination that owns
it: decisions and rejected alternatives in an ADR, structural facts in
`docs/architecture.md`, and user-visible changes in a changelog. This avoids both
losing important reasoning and keeping task scaffolding that becomes stale as soon
as the work ships.

Directory and file names describe content, never the tool that produced them. The
same reasoning that rules out a vendor-specific instruction file rules out a
directory named after a generator: with several assistants in use, only one of them
would ever produce such a name.

`AGENTS.md` at the repository root is the single canonical set of instructions
for coding assistants, following the open `AGENTS.md` convention rather than any
one vendor's file name. Tool-specific locations become pointers containing a
reference to `AGENTS.md` and nothing else. Pointers are plain files rather than
symbolic links, because a symlink checked out on Windows without `core.symlinks`
degrades into a text file containing a path.

`AGENTS.md` stays short and stable: the layer map, the commands, the invariants,
and the rules for keeping documentation current. Detail belongs in `docs/` and is
linked, not inlined — some tools inject this file into every request, so its size
is a recurring cost. Nested `AGENTS.md` files are added only where the toolchain
genuinely differs, such as the Gradle and Kotlin build under `apps/jetbrains`.

Documentation is kept honest by deterministic checks rather than by review
attention or by an assistant reviewing pull requests. A `npm run check:docs`
target, runnable by a human, an assistant, or CI, is the enforcement mechanism.
Its initial checks: Markdown links resolve, including relative links to files, so
renames break the build; every package under `packages/*` has a README; each
released package's `package.json` version has a matching changelog heading; and
every name a README example imports from a workspace package is really exported by
it, which catches the most common form of public API drift.

Call signatures in examples are deliberately not verified. Doing so means compiling
the extracted snippets, which requires built declarations and therefore a build step
inside the documentation check — a cost this decision does not pay for now.
Signature drift is caught by reading the example, and the obligation to do so is
stated in `AGENTS.md`. The weaker guarantee is stated plainly wherever the check is
described, because a check believed to be stronger than it is would be worse than no
check.

Specific tool choices are implementation details, not part of this decision.

Assistant session memory and commit messages are not documentation. A durable
decision surfaced in a session is promoted into an ADR or the relevant document;
otherwise it does not exist as far as the project is concerned.

## Consequences

There is one place to look for any given piece of project knowledge, and one
place to change it. Documentation drift becomes visible in code review because
the text and the code appear in the same diff.

Every coding tool reads the same instructions, so their behavior converges
instead of diverging per tool. Adding support for a new tool costs one pointer
file.

The deterministic checks turn a class of documentation rot into build failures,
which is the only form of enforcement that survives a busy week. The export
verification in particular ties the published API surface to its documentation: a
rename that leaves a README behind stops the build rather than shipping.

The costs are real. `npm run check:docs` adds a maintenance surface of its own,
and a link checker that reaches the network is a source of flakiness — external
link checking may need to be scheduled rather than run per commit. Instructions
kept short enough to stay stable will sometimes be less specific than a given
task wants; the fix is to link to detail, not to grow the file. Pointer files are
a small, deliberate duplication accepted in exchange for not depending on symlink
behavior across platforms.

The `AGENTS.md` support matrix across tools is still moving. Pointer files
insulate the project from that, but which pointers are needed has to be verified
against the tools actually in use rather than assumed.

Deliberately out of scope for now, revisit if the need appears: a generated API
reference (TypeDoc), a documentation site (the GitHub Pages deployment currently
serves the web editor), and automated changelog generation (Changesets or
release-please) — the hand-written changelogs are currently better than generated
ones would be.

## Alternatives considered

**A vendor-specific instruction file as the source of truth, e.g. `CLAUDE.md`.**
Simplest, and needs no pointer files for the primary tool. Rejected because it
makes one tool's convention the project's convention and puts every other tool at
a permanent disadvantage, when the content is not tool-specific at all.

**Full instructions duplicated into each tool's location.** Every tool gets its
native format with no indirection. Rejected because divergence is inevitable —
one file gets updated, the others silently do not, and the project ends up with
contradictory instructions that are harder to debug than missing ones.

**Symbolic links from tool-specific names to `AGENTS.md`.** No duplication at
all, and widely used. Rejected on portability: this project is built on Windows,
macOS, and Linux, and a symlink checked out without `core.symlinks` becomes a
file containing a path, which a tool reads as garbage instructions rather than
failing loudly.

**An external wiki or knowledge base (Notion, Confluence).** Better editing and
already reachable through existing tooling. Rejected for anything code-adjacent:
it cannot be reviewed in the pull request that changes the code, drifts
immediately, and is invisible to assistants working in the repository. It remains
appropriate for non-code material such as GEDCOM specification research.

**An assistant reviewing pull requests for documentation drift in CI.** Catches
semantic drift that no deterministic check can express. Rejected as the primary
mechanism because it costs money per run, produces noise that trains reviewers to
dismiss it, and is non-reproducible. A prompt kept in `docs/prompts/` and run
deliberately gives most of the benefit with none of those properties; the CI
variant can be added later on top of the deterministic checks, not instead of
them.

**Separate documentation for humans and for assistants.** Each audience gets
text pitched at it exactly. Rejected because the content overlaps almost
entirely, and two copies of the same facts drift apart at twice the rate.
