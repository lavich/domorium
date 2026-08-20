/**
 * The one reader of the schema's `calendar` table, for everything that has to
 * know which calendars there are, which months each takes and which epoch may
 * close a year: the 5.5.1 date rules, the GEDCOM 7 date grammar, the day-length
 * check and date completion.
 *
 * Month lengths are not here and not in the schema. The specification gives
 * `day = Integer` and says no more, so a length is arithmetic rather than
 * vocabulary; calendarDays.ts holds it, and a test binds its table to this one.
 */

import { GedcomScheme, GedcomTag } from "../schemes/schema-types";
import { isExtensionTag } from "./extensions";

// 5.5.1 writes a calendar as an escape, `@#DJULIAN@`, and one of its calendars
// is named `FRENCH R` — so an escape has to be read before a date is split on
// whitespace, not after.
const ESCAPE_SRC = "@#D([A-Z][A-Z ]*)@";
const LEADING_ESCAPE = new RegExp(`^${ESCAPE_SRC}\\s*`, "u");
const ESCAPE = new RegExp(`^${ESCAPE_SRC}$`, "u");
const TOKEN = new RegExp(`${ESCAPE_SRC}|\\S+`, "gu");

/** An absent calendar means GREGORIAN, in both dialects. */
export const DEFAULT_CALENDAR = GedcomTag("GREGORIAN");

export interface Vocabulary {
  /** Permitted months, or null where the schema describes no such calendar. */
  months: Set<string> | null;
  epochs: Set<string> | null;
}

const UNDESCRIBED: Vocabulary = { months: null, epochs: null };

// What a calendar permits is fixed by the schema, so the sets are built once per
// calendar rather than once per date.
const vocabularies = new WeakMap<GedcomScheme, Map<GedcomTag, Vocabulary>>();

export function vocabularyOf(
  scheme: GedcomScheme,
  calendar: GedcomTag,
): Vocabulary {
  let byCalendar = vocabularies.get(scheme);
  if (!byCalendar) {
    byCalendar = new Map();
    vocabularies.set(scheme, byCalendar);
  }

  const cached = byCalendar.get(calendar);
  if (cached) {
    return cached;
  }

  const known = scheme.calendar[calendar];
  if (!known) {
    return UNDESCRIBED;
  }
  const vocabulary: Vocabulary = {
    months: new Set(Object.keys(known.months)),
    epochs: new Set(known.epochs),
  };
  byCalendar.set(calendar, vocabulary);
  return vocabulary;
}

/**
 * An extension tag that is not an alias is accepted in any of the three slots a
 * calendar constrains: an extension calendar defines its own months and epochs,
 * and rejecting an undeclared one here would report files this validator cannot
 * prove wrong. An alias resolves to the standard tag it abbreviates and is held
 * to the calendar's own vocabulary like any other standard tag.
 */
export function permits(
  vocabulary: Set<string> | null,
  token: string,
): boolean {
  return vocabulary === null
    ? isExtensionTag(token)
    : vocabulary.has(token) || isExtensionTag(token);
}

/** How 5.5.1 writes a calendar, which is the form completion has to offer. */
export function calendarEscape(calendar: string): string {
  return `@#D${calendar}@`;
}

/** The calendar a token names, in either dialect's form, or null. */
export function calendarNamed(
  scheme: GedcomScheme,
  token: string,
): GedcomTag | null {
  const escaped = ESCAPE.exec(token)?.[1];
  if (escaped !== undefined) {
    return GedcomTag(escaped);
  }
  const bare = GedcomTag(token);
  return scheme.calendar[bare] ? bare : null;
}

/** The leading calendar escape 5.5.1 puts in front of a date, and the rest. */
export function stripCalendarEscape(value: string): {
  calendar: GedcomTag | null;
  rest: string;
} {
  const match = LEADING_ESCAPE.exec(value);
  if (!match) {
    return { calendar: null, rest: value };
  }
  return { calendar: GedcomTag(match[1]), rest: value.slice(match[0].length) };
}

/** The tokens of a date, with an escape kept whole however it is spaced. */
export function dateTokens(value: string): string[] {
  return value.match(TOKEN) ?? [];
}
