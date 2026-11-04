## Context

See proposal.md — Why. Observed in the code:

- A missing `TRLR` is `VAL002` pushed by `GedcomValidator.collect` with the range
  `parent?.range ?? 0:0`, so at the root it is always `0:0`.
- A missing `HEAD` yields no `VAL002`: with no version the document stops at `VAL012`
  , whose range is `VERS`'s value, else `HEAD`'s, else the origin
  . With no `HEAD` it is the origin.
- `Diagnostic.data` and `GedcomError.data` (`errors.ts`) carry `xref`,
  `requiredRecordTag` and `expectedLevel`. The language server finds the current diagnostic
  by code, message and range and so recovers `data`; CodeMirror
  passes the diagnostic it was given.
- `getCodeActions` keeps a diagnostic only where `overlaps(diagnostic.range, requested)`,
  which compares ends strictly; a range of zero width never
  overlaps anything.
- `unresolvedXrefActions` already finds the `TRLR` line, and `terminatorOf` already reads
  the document's terminator.

Behaviour decision, not an architecture one (ADR-0018): the spec holds the contract.

## Goals / Non-Goals

**Goals**

- Two actions, for `TRLR` and for `HEAD`, working from an empty file to a valid one.
- The text of a minimal header and of the trailer is produced in one place in
  `language-service`, so a future "new file" command can reuse it.

**Non-Goals**

- A missing final newline: no diagnostic exists, and an editor setting covers it.
- Headers for 5.5.1, or a header for a `HEAD` that lacks only its version.
- A "fix all" action, and the new-file command itself.

## Decisions

**The validator marks, the service decides.** Diagnostics gain a `missingTag` field
(`"TRLR"`) on `VAL002`, set only for a missing root `TRLR`, and `missingHeader: true` on
`VAL012`. The latter needs a flag on `VersionResolution`, which `resolveGedcomVersion`
computes without one and which the package exports, so the
README of `validator` changes too. The service reads those and
never parses messages or re-scans the document for the absence. Alternative: the service
scans for `HEAD`/`TRLR` itself — rejected; two places would define "missing".

**`TRLR` is reported on the last GEDCOM line.** The validator sees nodes, not text
(`collect` takes no text), so it can name a line but not the end of the document; the
last node that carries a level gives a range with a width, which every host can show and
ask about. The service computes where to insert from the text, at its very end, so trailing
blank lines or a stray line do not move the insertion. Only `TRLR` moves; other root tags
keep `0:0`. Alternative: keep `0:0` — rejected, the action would appear only with the cursor
on the first line. Alternative: give the validator the text — rejected, a second source for
what the document's end is.

The missing-`TRLR` diagnostic cannot occur on an empty document: with no version the
validator stops at `VAL012`, so the empty file is first answered by the header action.

**A zero-width diagnostic is matched by line.** Only `VAL012` for an absent `HEAD` is
zero-width after this change (`0:0`). `overlaps` is strict at both ends, so it would never
be offered, and a host that widens an empty marker to one character would ask over a range
that does not touch the original. A zero-width diagnostic therefore matches a request on its
line; a diagnostic with a width keeps today's rule, so a cursor at the edge of an xref still
gets nothing. Existing tests pass the diagnostic's own range and would not catch a symmetric
"touches" rule, so one test pins the xref boundary.

**One version, 7.0.** The header is `0 HEAD`, `1 GEDC`, `2 VERS 7.0`; the title says
"GEDCOM 7.0" so the author chooses it knowingly. A 5.5.1 header needs a `SUBM` record and
`CHAR`, which are the author's data. Adding the header can surface 7.0 diagnostics in a
file written for 5.5.1; the title is the warning, and the action is one undo from reverted.

**Insertion.** `HEAD` goes at `0:0`. `TRLR` goes at the end of the document; a terminator
is written first when the last line has none. The terminator is `terminatorOf(text)`.

## Risks / Trade-offs

- [The `TRLR` diagnostic moves in every host] → a scenario in the spec and a test in
  `validator`; `check:conformance` is run and any record it flags is read for position
  changes only.
- [JetBrains' client may treat a diagnostic at the end of the file differently] → checked by
  hand in a real IDE before the PR is merged, as no automated test reaches it.
- [A fix applied to a 5.5.1 file turns it into a 7.0 file] → the title names the version;
  no other version is offered.
- [Changing `overlaps` affects other actions] → the rule applies only to ranges without
  width; the existing tests run unchanged, and one test pins the edge of an xref.

## Migration Plan

None. No stored data, no protocol change. Releases are decided separately; the touched
units are `validator`, `language-service` and, through them, the hosts.

## Implementation

- `check:conformance` passed without `--update`: the records and digests do not depend on
  where a `VAL002` sits, so no corpus record changed. The risk entry above overstates it.
- The changelogs of `validator`, `language-service` and the hosts are not touched: no
  version is bumped here, and an entry belongs with the bump that releases them.
- `terminatorOf` moved from `codeActions.ts` to `position/lineTerminators.ts` so the new
  module and `codeActions.ts` share it without importing each other.
- The one-line feature lists (`README.md`, `apps/vscode/README.md`, `plugin.xml`,
  `abilities.ts`, `integrations.ts`) now say "a missing header or trailer".
- No guard against an existing `TRLR` inside the trailer action: `getCodeActions` already
  drops a diagnostic the document no longer has, which is what the spec scenario pins.
- A fragment never carries `missingHeader`: it has no header to lack, so it is offered no
  header action.
- `lastGedcomLine` follows the last child of the last record rather than walking the whole
  tree; a record with a hundred thousand children overflowed the argument limit when its
  children were spread into a stack.
