## Why

The Obsidian plugin gives shared notes, note records and records of the file's own a card
with the tree of their lines, editable through the structure edits of #521 / #522, and its
main use is changing a note's text. That is the one edit the service refuses: `setValue` on
a record's opening line answers `record-edit-unsupported` for every line at level 0
(`packages/language-service/src/libs/structure/edit.ts:359-365`), and `validateValue`
refuses the same way (`validateValue.ts:33-38`), although `describeStructure` already
describes the value of those lines (issue #527).

While probing it, a wider gap showed: `setValue` on a structure the standard gives no value,
such as `3 MAP`, writes `3 MAP oops` and `validateValue` answers no problem, though 7.0 says
"If there is no payload descriptor, the described structure must not have a payload".

## What Changes

- `setValue` and `validateValue` at a record's opening line write and check the record's
  value where the standard gives that record one: a 7.0 `SNOTE`, a 5.5.1 `NOTE` record, a
  record with an extension tag. The identifier and the tag stay; the old continuation lines
  are replaced; every other line beneath the record stays.
- A value for any structure the standard gives none, a record such as `INDI` or `HEAD` or a
  substructure such as `MAP`, is refused with a code of its own, `value-not-allowed`, by
  `setValue`, `addStructure` and `validateValue`. The validator answers it for a value about
  to be written as `VAL018`, with the tag in `data`.
- Emptying a record's value is refused with `value-required` where the dialect requires the
  value, and where a 7.0 record would be left with neither a value nor a substructure
  (`VAL019`). A substructure emptied by `setValue` behaves as before.
- Removing a whole record stays refused with `record-edit-unsupported`.

The user's decision, 2026-11-11: option A of the three put to them, records' opening lines
plus `value-not-allowed` for every structure that takes no value ("да"). A diagnostic of the
validator for such a value or an empty structure already in a file is left to its own issue,
as every editor would show it.

The user's decision after the review of the plan, 2026-11-11: the 7.0 rule that a structure
needs a value or a substructure applies to records only, so an emptied part of a name keeps
the behaviour #524 settled; the 5.5.1 family `EVEN` is exempted here and its scheme entry goes
to its own issue ("да").

### Out of scope

Changing a record's identifier (`rename`) or its tag, adding or removing whole records, and
diagnostics for existing files.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `language-service/structure-edit`: the value of a record's opening line can be set and
  checked, `value-not-allowed`, the emptied-value rule; `record-edit-unsupported` narrows to
  removing a record.
- `validator/diagnostic-facts`: `VAL018` and `VAL019` carry the tag in `data`.

## Impact

- Layers: `validator` (`checkPayload` at the level of records, the code `VAL018`) and
  `language-service` (`setValue`, `addStructure`, `validateValue`). The dependency direction
  still points down.
- Hosts: the Obsidian plugin. VS Code, JetBrains and the web editor are untouched; no
  diagnostic changes, so the conformance record stays.
- `EditRefusalCode` widens by `value-not-allowed`; `record-edit-unsupported` is no longer
  answered by `setValue`. No version of any package is decided here.
