## Why

The Obsidian plugin shows a record as the tree of its lines in the order the file writes
them, editable through the structure edits of #521 / #522, and the reader must also be able
to drag a row to change that order (issue #523). Order carries meaning: GEDCOM 7 says that
"substructures with the same structure type are in a fixed order" and that the first is the
most preferred (`gedcom-1-hierarchical-container-format.md`, "partially ordered"), so the
first `NAME` is the preferred one. Nothing in the service moves a structure:
`packages/language-service/src/libs/structure/edit.ts` has `addStructure`, `setValue` and
`removeStructure` only, and an editor that cuts and pastes text itself would have to know
where a structure's subtree and continuation lines end.

## What the user asked for

From issue #523: an edit `moveStructure(position, target, expectedVersion)` in the style of
`removeStructure` that moves one structure, with its substructures and `CONC` / `CONT` lines,
to a slot among the siblings of the same parent, before a given sibling or at the end; levels
unchanged, no other line touched; a stale version refused; a move that leaves the order as it
is answered with an empty edit, not a refusal. Refusals with codes a UI can word. The valid
slots known before the drop, from the same rule as the refusal. Not needed: moving into
another parent, moving whole records, anything about how the drag looks.

The issue asked whether the standard forbids any order among siblings beyond the file's
`HEAD` / `TRLR` and 7.0's `GEDC` first in `HEAD`. It does not: `HEAD` first and `TRLR` last
concern records (`gedcom-3-structures-1-organization.md`, "the `HEADER` must come first and
`TRLR` must be last"), continuation lines are not siblings ("They must appear immediately
following the line whose payload they are encoding"), and `GEDC` first is a recommendation
("It is recommended that `GEDC` be the first substructure of the header"), as are `SCHMA`
before any extension tag and `CHIL` in birth order.

Order does decide how a document is read inside `HEAD`, where the first occurrence wins: a
`SYST` before `GEDC` makes the file a Personal Ancestral File that is not validated
(`packages/validator/src/validator/versionRegistry.ts:111-119`, step 1 of FamilySearch's
version detection), the first `VERS` under `GEDC` names the version
(`versionRegistry.ts:123-125`), and the first declaration of a tag in `SCHMA` is the one kept
(`extensions.ts:95`). Measured against the validator's build: moving the `GEDC` of a 7.0
document after its `SYST` leaves the dialect undefined and three diagnostics replaced by one
`VAL015` warning. Outside `HEAD` no diagnostic depends on sibling order, except where
siblings are written at a wrong level: the parser takes a line's parent from its level, so
moving `2 PLAC` before `3 DATE` under a `BIRT` makes the `DATE` a child of the `PLAC`.

The user's decision, 2026-11-12, of the three options put to them — A: no order rules, every
sibling slot allowed; B: A with `GEDC` held first in a 7.0 `HEAD`; C: A with warnings for the
three recommendations: "берём A".

The user's decision after the review of the plan, 2026-11-12, of three options for a move that
changes how the document is read — 1: refuse it with a code of its own, the description
listing slots by place only; 2: as 1, the description trying every slot under `HEAD`; 3: no
move inside `HEAD`: "1".

## What Changes

- `moveStructure(position, target, expectedVersion)` returns a `StructureEditResult` or an
  `EditRefusal`. `target` is `{ before: Position }`, a line of a sibling, or `{ end: true }`.
  The structure's lines move as they are written; nothing else is rewritten.
- `describeMove(position)` answers, before a drop, the structure's range and every slot among
  its siblings in file order, each saying whether taking it changes the order.
- Refusals: `not-a-structure`, `record-edit-unsupported` for a record, `not-a-sibling` (new)
  for a target that is not a sibling of the structure, `no-dialect`, `stale-document`, and
  `reading-changed` (new) for a move after which the document is read otherwise: another
  version resolution or dialect, or other diagnostics by code and message.
- No sibling order is refused or warned about for its own sake, in either 5.5.1 or 7.0. A
  slot `describeMove` lists is never refused for its place; a move to it can still be refused
  with `reading-changed`, which today only a move under `HEAD` or among siblings written at a
  wrong level causes.

### Out of scope

Moving a structure into another parent, moving records among records, and any rule or warning
for the recommended orders (`GEDC` first, `SCHMA` before extensions, `CHIL` by birth).

## Capabilities

### New Capabilities

- `language-service/structure-move`: moving one substructure among its siblings and
  describing the slots it may take.

### Modified Capabilities

None. `language-service/structure-edit` keeps its three operations and its revalidation; a
move reuses its refusal codes but is revalidated by a rule of its own, since every line it
writes is a line that was already there.

## Impact

- Layers: `language-service` only (`libs/structure`, `types.ts`, the service class, its
  README). The validator is read, not changed; the dependency direction still points down.
- Hosts: the Obsidian plugin, outside this repository. VS Code, JetBrains and the web editor
  are untouched: `language-server` and `codemirror` call none of the structure edits, and no
  diagnostic changes, so the conformance record stays.
- `EditRefusalCode` widens by `not-a-sibling` and `reading-changed`; new exported types `MoveTarget`,
  `MoveDescription` and `MoveSlot`. No version of any package is decided here.
