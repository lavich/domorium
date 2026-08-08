# Changelog

All notable changes to the GEDCOM extension by Domorium are documented here.

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
