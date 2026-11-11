## Context

`setValue` and `validateValue` refuse every level-0 line before looking at it. The rest of
the machinery already fits a record: `describeStructure` reads a record's shape from
`GedcomDocument.getStructureShape(node)` (payload kind, required, `lineBreaks`), the writer
takes the line's head as `level tag`, and the replacement of a line with its leading
continuation run leaves the other children alone. A structure with no payload type is
skipped by `RuleNode.collect` (`rule-node.ts`, `fieldType.type === null`), so nothing in the
pipeline refuses a value for it today. See proposal.md for why. These are behaviour
decisions: the spec holds the contract, no ADR (ADR-0018).

## Goals / Non-Goals

**Goals:** the edits #527 asks for, and the same answer for a value where none is allowed,
whether the structure is a record or not.

**Non-Goals:** diagnostics for existing files; editing an identifier or a tag.

## Decisions

**One route for a record.** `typeAtPath` answers the root type `""` for an empty path, so
`GedcomDocument.checkPayload([], tag, value, recordNode)` and the record table of
`getRules(scheme, "")` serve a record as they serve any field. In `setValue` the record branch
reads the record's own shape (`getStructureShape(node)`, or the extension shape the
description uses) for the kind, `lineBreaks` and `concatenate`, and the name policy is not
asked, since a record has no parent. A record whose tag is unknown has no shape; it is written
and refused by the revalidation as `unknown-field` (`VAL001` on the written line).

**Writing the opening line.** The writer is given the head `@N1@ SNOTE` in place of the tag,
so the identifier and the tag are kept as written and the 5.5.1 room for the first line counts
them. `CONT` and `CONC` go one level below, at 1. The edit replaces the opening line and its
leading continuation run, and removes stray continuation lines, as for any other value. The
revalidation scope is the record itself, and `HEAD` keeps its whole-document scope.

**One source for the checks of a value.** `checkPayload` answers the new rules, and
`setValue` and `addStructure` refuse from its answer rather than from a second test of their
own, so `validateValue` and the operations cannot drift apart:

- `VAL018` (`ValueNotAllowed`, `{ tag }`) for a non-empty value where the payload type is
  `null` in the scheme, the standard's "no payload descriptor". It is keyed on that `null`,
  not on the kind `none`, which an unnamed type would also give (#112; none exists today, and
  a test keeps it so). The 5.5.1 scheme gives the family `EVEN` a `null` type although its
  grammar reads `[<EVENT_DESCRIPTOR> | <NULL>]`; that type is exempted by name here, and
  correcting the scheme, which would add a diagnostic to existing files, is #528.
- `VAL019` (`EmptyStructure`, `{ tag }`) for an empty value on a 7.0 record whose payload type
  is not `null` and whose children are only continuation lines. Only records: an emptied
  substructure keeps the behaviour #524 settled for the parts of a name, and an emptied event
  stays the warning `VAL010` it is today.
  Both are answered for a value about to be written only; the validator reports neither for a
  file, so no diagnostic changes.

**`record-edit-unsupported`.** It stays for `removeStructure` at a record, where removing an
`INDI` would leave pointers to it elsewhere.

**Known gap.** An extension tag that `SCHMA` declares as a standard record is still described
and written as an extension, so a value for an aliased `INDI` is not refused.

## Risks / Trade-offs

- [A host that switched on `record-edit-unsupported` from `setValue`] → the code only came
  from #522, which no released version carries yet.
- [The 5.5.1 family `EVEN` exemption is a name in code] → it stays until the scheme is
  corrected in its own issue, with a test that names it.
