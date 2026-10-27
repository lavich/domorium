## Context

`GedcomDocument.readDate` (`packages/validator/src/document/gedcomDocument.ts:330`)
returns `null` unless `validatedAs` is set, and `validatedAs` is set only by
`applyScheme`, which `createDocument` skips for the `undetermined`, `paf` and
`unsupported` resolutions (`gedcomDocument.ts:148-184`). A fragment created with
a dialect is `undetermined` too, but goes through `applyScheme`
(`gedcomDocument.ts:139-146`), so `validatedAs` is exactly "checked against a
dialect". An `undetermined` resolution carries a scheme, but it is always the
newest one, 7.0, kept so an empty buffer can complete its header
(`versionRegistry.ts:133-145`) — not a reading of the file.

Both date readers take their schema as an argument and normalise to the same
`GedcomDateValue`: `readDateValue551(scheme, text)` (`date-551.ts:190`) and
`readDateValueV7(text, scheme, extensions)` (`date-v7.ts:196`), the latter
resolving `SCHMA` aliases first. The period and exact-date grammars of each
dialect accept subsets of what its date-value grammar accepts. A grammar's test
accepts more than its reader reads: 5.5.1 accepts any text after a calendar the
schema gives no months, such as `ROMAN`, and reads none of it (ADR-0012).

The day-length check, `impossibleDays` (`calendarDays.ts:85`), scans raw tokens
for a day followed by a `GREGORIAN` or `JULIAN` month. It feeds `VAL014`
(`rule-node.ts:570`) and the `null` in `readDate`. Year 0 passes everything
today: `0`, `0 BCE`, `0BC` and `1 JAN 0000` read as year 0 in their dialects
with no diagnostic.

## Goals / Non-Goals

**Goals:**

- `readDate` reads a date in a document checked against no dialect.
- Year 0 in `GREGORIAN` and `JULIAN` is a diagnostic and reads as `null`.

**Non-Goals:**

- Reporting anything new about a document checked against no dialect, or
  changing its completions or `getDialect()`: reading a date is not checking
  the file, and ADR-0009 still decides what an unchecked document is offered.
- Year 0 in `HEBREW`, `FRENCH_R` or an extension calendar. Neither specification
  states it.
- `SCHMA` aliases in the day-length check: that is #448. The year check reads
  the grammar's output and so resolves aliases already; the day check is left as
  it is.

## Decisions

### Documents without `validatedAs` read 5.5.1 first, then 7.0

Where `validatedAs` is unset, `readDate` tries
`readDateValue551` with the 5.5.1 schema, then `readDateValueV7` with the 7.0
schema and empty extensions, and keeps the first that reads. The schemas come
from `schemaForDialect`, not from `this.scheme`. The condition is `validatedAs`,
not the resolution kind, so a fragment created with a dialect keeps reading in
that dialect alone.

The order matters only for a payload both grammars read, and on those the two
agree: the plan's review found no payload both read differently. 5.5.1 goes
first because a file without a version is in practice a 5.5-era export. A test
holds the agreement on the shared forms.

Alternatives:

- The `undetermined` resolution's own 7.0 scheme, as #453 first suggested. It is
  the newest schema, kept for an empty buffer, not read from the file; it loses
  every 5.5-era construct (`@#DJULIAN@`, dual years, `B.C.`, phrases) and leaves
  PAF and unsupported documents at `null`.
- Guessing the dialect from `SCHMA`, `CHAR` or a calendar escape. A heuristic
  that misjudges short files, and a second answer to the question ADR-0009
  settles by reading `VERS` alone.
- Leaving it to the consumer, which would re-implement the same fallback over
  the same two readers.

No ADR: the contract outlives this change as the `language-service/read-date`
spec, and the reasoning stays here.

### Year 0 is judged on what the grammar read, not on tokens

The year check takes the `GedcomDate[]` a reader returned and reports each date
whose `calendar` is `GREGORIAN` or `JULIAN` and whose `year` is 0. A token scan
like the day check's would have to re-derive what the grammar already decided,
and gets it wrong: a 5.5.1 epoch glued to the year (`0BC`) is one token, and an
extension calendar (`_CAL 0`) is not one `calendarNamed` knows, so the scan would
judge it as Gregorian. The reader settles both, and resolves `SCHMA` aliases.

In `rule-node.ts`, `ValueRule` replaces `calendarDays: true` with
`read: (value, scheme, extensions) => GedcomDateValue | null`. The six date
rules all use their dialect's date-value reader, since periods and exact dates
are subsets of a date value. After `test` passes, the rule reports the day
findings as today and the year findings from `read`. A payload `test` rejects
reaches neither, so it carries only the malformed-value diagnostic; a payload
`test` accepts and `read` does not read has no year findings.

`readDate` declines a reading with a day finding (under the schema that read
it) or a year finding.

### A code of its own: `VAL016` `ImpossibleYear`

`errors.ts` says each kind of problem needs its own code so a consumer can
filter or suppress it; a year a calendar does not number is not a day a month
does not have. Level `error`, like `VAL014`. The message follows `VAL014`'s
shape: `names year 0, and GREGORIAN has no year 0`. The enum's doc comment says
the rule is GEDCOM 7's, applied to 5.5.1 as well. Numbering continues the `VAL`
series; #235 is still open and this change does not pre-empt it.

Where a date has both faults, as `30 FEB 0` does, both codes are reported: they
are two separate facts, and `VAL014` already judges February of year 0 by the
leap-year rule.

### The dual year before the era is documented, not changed

`readDateSlot` already drops a dual year with an epoch (`date-551.ts:88-96`).
The doc comment on `GedcomDate.dualYear` and the language-service README say so.

## Risks / Trade-offs

- [A real export writes year 0 for "unknown"] → it now carries an error where it
  carried none. The user chose to reject it; the message names the rule, and a
  consumer can suppress the code. The conformance check shows whether any
  vendor file does.
- [The two grammars come to read some payload differently] → the agreement test
  fails first.
- [A consumer took `null` from an unchecked document to mean "do not trust it"]
  → the README states the new contract; `getVersionResolution()` still says the
  document is not checked.
- [Reading a date value twice per date line in `rule-node`, once to test and once
  to read] → only for lines that pass the test, and both are linear in a short
  payload. `test` cannot become `read !== null`: that would report the
  undescribed calendars ADR-0012 leaves alone.

## Migration Plan

None. `readDate` answers where it answered `null`, and `VAL016` is new. Released
as minor versions of `@domorium/validator` and `@domorium/language-service`.

- A document checked against no dialect falls through to 7.0 also where 5.5.1
  reads an impossible date. No payload was found where that changes the answer;
  it keeps `readDate` to the one rule its comment states.
- Year 0 with an extension epoch (`0 _EP`) is not reported: an extension epoch
  numbers its years its own way, as the day check already assumes.
- The landing page's list of checks names year 0 beside `31 FEB`, checked with a
  screenshot of the built page.
- `scripts/vendor-corpus.json` notes now name the `VAL001…VAL016` range.
