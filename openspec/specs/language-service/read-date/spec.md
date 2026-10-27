# language-service/read-date Specification

## Purpose

States what `readDate` answers for a date payload, so that a consumer showing a
year — the Obsidian plugin first among them — gets one from every document that
writes a readable date, whether or not the document is checked against a
dialect.

## Requirements

### Requirement: A document checked against a dialect reads in that dialect

Where the document is checked against a dialect — a supported version, a
substituted one, or a fragment created with a dialect — `readDate` SHALL read
the payload by that dialect's date grammar, and SHALL answer `null` wherever the
document's diagnostics would reject the payload as a date value.

#### Scenario: A GEDCOM 7 document

- **WHEN** a document declaring `2 VERS 7.0` reads `7 NOV 1867`
- **THEN** it answers one date: calendar `GREGORIAN`, day 7, month `NOV`, year 1867

#### Scenario: A date the dialect rejects

- **WHEN** a document declaring `2 VERS 7.0` reads `@#DJULIAN@ 1750`
- **THEN** it answers `null`, as the GEDCOM 7 grammar has no calendar escape

#### Scenario: A substituted version

- **WHEN** a document declaring `2 VERS 5.5` reads `1401 B.C.`
- **THEN** it answers one date with year 1401 and epoch `BCE`, read by GEDCOM 5.5.1

#### Scenario: A fragment created with a dialect

- **WHEN** a fragment created with dialect 7.0 reads `@#DJULIAN@ 1750`
- **THEN** it answers `null`, as it reads by GEDCOM 7 alone

### Requirement: A document checked against no dialect reads by either dialect

Where the document is checked against no dialect — its header names no
`HEAD.GEDC.VERS`, names a system before `GEDC` (a Personal Ancestral File), or
names a version no schema describes — `readDate` SHALL read the payload by the
GEDCOM 5.5.1 date grammar and schema, and where that reads no date value, by the
GEDCOM 7 date grammar and schema without `SCHMA` context. It SHALL answer `null`
only where neither reads a date value, or where the date read names a day or a
year its calendar does not have.

The answer SHALL have the same shape whichever dialect read it: the GEDCOM 7
spelling of a calendar and `BCE` for every spelling of the epoch.

#### Scenario: No version in the header

- **WHEN** a document whose header has no `GEDC` reads `7 NOV 1867`
- **THEN** it answers one date: calendar `GREGORIAN`, day 7, month `NOV`, year 1867

#### Scenario: A Personal Ancestral File

- **WHEN** a document whose header names `1 SYST` before `1 GEDC` reads
  `ABT 1850`
- **THEN** it answers modifier `ABT` and one date: calendar `GREGORIAN`, year 1850

#### Scenario: An unsupported version

- **WHEN** a document declaring `2 VERS 8.0` reads `BET 1850 AND 1860`
- **THEN** it answers modifier `BET` and two dates, years 1850 and 1860

#### Scenario: A construct only GEDCOM 5.5.1 writes

- **WHEN** a document with no version reads `@#DJULIAN@ 12 FEB 1750/51`
- **THEN** it answers one date: calendar `JULIAN`, day 12, month `FEB`, year
  1750, dual year 1751

#### Scenario: A construct only GEDCOM 7 writes

- **WHEN** a document with no version reads `FROM JULIAN 1670 TO 1800`
- **THEN** it answers modifier `FROM` and two dates: `JULIAN` 1670 and
  `GREGORIAN` 1800

#### Scenario: Not a date in either dialect

- **WHEN** a document with no version reads `sometime in spring`
- **THEN** it answers `null`

#### Scenario: A day its calendar does not have

- **WHEN** a document with no version reads `31 FEB 1900`
- **THEN** it answers `null`

#### Scenario: The reading reports nothing

- **WHEN** documents with no version, with a PAF header, and declaring
  `2 VERS 8.0` are created, each with a `DATE` line
- **THEN** their diagnostics are exactly `VAL012`, `VAL015` and `VAL011`
  respectively, and none of them concerns the `DATE` line

### Requirement: A year a calendar does not number reads as nothing

`readDate` SHALL answer `null` for a payload in which any date it reads names
year 0 in the `GREGORIAN` or `JULIAN` calendar, with or without the `BCE` epoch,
in every document.

#### Scenario: Year 0 in a GEDCOM 7 document

- **WHEN** a document declaring `2 VERS 7.0` reads `0` or `0 BCE`
- **THEN** it answers `null`

#### Scenario: Year 0 in a GEDCOM 5.5.1 document

- **WHEN** a document declaring `2 VERS 5.5.1` reads `0`, `0BC` or
  `@#DJULIAN@ 1 JAN 0`
- **THEN** it answers `null`

#### Scenario: Year 0 in an extension calendar

- **WHEN** a document declaring `2 VERS 7.0` and `_CAL` in `SCHMA` reads `_CAL 0`
- **THEN** it answers one date: calendar `_CAL`, year 0

### Requirement: A year before the common era carries no dual year

A date read with the `BCE` epoch SHALL NOT carry a dual year, and the API's
description of the dual year SHALL say so: the Old Style / New Style overlap a
dual year records falls in the common era.

#### Scenario: A 5.5.1 dual year before the era

- **WHEN** a document declaring `2 VERS 5.5.1` reads `1750/51 B.C.`
- **THEN** it answers one date: calendar `GREGORIAN`, year 1750, epoch `BCE`, and
  no dual year
