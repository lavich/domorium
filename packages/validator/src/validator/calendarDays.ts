/**
 * The part of a date the grammar cannot express: `31 FEB` is two well-formed
 * tokens naming a day February does not have.
 *
 * Which calendars there are and which months each takes is the schema's, read
 * through calendars.ts. What is here is the arithmetic the specification never
 * states: how long a month is, and which years February gets a 29th in.
 * GREGORIAN and JULIAN share the twelve month tags and their lengths and differ
 * only in that rule, which is why one table serves both.
 */

import { GedcomScheme } from "../schemes/schema-types";
import { calendarNamed, dateTokens, DEFAULT_CALENDAR } from "./calendars";
import { isEpoch } from "./epoch";

export const LENGTHS: Record<string, number> = {
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

// The calendars whose arithmetic LENGTHS states. A date in any other is left
// alone rather than judged by the Gregorian year.
const CHECKED_CALENDARS = new Set([DEFAULT_CALENDAR, "JULIAN"]);
const INTEGER = /^\d+$/u;

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

function withoutPhrases(value: string): string {
  return value.replace(/\([^()]*\)/gu, " ");
}

export function impossibleDays(
  scheme: GedcomScheme,
  value: string,
): ImpossibleDay[] {
  const tokens = dateTokens(withoutPhrases(value));
  const found: ImpossibleDay[] = [];
  let calendar: string = DEFAULT_CALENDAR;

  for (let at = 0; at < tokens.length; at += 1) {
    const token = tokens[at];
    const named = calendarNamed(scheme, token);
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

    // Rather than answer what a leap year is before the common era.
    const year =
      INTEGER.test(tokens[at + 2] ?? "") && !isEpoch(tokens[at + 3])
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
