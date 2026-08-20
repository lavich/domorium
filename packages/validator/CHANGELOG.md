# Changelog

All notable changes to `@domorium/validator` are documented here.

## 2.0.0 - 2026-08-20

Removes three members of `GedcomDocument` that no consumer read, which is what
makes this a major: `updateDocument`, which returned `this` and did nothing;
`xRefs`, a parse product nothing outside the package looked at; and the public
`pointers`, now private because writing to it poisoned the pointer-target cache
keyed on it. `getErrors` and `getNodes` lose parameters they never read — a
change to their types only, since JavaScript discards a surplus argument.

- **A 5.5.1 multimedia format is read without regard to case.** `2 FORM JPG` was
  reported against a set the specification writes in lower case, so a file holding
  the right value in the wrong spelling read as one holding a format 5.5.1 does not
  have — and `FORM` is required under every `OBJE`.`FILE`, so an export writing
  extensions in upper case earned an error per photograph. That set is now compared
  without regard to case; `png` and `pdf`, which the specification has no spelling
  for, are still reported. The LDS status sets, which 5.5.1 writes in upper case,
  are unchanged: the case matters differently per set, so the set is named rather
  than the comparison.
- **A tag typed in lower case is completed.** The lexer reads `1 sex` as the SEX
  tag and the validator names the mistake — a tag is written in upper case, SEX —
  but completion, which is the way out of it, matched upper case only: `1 se`
  offered nothing where `1 SE` offered 62 tags, and a payload typed after `1 sex`
  was offered nothing where after `1 SEX` it was offered the four values of the
  enumeration. The typed tag is now read as the lexer reads it, and the schema is
  asked about the tag it names rather than about the letters as they were typed.
- **A completion on a large document is answered in under a millisecond.** Every
  request rebuilt the flattened node array and then filtered it, so a 300k-line
  file paid 69 ms per keystroke — for a tree the last parse built and nothing has
  touched since, where parsing and validating that whole file takes 492 ms once.
  The walk is now cached against the array a parse replaces, and the line the
  cursor sits on is found by halving the nodes rather than by reading the range of
  every one before it: 6 ms for the first completion after a parse, 0.1 ms for
  each one after that.
- **A second `createDocument` on one instance answers for the file it was given.**
  A header naming a system before `GEDC`, a version no schema describes, and a
  header naming no version at all each return before a schema is chosen, and the
  schema, the extension tags and the GEDCOM 7 flag of the document read before
  them stayed where they were: an instance that had read a 7.0 file offered
  `SCHMA` while completing the header of a Personal Ancestral File, and labelled
  a tag with a URI declared by a `HEAD`.`SCHMA` in another file. Parsing now
  clears all three, so every call answers for its own text.
- **`GedcomDocument` no longer carries members nothing reads.** `updateDocument`
  returned `this` and did nothing; `getErrors` took a language it never read and
  `getNodes` a range it never read — and that `Range` was the DOM's, ambient
  because the package pinned no `lib`, so `getNodes(new Range())` compiled in a
  package that must also run in Node. `pointers` and `xRefs` were mutable parse
  products no consumer outside the package read, and assigning to `pointers`
  poisoned the pointer-target cache keyed on it. `getErrors()` and `getNodes()`
  take no arguments, `pointers` is private and `updateDocument` and `xRefs` are
  gone; the package compiles against `ES2023` alone, so a DOM global cannot be
  named by accident again.
- **A 5.5.1 multimedia format and the four LDS ordinance statuses are read against
  the value sets the specification spells out.** `3 FORM exe` beneath a FILE, and
  `2 STAT nonsense` beneath BAPL, CONL, ENDL, SLGC or SLGS, were accepted: 5.5.1
  states these closed sets in its primitive definitions rather than in an
  enumeration vocabulary, so the scheme recorded only a type URI and the payload
  was checked for one thing, that it was not empty. A multimedia FORM is now one
  of `[bmp, gif, jpg, ole, pcx, tif, wav]` — 5.5 spelled two of those `jpeg` and
  `tiff` — and each ordinance status one of the seven or eight the specification
  lists for it. Their values are upper case where `PEDI` and `RESN` are lower, and
  a file that mixes the two is now told so. Completion offers these values as well.
- **A payload type the validator does not describe is left alone, rather than
  required to be a non-empty string.** Every payload type either schema declares is
  now named, and a test over both says so. A type new to an upstream release used to
  reach the same check as free text and report a missing value on every structure
  that legitimately omits it; it now fails that test instead, where a person can see
  it.
