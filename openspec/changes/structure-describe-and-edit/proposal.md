## Why

The Obsidian plugin ([domorium-obsidian](https://github.com/lavich/domorium-obsidian))
wants a form in its record card where a reader edits, adds and deletes the names of a
person without knowing GEDCOM tags or where they go. The file stays the source of truth;
the form writes lines into the text. What a structure may hold, where each line goes and
what is valid is knowledge of the standard and the dialect. It belongs here, so that no
editor keeps its own copy that drifts. Today the service can diagnose a document and
answer `rename` and `moveFileLinks`, but it cannot describe the fields of a structure or
change one (issue #521).

The first consumer is `INDI.NAME`. Every other structure — an event, a source citation, a
family — has the same shape of question, so the contract is made for structures, not for
names.

## What Changes

- The validator exposes what its schema says about a structure: the substructures it may
  hold with their cardinality and payload kind, and the values of an enumeration, in the
  dialect the document was checked against. It also exposes the escape and the unescape of
  a text payload, which it owns as the owner of the format.
- The language service describes the structure at a position: its fields with a stable
  dialect-neutral id, requiredness, repeatability, payload kind, and the occurrences the
  document already holds, each with its range.
- The language service adds, sets and removes one substructure at a position, returning a
  `WorkspaceEdit` or an `EditRefusal`. The edit carries the level, the place among
  siblings, escaping and continuation lines, and touches no other line.
- A value that breaks a rule of the dialect is refused with a code that names the rule.
  A problem the validator reports as a warning does not refuse, except an unknown tag: it
  comes back beside the edit, so the caller can show it or ignore it.
- A value can be checked without building an edit, so a form can validate a field as the
  reader types.
- The description carries enough of the payload to choose a widget (a date, an age, a
  language tag, an enumeration, a pointer with the records it may point to, whether the
  payload is required), and a structure can be described by its schema path before any of
  it exists in the document, so a form can draw `INDI.NAME.TRAN.LANG`.
- A pointer field that has a reciprocal on the other record is described, and writing it
  is refused until a policy writes both sides, so no edit breaks a reciprocal pointer.
- A small registry of per-structure policies keeps related lines consistent. The first
  entry keeps the `/Surname/` of a `NAME` payload in step with its `SURN` and `GIVN`.

### Out of scope

Creating or removing a whole record, how a form looks, and a second parser or model in a
host. Exporting the validator's rules for dates, ages and names as data: a host gets the
kind of widget and asks the service about a value. Exposing the operations through the language server is left for a request from
LSP hosts; no LSP host asks for it.

## Capabilities

### New Capabilities

- `validator/structure-schema`: what the schema of a dialect says about the fields of a
  structure, readable from a parsed document, and how a payload is escaped and read back.
- `language-service/structure-description`: the description of the structure at a
  position or at a schema path, its field ids, payload detail, occurrences and their
  ranges.
- `language-service/structure-edit`: add, set and remove a substructure, how the line is
  written and placed, the refusal codes, the warnings that pass, the check of a value
  without an edit, reciprocal pointers, and the stale-version refusal.

### Modified Capabilities

None.

## Impact

- Layers: `validator` (a method on `GedcomDocument` and its types), `language-service`
  (three operations, a description, the policy registry, new refusal codes). The
  dependency direction still points down; nothing in `validator` learns about edits and
  nothing in `language-service` reads the schema files.
- Hosts: the Obsidian plugin gains the API it asked for. VS Code, JetBrains and the web
  editor are untouched; `language-server` and `codemirror` do not change.
- `EditRefusalCode` widens, which is additive for a caller that switches on it with a
  default branch. No new dependency, no version of any package decided here.
