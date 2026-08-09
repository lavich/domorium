# Changelog

All notable changes to `@domorium/validator` are documented here.

## 1.4.0 - 2026-08-09

- Read a `HEAD.SCHMA` tag whose URI is a standard one as the structure it names.
  A tag definition makes its tag an abbreviation for that URI, so a record
  written under an alias now answers a pointer to the standard tag, a date in an
  aliased calendar carries that calendar's months, and an aliased structure is
  validated as the standard one — payload and substructures alike. Its position
  is not checked: a relocated standard structure may only appear under a
  superstructure the specification does not document it under.
- Accept an extension tag as an enumeration value. Every one was reported as an
  error, though the specification permits extending an enumeration with values
  matching `extTag`. A value borrowed from another standard set, which the same
  paragraph forbids, is still refused. An undocumented extension value reports
  `VAL008`, as an undocumented tag already did.
- Stop requiring a payload GEDCOM 5.5.1 does not define. `1 EVEN` with a `TYPE`
  beneath it was reported as missing a value; the individual event structure
  gives it no payload at all, and the family one spells it
  `[<EVENT_DESCRIPTOR> | <NULL>]`.
- **Reject a whole-number payload that is not a number.** `1 NCHI abc` was
  accepted, and so were `3.7`, `12abc`, `1e3` and `Infinity`: the check compared
  `parseInt(value) < 0`, and `NaN` fails every comparison.
- An event with neither a payload nor substructures is a warning, `VAL010`,
  rather than an error reading "should be Y or null" — null is what it had, and
  the payload is optional. It is not silent either: 5.5.1 introduces the `Y`
  convention precisely to protect against processors that prune lines having
  neither a value nor a subordinate line.
- A pointer whose target record type appears nowhere in the document no longer
  reads `should be in set []`.
- **Each kind of problem now has its own code.** Every payload problem shipped as
  the bare string `VAL`, so a consumer could not tell a missing value from a
  malformed one, and `VAL003` to `VAL006` sat declared and unused. See the code
  table in the README. `unresolved-xref` and `invalid-level` keep their strings.
- Export `GedcomError`, `GedcomErrorCode`, `Range` and `Position`. `getErrors()`
  returns `GedcomError[]` and the type could not be named by a consumer.

## 1.3.0 - 2026-08-08

- Read GEDCOM 7 dates against the calendar they name. `JULIAN 1401`,
  `HEBREW 1 TSH 5761`, `FRENCH_R 2 VEND 8` and even `GREGORIAN 1 JAN 2000` were
  all reported as invalid, because only v5.5.1's `@#D…@` escape was understood.
  Each calendar's own months and epochs now apply, so `HEBREW 1 JAN 5761` is
  refused and `BCE` is confined to the two calendars that permit it. A calendar
  binds to the date after it, so `FROM JULIAN 1670 TO GREGORIAN 1800` is two
  dates in two calendars.
- **Three v5.5.1 date forms are now refused inside a 7.0 document**, which may
  make a file that was quiet noisy: the `@#D…@` calendar escape, a slashed year
  such as `1 JAN 1857/58`, and the `INT 1950 (around 1950)` and `(unknown)`
  phrase forms. Version 7.0 removed all three; a date phrase belongs in a
  `PHRASE` substructure. GEDCOM 5.5.1 documents keep them.
- Stop reporting a payload the specification allows to be omitted. A payload may
  be left out whenever its data type admits the empty string, which covers 61 of
  the 182 payload types — `1 EVEN` with only a `TYPE` beneath it was being
  flagged. `AGE`, `DateValue` and `DatePeriod` have their own explicit
  permission: omitting the payload and giving a `PHRASE` instead is the
  specification's own way to record that something happened but not what.
- Accept a leading UTF-8 byte order mark instead of reporting it as an
  unexpected character. This was invisible in a browser, which strips the mark
  while decoding, and affected anyone reading a file from disk.
- Say what belongs in a pointer slot. `Value for SOUR should be POINTER` named
  the rule rather than the problem; a payload that is not a pointer at all now
  reads `should be a pointer to a SOUR record, written as "@xref@"`, while an
  xref that resolves to nothing names the records it could have meant.

## 1.2.0 - 2026-08-07

- Keep the spaces that belong to a value. The lexer treated the delimiter after
  a tag as whitespace to skip, so a `NOTE` whose text began with spaces lost
  them, and `CONC` continuations silently changed the text they rejoined.
- Report a value that begins with a leading space or ends with a trailing one
  correctly rather than validating a string the document never contained.
- Name at most ten candidates when a payload is not in its permitted set, and
  count the rest, joining them with `", "`. The full list is every matching
  xref in the document, and interpolating it produced a message tens of
  thousands of characters long with no break opportunity in it — enough to
  stretch an editor's diagnostic tooltip past the edge of the screen.
- `ASTNode` and `ASTToken` now carry `startOffset` and `endOffset`, and their
  `range` is derived from those on access rather than stored. This is what makes
  a large document affordable: a stored range costs three objects per token, and
  that was most of the syntax tree's memory. `range` is `readonly` as a result —
  code that assigned to it must set the offsets instead, and code in a tight loop
  should read the offsets, because reading `range` allocates.
- Build the syntax tree straight from the token stream instead of walking a
  Chevrotain parse tree first, and index pointer targets once per document
  rather than scanning every pointer for each one. Validation cost no longer
  grows with records times nodes.

## 1.1.0 - 2026-08-06

- Accept application-defined extension tags (`_XXXX`) instead of reporting them
  as unknown. Their subtrees are not validated: an extension's payload and
  permitted substructures are defined by whoever authored it. See
  [ADR-0008](../../docs/adr/0008-extension-tag-validation.md).
- Read `HEAD.SCHMA` declarations, and report a GEDCOM 7 extension tag that is
  used without one as `VAL008`. GEDCOM 5.5.1 documents, which have no SCHMA
  structure, are unaffected.
- Report a tag declared twice in `HEAD.SCHMA` as `VAL009`, and validate that
  each declaration is an underscore-prefixed tag followed by an absolute URI.
- Resolve the declared URI of an extension tag through `getLabel`, and offer
  declared extension tags from `getCompletions`.
- Stop offering root record tags as completions inside a subtree whose parent
  type cannot be resolved.

## 1.0.0 - 2026-08-05

- First stable release. `GedcomDocument` and the diagnostic shapes it returns are
  now the package's committed public API: a breaking change to them requires a
  major version.
- No behavioral change from 0.2.0.

## 0.2.0 - 2026-08-03

- Move the package from `@gedcom/validator` to `@domorium/validator` as part of
  the Domorium rebrand.
- Add the FamilySearch GEDCOM specification notice to the published package.

## 0.1.3 - 2026-07-24

- Move the public package to the `@gedcom/validator` organization scope.
- Update repository metadata and documentation for the GEDCOM project.

## 0.1.2 - 2026-07-23

- Expose schema-aware pointer target metadata for editor features.
- Distinguish valid GEDCOM record declarations from nested structures and header/trailer lines.
- Expose the AST-detected GEDCOM version to downstream language tooling.

## 0.1.1 - 2026-07-21

- Upgrade to Chevrotain 12 to remove vulnerable `lodash-es` runtime dependencies.
- Require Node.js 22 or newer when using the package directly in Node.js.

## 0.1.0 - 2026-07-21

- Initial public release.
- Parse GEDCOM 5.5.1 and GEDCOM 7 documents into an AST.
- Validate structure, cardinality, payloads, and references.
- Provide completion data for GEDCOM-aware editors.
