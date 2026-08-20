# 0012. Keep calendar vocabulary in the schema and calendar arithmetic in code

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

The twelve Gregorian month tags existed in four places, and the 5.5.1 dialect
could use none of them:

- `MONTH_REGEXP_SRC` in `rule-node.ts`, an alternation inside the 5.5.1 date
  grammar;
- `LENGTHS` in `calendarDays.ts`, added for the `31 FEB` check, beside a calendar
  list of its own carrying `ROMAN` and `UNKNOWN`;
- the `calendar` section of `g7validation.json`, which GEDCOM 7 date validation
  and date completion both read;
- `CALENDARS` and `EPOCHS` in `dateSlot.ts`, four bare calendar names and two
  epoch spellings, which did not include 5.5.1's `@#DJULIAN@` escape form.

`g551validation.json`'s `calendar` section was `{}`. The measured consequences: a
5.5.1 author was offered no month in any slot of a date, and a non-Gregorian
escape was validated by a non-empty check alone, so `@#DHEBREW@ 45 XXX 5760`
passed.

Two facts constrain any answer. Month lengths are not in the specification —
GEDCOM 7 gives `day = Integer` and says no more — and are in none of the five
upstream files the schema generator fetches, so they cannot come from the
generated half of the schema. And Gregorian and Julian share all twelve month
tags and all twelve lengths, differing only in which years February gets a 29th
in: the one thing that separates them is a rule of arithmetic, not a tag.

## Decision

The schema owns calendar **vocabulary**; TypeScript owns calendar
**arithmetic**; one module reads the first and one table states the second.

- `g551validation.json` gains a `calendar` section describing all six calendars
  5.5.1 names, hand-maintained as the rest of that file is.
- `validator/calendars.ts` is where a calendar question is answered. It answers
  which calendar a token names in either dialect's form, which months and epochs
  that calendar permits, and how to split a date into tokens with an escape kept
  whole. The 5.5.1 date grammar, the GEDCOM 7 date grammar, the day-length check
  and date completion all read it, and none keeps a list of its own.
- `calendarDays.ts` keeps `LENGTHS` and `isLeapYear`. **No `leapRule` string
  goes into the JSON.** A calendar whose only difference is which years February
  is 29 days long in is described by a branch of code, and naming that branch in
  data would put a dispatch key in a file that has no way to check it: nothing
  in the generated half could produce it, no reader of the JSON learns anything
  from it, and a typo in it would switch a check off silently. The seam between
  the two halves is asserted instead — a test binds `LENGTHS` to the months both
  schemes give `GREGORIAN` and `JULIAN`, in both directions.
- An empty `months` table means _undescribed_, not _nothing permitted_. 5.5.1
  names `ROMAN` and `UNKNOWN` as calendars and defines a month for neither, so a
  date under either is accepted on a non-empty check as before, and so is a date
  under an escape naming a calendar no dialect describes.

## Consequences

A 5.5.1 date now gets the completion a 7.0 date gets — the escapes at the start,
the months of the calendar in force, the epoch once the year is there — and the
5.5.1 grammar checks the month against the calendar its escape names. Measured
on the two conformance corpora, this changed no diagnostic: 23 official files at
8 diagnostics and 14 vendor exports at 14 795, both as recorded. The only
escape-bearing dates in either corpus are two French Republican dates in an
Ancestris export, whose months the new check accepts.

Both schemas carry the vocabulary, so both bundles carry it: the ESM bundle grew
from 515 KB to 519 KB. Finding 15 of #273 already owns that cost.

The 5.5.1 month tables are hand-written, and hand-written data is wrong in ways
generated data is not. Three tests hold them: the seam to `LENGTHS`, an assertion
that the two schemes agree on the months of every calendar both describe, and the
date tests naming a month in each calendar.

`buildTagMap` in the generator reads `existing.calendar`, so the risk of touching
that section was measured before anything moved. Adding a calendar or a month
adds an entry to the generated `tag` map; respelling one changes a value there;
**emptying the section removes nothing**, because `generate-schema.ts` feeds its
own previous output back in and the final loop over `existing.tag` re-supplies
every entry. The 42 entries the section contributes are therefore visible only in
a cold run. No entry moved here, because 7.0's section is unchanged — and it
could not have been shared with 5.5.1's, whose French Republican calendar is
spelled `FRENCH R` where 7.0 spells it `FRENCH_R`.

What this does not settle: a 5.5.1 escape is still read only at the head of a
payload, so `FROM @#DJULIAN@ 1700 TO 1800` — legal, since the escape binds to a
date rather than to the payload — is still reported. That is a limit of reading
the 5.5.1 grammar with a regular expression, and finding 13 of #273 does not
lift it: that finding moved the switch in `rule-node.ts` into a table of
predicates, and each 5.5.1 date predicate is still one of these grammars. A
reader like `date-v7.ts`'s, which walks tokens, is what would.

Nor does it leave `calendars.ts` the sole reader of `scheme.calendar`: `date-v7.ts`
still asks the table whether a token names a calendar, `rule-node.ts` still reads a
calendar's months from it, and `completion.ts` still enumerates it. Those are reads
of the one table rather than copies of its contents, so the vocabulary has a single
home either way — but the module does not yet own the access, and routing them
through it is what would make that true.

## Alternatives considered

**`{"FEB": 28, "leapRule": "gregorian"}` in the schema.** The question #207 was
filed to answer. It keeps every calendar fact in one file, and pays for it with a
string in data whose only meaning is the name of a branch in code — unverifiable
by anything that reads the JSON, unproducible by the generator, and silent when
misspelled. A test binding two tables costs less than a dispatch key in data.

**Month lengths derived from the tags.** Nothing derives them: the lengths are
not a function of the tag, which is why the specification omits them.

**One `calendar` section shared by both schemes.** The two dialects do not share
a calendar vocabulary. 5.5.1 spells the French Republican calendar `FRENCH R` and
names `ROMAN` and `UNKNOWN`, which 7.0 dropped; 7.0 pins `BCE` where 5.5.1 fixes
no epoch spelling at all. A shared section would have to describe the union and
then be filtered per dialect, which is the same knowledge in a harder shape.

**Leaving 5.5.1 validation as it was and filling the table for completion only.**
This was the smaller change, and it keeps the alternation in `rule-node.ts` alive
as a fourth copy of the month tags. The point of answering the question once was
to leave one place where a month is named.
