## Context

See proposal.md for the problem and the reproduction. The pieces involved:

- `impossibleDays(scheme, value)` (`calendarDays.ts:94-137`) strips phrases,
  splits with `dateTokens`, and walks the tokens: a separator (`SEPARATORS`,
  `:43-54`) resets the calendar to `GREGORIAN`, a token `calendarNamed` knows
  sets it, and an integer followed by a month in `LENGTHS` is a day to judge.
- The GEDCOM 7 grammar resolves every token with `resolveTag(extensions, token)`
  before reading (`date-v7.ts:155-162`). Only an extension tag can be an alias,
  and nothing else in a date begins with `_`, so resolving the whole token list
  is safe (the comment at `:155-156` says so).
- `collectExtensions` (`extensions.ts:56-107`) maps a declared tag to a standard
  tag through `scheme.tag`, the URI-to-tag table. In `g7validation.json` that
  table names every calendar and month URI (`cal-JULIAN` → `JULIAN`,
  `month-APR` → `APR`); in `g551validation.json` it names no calendar or month
  at all, and the 5.5.1 grammar resolves no alias.
- Callers: `impossibleDateErrors` in `rule-node.ts:126-150`, given
  `this.extensions` alongside it at `:590-598`; `possibleDate` in
  `gedcomDocument.ts:52-61`, called from `readDate` (`:343-359`) with the
  document's extensions on the checked path and with none on the unchecked one.
- `impossibleYears` (`calendarDays.ts:143-155`) judges the reader's
  `GedcomDate[]`, whose `calendar` is already resolved — confirmed by
  reproduction (`_JUL 0` → `VAL016` naming `JULIAN`).

## Goals / Non-Goals

**Goals:**

- `VAL014` and `readDate` judge the same month and calendar the GEDCOM 7
  grammar reads.

**Non-Goals:**

- Re-basing the day check on the reader's output, as the year check is (see
  Decisions).
- Anything in GEDCOM 5.5.1, or in a document checked against no dialect: the
  first has no aliases, the second reads by GEDCOM 7 without `SCHMA` and keeps
  doing so.
- Date completion (`completion/dateSlot.ts`), which reads its own way and does
  not consult the day check.
- The year check, which already resolves aliases; it gains a regression test only.

## Decisions

### Resolve the tokens before the scan, with the extensions the grammar gets

`impossibleDays` takes an `ExtensionContext` as a third parameter, defaulting
to `emptyExtensions()` as the `date-v7.ts` readers do, and maps every token
through `resolveTag` before the scan, after phrases are stripped. The scan is
otherwise unchanged: `calendarNamed` now sees `JULIAN` for `_JUL`, `LENGTHS`
sees `APR` for `_APRX`, and the `ImpossibleDay` it returns carries the standard
month, so the `VAL014` message names `APR` — as `VAL016` names `JULIAN` for
`_JUL 0` today.

`impossibleDateErrors` takes the extensions and passes them;
`possibleDate` takes them too, and `readDate` passes `this.extensions` on the
checked path and nothing on the unchecked one, where the GEDCOM 7 reading already
has no `SCHMA`.

The 5.5.1 rules receive the same `this.extensions`. That is harmless rather than
a second rule: no 5.5.1 alias can name a month or a calendar, because
`g551validation.json`'s `tag` table names none, and the 5.5.1 grammar rejects
an extension tag as a month (`31 _APRX 2000` is `VAL004` there, reproduced), so
the check is never reached. A test in `calendarDays.test.ts`, beside the one
binding `LENGTHS` to the schemas, holds that the 5.5.1 `tag` table names no
calendar or month URI; it fails first if that assumption ever breaks. Passing extensions per rule
instead (a field on `ValueRule`) was considered and rejected: it adds a
per-dialect switch to guard a case the schema already rules out.

Alternatives:

- **Judge days from the reader's `GedcomDate[]`**, as `impossibleYears` does.
  The reader has the resolved calendar and month, the day, the year and the
  epoch, so this would remove the token scan, `SEPARATORS` and phrase stripping
  altogether. Rejected for this change: it alters what is judged outside the
  issue. A 5.5.1 dual year (`29 FEB 1699/00`) reads as year 1699 and would
  become a Gregorian non-leap year where the scan gives February 29 days, and
  every case the scan settles today would need re-proving against two readers.
  Worth its own issue if the two checks are to share one input.
- **Resolve aliases in `dateTokens`.** It is shared with 5.5.1 escapes and
  completion and has no `ExtensionContext`; resolution belongs with the GEDCOM 7
  reading, as `tokenizeResolved` keeps it.

No ADR: this is a behaviour decision; the contract is the
`validator/impossible-day` and `language-service/read-date` specs (ADR-0018).

## Risks / Trade-offs

- [A file in the conformance corpora aliases a month or a calendar] → its
  `VAL014` count moves. `npm run check:conformance` shows it; re-record with
  `-- --update` and read the diff.
- [An alias resolves to a token the scan treats as a separator] → none can:
  `SEPARATORS` are date keywords, and `scheme.tag` maps URIs to structure,
  enumeration, calendar and month tags. A payload that resolved to one would
  fail the grammar first and never reach the check.
- [A consumer took `readDate("31 _APRX 2000")` as a valid April date] → it now
  answers `null`, as the README promises for anything the diagnostics reject.

## Migration Plan

None. A patch release of `@domorium/validator`, picked up by the next
`@domorium/language-service` release; both made later by a separate release PR.
