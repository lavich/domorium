## Context

The schema of each dialect lives in `validator` and nothing outside it reads it:
`GedcomDocument` wraps the scheme and answers `getLabel` and `getPointerTargetTag` for a
node through `RuleNode`, and `getCompletions` through the scheme directly. The scheme already holds what the form
needs: `substructure` (tags with cardinality `{0:M}`), `payload` (kind, and the enum set),
`set` (the values), `label`. The service already has the pattern for an edit: `rename` and
`fixAll` return a `WorkspaceEdit` or an `EditRefusal`, take an `expectedVersion`, and the
fix-all action revalidates by applying the edit to the text and building a document again.

See proposal.md for why. The decisions below are behaviour decisions: the specs hold
the contract, no ADR (ADR-0018). Nothing here crosses a package boundary that is not
already crossed in that direction.

## Goals / Non-Goals

**Goals:**

- One pair of primitives, schema-driven, that works for every structure the scheme knows,
  with `INDI.NAME` as the first thing tested, not the only thing possible.
- A host picks its labels and messages by id and code, never by parsing text.

**Non-Goals:**

- Exposing the operations through `language-server`. No LSP host asks for it; it is a
  later change over the same service methods.
- A path-addressed API. See the addressing decision.

## Decisions

**Where the schema is read.** A method on `GedcomDocument`, beside `getLabel`, returns the
fields of a node, of a tag beneath a node, or of a schema path from a record, as plain
data: `{ tag, min, max, payload }` with `payload` of a closed list of kinds (text, integer,
boolean, enum with values, multi-valued enum, pointer with the target tag, date, date
period, exact date, time, age, language tag, media type, latitude, longitude, personal
name, tag definition, none for a structure with no payload) and whether it is required. The
kinds are derived from the `FieldType`s and the payload table that `rule-node.ts` already
uses; the 5.5.1 text-or-pointer fields of ADR-0010 are their own kind. Required is read from
the same rule that decides the validator's `VAL003` in each dialect, which is not exported
today, so the validator gains one public read of it. Cardinality is read with the existing
`parseCardinality`. A document counts as having a dialect when it was validated against one,
which a fragment with `options.dialect` was and `getDialect()` does not say. `language-service` gets no scheme and no `RuleNode`; its dependency stays
the document. Alternative: export the scheme from `validator`. Rejected: a second reader of
the scheme files would hold the rules the validator holds, which is the drift the issue
asks to avoid.

**Addressing is by position.** Like `rename` and `references`: it fits LSP hosts and a
cursor in CodeMirror, and a stale position is caught by `expectedVersion`. The description
returns the range of each existing occurrence, so a host navigates by data and does not
compose a path. A path is a second public grammar (what addresses `HEAD`, an extension
tag, a repeated tag after a delete, a duplicated xref?) and cannot be removed once
published; it can be added later over the same position-based methods. The cost is that a
host re-reads the description after each edit, because every edit shifts positions.

**The field id is a path of tags.** `INDI.NAME.GIVN`, the same in both dialects. The
schema identifier (`.../v5.5.1/GIVN`, `.../v7/GIVN`) differs between them, so as the id it
would make a host keep two label tables; it is given beside the id. A path may be ambiguous
for the one tag that the scheme types by context; where two schema types share a path the
description reports the one of the document's dialect.

**The operations.** `describeStructure(position, tag?)`, `describeSchemaPath(path)`,
`validateValue(position, tag, value)`, `addStructure(position, tag,
input, expectedVersion)`, `setValue(position, value, expectedVersion)` and
`removeStructure(position, expectedVersion)`. The position of `add` is a structure to add
beneath; the position of `set` and `remove` is an occurrence. `input` is `{ value?,
children? }`, children being the same shape, so a name arrives with its parts in one edit.
Setting a field with no occurrence is `add`: the description says which a form needs.

**Placement.** A tag the parent holds goes after the last of them and its subtree, because
order among repeats is the author's order of preference. A new tag goes at the end of the
parent's subtree. Neither a convention such as "`NAME` first in a person" nor an order in
the scheme is used: the standard fixes none, and the scheme lists tags alphabetically.

**Writing a value.** Escaping and its reading half live together in `validator`, which owns
the format: the escape of a text payload (every `@` in 5.5.1, the leading `@` of each line in
7.0), the unescape, and no escape at all for a pointer, a date and a date period, whose own
grammar uses the at sign. Escaping every `@` of every payload would write `@@S1@@` for a
pointer and break a 5.5.1 calendar escape such as `@#DJULIAN@`. `resolveValue` is left as it
is, since it joins `CONC` for both dialects and a change to it reaches every consumer; the
description reads `unescape(resolveValue(node))` for a text kind. The writer in
`language-service` builds lines from that: `CONT` for line breaks in both dialects, `CONC`
only in 5.5.1 and only past 255 characters, never splitting an escaped `@`, a surrogate pair
or leaving a piece that starts or ends with a space, since readers differ on trimming. The
validator does not forbid `CONC` in 7.0 (it skips continuation lines in every dialect), so
the writer is the only place that holds the rule. The 255 limit and the 7.0 rule for the
leading `@` of a continuation line are read from the standards and tested in task 3.1.
`input` for a 5.5.1 text-or-pointer field is `{ value }` or `{ pointer }`, so the writer
never guesses which it was given. Line terminator and end-of-text come from the existing
`terminatorOf` and `endOfText`, which choose `
` for a document that has any.

