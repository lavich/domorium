## Context

The structure edits live in `packages/language-service/src/libs/structure/edit.ts`: `gate`
refuses a stale version and a document with no dialect, `structureAt` (`locate.ts`) maps a
line, a continuation line included, to its structure, `subtreeEnd` finds a structure's last
line, `removeLines` and `insertAfter` build the text edits, and `verify` applies the edits,
revalidates and turns an added error into a refusal. See proposal.md for why. These are
behaviour decisions: the spec holds the contract, no ADR (ADR-0018).

## Goals / Non-Goals

**Goals:** a move and its description from one rule, so that no slot the description lists is
refused for its place.

**Non-Goals:** a single operation for "move up" or "move down" (a host names the sibling);
moving across parents.

## Decisions

**A new module beside the edits.** `libs/structure/move.ts` holds `moveStructure` and
`describeMove`; `edit.ts` exports `gate`, `removeLines` and `isContinuation` for it.
The rule both share is one function, `slotsOf`: the children of the parent that
`structureAt` would answer for their own line — a level and a tag, not `CONT` or `CONC` — in
order, each as a slot before it, then the end, with `changesOrder` false for the
structure itself, the sibling after it, and the end when it is the last. `moveStructure`
resolves the target, finds its slot among `slotsOf(node)` and answers the empty edit for a
slot that keeps the order. Alternative: listing slots in `describeStructure` per occurrence;
rejected because that description groups children by field and loses the file's order, which
is the order a drag works in.

**The target as a line, resolved like the position.** `{ before: Position }` goes through
`structureAt`, so a sibling's continuation line names the sibling, as the position's does;
the resolved node must be a child of the structure's parent and not a continuation, otherwise
`not-a-sibling`. `{ end: true }` names the slot after the last sibling. Alternative: a sibling
index; rejected because every other entry point takes a position, and an index read before
an edit is as stale as a line, without the version check to catch it.

**A parent that is no structure.** A line with no level becomes a root and adopts the lines
after it, and a line with a level and no tag, such as `1`, adopts the deeper lines after it,
so a structure's parent can be a line `structureAt` would not answer for. Such a
parent refuses the move with `not-a-structure`, as a position on it would.

**Two text edits, no rewrite.** The block runs from the structure's line to its subtree's last
line, extended over the following lines that hold no node and are not blank — a line the lexer
could not read belongs to the subtree it stands in, a blank line may only separate records —
up to the next node. It is sliced from the document, so each line keeps its own terminator in
a file that mixes them. One edit removes those lines (`removeLines`, which already handles the
last line of a text with no final terminator). The other inserts the block:

- before a sibling, at the start of the sibling's line;
- at the end, when a line follows the last sibling's block, at the start of that line;
- at the end, when the last sibling's block ends the text, at the end of the text, as the
  block's own last terminator followed by the block without it.

A block that ended the text has no terminator of its own; it takes the one `removeLines`
removed, the terminator of the line before it.
The two never overlap: a target that would touch the removed span is one of the slots
that keep the order. Rewriting the span between the two places as one edit was rejected: it
would touch lines the move does not change, against the structure-edit rule an editor's undo
and diff rely on.

**Revalidation of the whole reading, not of written lines.** `verify` (`edit.ts`) treats
every diagnostic on a written line as added, apart from `VAL002`; for a move every line of the
block is written, so a `DATE` that was already wrong would refuse it. Its per-code count
comparison inside the parent's scope misses the other way a move goes wrong: inside `HEAD` the
first `SYST`, `GEDC`, `VERS` or `SCHMA.TAG` wins (proposal), so a move can drop the dialect or
lower a count and pass. A move therefore does not use `verify`. `moveStructure` builds the
moved document with the same options and compares it with the current one:
`getErrors()` of each, the whole document, as a multiset of `code` and `message`;
`getVersionResolution().kind` and `getValidatedDialect()`; and, for every line with an
extension tag, the tag with the URI `getLabel` reads for it, as a multiset. Any difference
refuses with `reading-changed`, carrying the first added or lost diagnostic's code as
`diagnosticCode` when there is one; equality answers the edit with no warnings. Every
resolution or dialect change found so far also changes a diagnostic, so those two checks hold
for a document clean in both readings rather than for a tested case of their own; a `SCHMA`
swap of two unknown URIs changes no diagnostic, which is what the extension comparison is
for. The validator's messages hold no line numbers
(checked: none interpolates a position), so a moved diagnostic compares equal. A full parse
is what every structure edit already pays in `verify`. Alternative: keep `verify` with a
`moved` flag that skips the written-line rule; rejected because the count comparison in the
parent's scope cannot see the dialect change or a falling count.

**No reciprocal or dialect rule for a move.** A move writes no pointer and removes none, so
`reciprocal-pointer-unsupported` does not apply; the user chose no order rule (proposal,
option A). `gate` is still asked first, so a stale version and a document with no dialect are
refused before an empty edit is answered.

**Types.** `MoveTarget = { before: Position } | { end: true }`;
`MoveSlot { target: MoveTarget; changesOrder: boolean }`;
`MoveDescription { ok: true; version; range; subtreeRange; slots: MoveSlot[] }`, exported
beside `StructureEditResult`. `EditRefusalCode` gains `not-a-sibling` and `reading-changed`.

## Risks / Trade-offs

- [A host drops onto a slot of an older description] → the move takes `expectedVersion` and
  refuses with `stale-document`; `describeMove` answers its version as `describeStructure`
  does.
- [A slot `describeMove` lists is refused with `reading-changed`] → only a move under `HEAD`,
  or among siblings written at a wrong level, does that today; the host shows the refusal as for any drop, and the spec says a listed slot
  may be refused that way. Trying every slot in the description was option 2, declined.
- [A diagnostic whose message one day names a line] → a move would then be refused as a change
  of reading; a test moving every slot of a fixture with diagnostics catches it.
- [Moving `GEDC` away from the first place in a 7.0 `HEAD` is allowed] → the standard
  recommends, not requires, that place (proposal); the user chose option A.

## Implementation

- `insertAfter` stays private: the move builds its insertions itself, from the block.
- The cross-review of the code added the lexer-unreadable and blank-line rules of the block,
  the terminator a block that ended the text takes, the extension-URI comparison, and the
  refusal of a continuation beneath a continuation (`structureAt` answers the outer one).
- `npm run check` passed with `check:jetbrains` run.
