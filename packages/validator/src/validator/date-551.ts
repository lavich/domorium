import { GedcomScheme, GedcomTag } from "../schemes/schema-types";
import type { DateModifier, GedcomDate, GedcomDateValue } from "../types/date";
import { DEFAULT_CALENDAR, stripCalendarEscape } from "./calendars";
import { EPOCH_SRC } from "./epoch";

const YEAR_REGEXP_SRC = "\\d+(?:/\\d{2})?";

interface DateGrammars {
  dated: RegExp;
  exact: RegExp;
}

// The months belong to the calendar in force, so a grammar is built per calendar
// rather than once — and cached against the scheme, which never changes.
const grammars = new WeakMap<GedcomScheme, Map<string, DateGrammars | null>>();

function buildGrammars(months: string[]): DateGrammars {
  const month = `(?:${months.join("|")})`;
  // Day requires a month: "(?:\d{1,2}\s)?MONTH\s" only ever matches together,
  // so a bare "DAY YEAR" (no month) never matches.
  const date = `(?:(?:(?<day>\\d{1,2})\\s)?(?<month>${month})\\s)?(?<year>\\d+)(?:/(?<dual>\\d{2}))?`;

  return {
    dated: new RegExp(`^${date}(?:\\s?(?<epoch>${EPOCH_SRC}))?$`),
    exact: new RegExp(`^\\d{1,2}\\s${month}\\s${YEAR_REGEXP_SRC}$`),
  };
}

/**
 * Null where the schema names no month for the calendar: 5.5.1 lists ROMAN and
 * UNKNOWN as calendars and defines a month for neither, and an escape may name
 * a calendar no dialect describes at all. Saying nothing there is the point —
 * a real file in a calendar we cannot spell out is not a file to report.
 */
function grammarsFor(
  scheme: GedcomScheme,
  calendar: string,
): DateGrammars | null {
  let byCalendar = grammars.get(scheme);
  if (!byCalendar) {
    byCalendar = new Map();
    grammars.set(scheme, byCalendar);
  }
  const cached = byCalendar.get(calendar);
  if (cached !== undefined) {
    return cached;
  }

  const months = Object.keys(
    scheme.calendar[GedcomTag(calendar)]?.months ?? {},
  );
  const built = months.length === 0 ? null : buildGrammars(months);
  byCalendar.set(calendar, built);
  return built;
}

/**
 * One `<DATE>`, with the escape that names its calendar. 5.5.1 puts the escape
 * inside `<DATE>` and `<DATE>` after the modifier, so a calendar binds to the
 * date it precedes and never to the payload: `BET` and `FROM` hold two dates,
 * and each names its own.
 */
function isValidDateSlot(scheme: GedcomScheme, slot: string): boolean {
  const { calendar, rest } = stripCalendarEscape(slot);
  const rules = grammarsFor(scheme, calendar ?? DEFAULT_CALENDAR);
  return rules === null ? rest.length > 0 : rules.dated.test(rest);
}

function readDateSlot(scheme: GedcomScheme, slot: string): GedcomDate | null {
  const { calendar, rest } = stripCalendarEscape(slot);
  const named = calendar ?? DEFAULT_CALENDAR;
  const groups = grammarsFor(scheme, named)?.dated.exec(rest)?.groups;
  if (!groups) {
    return null;
  }

  const { day, month, year, dual, epoch } = groups;
  const date: GedcomDate = {
    calendar: named.replace(" ", "_"),
    year: Number(year),
  };
  if (day !== undefined) {
    date.day = Number(day);
  }
  if (month !== undefined) {
    date.month = month;
  }
  // The grammar admits any two digits after the slash, but only the year that
  // follows names a dual year: `1750/50` and one before the common era have none.
  if (
    dual !== undefined &&
    epoch === undefined &&
    Number(dual) === (date.year + 1) % 100
  ) {
    date.dualYear = date.year + 1;
  }
  if (epoch !== undefined) {
    date.epoch = "BCE";
  }
  return date;
}

// A date carries no keyword, so the last one in the payload is the separator
// however greedily it is matched.
const INTERPRETED = /^INT\s(.+)\s\(([^()]*)\)$/;
const PHRASE = /^\(([^()]*)\)$/;
const APPROXIMATED = /^(ABT|CAL|EST|BEF|AFT)\s(.+)$/;
const RANGE = /^BET\s(.+)\sAND\s(.+)$/;
const FROM_TO = /^FROM\s(.+)\sTO\s(.+)$/;
const FROM = /^FROM\s(.+)$/;
const TO = /^TO\s(.+)$/;

interface Shape {
  modifier?: DateModifier;
  slots: string[];
  phrase?: string;
}

function periodShape(value: string): Shape | null {
  const fromTo = FROM_TO.exec(value);
  if (fromTo) {
    return { modifier: "FROM", slots: [fromTo[1], fromTo[2]] };
  }
  const from = FROM.exec(value);
  if (from) {
    return { modifier: "FROM", slots: [from[1]] };
  }
  const to = TO.exec(value);
  return to && { modifier: "TO", slots: [to[1]] };
}

function valueShape(value: string): Shape | null {
  const phrase = PHRASE.exec(value);
  if (phrase) {
    return { slots: [], phrase: phrase[1] };
  }
  const interpreted = INTERPRETED.exec(value);
  if (interpreted) {
    return { modifier: "INT", slots: [interpreted[1]], phrase: interpreted[2] };
  }
  const range = RANGE.exec(value);
  if (range) {
    return { modifier: "BET", slots: [range[1], range[2]] };
  }
  if (FROM.test(value) || TO.test(value)) {
    return periodShape(value);
  }
  const approximated = APPROXIMATED.exec(value);
  if (approximated) {
    return {
      modifier: approximated[1] as DateModifier,
      slots: [approximated[2]],
    };
  }
  return { slots: [value] };
}

function isValidShape(scheme: GedcomScheme, shape: Shape | null): boolean {
  return (
    shape !== null && shape.slots.every((slot) => isValidDateSlot(scheme, slot))
  );
}

export function isValidDatePeriod551(
  scheme: GedcomScheme,
  value: string,
): boolean {
  return isValidShape(scheme, periodShape(value));
}

export function isValidDateValue551(
  scheme: GedcomScheme,
  value: string,
): boolean {
  return isValidShape(scheme, valueShape(value));
}

/**
 * `DATE_EXACT` is `<DAY> <MONTH> <YEAR_GREG>`: Gregorian, and no slot for a
 * calendar, so an escape is not stripped before the grammar reads it.
 */
export function isValidDateExact551(
  scheme: GedcomScheme,
  value: string,
): boolean {
  const rules = grammarsFor(scheme, DEFAULT_CALENDAR);
  return rules === null ? value.length > 0 : rules.exact.test(value);
}

export function readDateValue551(
  scheme: GedcomScheme,
  value: string,
): GedcomDateValue | null {
  const shape = valueShape(value);
  if (shape === null) {
    return null;
  }
  const dates: GedcomDate[] = [];
  for (const slot of shape.slots) {
    const date = readDateSlot(scheme, slot);
    if (date === null) {
      return null;
    }
    dates.push(date);
  }
  return {
    ...(shape.modifier === undefined ? {} : { modifier: shape.modifier }),
    dates,
    ...(shape.phrase === undefined ? {} : { phrase: shape.phrase }),
    text: value,
  };
}
