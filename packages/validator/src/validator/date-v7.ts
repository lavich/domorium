import { GedcomScheme, GedcomTag } from "../schemes/schema-types";
import { isExtensionTag } from "./extensions";

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
 * Two properties of that grammar do the work here. A calendar is a bare word in
 * front of the date rather than v5.5.1's `@#D…@` escape, and it binds to the
 * `date` that follows it, not to the payload — so `FROM JULIAN 1670 TO 1800` is
 * two dates in two calendars. An absent calendar means `GREGORIAN`.
 *
 * The months and epochs each calendar permits come from the schema, which
 * already carries them. Nothing read that section before this parser existed.
 *
 * Parsing rather than matching: a regexp large enough to cover four calendars,
 * their month sets, their epochs and the range forms is one nobody can read, and
 * the one that used to stand here silently rejected every date that named its
 * calendar. See issue #92.
 */

const INTEGER = /^\d+$/;

// The grammar guarantees no calendar, month or epoch collides with these, which
// is what lets a date be read greedily and still stop before the next keyword.
const APPROXIMATE = ["ABT", "CAL", "EST"];

// An absent calendar is GREGORIAN, per Appendix A.
const DEFAULT_CALENDAR = GedcomTag("GREGORIAN");

const NOT_A_DATE = -1;

interface Vocabulary {
  /** Permitted months, or null when the calendar is an extension. */
  months: Set<string> | null;
  epochs: Set<string> | null;
}

const EXTENSION_VOCABULARY: Vocabulary = { months: null, epochs: null };

// What a calendar permits is fixed by the schema, so the sets are built once per
// calendar rather than once per date. Building them inline cost two allocations
// for every DATE in the document, and a large tree has hundreds of thousands.
const vocabularies = new WeakMap<GedcomScheme, Map<GedcomTag, Vocabulary>>();

function vocabularyOf(scheme: GedcomScheme, calendar: GedcomTag): Vocabulary {
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
    return EXTENSION_VOCABULARY;
  }
  const vocabulary: Vocabulary = {
    months: new Set(Object.keys(known.months)),
    epochs: new Set(known.epochs),
  };
  byCalendar.set(calendar, vocabulary);
  return vocabulary;
}

/**
 * An extension tag is accepted in any of the three slots a calendar constrains.
 * Whether a given one is meaningful is a question for the schema it was declared
 * with — an extension calendar defines its own months, and a documented
 * extension month may be an alias for a standard one (#94). Rejecting them here
 * would report files this validator cannot prove wrong.
 */
function permits(vocabulary: Set<string> | null, token: string): boolean {
  return vocabulary === null
    ? isExtensionTag(token)
    : vocabulary.has(token) || isExtensionTag(token);
}

/** Reads one `date`, returning the index after it or `NOT_A_DATE`. */
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

  // [[day D] month D] — a day only exists alongside a month, so a bare number
  // in front of the year is the year itself.
  if (
    INTEGER.test(tokens[at] ?? "") &&
    tokens[at + 1] !== undefined &&
    permits(months, tokens[at + 1])
  ) {
    at += 2;
  } else if (tokens[at] !== undefined && permits(months, tokens[at])) {
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

// Trim before splitting rather than filtering after it: this runs once per DATE
// in the document, and the filter was a second array each time.
function tokenize(value: string): string[] {
  return value.trim().split(/\s+/);
}

function isWholeValue(
  value: string,
  scheme: GedcomScheme,
  read: (tokens: string[], start: number, scheme: GedcomScheme) => number,
): boolean {
  const tokens = tokenize(value);
  return tokens.length > 0 && read(tokens, 0, scheme) === tokens.length;
}

export function isValidDateValue(value: string, scheme: GedcomScheme): boolean {
  return isWholeValue(value, scheme, readDateValue);
}

export function isValidDatePeriod(
  value: string,
  scheme: GedcomScheme,
): boolean {
  return isWholeValue(value, scheme, readDatePeriod);
}

/**
 * `DateExact` names no calendar and takes no epoch: it is day, month and year in
 * the Gregorian calendar, and all three are required.
 */
export function isValidDateExact(value: string, scheme: GedcomScheme): boolean {
  const tokens = tokenize(value);
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
