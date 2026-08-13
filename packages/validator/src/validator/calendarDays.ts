/**
 * The part of a date the grammar cannot express: `31 FEB` is two well-formed
 * tokens naming a day February does not have.
 *
 * Only GREGORIAN and JULIAN are checked. They share the twelve month tags and
 * their lengths, and differ only in which years February gets a 29th; HEBREW
 * and FRENCH_R have months of their own and are left alone rather than judged
 * by somebody else's calendar.
 */

const LENGTHS: Record<string, number> = {
  JAN: 31,
  FEB: 29,
  MAR: 31,
  APR: 30,
  MAY: 31,
  JUN: 30,
  JUL: 31,
  AUG: 31,
  SEP: 30,
  OCT: 31,
  NOV: 30,
  DEC: 31,
};

const CHECKED_CALENDARS = new Set(["GREGORIAN", "JULIAN"]);
const INTEGER = /^\d+$/u;
// 5.5.1 names a calendar with an escape rather than a bare word, and both
// dialects reach this check.
const CALENDAR_ESCAPE = /^@#D([A-Z][A-Z_ ]*)@$/u;
const CALENDARS = new Set([
  ...CHECKED_CALENDARS,
  "HEBREW",
  "FRENCH_R",
  "FRENCH R",
  "ROMAN",
  "UNKNOWN",
]);

function calendarOf(token: string): string | null {
  const escaped = CALENDAR_ESCAPE.exec(token)?.[1];
  if (escaped !== undefined) {
    return escaped;
  }
  return CALENDARS.has(token) ? token : null;
}

export interface ImpossibleDay {
  day: number;
  month: string;
  /** What the month does have, for a message that says more than "wrong". */
  length: number;
}

export function isLeapYear(year: number, calendar: string): boolean {
  if (year % 4 !== 0) {
    return false;
  }
  return calendar === "JULIAN" || year % 100 !== 0 || year % 400 === 0;
}

export function daysInMonth(
  month: string,
  year: number | null,
  calendar: string,
): number | null {
  const length = LENGTHS[month];
  if (length === undefined) {
    return null;
  }
  if (month !== "FEB" || year === null) {
    return length;
  }
  return isLeapYear(year, calendar) ? 29 : 28;
}

/**
 * A phrase is free text that may hold anything, including something shaped
 * like a date, so it is removed before the value is read as one.
 */
function withoutPhrases(value: string): string {
  return value.replace(/\([^()]*\)/gu, " ");
}

export function impossibleDays(value: string): ImpossibleDay[] {
  const tokens = withoutPhrases(value).trim().split(/\s+/u);
  const found: ImpossibleDay[] = [];
  let calendar = "GREGORIAN";

  for (let at = 0; at < tokens.length; at += 1) {
    const token = tokens[at];
    const named = calendarOf(token);
    if (named !== null) {
      calendar = named;
      continue;
    }
    const month = tokens[at + 1];
    if (
      !CHECKED_CALENDARS.has(calendar) ||
      !INTEGER.test(token) ||
      month === undefined ||
      LENGTHS[month] === undefined
    ) {
      continue;
    }

    // Astronomical year numbering before the common era is a question this
    // check does not need to answer: February is given its longest length.
    const epoch = tokens[at + 3];
    const year =
      INTEGER.test(tokens[at + 2] ?? "") && epoch !== "BCE" && epoch !== "B.C."
        ? Number(tokens[at + 2])
        : null;
    const length = daysInMonth(month, year, calendar);
    const day = Number(token);
    if (length !== null && (day < 1 || day > length)) {
      found.push({ day, month, length });
    }
    at += 1;
  }

  return found;
}
