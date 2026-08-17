# Changelog

All notable changes to the GEDCOM extension by Domorium are documented here.

## 1.6.1

- **A note written as text in a GEDCOM 5.5.1 file is no longer reported.**
  `1 NOTE plain text` was told to be a pointer to a `NOTE` record, and a source
  citation carrying its description — `1 SOUR Parish register` — was told the same,
  with `TEXT` beneath it called an unknown tag. Both are forms the specification
  provides, and files exported by MyHeritage, Ancestry and Gramps are full of them.

## 1.6.0

- **A file is coloured by what each part of a line is.** A tag is a keyword
  rather than a string, an XREF is an identifier rather than a keyword, and the
  value of a line — which carried no colour at all — is a string. Every theme
  colours these four on its own, so a `.ged` file will look different after the
  update.
- **An XREF is coloured where it used to be plain.** A theme with no rule of its
  own for an identifier falls back to a TextMate scope, and the one VS Code
  reaches for by default is the colour of ordinary text. The extension now names
  the scopes to fall back to instead, and the record an XREF declares is set
  apart from a reference to it.

## 1.5.0

- **A file whose version cannot be checked no longer looks clean.** `2 VERS 4.0`,
  a misspelled version and a file with no version line were all checked against
  GEDCOM 7 and reported nothing, because none of those rules applied to them.
  They now carry one error saying so, and the rest of the checking goes quiet
  rather than judging the file by the wrong specification. Levels, syntax and
  highlighting still work, and so do folding and navigation.
- **`2 VERS 5.5`, `5.5.5` and `5.5EL` are checked against the 5.5.1 rules with a
  warning** that says the two differ, so some marks may not apply and others may
  be missing. Those files previously collected the 5.5.1 marks with no
  explanation of where they came from.
- Completions and file links go quiet for a version with no rules, and a
  4.0 file is no longer offered GEDCOM 7 record creation.
- **Anything written under a structure that cannot hold it is now marked.** A
  line beneath `1 TITL`, or beneath the trailer in a 5.5.1 file, was accepted
  without comment.
- `2 VERS  5.5.1` written with two spaces was read as GEDCOM 7, so a 5.5.1 file
  was checked against the wrong rules and an absolute media path stopped being a
  clickable link. Both are fixed.
- `1 OBJE` with `FILE` and `TITL` written beneath it, the inline form of a 5.5.1
  media link, no longer reports `Unknown tag FILE`.

## 1.4.0

- An extension tag used as an enumeration value is no longer marked as an error.
  `2 PEDI _ENUMVAL` and `2 ROLE _CHILD` were underlined; the specification
  permits extending an enumeration this way. One that is never declared in
  `HEAD.SCHMA` is now a warning instead.
- A `HEAD.SCHMA` tag declared as an abbreviation for a standard URI is read as
  the structure it names. A record written under such an alias now satisfies a
  pointer to the standard tag, and a date in an aliased calendar is accepted.
- `1 EVEN` with a `TYPE` beneath it is no longer reported as missing a value in a
  GEDCOM 5.5.1 file.
- **A count that is not a number is now marked.** `1 NCHI abc` was accepted, and
  so were `3.7`, `12abc` and `Infinity`.
- An event with neither a value nor anything beneath it is a warning rather than
  an error, and says what is actually wrong: the line asserts nothing and other
  software may drop it.
- A source citation pointing at a record type the file does not contain no longer
  offers an empty list of candidates.
- Problems now carry a distinct code for each kind, so they can be filtered and
  suppressed separately in the Problems panel.

## 1.3.0

- Dates that name their calendar are no longer marked as errors. `JULIAN 1401`,
  `HEBREW 1 TSH 5761` and even `GREGORIAN 1 JAN 2000` were all underlined in a
  GEDCOM 7 file. Each calendar's own months and epochs now apply, so a Hebrew
  date with a Gregorian month is still caught.
- **Three older date forms are now marked in a 7.0 file**, so a file that was
  clean may not be: the `@#DGREGORIAN@` calendar escape, a slashed year such as
  `1 JAN 1857/58`, and phrases like `INT 1950 (around 1950)` or `(unknown)`.
  Version 7.0 removed all three — a date phrase belongs in a `PHRASE` line
  beneath the date. GEDCOM 5.5.1 files are unaffected.
- A structure whose payload the specification allows to be left out is no longer
  reported as missing a value. `1 EVEN` with only a `TYPE` beneath it was
  flagged, along with 60 other kinds of line, and so were `AGE` and `DATE` left
  empty with a `PHRASE` instead.
- A file that begins with a byte order mark no longer opens with a warning on
  its first line.
- The message for a source citation that carries text instead of a pointer now
  says what belongs there rather than naming the rule.

## 1.2.0

- Keep the spaces that belong to a value. A `NOTE` beginning with spaces kept
  losing them, and `CONC` continuations silently changed the text they rejoined.
- Stop the hint for a broken pointer from covering the editor. It listed every
  matching record in the file and offered a quick fix for each; it now names ten
  and says how many more there are, and completion still offers all of them.
- Colour and validate large files without the editor stalling. Highlighting is
  built for the visible lines rather than the whole document, the problems panel
  refreshes once typing pauses, and validation cost no longer grows with the
  number of records times the number of lines.
- Hover no longer shows stray asterisks around the tag description.

## 1.1.0

- Accept application-defined extension tags (`_XXXX`) instead of reporting every
  one of them as an unknown tag. Files exported by other genealogy applications
  no longer fill the Problems panel with false warnings.
- Read extension tag declarations from `HEAD.SCHMA` in GEDCOM 7 documents: hover
  shows the URI a tag is bound to, and autocomplete offers the declared tags.
- Warn when a GEDCOM 7 document uses an extension tag it never declares in
  `HEAD.SCHMA`. GEDCOM 5.5.1 files, which have no such structure, are unaffected.
- Stop offering top-level record tags as completions inside a structure whose
  type cannot be resolved.

## 1.0.0

- First stable release: context-aware autocomplete, real-time validation against
  the GEDCOM 5.5.1 and 7.0 specifications, semantic highlighting, hover, go to
  definition, find all references, safe XREF rename, quick fixes, and folding.
- No functional change from 0.1.1.

## 0.1.1

- Present the extension as GEDCOM while retaining Domorium as the publisher and
  ecosystem identity.

## 0.1.0

- Rebrand the extension as Domorium — GEDCOM Tools.
- Move the Marketplace identity to `domorium.gedcom`.
- Move shared dependencies to the `@domorium` npm scope.

## 0.0.13

- Rename the extension from Domorium to GEDCOM
- Point repository and image links at the renamed repository

## 0.0.12

- Add Find All References and read/write XREF highlights
- Add safe, atomic XREF rename with stale-edit protection
- Add clickable web and local-file links
- Add quick fixes for broken references and invalid GEDCOM levels

## 0.0.11

- Add context-aware autocomplete for GEDCOM tags, structures, and values
- Add document symbols for navigating records in the Outline view
- Improve semantic highlighting accuracy

## 0.0.10

- Validate DATE, DATE_PERIOD and DATE_EXACT values
- Fix parser stalling on files with a GEDCOM 7 SNOTE record
- Accept @VOID@ as a valid pointer value
- Fix TIME validation (single-digit hours, fractional seconds, v7-only UTC suffix)

## 0.0.9

- Improved validator

## 0.0.8

- Make monorepo

## 0.0.3

- Basic validation
- Folder by level

## 0.0.1

- Initial release
- Syntax highlighting
- Basic validation