- **A 5.5.1 date is read against the calendar its escape names, and completion
  offers one.** The twelve month tags lived in four places — the 5.5.1 date grammar,
  the day-length table, the 7.0 `calendar` section and the completion reader's own
  list — and 5.5.1, whose `calendar` section was empty, could use none of them. That
  section now describes all six calendars 5.5.1 names, `validator/calendars.ts` is
  the only reader of it, and the lengths stay in code with a test binding them to the
  months both schemes name. `@#DHEBREW@ 45 XXX 5760` is reported rather than waved
  through on a non-empty check, `@#DJULIAN@ 12 JAN 2000` is checked as a date rather
  than accepted for being non-empty, and a date under `@#DROMAN@` or `@#DUNKNOWN@` —
  calendars 5.5.1 names and gives no month — is still accepted, because an empty
  month table says nothing rather than forbidding everything. Completion in a 5.5.1
  file went from 8 candidates with the cursor after `2 DATE` to 26, the escapes and
  the Gregorian months joining the modifiers; from none after `2 DATE 12` to 14; and
  from none after `2 DATE 12 JAN 2000` to the two epoch spellings 5.5.1 writes.
  Neither conformance corpus moved: 8 diagnostics over 23 official files, 14 795
  over 14 vendor exports. See docs/adr/0012.

- **A document with more than about 125k diagnostics reports all of them instead of
  none.** Diagnostics were gathered by spreading each level's array into its
  parent's `push`, and a spread is one argument per element: V8 refuses somewhere
  past 125k, so `createDocument` threw a `RangeError` for exceeding the call stack
  and the caller got an exception where it had asked a question — not a truncated
  list, none. A file of 130 000 records each carrying one tag the schema does not
  define there now reports its 130 000 warnings. One array is carried down the walk
  and pushed into, so nothing is capped and no array is allocated per node.
- **A line below one carrying a pointer but no tag answers nothing instead of
  throwing.** `0 @I1@`, what a truncated export leaves behind, still becomes a node
  and adopts the lines indented under it, so the walk from a node to the root met a
  step with no tag and threw `TypeError: Cannot read properties of undefined`. Asking
  for the type, the label or the pointer target of such a node — hovering
  `1 NAME John /Doe/` is one way in — now gives the same empty answer already given
  for a path the schema does not resolve.
- **A year followed by an extension epoch is a date.** `2 DATE 2000 _MYEPOCH` was
  reported as an invalid date value. An extension tag is admissible as a month and
  as an epoch alike, and the reader took the pair for a day and a month — leaving
  the date with no year, which every date must have. A month is now read only when
  the year it must precede follows it, so the epoch reading is the one left. The
  same value under an extension calendar, `2 DATE _MYCAL 1900 _MYEPOCH`, was
  rejected for the same reason and is now read too.

- **An unresolved pointer names the xref that failed, and lists nothing.** A `FAMC`
  pointing at a family the file does not declare was reported as "Value for FAMC
  should be in set [@F70@, @F75@, … 2853 more]" — the vocabulary of a closed set,
  spent on ten families that were not the problem, ending in an admission that it
  gave up. A pointer's set is the population of the document, so the diagnostic now
  states the fact about the line: "No FAM record carries @F1450@". An enumeration
  still lists its values, because for `SEX` the four of them are the whole answer.
  Where the payload is not a pointer at all the message is unchanged — there the
  shape is what is wrong, not the identifier.

## 1.8.2 - 2026-08-18

- **A tag written in mixed case is read as written, and the message says which tag
  is meant.** `1 NoTe hello` was reported as "Unknown tag N" — the tag pattern held
  upper case only, so it matched as far as `N` and `oTe hello` became the value, and
  the reader was told about a tag that is nowhere in their file. The tag is now read
  whole and the message says a tag is written in upper case, naming `NOTE`. Where
  case is not the problem, `1 NOTEE` still reads as an unknown tag.
- **A line carrying no level is reported once.** The parser says a GEDCOM line must
  begin with a level, and the validator no longer adds its own word about the tag of
  a line that is not a line.

- **A tag declared twice in `HEAD.SCHMA` with different URIs is no longer reported.**
  The specification permits it — "the schema structure may contain the same tag more
  than once with different URIs" — and its own `extensions.ged` declares `_PARTY`
  twice, once for a substructure and once for a record. The check now asks whether
  the same tag was declared twice with the _same_ URI, which says nothing the first
  declaration did not. Which of several URIs applies where a tag is used is a
  separate question.

