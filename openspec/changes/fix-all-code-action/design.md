## Context

`getCodeActions` answers per diagnostic and per cursor range; each answer is a
`quickfix`. The server flattens them and ignores `context.only`. Fix-all is the first
action that spans the whole document, so it is computed from the current diagnostics, not
from the requested ones. This is a behaviour decision: the spec holds the contract, no ADR
(ADR-0018).

## Decisions

**Which fixes.** Exactly the ones a quick fix already offers without a choice: **Add
trailer**, **Add a GEDCOM 7.0 header**, **Change level to N**. The header and the trailer
reuse the existing action builders. An unresolved xref has up to three answers and needs
the author, so none of them joins.

**One edit.** The fixes become one `WorkspaceEdit` at the document's version. LSP allows
several inserts at one position and any number of inserts followed by one replace at the
same start, so the edits are ordered header, level fixes, trailer, and keep that order
when sorted by offset (the sort is stable). An empty document gets the header and the
trailer as two inserts at `0:0`, in that order.

**Level fixes are checked together.** The per-diagnostic safety check of the quick fix
reparses the document once per diagnostic; for four hundred levels that is four hundred
parses. Fix-all instead applies all edits to the text, revalidates once, and requires that
no diagnostic code occurs more often than before and that the total falls. If it fails the
level fixes are dropped and the header and trailer, which cannot interact with them, are
checked the same way. Where nothing remains, nothing is offered.

**The `only` filter.** LSP kinds are hierarchical: a filter entry matches a kind equal to
it or beginning with it and a dot. The server answers `quickfix` actions only when the
filter is absent or matches `quickfix`, and the fix-all action when it matches
`source.fixAll` (so `source` matches too). Fix-on-save sends `only: ["source.fixAll"]`, so it
no longer computes quick fixes it discards.

**Without a filter.** A lightbulb request has no filter and arrives on every cursor
move. The fix-all action is then offered, and computed, only when the request's diagnostics
include one of the three kinds it would fix, so a cursor on any other line costs nothing.
With the filter it is computed whenever asked, whatever the request names.

**Kinds in the service.** `CodeAction.kind` widens from `"quickfix"` to
`"quickfix" | "source.fixAll"`; the service declares it itself, not from the LSP package.

**Cost.** One pass over the diagnostics and one revalidation, the same order as one
`isSafeLevelFix` today, however many diagnostics there are.

## Risks

- A host that groups source actions under its own menu will show the action there; JetBrains
  is the one not seen, hence the manual check in the tasks.
- Revalidation uses the document options the service was created with, so a fragment
  document is checked as a fragment.