**Setting a value with continuation lines.** The line and its `CONT`/`CONC` children are
one value: `setValue` replaces them together, writing the new continuation lines directly
under the line before the other children, and leaves the rest of the subtree alone.

**Records.** `setValue` and `removeStructure` at a level-0 record are refused with
`record-edit-unsupported`: removing an `INDI` would leave `FAMC`, `FAMS`, `CHIL`, `HUSB` and
`WIFE` pointing at it, outside the touched structure where nothing would count them.
Creating a record is out of scope for the same reason.

**Validation by revalidating the text.** The edit is applied to the text and a document is
built again, as fix-all does. Comparing the diagnostics by code and message is not enough: a
third `GIVN` repeats the message of the second (`Too many occurrences of GIVN in parent
NAME`), and the value messages do not carry the value. So a diagnostic on a line the edit
writes is new, whatever was there before ("on a line" is the line where the diagnostic's
range starts, so a missing required child, which is reported at the whole parent, belongs to
the parent's first line and an old one does not count when an unrelated line is added inside
it). Elsewhere it is new only when the count of that code in the parent of the touched
structure has grown. The parent's place in the new text comes from the edit's own offsets: for
an add or a set, the parent's range shifted by the edit, and for a remove, the parent's end
moved back by the length removed. Two effects are accepted: setting an already-excess `GIVN`
to another value refuses, because the `VAL007` sits on that line, and a policy that rewrites
the `NAME` line makes an old error on that line count as new. A structure beneath `HEAD` is compared over the whole document,
because a new `GEDC.VERS` or `SCHMA` changes what is valid elsewhere. A new error refuses,
and so does `VAL001`, an unknown tag, which the validator calls a warning and the plan
refuses because the form chose a tag the dialect does not have. Mapped to refusal codes:
`VAL001` → `unknown-field` (a `VAL008` extension tag with no `SCHMA` is a warning and passes),
`VAL002` → `required-field-missing`, `VAL003` →
`value-required`, `VAL004`, `VAL006`, `VAL014` and `VAL016` → `payload-datatype` (an impossible
day or year is a datatype failure of the value, told from the others by `diagnosticCode`, which
every refusal from a diagnostic carries), `VAL005` →
`value-not-in-enum`, `VAL007` → `cardinality-exceeded`, `unresolved-xref` →
`unresolved-pointer`. Any other new error is `rule-violation` with `diagnosticCode`; there is
no "nearest code", which could not be tested. Warnings and information come back as
`warnings`.

**The result type.** `StructureEditResult` is `WorkspaceEditResult` with `warnings`:
`Diagnostic[]`, always present, empty when clean. A caller that wants warnings to block
treats a non-empty list as a refusal; one that wants them through ignores it. The
refusal codes are added to `EditRefusalCode`, and `EditRefusal` gains an optional
`diagnosticCode`, which is additive: no consumer in `language-server`, `codemirror` or
`apps/*` switches over the codes, and `language-server` re-exports the types unchanged.

**Schema path.** A form for `INDI.NAME.TRAN.LANG` cannot ask by position, because the
`NAME` it lies beneath is not in the text. `describeSchemaPath` takes the path from a record
and answers from the schema alone, in the document's dialect, with the same field shape as
a described position and no occurrences. Both the validator method and the service method
are the same read; the path is not an address for an edit.

**Payload detail and pointer candidates.** The validator reports the kind; the service adds
what only the document knows: for a pointer field, the records of the target tag from the
`ReferenceIndex`, each by xref. Labels for a record (a person's name) are the host's, drawn
from `getRecordPreview` or its own reading; the description gives the xref and the tag. A
payload is required when the datatype does not admit the empty string, which
`rule-node.ts` already decides for the validator's own `VAL003`.

**Checking a value without an edit.** `validateValue` answers the rules that depend on the
value and the field alone: unknown field, cardinality against the occurrences the parent
holds, enumeration, datatype, a missing required value. It runs the validator's check on
one payload and does not parse the document again, so a form can call it per keystroke.
It is advisory: `addStructure` and `setValue` stay the authority and may still refuse for a
rule that depends on the rest of the document. There is no fallback to building the edit in
memory, because that is a full parse per keystroke, which is what this operation exists to
avoid. The validator's check (`RuleNode.collect` on a node, the rule lookup and the sibling
count in `GedcomValidator`) needs only the scheme, the pointer map and the extension context,
which the document holds. Building it is more than it sounds: the check needs a synthetic
`ASTNode` with its tokens, and the unknown-tag, cardinality and sibling-count logic is inline
in `GedcomValidator`'s loop and has to be lifted into a function the validator and
`validateValue` share. If task 1.2 finds it cannot run on a payload alone, the change is
revised before the operation is built, not worked around. Alternative: expose a per-datatype
regex or grammar. Rejected: dates, ages and names are code in `rule-node.ts`, not data, and
a copy in a host is the drift this change exists to prevent.