- **A line the lexer cannot read is reported once, in words about GEDCOM.** An xref
  with a space in it — `0 @NoTe ref@ NOTE …` — produced "unexpected character:
  ->@<- at offset: 199, skipped 1 characters", which is true of the scanner and no
  use to a reader. The lexer then resumed one character on, so the wreckage lexed
  into a tag `N` and a value, and the line was reported a second time as an unknown
  tag that is nowhere in the file. Such a line now yields one diagnostic, saying an
  xref holds letters, digits and underscore between two @ marks, and its tokens are
  dropped rather than read as something else. The lines around it are untouched.
- **An unknown tag at the top level says `root`** where it said `undefined`. The
  message about a missing tag has said `root` all along.
- **A file whose lines end in CR is read as a file, not as one line.** 5.5.1 ends a
  line with CR, LF, CR-LF or LF-CR; the lexer's terminator was `\r?\n` and the line
  index counted only LF, so a CR-only document parsed to a single node, its version
  was never found, and everything above the lexer worked from one line. All four
  terminators now end a line, a two-character form counts as one, and positions come
  out the same whichever is used.

- **A required tag missing from a childless parent is reported where it is
  missing.** The position came from the parent of the first child, so a parent with
  no children at all had no position to offer and the report landed on line 1. In a
  105 707-line export that put ten `Missing required tag FORM in FILE` diagnostics
  at the top of the document, a hundred thousand lines from the media references
  they describe.
- **Six closed value sets in 5.5.1 are checked at last.** `QUAY 9`, `PEDI nonsense`,
  `RESN whatever`, `ORDI maybe`, `STAT nonsense` under `FAMC` and `ADOP nonsense`
  under `INDI.ADOP.FAMC` all passed, because 5.5.1 states these sets in its
  primitive definitions rather than in an enumeration vocabulary, and a payload
  type the field-type switch did not name was validated as free text. Each now
  names its set in the scheme and is judged by the rule that already existed for
  GEDCOM 7 enumerations. Every real export in the corpus already wrote these
  correctly, so nothing new is reported there. Completion offers the same values
  while one is typed, because it reads the same sets: a `PEDI` line in a 5.5.1
  file now proposes `adopted`, `birth`, `foster` and `sealing`.
- **A BC year in a 5.5.1 file is read in the spellings exports write.** `1472 B.C.`
  passed while `1472 BC`, `1472BC` and `1472B.C.` were reported, though `YEAR_GREG`
  carries no epoch at all and the specification only says in prose that "(B.C.)"
  appended to the year marks a date before the common era — pinning neither the
  spelling nor the delimiter. Every spelling now reads as the same era, in the
  validity check and in the leap-year rule alike, so `29 FEB 1000 BC` is no longer
  judged by whether 1000 was a leap year. Free text stays reported: `609 BC Megiddo`
  and `abt. 716 BC (or 725)` belong in `DATE_PHRASE` parentheses. GEDCOM 7 is
  unchanged, where `epoch = %s"BCE"` says exactly what is allowed.
- **An age in a 5.5.1 file is no longer judged by GEDCOM 7's grammar.** `AGE <8y`
  was reported while `AGE < 8y` passed, and `8Y` and `child` were reported while
  `8y` and `CHILD` passed. One expression served both versions, and it was
  written to v7's ABNF, where the delimiter after `<` or `>` is required and
  `years = Integer %x79` pins the unit letter. 5.5.1 prints neither rule, and
  real exports write both forms, so 5.5.1 ages are now read without a required
  delimiter and without regard to case. v7 keeps its ABNF exactly.

## 1.8.1 - 2026-08-17

- **A note written as text in a 5.5.1 file is no longer reported.** `1 NOTE plain
text` was told to be a pointer to a `NOTE` record, though `NOTE_STRUCTURE` has
  two forms and the text itself is the second. A note that ran to a `CONT` line
  escaped, because the pointer rule stays silent for a structure with children,
  so the report landed only on one-line notes — which every export from
  MyHeritage, Ancestry and Gramps is full of. The schema still names the pointer
  form, which is the one with a target to resolve and to complete.
- **A source citation carrying its description is no longer reported either.**
  `1 SOUR Parish register, Warsaw, vol 3 p 41` is the branch 5.5.1 provides for
  systems that keep no source records, and `TEXT` written beneath it is no longer
  an unknown tag. See [ADR 0010](../../docs/adr/0010-two-form-structures-in-5-5-1.md).

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
