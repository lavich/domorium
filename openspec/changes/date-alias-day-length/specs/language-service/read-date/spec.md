## MODIFIED Requirements

### Requirement: A document checked against a dialect reads in that dialect

Where the document is checked against a dialect — a supported version, a
substituted one, or a fragment created with a dialect — `readDate` SHALL read
the payload by that dialect's date grammar, and SHALL answer `null` wherever the
document's diagnostics would reject the payload as a date value. In a document
checked as GEDCOM 7, a month or a calendar written as a `SCHMA` alias SHALL be
read as the standard tag it abbreviates both in the answer and in judging
whether the date names a day its month does not have.

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

#### Scenario: An aliased month naming a day it does not have

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _APRX https://gedcom.io/terms/v7/month-APR` in `SCHMA` reads
  `31 _APRX 2000`
- **THEN** it answers `null`

#### Scenario: An aliased Julian calendar

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _JUL https://gedcom.io/terms/v7/cal-JULIAN` in `SCHMA` reads
  `_JUL 29 FEB 1900`
- **THEN** it answers one date: calendar `JULIAN`, day 29, month `FEB`, year 1900
