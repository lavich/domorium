## Purpose

Reports a date naming a day its month does not have, such as `31 FEB`, which the
date grammar accepts because it gives a day as an integer and says no more — and
reads the month and the calendar the way the grammar does, `SCHMA` aliases
resolved, so the check and the grammar agree about what a date says.

## ADDED Requirements

### Requirement: A day its month does not have is reported

The validator SHALL report, with the code `VAL014` and level `error`, every date
in a date payload accepted by its dialect's grammar that names a day below 1 or
above the length of its month, where the date is in the `GREGORIAN` or `JULIAN`
calendar, in documents checked as GEDCOM 7 and as GEDCOM 5.5.1. February SHALL
be judged by the leap-year rule of the date's own calendar: in `GREGORIAN` a
year divisible by 100 and not by 400 is not leap, in `JULIAN` every fourth year
is. Where the date has no year a day can be judged against, or its year is
before the common era, February SHALL be given 29 days. Each date of a range or
a period SHALL be judged in its own calendar. A date in any other calendar, and
text inside a phrase, SHALL NOT be judged. The message SHALL name the day, the
month and the number of days the month has.

#### Scenario: A day February does not have

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE 31 FEB 1900`
- **THEN** the line carries a `VAL014` error whose message names `31 FEB` and
  says FEB has 28 days

#### Scenario: The Julian leap-year rule

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE JULIAN 29 FEB 1700`
- **THEN** no `VAL014` is reported for it
- **AND** `2 DATE 29 FEB 1700` carries a `VAL014` error

#### Scenario: A calendar escape in GEDCOM 5.5.1

- **WHEN** a document declaring `2 VERS 5.5.1` has `2 DATE @#DJULIAN@ 29 FEB 1700`
- **THEN** no `VAL014` is reported for it

#### Scenario: Each date of a range in its own calendar

- **WHEN** a document declaring `2 VERS 7.0` has
  `2 DATE FROM JULIAN 1 JAN 1700 TO 29 FEB 1900`
- **THEN** the line carries one `VAL014` error naming `29 FEB`

#### Scenario: A calendar whose months are not judged

- **WHEN** a document declaring `2 VERS 5.5.1` has
  `2 DATE @#DROMAN@ 31 FEB 1900`
- **THEN** no `VAL014` is reported for it

### Requirement: An aliased month or calendar is read as the tag it abbreviates

In a document checked as GEDCOM 7, the day-length check SHALL read a month or a
calendar written as an extension tag that `HEAD.SCHMA` declares with the URI of
a standard month or calendar as that standard month or calendar, exactly as the
GEDCOM 7 date grammar reads it, in every date payload type. A `VAL014` message
for such a date SHALL name the standard month. An extension tag that is not an
alias of a standard month or calendar SHALL be read as it is written. In a
document checked as GEDCOM 5.5.1, an extension tag in a date SHALL never be read
as a standard month or calendar, whatever `SCHMA` the file writes.

#### Scenario: An aliased month naming a day it does not have

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _APRX https://gedcom.io/terms/v7/month-APR` in `SCHMA` has
  `2 DATE 31 _APRX 2000`
- **THEN** the line carries a `VAL014` error whose message names `31 APR` and
  says APR has 30 days

#### Scenario: An aliased month in an exact date

- **WHEN** the same document has `1 CHAN` with `2 DATE 31 _APRX 2000`
- **THEN** that line carries a `VAL014` error

#### Scenario: An aliased Julian calendar

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _JUL https://gedcom.io/terms/v7/cal-JULIAN` in `SCHMA` has
  `2 DATE _JUL 29 FEB 1900`
- **THEN** no `VAL014` is reported for it, as 1900 is a Julian leap year

#### Scenario: An aliased calendar binds to its own date only

- **WHEN** the same document has `2 DATE FROM _JUL 29 FEB 1900 TO 29 FEB 1900`
- **THEN** the line carries one `VAL014` error naming `29 FEB`, for the second,
  Gregorian, date

#### Scenario: An aliased month whose day exists

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _APRX https://gedcom.io/terms/v7/month-APR` in `SCHMA` has
  `2 DATE 30 _APRX 2000`
- **THEN** no diagnostic is reported for it

#### Scenario: An aliased month in a date period

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _APRX https://gedcom.io/terms/v7/month-APR` in `SCHMA` has
  `1 SOUR`, `2 DATA`, `3 EVEN BIRT`, `4 DATE FROM 31 _APRX 2000`
- **THEN** that line carries a `VAL014` error naming `31 APR`

#### Scenario: An aliased calendar and an aliased month together

- **WHEN** a document declaring `2 VERS 7.0` declares in `SCHMA`
  `_JUL` → `https://gedcom.io/terms/v7/cal-JULIAN`,
  `_APRX` → `https://gedcom.io/terms/v7/month-APR` and
  `_FEBX` → `https://gedcom.io/terms/v7/month-FEB`, and has
  `2 DATE _JUL 31 _APRX 1900` and `2 DATE _JUL 29 _FEBX 1900`
- **THEN** the first line carries one `VAL014` error naming `31 APR`, and the
  second carries none

#### Scenario: An aliased calendar at one end of a range

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _JUL https://gedcom.io/terms/v7/cal-JULIAN` in `SCHMA` has
  `2 DATE BET _JUL 29 FEB 1900 AND 29 FEB 1900`
- **THEN** the line carries one `VAL014` error naming `29 FEB`

#### Scenario: An extension tag that is not an alias

- **WHEN** a document declaring `2 VERS 7.0` and
  `2 TAG _MON https://example.com/month` in `SCHMA` has `2 DATE 31 _MON 1900`
- **THEN** no `VAL014` is reported for it

#### Scenario: No alias in GEDCOM 5.5.1

- **WHEN** a document declaring `2 VERS 5.5.1` writes `1 SCHMA` with
  `2 TAG _APRX https://gedcom.io/terms/v7/month-APR` and has
  `2 DATE 31 _APRX 2000`
- **THEN** the line carries a `VAL004` error and no `VAL014`
