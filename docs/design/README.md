# Designs

One document per piece of work: what is being built, why, and where its boundaries
are. Designs describe intent, not current state.

These are scaffolding. The repository's durable documentation is
[docs/architecture.md](../architecture.md) for how things are, and
[docs/adr/](../adr/) for why they were decided that way.

Separate step-by-step implementation plans are not kept here. Ordering that matters
— a sequence containing an irreversible step, or work that alternates between
repositories — is a section of the design, written as constraints rather than as a
checklist. A plan is the fastest-staling document a repository can hold: every
completed step makes it wrong, and nothing in it outlives the task, because the
reasoning lives in the design. Progress belongs in git history, pull requests, and
[TODO.md](../../TODO.md).

Execution rules that apply to more than one task are not design content either.
They belong in [AGENTS.md](../../AGENTS.md), where they survive the document's
deletion — release approval gates most of all.

## Lifecycle

Every document carries a status header:

```text
- **Status:** Draft | In progress | Shipped | Abandoned
- **Started:** YYYY-MM-DD
```

Without it, a reader cannot tell an active design from an abandoned one, and a
stale document is worse than a missing one.

**When the work ships, drain the document before deleting it.** Anything that
outlives the task — a decision that would be expensive to reverse, and the
alternatives that were rejected — moves into an ADR. Anything describing current
structure moves into `docs/architecture.md`. User-visible changes go into the
relevant `CHANGELOG.md`. Only then is the document removed.

This rule exists because it was once skipped. The July 2026 npm publishing design
was deleted with the commit that shipped it, taking with it the reasoning behind
independent per-package versioning, OIDC Trusted Publishing, and the boundary with
the Obsidian repository. That reasoning had to be recovered from git history and
written up as [ADR 0003](../adr/0003-independent-package-publishing.md).

**When work is abandoned**, mark it `Abandoned` with a one-line reason and delete
it. If the reason is itself interesting — an approach that looked right and was
not — that belongs in an ADR too.

## Conventions

- One directory, flat. Filenames are `YYYY-MM-DD-short-slug-design.md`.
- Documents are not immutable. Unlike ADRs, they are revised as understanding
  improves — that is what they are for.
