## Why

In a GEDCOM 7 file the day-length check reads a date's tokens as written, while
the date grammar reads them after resolving `SCHMA` aliases, so the two disagree
about what a date says (lavich/domorium#448). `impossibleDays`
(`packages/validator/src/validator/calendarDays.ts:94-137`) splits the raw
payload with `dateTokens` (`:98`), finds calendars with `calendarNamed` (`:108`,
`calendars.ts:87-97`) and months in `LENGTHS` (`:118`); none of them knows the
document's aliases. The GEDCOM 7 grammar resolves every token through
`resolveTag` first (`date-v7.ts:157-162`). The same check feeds `VAL014`
(`rule-node.ts:126-139`, called at `:590-598`) and the `null` in
`GedcomDocument.readDate` (`gedcomDocument.ts:52-61`, `:343-359`).

Reproduced on `main` at `189e0fa` against the built validator, in a 7.0
document whose `SCHMA` declares the alias, the date on `INDI.BIRT.DATE` and on
`INDI.CHAN.DATE` (a `DateExact`):

| Payload            | Alias                 | Diagnostics on `BIRT.DATE`                    | `readDate`                                                   |
| ------------------ | --------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `31 _APRX 2000`    | `_APRX` → `month-APR` | none (none on `CHAN.DATE` either)             | `{ calendar: GREGORIAN, day: 31, month: "APR", year: 2000 }` |
| `_JUL 29 FEB 1900` | `_JUL` → `cal-JULIAN` | `VAL014`: `names 29 FEB, and FEB has 28 days` | `null`                                                       |

The first is a day April does not have, passed and handed on under the standard
month name; the second is a valid Julian date judged by the Gregorian leap-year
rule.

The year check added by #465 is not affected: `impossibleYears`
(`calendarDays.ts:143-155`) reads the grammar's output, which has the alias
resolved. Reproduced: `_JUL 0` with `_JUL` → `cal-JULIAN` carries
`VAL016`: `names year 0, and JULIAN has no year 0`, and `readDate` answers
`null`. Its behaviour stays as it is; this change only adds a test that holds it.

## The requirement, as the user decided it

2026-10-29, asked: "#448: читать дату для проверки длины дня с учётом алиасов из
SCHMA? Тогда `31 _APRX 2000` получит VAL014, а `_JUL 29 FEB 1900` перестанет его
получать; readDate для первой даты вернёт null." The user chose **"Да, как в
issue"**: the day-length check and `readDate` read months and calendars after
resolving `SCHMA` aliases, as the grammar already does. GEDCOM 7 only.

## What Changes

- In a document checked as GEDCOM 7, the day-length check reads a month or a
  calendar written as a `SCHMA` alias as the standard tag it abbreviates, with
  the same resolution the GEDCOM 7 date grammar applies. `VAL014` is reported
  for an aliased month naming a day it does not have, in every date payload type
  (`DateValue`, `DatePeriod`, `DateExact`), and is no longer reported for a day
  that the aliased calendar has. The message names the standard month, as
  `VAL016` already names the standard calendar.
- `readDate` in a document checked as GEDCOM 7 declines a date by the same
  resolved check, so `31 _APRX 2000` reads as `null` and `_JUL 29 FEB 1900` reads
  as one Julian date.
- Unchanged: GEDCOM 5.5.1, whose grammar reads no extension tag as a standard
  month or calendar even where the file writes a `SCHMA`; a
  document checked against no dialect, whose GEDCOM 7 reading has no `SCHMA`
  context; an extension tag that is not an alias; the year check.
- No breaking change. A diagnostic appears on files where it was missing and
  disappears where it was wrong.

## Capabilities

### New Capabilities

- `validator/impossible-day`: the `VAL014` diagnostic for a day its month does
  not have, stated for the first time, including how an aliased month or
  calendar is read.

### Modified Capabilities

- `language-service/read-date`: the requirement "A document checked against a
  dialect reads in that dialect" states that a GEDCOM 7 document resolves its
  `SCHMA` aliases before judging the day, with the issue's two payloads as
  scenarios.

## Impact

- Layers: `@domorium/validator` only (`calendarDays.ts`, `rule-node.ts`,
  `gedcomDocument.ts`). `@domorium/language-service` passes `readDate` and the
  diagnostics through unchanged (`languageService.ts:103-105`). Dependencies
  keep pointing down; no adapter or host changes code.
- Hosts: all four see the diagnostic change on a GEDCOM 7 file that aliases a
  month or a calendar — VS Code and JetBrains through the language server, the
  web editor and Obsidian through `@domorium/codemirror`. `readDate`'s consumer
  is domorium-obsidian, outside this repository.
- Public API: no signature exported from the package entry point changes.
- Docs: `## Unreleased` entries in the validator and language-service
  changelogs. The READMEs already promise this behaviour ("`null` wherever
  `getDiagnostics()` would reject it"; the 2.1.0 changelog says `readDate`
  "resolves a `SCHMA` alias of a month or a calendar"), so they change only if a
  re-read finds a sentence the fix makes untrue.
- Release: `@domorium/validator` patch (a bug fix), made later by a separate
  release PR. npm consumers of `@domorium/language-service` get it without a
  language-service release, through its `^2.2.0` range on the validator
  (`packages/language-service/package.json:56`); the editor hosts bundle their
  dependencies and see it only after their own releases.
