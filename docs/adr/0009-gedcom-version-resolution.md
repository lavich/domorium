# 0009. Resolve the GEDCOM version by longest match, and refuse what we cannot judge

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

`schemeFor` chose between two schemas with one test:

```ts
return version?.startsWith("5") ? g551validationJson : g7validationJson;
```

Two outcomes for every input, and no way to say "I do not know this version". Measured
against a valid-shaped document containing one `INDI`:

| `2 VERS`                    | schema chosen | diagnostics |
| --------------------------- | ------------- | ----------: |
| `7.0`                       | 7.0           |           0 |
| `5.5.1`                     | 5.5.1         |           4 |
| `5.5`, `5.5.5`              | 5.5.1         |           4 |
| `4.0`, `x`, `V5.5.1`, empty | **7.0**       |       **0** |
| no `VERS` line              | 7.0           |           1 |

Zero means nothing the file was checked against applied to it. A GEDCOM 4.0 file, and a
file whose version is garbage, were reported clean.

[FamilySearch's version-detection algorithm](https://github.com/FamilySearch/GEDCOM/blob/main/version-detection/version-detection.md)
specifies nine versions plus two known unofficial dialects, resolved by **longest match**
on the five characters following the `2 VERS` tag. `startsWith("5")` is not one: it cannot
separate 5.5 from 5.5.1 from 5.5.5. The algorithm also resolves an unrecognised version to
**3.0**, the oldest, on the reasoning that an unknown version predates the table — the
opposite of defaulting to the newest.

Only GEDCOM 7 has a machine-readable specification;
`extracted-files` in the FamilySearch repository covers 7.0 alone. Every 5.x schema is
hand-written, which makes each additional version an authoring cost rather than a loader
change. `g551validation.json` is the one that exists, and its `gedcom.io/terms/v5.5.1/`
URIs are synthetic — that namespace returns 404 — coined to mirror the v7 shape.

Whether one schema may stand in for another version depends on the **direction** of the
difference, which was measured per dialect rather than assumed:

- **5.5.5** is 5.5.1 with obsolete and redundant constructs removed and the grammar
  tightened. It is a restriction, so the 5.5.1 schema accepts everything a 5.5.5 file may
  contain. Under-strict, never falsely strict.
- **5.5** disagrees with 5.5.1 about the multimedia link: `FORM` sits beneath `OBJE` in 5.5
  and beneath `FILE` in 5.5.1. False errors, measured while fixing #132.
- **5.5EL** extends 5.5 with a `_LOC` record. Its additions are almost all
  underscore-prefixed — `_LOC`, `_LANG`, `_FPOST`, `_FSTAE`, `_FCTRY`, `_FOKOID`, `_DMGD`,
  `_AIDN` — which ADR-0008 already accepts unvalidated in 5.5.1; only `NAMC` is unknown to
  the schema. Its authors have withdrawn it, directing implementers to the GEDCOM-L
  agreements instead.
- **5.6** is a December 2000 draft describing itself as a refinement of 5.5, so it is a
  parallel branch to 5.5.1 rather than its successor. Eight of the eleven tags it adds
  reached 5.5.1 independently; three did not. It names a web address `URL` where 5.5.1 names
  it `WWW`, and adds `CLNDR` and `WAC`. A web address is present in most real files, so the
  substitution would report a false error in most of them.

## Decision

Replace the two-way branch with an ordered longest-match table returning a discriminated
union of four outcomes:

| Match                           | Outcome                    |
| ------------------------------- | -------------------------- |
| `7.0`                           | supported, GEDCOM 7 schema |
| `5.5.5`                         | substituted by 5.5.1       |
| `5.5.1`                         | supported, 5.5.1 schema    |
| `5.5 EL`                        | substituted by 5.5.1       |
| `5.5`                           | substituted by 5.5.1       |
| `5.6`, `5.4`, `5.3`, `5.0`, `4` | unsupported                |
| anything else                   | unsupported                |
| no version found                | undetermined               |

`5.5.5` and `5.5 EL` appear in the table **because** they are longer strings that begin with
`5.5`. Omitting them would not leave them unsupported; it would silently resolve them as
`5.5`.

A **substituted** version validates against the 5.5.1 schema and reports a warning naming
the substitution, worded so that it does not promise correctness — the schemas differ, and
some diagnostics may not apply.

An **unsupported** or **undetermined** version reports an error and suppresses every
schema-derived diagnostic: unknown tags, cardinality, payload types, and extension-tag
declarations. Everything that does not need a schema still runs — lexing, tree assembly,
and level validation — because a file the validator cannot judge against a specification
may still have a level that cannot follow the line above it. Two distinct codes separate
"could not determine the version" from "version X is not supported": the causes differ, and
so does what the reader should do about it.

The two differ in one further respect. An **undetermined** document still gets a schema for
**completions**, though not for validation, and it is the newest supported one. An empty
buffer is the common case in an editor and has no version by definition, so a reader typing
the first line of a new file must still be offered `HEAD`, and the version they are about to
write is most likely the current one. An **unsupported** document is offered nothing: a 4.0
file is not on its way to becoming supported, and completing GEDCOM 7 tags into it would be
inventing a file the reader did not ask for.

Which version counts as newest is read off the table's own order rather than named in code,
so a future release is a row at the top and nothing else. Whether a version requires
extension tags to be declared in `HEAD.SCHMA` is likewise a property of the table entry, not
a comparison against the string `7.0`.

Resolution happens once, in `GedcomDocument.createDocument`, where version, schema,
extension context and validation already meet.

## Consequences

A file the validator cannot judge stops coming back clean. That is the point, and it is a
visible behaviour change in all four editors: 4.0, 5.3 and unversioned files gain an error
where they had silence, and 5.5 files gain a warning. Each host's changelog has to say so.

Completions go quiet for an unsupported version, because they read the schema too. That is
consistent — offering GEDCOM 7 tags inside a 4.0 file was never right — but it is a loss of
function for those files, not only a gain in honesty.

An empty buffer now carries an error while it is being written, which is noise on the way to
a valid file. It is accepted because the alternative is worse: a threshold below which the
validator stays quiet would have to guess when a document is finished, and would then be
silent about genuinely truncated files.

Adding a version becomes a row and a schema file rather than an edit to a conditional, and
the table is the single place where the question "what do we do with this version" is
answered. The cost is that the table now carries entries whose only purpose is to prevent a
longest-match accident, and a reader who does not know that will read them as noise.

The direction-of-difference reasoning above is the part most likely to be lost. Without it,
adding `5.6` to the substituted list looks like an obvious improvement.

Nothing here narrows a published type, so it ships in a minor version. The new codes are
additive.

## Alternatives considered

**Keep `schemeFor` and add a separate "is this supported" guard.** The smallest diff. Rejected
because two functions would have to agree about the same string, which is the split that
produced #116 — one value meaning two opposite things, and the permissive reading winning.

**Default to GEDCOM 7 for anything unrecognised, as today.** Rejected: it reports the most
modern rules against the least modern files and calls the result clean. The detection
algorithm's own default is the oldest version, for the opposite reason.

**Refuse to parse an unsupported file at all.** Rejected because highlighting, folding and
navigation are built on the syntax tree, not the schema. Refusing to parse would break
features that work perfectly well without knowing the version.

**Substitute 5.5.1 for every 5.x version, including 5.6.** Rejected on the measurement: 5.6
names a web address `URL`, so most real 5.6 files would collect a false error on a line that
is correct. Substitution is defensible where the substituted schema is more permissive than
the file's own specification, and 5.6 is not that case.

**Hand-write 5.5, 5.6 and 5.5.5 schemas now.** The complete answer, and rejected for cost:
no 5.x version has a machine-readable specification, and the conformance corpus that would
verify them covers 7.0 only. Substitution with a warning delivers most of the value at a
fraction of the work, and leaves each schema as its own decision later.
