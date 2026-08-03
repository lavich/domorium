# Architecture Decision Records

Each ADR captures one significant decision: the context that forced it, the
choice made, and the consequences accepted. Records are immutable once
accepted — a decision that no longer holds is superseded by a newer ADR rather
than edited in place.

Use [template.md](template.md) for new records. Number them sequentially and
never reuse a number. The table below is part of the record: `npm run check:docs`
fails if a file in this directory is missing from it, or if two records share a
number.

| ADR                                                 | Title                                          | Status   |
| --------------------------------------------------- | ---------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md)       | Record architecture decisions                  | Accepted |
| [0002](0002-documentation-in-repository.md)         | Documentation lives in the repository          | Accepted |
| [0003](0003-independent-package-publishing.md)      | Publish shared packages independently via OIDC | Accepted |
| [0004](0004-standard-semantic-token-vocabulary.md)  | Use the standard LSP semantic token vocabulary | Accepted |
| [0005](0005-obsidian-plugin-separate-repository.md) | Keep the Obsidian plugin in its own repository | Accepted |

## What belongs in an ADR

A decision belongs here when reversing it later would be expensive: package
boundaries, protocol and format choices, release topology, toolchain
commitments, and anything a future contributor would otherwise have to
reconstruct from commit history.

Routine implementation choices do not belong here. Roadmap items live in
[TODO.md](../../TODO.md), and longer-range directions in
[roadmap.md](../roadmap.md). Brainstorming notes and implementation plans remain
temporary; any decision from them that outlives the task is recorded here before
the change is merged.
