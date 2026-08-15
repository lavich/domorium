# 0010. Model a 5.5.1 structure written two ways as one structure

- **Status:** Accepted
- **Date:** 2026-08-15

## Context

GEDCOM 5.5.1 defines three structures as an alternation, where the same tag in
the same position carries either a pointer or its own content:

```gedcom
NOTE_STRUCTURE:  n NOTE @<XREF:NOTE>@  |  n NOTE [<SUBMITTER_TEXT>|<NULL>]
SOURCE_CITATION: n SOUR @<XREF:SOUR>@  |  n SOUR <SOURCE_DESCRIPTION>
MULTIMEDIA_LINK: n OBJE @<XREF:OBJE>@  |  n OBJE  (+1 FILE …)
```

Each branch admits its own substructures: a citation by pointer takes `PAGE`,
`EVEN` and `DATA`, while a citation carrying the description takes `TEXT`
directly.

The schema this package validates against maps one tag in one parent to exactly
one structure type, and each type has one payload. It cannot state "either this
shape or that one". GEDCOM 7 removed the question by splitting the tags — a note
is `NOTE` for text and `SNOTE` for a pointer, and `SOUR` and `OBJE` are pointers
only — so this affects the 5.5.1 schema alone, which is maintained by hand.

Files exported by MyHeritage, Ancestry and Gramps use both branches heavily.
While only the pointer branch was modelled, a one-line note and a citation
carrying its description were each reported as a malformed pointer.

## Decision

Model the two branches as one structure whose members are the union of both.

- The schema names the pointer form, which is the branch with a target to
  resolve, to complete and to follow.
- The structures whose payload may be their own content instead are named in the
  rule engine, beside the payloads that may be omitted, and a payload not
  written as `@xref@` is read as that branch.
- Substructures from both branches are listed together under the one type.

## Consequences

A file using either branch validates, which is what the specification says and
what real exports contain. Going to the definition of a pointed note or citation
still works, because the type stays a pointer.

A document that mixes the branches is no longer caught: `2 SOUR @S1@` with
`3 TEXT …` beneath it is accepted, though `TEXT` belongs to the other branch.
This is a deliberate loss of strictness, taken because a false report on a valid
file costs more than a missed report on an unusual one.

The knowledge lives in two places — the schema lists the substructures, the rule
engine lists which structures have a text branch — joined only by a URI. A
renamed structure would silently disable the second half; the tests over the four
shapes a note and a citation can take are what catch it.

`MULTIMEDIA_LINK` is not in that list: its second branch carries no payload at
all, and the rule for a pointer already stays silent when a structure has
substructures. It passes for a reason unrelated to this record.

## Alternatives considered

**Teach the schema alternatives** — a tag maps to a list of candidate types, and
the payload's shape selects one. This is what the specification actually says,
it would model `MULTIMEDIA_LINK` honestly rather than by accident, and it would
keep the mixed-branch document an error. It changes the schema format and every
consumer that reads a type from it — the validator, completion, document links
and go-to-definition — which is more than the reported problem is worth today.
Worth revisiting if a fourth such structure appears or if mixed branches turn
out to matter.

**A flag in the schema, such as `"orText": true`** — rejected: the schema files
mirror the specification's own vocabulary, and the 7.0 one is generated from
upstream. A field of ours in that shape is a private extension to a format we do
not own, and it would be lost the next time the file is regenerated.

**Special-case the tags in the rule engine** — `if (tag === "NOTE")`. Rejected:
the tag alone does not say which structure it is; `NOTE` inside `HEAD` is a plain
string and a `NOTE` record is a different type again. The structure URI is what
identifies the case exactly.
