## Purpose

Reports a date naming a year its calendar does not number, so that a year 0 —
which GEDCOM 7 says the Gregorian and Julian calendars do not have — is not
accepted as a date like any other.

## ADDED Requirements

### Requirement: Year 0 in the Gregorian or Julian calendar is reported

The validator SHALL report, with the code `VAL016`, every date in a date payload
that its dialect's grammar reads as year 0 in the `GREGORIAN` or `JULIAN`
calendar, with or without the `BCE` epoch, however the year and the epoch are
written, in documents checked as GEDCOM 7 and as GEDCOM 5.5.1. The calendar is
the one the grammar reads, `SCHMA` aliases resolved. The message SHALL name the
year and the calendar.

GEDCOM 7 states of both calendars that "there is no year 0; year 1 BCE was
followed by year 1". GEDCOM 5.5.1 states nothing, and is held to the same rule
because its calendars are the same ones.

#### Scenario: Year 0 in a GEDCOM 7 date

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE 0 BCE`
- **THEN** the line carries a `VAL016` error naming year 0 and `GREGORIAN`

#### Scenario: Year 0 at one end of a range

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE BET JULIAN 0 AND 10`
- **THEN** the line carries one `VAL016` error naming year 0 and `JULIAN`

#### Scenario: Year 0 in a GEDCOM 5.5.1 date

- **WHEN** a document declaring `2 VERS 5.5.1` has `2 DATE 1 JAN 0000`,
  `2 DATE 0BC` or `2 DATE 0/01 B.C.`
- **THEN** each line carries a `VAL016` error naming year 0 and `GREGORIAN`

#### Scenario: A calendar the rule does not cover

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE HEBREW 0`, or declares
  `_CAL` in `SCHMA` and has `2 DATE _CAL 0`
- **THEN** no `VAL016` is reported for it

#### Scenario: A year that is not 0

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE 1 BCE` or
  `2 DATE 0 _MON 1900` with `_MON` declared in `SCHMA`
- **THEN** no `VAL016` is reported for it

#### Scenario: A day and a year both impossible

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE 30 FEB 0`
- **THEN** the line carries both `VAL014` and `VAL016`, each naming its own fault

#### Scenario: A malformed date is reported once

- **WHEN** a date payload does not match its grammar at all
- **THEN** it carries the malformed-value diagnostic and no `VAL016`
