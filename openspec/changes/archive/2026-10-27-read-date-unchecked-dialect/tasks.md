## 1. Year 0 in the validator

- [x] 1.1 Add `ImpossibleYear = "VAL016"` to `GedcomErrorCode`, its doc comment saying the rule is GEDCOM 7's and applied to 5.5.1 too, and its row in the code table of `packages/validator/README.md`; verify `npm run typecheck -w packages/validator` passes.
- [x] 1.2 Add to `calendarDays.ts` a function over a reader's `GedcomDate[]` returning each year 0 in `GREGORIAN` or `JULIAN`; verify with unit tests in `calendarDays.test.ts` over readings of `0`, `0 BCE`, `1 JAN 0000`, `0BC`, `0/01 B.C.`, `BET JULIAN 0 AND 10` (found) and `HEBREW 0`, `_CAL 0`, `1 BCE` (not found).
- [x] 1.3 In `rule-node.ts`, replace `calendarDays: true` with a `read` per date rule and report `VAL016` beside `VAL014`, message `names year 0, and <CALENDAR> has no year 0`; verify with validator tests for every scenario of `specs/validator/impossible-year/spec.md`, that `@#DROMAN@ 5 AUC 1000` in 5.5.1 still carries no diagnostic, and that the existing `VAL014` tests pass unchanged.

## 2. readDate

- [x] 2.1 Make `GedcomDocument.readDate` answer `null` for a reading with a year-0 finding; verify with tests for `0`, `0 BCE` (7.0), `0`, `0BC`, `@#DJULIAN@ 1 JAN 0` (5.5.1), and `_CAL 0` (7.0 with `_CAL` declared) reading as year 0.
- [x] 2.2 Make `readDate` in a document without `validatedAs` read by the 5.5.1 grammar and schema, then the 7.0 grammar and schema with empty extensions, declining a reading with a day finding under the schema that read it or a year finding; replace the tests in `readDate.test.ts` that expect `null` for undetermined, `4.0` and PAF documents with tests for every scenario of the checked-against-no-dialect requirement in `specs/language-service/read-date/spec.md`, and keep the substituted and fragment tests passing unchanged.
- [x] 2.3 Add a test that the 5.5.1 and 7.0 readers give identical answers for the forms both read (`7 NOV 1867`, `ABT 1850`, `BET 1850 AND 1860`, `FROM 1850 TO 1860`, `1401 BCE`) and for `@#DHEBREW@ 5761` against `HEBREW 5761`; verify it passes.
- [x] 2.4 Rebuild `packages/validator` and add language-service tests through `GedcomLanguageService.readDate` for the issue's reproduction (no `GEDC`, `7 NOV 1867`) and a PAF header; verify `npm run test:run -w packages/language-service` passes.

## 3. Documentation

- [x] 3.1 Document on `GedcomDate.dualYear` that a date before the common era never has one; verify a test reads `1750/51 B.C.` with no `dualYear`, adding one if none exists.
- [x] 3.2 Update "The date a payload names" in `packages/language-service/README.md` and the `readDate` row in `packages/validator/README.md`: a document checked against no dialect reads by either dialect without `SCHMA` context (an extension tag reads as a calendar, month or epoch, and no alias is resolved), year 0 reads as `null`, no dual year before the era; read every example and confirm each name still exists.
- [x] 3.3 Add changelog entries under an `## Unreleased` heading in `packages/validator/CHANGELOG.md` and `packages/language-service/CHANGELOG.md`; verify `npm run check:docs` passes.

## 4. Gate

- [x] 4.1 Run `npm run check:conformance`; if any recorded diagnostics change — the official 7.0 files or the vendor 5.5.1 corpus — re-record with `-- --update` and read the whole diff.
- [x] 4.2 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK. Ran: 1407 tests, `check:jetbrains` ran and passed.
