# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-30

## Context

This project has accumulated architectural decisions with real reasoning behind
them — scoping the published packages under `@gedcom`, adopting the standard
Language Server Protocol semantic token types instead of custom ones, splitting
the Obsidian plugin into a separate repository, keeping CodeMirror dependencies
external and single-instanced. None of that reasoning is written down.

It survives in three unreliable places. Commit messages record what changed but
rarely which alternatives were rejected and why. Assistant session memory is
local, unversioned, and invisible to anyone else working on the repository.
Human memory decays.

The practical cost appears when a decision is revisited. Without a record, the
same alternatives get re-proposed, the constraints that ruled them out have to
be rediscovered, and a decision that was deliberate becomes indistinguishable
from an accident of implementation order.

## Decision

Record significant architecture decisions as sequentially numbered ADRs in
`docs/adr/`, following the lightweight format popularized by Michael Nygard:
context, decision, consequences, alternatives considered.

Records are immutable once accepted. A decision that no longer holds is
superseded by a new ADR that links back to it, leaving the original readable as
history. Numbers are never reused.

The bar for a record is reversal cost: if undoing the decision later would be
expensive, it belongs here. Routine implementation choices do not. Roadmap items
stay in `TODO.md`, longer-range directions in `docs/roadmap.md`, and feature designs
in `docs/design/`.

## Consequences

A contributor — human or assistant — can reconstruct why the codebase is shaped
the way it is by reading a short, ordered set of documents rather than mining
git history.

Rejected alternatives become visible, which is the part that saves the most time
later. It also makes disagreement productive: an ADR can be argued against on
its recorded reasoning instead of on speculation about intent.

The cost is a small amount of writing at each significant decision, and the
discipline to write it when the decision is made rather than months later.
Retroactive ADRs are worth adding for decisions already in force, but they
reconstruct reasoning rather than capture it, and are weaker for it.

Records will sometimes be skipped. A partial set is still more useful than none,
so a missed record is not a reason to abandon the practice.

## Alternatives considered

**Rely on commit messages and pull request descriptions.** Zero additional
process, and this repository already writes decent ones. Rejected because they
are ordered by time rather than by topic, are not revisable into a current view,
and describe changes rather than decisions. Finding "why is the Obsidian plugin
a separate repository" means knowing which commit to look for.

**A single long `DECISIONS.md`.** Simpler to navigate at small scale. Rejected
because it invites editing history in place, which destroys the record's value,
and because it grows into a file nobody reads end to end.

**An external wiki or knowledge base.** Better editing experience and available
through existing tooling. Rejected because decisions would no longer be reviewed
alongside the code that implements them, and would drift from it. See
[0002](0002-documentation-in-repository.md).

**No records; treat the code as the documentation.** The code shows the current
state accurately and cannot go stale. Rejected because it cannot express what
was considered and rejected, which is precisely the information that prevents
relitigating settled questions.
