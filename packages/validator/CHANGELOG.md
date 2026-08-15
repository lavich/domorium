# Changelog

All notable changes to `@domorium/validator` are documented here.

## Unreleased

- **A note written as text in a 5.5.1 file is no longer reported.** `1 NOTE plain
text` was told to be a pointer to a `NOTE` record, though `NOTE_STRUCTURE` has
  two forms and the text itself is the second. A note that ran to a `CONT` line
  escaped, because the pointer rule stays silent for a structure with children,
  so the report landed only on one-line notes — which every export from
  MyHeritage, Ancestry and Gramps is full of. The schema still names the pointer
  form, which is the one with a target to resolve and to complete.

## 1.8.0 - 2026-08-14

- **A header naming a system before `GEDC` is Personal Ancestral File, and is no
  longer judged by a specification that does not apply to it.** FamilySearch's
  version-detection algorithm reads until whichever of `1 GEDC` and `1 SYST`
  comes first; `1 SYST` skips the version entirely and sends the file to the PAF
  specification. We read the `VERS` line regardless, resolved 5.5.1 and reported
  five diagnostics from a schema the algorithm says is not the file's.
- `VAL015` says so and nothing else is reported, the way an unsupported version
  already behaves. `getVersionResolution()` gains a `paf` kind carrying the
  system the header named. Writing a PAF schema is not in scope; saying plainly
  that this dialect is not judged here is.
- A `1 SYST` **after** `1 GEDC` changes nothing, which is what the algorithm
  says: whichever comes first decides.

## 1.7.0 - 2026-08-13

- **A date payload offers completions, and they depend on where the cursor is.**
  Typing one got no help at all, in a format where the help is most needed. The
  start of a value offers the calendars, the modifiers and the months; after a
  number, the months it could still take and the epoch it could already be;
  after `BET`'s first date, `AND`; after `FROM`'s, `TO`. An exact date is offered
  months alone, since its grammar admits no calendar and no epoch.
- **The months offered are the ones the calendar in force actually has.**
  a cursor after `HEBREW 1` offers `TSH` through `ELL`, one after `FRENCH_R`
  offers `VEND` through `COMP`, and the twelve a user knows by heart are not among them. This is the
  case the feature is for.
- GEDCOM 7 only. 5.5.1 keeps its months in a regular expression and its
  `calendar` section is empty, so there is nothing there to offer from.

- **A date naming a day the calendar does not have is reported.** `31 FEB 1900`,
  `31 APR 1880`, `0 JAN` and `99 JAN` were all accepted: the grammar gives a day
  as one or two digits, and nothing looked at the month it belongs to. Each now
  carries `VAL014` saying which day was named and how many the month has. So does
  `29 FEB 1900` — a year divisible by 100 and not by 400 has no 29th — while
  `29 FEB 2000` and `29 FEB 2024` stay quiet.
- The check is separate from the grammar and reported with a code of its own,
  because `31 FEB 1900` _is_ a date: telling its author it is not one would say
  the wrong thing about a value they can see is a date.
- **A Julian date is judged by the Julian rule**, which keeps every fourth year
  leap with no exception for centuries, so `JULIAN 29 FEB 1700` is accepted where
  the same day in the Gregorian calendar is not. `HEBREW` and `FRENCH_R` have
  months of their own and are not judged by anyone else's calendar. Both dialects
  are covered, including 5.5.1's `@#DJULIAN@` escape.
- A phrase is removed before a value is read as a date, so
  `INT 1900 (born 31 FEB by the old reckoning)` reports nothing.

## 1.6.0 - 2026-08-12

- **A fragment can be checked without being told it is not a file.** Text that is
  part of a document rather than one of its own — a block pasted into a note, an
  example in documentation, a selection — was judged as a whole file, so the one
  thing certainly not the author's mistake was the first thing reported, and
  nothing after it was read at all. `createDocument(text, { fragment: true,
dialect })` reads the lines and goes quiet only about what the boundary caused:
  the missing header and trailer, a pointer leaving the text, an extension tag
  with no `HEAD.SCHMA` to declare it in. An unknown tag, a payload of the wrong
  type and a level that cannot follow the line above are still reported.
- `dialect` is named by the caller because a fragment carries no
  `HEAD.GEDC.VERS`; without one there are still no rules to read it by.

## 1.5.0 - 2026-08-10

- **The GEDCOM version is resolved against a table by longest match, and a
  version we hold no schema for no longer validates against the newest one.**
  `2 VERS 4.0`, a garbage version and a document with no `VERS` line were all
  checked against GEDCOM 7 and reported clean, because nothing they were checked
  against applied to them. Three codes replace that silence: `VAL011` for a
  version no schema describes, `VAL012` for a document whose version cannot be
  read, `VAL013` for one checked against another version's schema. The first two
  suppress every schema-derived diagnostic, while lexing, tree assembly and
  level validation still run — a 4.0 file with a level that cannot follow the
  line above it still says so. `5.5`, `5.5.5` and `5.5 EL` are checked against
  the 5.5.1 schema with a warning naming the substitution; `5.6`, `5.4`, `5.3`,
  `5.0` and `4` are not, because the difference runs the wrong way and the
  substitution would report false errors on correct lines.
- **A structure the specification gives no substructures accepted any child.**
  `getRules` answered `undefined` both for a leaf and for a type it could not
  resolve, and the permissive reading of the two won: 57 structures in GEDCOM 7
  and 89 in 5.5.1 accepted anything at all, `TRLR` among them in 5.5.1. So

      0 @S1@ SOUR
      1 TITL Open Archieven
      2 BOGUS whatever

  reported nothing. A child of a leaf structure is now an unknown tag.

- `2 VERS  5.5.1`, with more than one space after the tag, selected the GEDCOM 7
  schema and the file came back clean. The delimiter after a tag belongs to the
  payload, so the version is trimmed before it selects anything. Present since
  1.2.0.
- The inline form of a 5.5.1 multimedia link was unreachable, so `1 OBJE` with
  `FILE` and `TITL` written beneath it reported `FILE` as an unknown tag. Both
  shapes now resolve. One type serves both, so a pointer carrying children and an
  inline form with only a `TITL` are accepted where the specification allows
  neither; telling them apart needs a schema that can offer two types for one
  tag.
- New on `GedcomDocument`: `getVersionResolution()` returns the outcome above
  without parsing a message, and `getDialect()` names the version whose rules
  apply — or nothing, for a version we cannot judge. `VersionResolution` and
  `GedcomDialect` are exported alongside them.

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
