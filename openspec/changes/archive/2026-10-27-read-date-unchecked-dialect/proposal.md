## Why

`readDate` answers `null` for every payload in a document whose version is not
checked — no `HEAD.GEDC.VERS`, a Personal Ancestral File header, or a version no
schema describes — so domorium-obsidian, which reads every year it shows
through `readDate`, shows no year at all for such files (#453). The same probes
found that a year 0 reads and validates as a Gregorian or Julian year, which
GEDCOM 7 says does not exist, and that a dual year before the common era is
dropped without the API saying so.

## User's decision

Recorded 2026-10-27, answering the three questions #453 raises:

- How `readDate` reads a date in a document without a checked version (no
  `VERS`, PAF, an unknown version): **"Любым диалектом"** — by either dialect,
  5.5.1 first, then 7.0; whichever reads it.
- Year 0 in `GREGORIAN` and `JULIAN`: **"Отклонять"** — reject it, with a new
  diagnostic in every host, and `readDate` answers `null`.
- A dual year before the era (`1750/51 B.C.`): **"Только документировать"** —
  document that it carries no `dualYear`; behaviour unchanged.

## What Changes

- `readDate` in a document checked against no dialect — no `VERS`, a PAF
  header, or an unsupported version; not a fragment created with a dialect —
  reads the payload by the GEDCOM 5.5.1 date grammar and, where that reads
  nothing, by the GEDCOM 7 one, each with its own schema. It answers `null`
  only where neither dialect reads a date value, or where the date names a day
  its calendar does not have.
- A date the grammar reads as year 0 in `GREGORIAN` or `JULIAN`, with or
  without `BCE`, is reported with a new diagnostic code, `VAL016`
  (`ImpossibleYear`), in both dialects; `readDate` answers `null` for it in
  every document.
- `GedcomDate.dualYear` documents that a year before the common era never has
  one. Behaviour is unchanged.

## Capabilities

### New Capabilities

- `language-service/read-date`: what `readDate` answers for a payload,
  including in a document checked against no dialect.
- `validator/impossible-year`: the diagnostic for a year a calendar does not
  number.

### Modified Capabilities

None.

## Impact

- Layers: `@domorium/validator` (`GedcomDocument.readDate`, the day-length
  check in `calendarDays.ts`, the error-code enum) and
  `@domorium/language-service`, which passes `readDate` through unchanged.
  Dependencies keep pointing down; no adapter or host changes code.
- Hosts: `readDate` has no consumer inside this repository; its user is
  domorium-obsidian, outside it. `VAL016` reaches every host that shows
  diagnostics — VS Code, JetBrains, the web editor and Obsidian — on a file
  that writes a year 0.
- Public API: one new `GedcomErrorCode` member; `readDate` answers where it
  answered `null`. Neither is breaking.
- Release: `@domorium/validator` minor and `@domorium/language-service` minor,
  each with a changelog entry, when released.
