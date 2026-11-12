## Context

The checks a value gets before it is written live in the validator's `checkPayload`
(`packages/validator/src/validator/checkPayload.ts`), and the language service refuses from
its answer: `checkRefusal` takes the codes in `CHECKED_BEFORE_WRITING`
(`packages/language-service/src/libs/structure/edit.ts:99`), `validateValue` maps every
problem through `refusalCodeOf`, and the revalidation of the edited text turns new errors
into refusals and returns new warnings beside the edit. The rule of what a 7.0 local `FILE`
may hold lives in `language-service` (`gedcom7LocalFileKind`, `documentLinks.ts:83`), and so
does the table of file extensions (`EXTENSION_KINDS`, `media/mediaKind.ts:27`). See
proposal.md for why. These are behaviour decisions: the specs hold the contract, no ADR
(ADR-0018).

## Goals / Non-Goals

**Goals:** one rule for a 7.0 local path, read by the links and by the check of a value; one
table of known extensions, read by the media kind and by the enumeration check.

**Non-Goals:** a diagnostic for a `FILE` already in a file; a change to which payloads
`documentLinks`, `resolveFileTarget` or `moveFileLinks` accept.

## Decisions

**The local-path rule moves down, unchanged.** The validator exports a predicate with the
body of `gedcom7LocalFileKind` that names what is wrong with a local path — `absolute`,
`parent-folder`, `unescaped-character` or nothing — and `documentLinks` reads `file-relative`
from "nothing". The predicate gets its own tests in the validator, one per reason; the
behaviour of every link query is the same, which `documentLinks.test.ts`, `mediaAt.test.ts`,
`fileTargetPath.test.ts` and `retargetFileLinks.test.ts` prove unchanged. Keeping the rule in
`language-service` and checking it there instead was rejected: `validateValue` problems carry
a `diagnosticCode` that a host files them by, and only the validator issues those.

**`VAL020` in `checkPayload`, keyed on the payload type.** For a structure whose payload type
is `https://gedcom.io/terms/v7/type-FilePath` (the scheme's `FILE` and `FILE-TRAN`, tags
`FILE` and `TRAN`), the value trimmed, as `documentLinks` trims it, with no URI scheme of two or more
characters (`/^[A-Za-z][A-Za-z0-9+.-]+:/`) is read as a local path; where the predicate names
a problem, `checkPayload` answers `VAL020` (`FileTargetUnsupported`, error, `{ tag,
pathProblem }`, `pathProblem` typed in `GedcomError.data` and in `language-service`'s
`DiagnosticData`) and stops, as `VAL017` does. Keyed on the type rather than the tag, so that a
5.5.1 `FILE` (`xsd:string`) is never asked. The validator's document check does not raise it:
`RuleNode` is not touched, so files keep their diagnostics. `language-service` adds `VAL020`
to `CHECKED_BEFORE_WRITING` and maps it to `file-target-unsupported`. A one-letter scheme is a
drive letter, so `C:\x.jpg` is a local path and `absolute`; the order of the reasons is
`absolute`, then `parent-folder`, then `unescaped-character`.

**The payload as GEDCOM spells it.** `setValue` writes what it is given, and `moveFileLinks`
takes a plain path and escapes it (`encodeFileTarget`), so they meet on the reading rather than
the input: a local path `setValue` writes is one `documentLinks` reads as a relative file, and
`a?b.jpg` is refused where `moveFileLinks` would write `a%3Fb.jpg`. The README points a host
holding a plain path to `encodeFileTarget`. Escaping inside `setValue` was rejected: a 7.0
`FILE` that already holds `a%20b.jpg` would be read back as a different file. In 5.5.1,
`moveFileLinks` also refuses what its reader would not read back (`@` and surrounding spaces
among them); `setValue` keeps writing those, since #531 asked only about the path that 7.0
cannot carry and 5.5.1 reads `..` and an absolute path as a file.

**A percent-escaped dot, separator or colon is left alone.** `%2E%2E/x.jpg` and
`C%3A%5Cp%5Cx.jpg` read as names to the predicate and to `documentLinks`, and as no file to
`resolveFileTarget` (`fileTargetPath.ts:6, 41`); `moveFileLinks` writes the second today.
Refusing them would need the decoded-segment rule of `resolveFileTarget` in the validator too.
Deferred, noted in the proposal.

**`VAL021` in the enumeration check, gated on the set.** `RuleNode.validateEnumeration`
already names `enumset-MULTIMEDIA_FORMAT` for its case-insensitive comparison
(`rule-node.ts:96`). A second set, `TOLERATES_FILE_EXTENSIONS`, holding that set alone, lets a
value outside the permitted ones that is a known file extension, compared in lower case,
raise `VAL021` (`ToleratedForm`, warning, `{ tag }`) in place of `VAL005`. Every other set,
and every other value, is as before. Since the document check and `checkPayload` share this
method, both answer it. `language-service` maps `VAL021` to `value-not-in-enum`: the value is
outside the enumeration, the severity says it is tolerated, and the host tells it from a
misspelling by `diagnosticCode`. A code of its own in `EditRefusalCode` was rejected: the
union names why a value is wrong, and this is the same reason at a lower level.

**The set of known extensions, not their kinds, moves down.** The validator needs only which
extensions are known, and the kind of a medium is a viewer's classification
(`docs/architecture.md`: the validator owns the format). The validator exports
`KNOWN_FILE_EXTENSIONS`, a read-only set of the keys of `mediaKind.ts`'s table;
`language-service` keeps the table, and a test there asserts its keys equal the set, so the
two cannot drift. `mediaKind` is unchanged: a 5.5.1 `FORM png` it does not find in the
standard's list falls back to the path's extension, as today; reading the form there too
would change `media-at-position` and is left out.

**The description says so.** `payloadShape` adds `tolerates: "file-extension"` to the
enumeration of a set in `TOLERATES_FILE_EXTENSIONS`; the field is optional on the `enum`
member of `PayloadKind` and absent everywhere else. A string rather than a boolean leaves room
for another kind of tolerance without a second field.

## Risks / Trade-offs

- [Every host shows a 5.5.1 `FORM png` as a warning, not an error] → the user's decision;
  the vendor corpus is re-recorded and its note for `vendor-ancestris11-export.ged` rewritten, and the change
  is named in the changelogs when versions are cut.
- [The set of extensions grows and the validator tolerates more] → it is one set, and its
  test lists the kinds; a new entry is a deliberate edit read by both.
- [`tolerates: "file-extension"` says that some extensions are tolerated, not which] → a host
  asks `validateValue`, which answers per value; the README lists the set's source.
- [A 7.0 `FILE` that is a URL of an unusual scheme, or `media:x.jpg`, is written unchecked]
  → URLs are out of scope; the TODO item "Web link validation" holds them.
- [A file already holding `../x.jpg` gets no diagnostic, so `setValue` refuses to rewrite a
  value to the same text] → the refusal names the code; the user chose no diagnostic for
  existing files.
