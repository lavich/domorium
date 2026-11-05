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
parses. Fix-all instead applies all edits to the text and revalidates once. The level fixes
hold only if the wrong-level diagnostics fall by exactly the number fixed: a fix that makes
the next line's level wrong (`2 NAME` then `3 GIVN` under an `INDI`) shows up as a diagnostic
that was not there. If they do not hold they are dropped and the rest is offered; where
nothing remains, nothing is offered. The check does not compare other codes: a header gives
the validator a version to check against, and the diagnostics that appear then are not
regressions.

**A header reveals the trailer.** Without a version the validator does not report a missing
`TRLR`, so a file with neither shows only the header. The same revalidation reveals it, and
the trailer insert (positioned from the original text, at its end) joins the edit, so one
action completes the file.

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

## Implementation

- The first plan required that no diagnostic code occurs more often after the edit than before.
  Applied to a file with no header it always failed: the header gives the validator a version,
  and the checks against it are new diagnostics that are not regressions. The check is now the
  level count alone, and the revealed trailer is added to the edit.
- The header and trailer texts are exposed as `headerEdit` and `trailerEdit`, which the two
  quick fixes and fix-all share.
- Existing stdio tests of the two quick fixes now send `only: ["quickfix"]`, since a request
  without a filter that names a fixable diagnostic also returns the fix-all action.