**Reciprocal pointers.** The repository invariant is that a semantic edit preserves
reciprocal pointers. A generic `addStructure` for `FAMC` writes one side and leaves the
`CHIL` of the family missing. Until a policy writes both sides, the fields of the pairs are
described with a `reciprocal` mark and every operation on them, or on a structure holding one,
is refused with `reciprocal-pointer-unsupported`. The set of paired fields is a short list
in the policy registry: `INDI.FAMC` with `FAM.CHIL`, `INDI.FAMS` with `FAM.HUSB` and
`FAM.WIFE`, and the `FAMC` of every event that has one (`BIRT`, `CHR`, `ADOP`, `SLGC` and the others the scheme lists), which names a
family and implies the same pair; task 3.5 reads the scheme for any other pair before the
list is closed. The repository has no reciprocity code to reuse; the invariant is only stated.
The registry is placed so that it can move to the `packages/mutations` that `docs/roadmap.md`
foresees; that is not an ADR decision here. Alternative: let
the validator's `unresolved-xref` and the reciprocity diagnostics catch it afterwards.
Rejected: the edit would pass and leave a document the invariant forbids.

**Boundaries.** What the host gets is the kind of a widget, not the rule behind it: a date,
an age or a personal name is validated by code in the validator and stays there. Consistency
between two fields is not found in the schema; each relation (a surname in slashes and
`SURN`, a pair of pointers) is a policy entry, so automation covers structure and
enumeration and cardinality, and a new relation costs one entry.

**Policies.** A registry keyed by field path holds hooks that run after the edit is built
and before it is checked, and may add edits to the same `WorkspaceEdit`. The first is
`INDI.NAME`. When a name is added with `GIVN` or `SURN` and no payload, the payload is
written as `given /surname/`. When `GIVN` or `SURN` of an existing `NAME` is set, the hook
replaces only the piece of the payload that held the old value (the text before the slashes,
or the text between them) and keeps every other character, so a prefix, a suffix and the
author's spacing stay; where the old value is not found in that place the payload is left
as written, because the author chose it. A payload is not recomposed from all the parts,
which would drop `NPFX`, `NSFX` and `SPFX` that the payload carries, and 7.0 allows many
`GIVN` and `SURN`. The registry keeps the general operations free of the name's rules, and a
later policy (a date beside a time, say) is one more entry.

## Risks / Trade-offs

- [Whole-document revalidation per edit costs a parse of the document] → the same order as
  one fix-all, and an edit is a user action; `validateValue` is the per-keystroke path and
  does not parse. The cost is measured with the existing timing tests (#87), and a scoped
  parse is a later change if it matters.
- [Pointer candidates walk the reference index per described field] → the description
  caches the list per parse, as folding ranges are cached; the timing task covers
  `describeStructure` on the large document too. The label of a candidate is the existing
  `recordLabel`, so no host reads names itself.
- [The position of a structure is not located by any existing function] →
  `findNodeByTagAtPosition` matches the tag token only and scans the tree; a locator by
  offset, in the manner of `rootsInRange`, is part of task 2.1.
- [A host reads values with `@` unescaped by `resolveValue`] → the description unescapes,
  and a test round-trips a value through the edit and the description in both dialects.
- [The count comparison lets through a replacement of one old problem by another of the
  same code elsewhere in the structure] → accepted: such a problem is old; a problem on a
  line the edit wrote always counts.
- [`validateValue` and the operation disagree] → both go through the same validator check
  for the rules they share, and a test asks the same set of values through both.
- [The list of reciprocal pairs is incomplete] → task 3.5 reads the scheme for pointers
  between records of different types before closing it; an unlisted pair is a missed
  refusal, so the test names the pairs it knows.

- [An enumeration lists the dialect's values, while the validator also accepts an extension
  tag there, subject to a 7.0 `SCHMA` declaration] → the description lists the values the
  dialect defines; an extension value is accepted by the operation, not offered.
- [Open change `fix-all-code-action` touches the same `languageService.ts`, `types.ts` and
  README] → a merge to resolve when the first of them lands; no semantic overlap.

## Open Questions

- Whether the second `NAME` of a person should be placed first when the author wants it as
  the preferred one. It changes placement only; the host can reorder with a remove and an
  add until a real use shows it needs an operation.
