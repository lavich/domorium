import { GedcomScheme, GedcomTag } from "../schemes/schema-types";
import {
  emptyExtensions,
  ExtensionContext,
  isExtensionTag,
  resolveTag,
} from "./extensions";
import { DEFAULT_CALENDAR, permits, vocabularyOf } from "./calendars";

/**
 * GEDCOM 7 dates, from gedcom-2-data-types.md:
 *
 * ```abnf
 * DateValue   = [ date / DatePeriod / dateRange / dateApprox ]
 * DateExact   = day D month D year  ; in Gregorian calendar
 * DatePeriod  = [ %s"TO" D date ]
 *             / %s"FROM" D date [ D %s"TO" D date ]
 * date        = [calendar D] [[day D] month D] year [D epoch]
 * dateRange   = %s"BET" D date D %s"AND" D date / %s"AFT" D date / %s"BEF" D date
 * dateApprox  = (%s"ABT" / %s"CAL" / %s"EST") D date
 * calendar    = %s"GREGORIAN" / %s"JULIAN" / %s"FRENCH_R" / %s"HEBREW" / extTag
 * day         = Integer
 * year        = Integer
 * month       = stdTag / extTag  ; constrained by calendar
 * epoch       = %s"BCE" / extTag ; constrained by calendar
 * ```
 *
 * A calendar is a bare word rather than v5.5.1's `@#D…@` escape, and it binds to
 * the `date` that follows it, not to the payload — so `FROM JULIAN 1670 TO 1800`
 * is two dates in two calendars. An absent calendar means `GREGORIAN`.
 */

const INTEGER = /^\d+$/;

// The grammar guarantees no calendar, month or epoch collides with these, which
// is what lets a date be read greedily and still stop before the next keyword.
const APPROXIMATE = ["ABT", "CAL", "EST"];

const NOT_A_DATE = -1;

function readDate(
  tokens: string[],
  start: number,
  scheme: GedcomScheme,
): number {
  let at = start;
  const first = tokens[at];
  if (first === undefined) {
    return NOT_A_DATE;
  }

  let calendar = DEFAULT_CALENDAR;
  if (scheme.calendar[GedcomTag(first)] || isExtensionTag(first)) {
    calendar = GedcomTag(first);
    at += 1;
  }
  const { months, epochs } = vocabularyOf(scheme, calendar);

  // [[day D] month D] — a day only exists alongside a month, so a bare number in
  // front of the year is the year itself. An extension tag is permitted as a month
  // and as an epoch alike, so a month is read only when the year it must precede
  // is in sight: "2000 _MYEPOCH" is otherwise a day and a month with no year.
  if (
    INTEGER.test(tokens[at] ?? "") &&
    tokens[at + 1] !== undefined &&
    permits(months, tokens[at + 1]) &&
    INTEGER.test(tokens[at + 2] ?? "")
  ) {
    at += 2;
  } else if (
    tokens[at] !== undefined &&
    permits(months, tokens[at]) &&
    INTEGER.test(tokens[at + 1] ?? "")
  ) {
    at += 1;
  }

  // Every date must have a year; a date with no year is omitted entirely and
  // described in a PHRASE instead.
  if (!INTEGER.test(tokens[at] ?? "")) {
    return NOT_A_DATE;
  }
  at += 1;

  if (tokens[at] !== undefined && permits(epochs, tokens[at])) {
    at += 1;
  }

  return at;
}

function readDatePeriod(
  tokens: string[],
  start: number,
  scheme: GedcomScheme,
): number {
  if (tokens[start] === "TO") {
    return readDate(tokens, start + 1, scheme);
  }
  if (tokens[start] !== "FROM") {
    return NOT_A_DATE;
  }
  const from = readDate(tokens, start + 1, scheme);
  if (from === NOT_A_DATE || tokens[from] !== "TO") {
    return from;
  }
  return readDate(tokens, from + 1, scheme);
}

function readDateValue(
  tokens: string[],
  start: number,
  scheme: GedcomScheme,
): number {
  const keyword = tokens[start];

  if (keyword !== undefined && APPROXIMATE.includes(keyword)) {
    return readDate(tokens, start + 1, scheme);
  }

  if (keyword === "BET") {
    const lower = readDate(tokens, start + 1, scheme);
    if (lower === NOT_A_DATE || tokens[lower] !== "AND") {
      return NOT_A_DATE;
    }
    return readDate(tokens, lower + 1, scheme);
  }

  if (keyword === "AFT" || keyword === "BEF") {
    return readDate(tokens, start + 1, scheme);
  }

  if (keyword === "FROM" || keyword === "TO") {
    return readDatePeriod(tokens, start, scheme);
  }

  return readDate(tokens, start, scheme);
}

function tokenize(value: string): string[] {
  return value.trim().split(/\s+/);
}

// Only an extension tag can be aliased, and nothing else in a date begins with
// an underscore, so the whole token list can be resolved at once.
function tokenizeResolved(
  value: string,
  extensions: ExtensionContext,
): string[] {
  return tokenize(value).map((token) => resolveTag(extensions, token));
}

function isWholeValue(
  value: string,
  scheme: GedcomScheme,
  extensions: ExtensionContext,
  read: (tokens: string[], start: number, scheme: GedcomScheme) => number,
): boolean {
  const tokens = tokenizeResolved(value, extensions);
  return tokens.length > 0 && read(tokens, 0, scheme) === tokens.length;
}

export function isValidDateValue(
  value: string,
  scheme: GedcomScheme,
  extensions: ExtensionContext = emptyExtensions(),
): boolean {
  return isWholeValue(value, scheme, extensions, readDateValue);
}

export function isValidDatePeriod(
  value: string,
  scheme: GedcomScheme,
  extensions: ExtensionContext = emptyExtensions(),
): boolean {
  return isWholeValue(value, scheme, extensions, readDatePeriod);
}

/**
 * `DateExact` names no calendar and takes no epoch: it is day, month and year in
 * the Gregorian calendar, and all three are required.
 */
export function isValidDateExact(
  value: string,
  scheme: GedcomScheme,
  extensions: ExtensionContext = emptyExtensions(),
): boolean {
  const tokens = tokenizeResolved(value, extensions);
  if (tokens.length !== 3) {
    return false;
  }
  const { months } = vocabularyOf(scheme, DEFAULT_CALENDAR);
  return (
    INTEGER.test(tokens[0]) &&
    permits(months, tokens[1]) &&
    INTEGER.test(tokens[2])
  );
}
