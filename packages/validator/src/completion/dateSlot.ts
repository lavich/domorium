/**
 * Which part of a date the cursor is in. A flat list would be worse than
 * nothing here: the months worth offering depend on the calendar named a few
 * tokens earlier, and the keywords depend on what the value opened with.
 */

import { GedcomScheme, GedcomTag } from "../schemes/schema-types";
import {
  calendarNamed,
  dateTokens,
  DEFAULT_CALENDAR,
  vocabularyOf,
} from "../validator/calendars";

export type DateGrammar = "value" | "period" | "exact";

export interface DateSlot {
  /** A calendar may be named here. */
  calendars: boolean;
  /** Whose months may be named here, or null where none may. */
  months: string | null;
  /** Whose epochs may be named here, or null where none may. */
  epochs: string | null;
  /** Bare words the grammar allows here. */
  keywords: string[];
}

const NOTHING: DateSlot = {
  calendars: false,
  months: null,
  epochs: null,
  keywords: [],
};

const MODIFIERS = ["ABT", "CAL", "EST", "BEF", "AFT", "BET", "FROM", "TO"];
const PERIOD_MODIFIERS = ["FROM", "TO"];
const CONNECTORS: Record<string, string> = { BET: "AND", FROM: "TO" };
const INTEGER = /^\d+$/u;

/**
 * The word under the cursor is a prefix the client filters by, not a decision
 * the reader has to make, so only whole tokens shape the answer.
 */
function completedTokens(typed: string): string[] {
  const tokens = dateTokens(typed);
  return /\s$/u.test(typed) ? tokens : tokens.slice(0, -1);
}

interface Reading extends DateSlot {
  /** Whether what has been read could already be a whole date. */
  complete: boolean;
}

function readDate(scheme: GedcomScheme, tokens: string[]): Reading {
  let at = 0;
  let calendar: GedcomTag = DEFAULT_CALENDAR;
  const named =
    tokens[0] === undefined ? null : calendarNamed(scheme, tokens[0]);
  if (named !== null) {
    calendar = named;
    at = 1;
  }
  const rest = tokens.slice(at);

  if (rest.length === 0) {
    return {
      calendars: at === 0,
      months: calendar,
      epochs: null,
      keywords: [],
      complete: false,
    };
  }
  // An extension tag is admissible as a month and as an epoch alike, so only a
  // spelling the calendar names closes the date; taking one for an epoch would
  // stop the reader a slot early.
  const { epochs } = vocabularyOf(scheme, calendar);
  if (rest.some((token) => epochs?.has(token))) {
    return { ...NOTHING, complete: true };
  }

  // [[day D] month D] year — an integer is the day only when a word follows
  // it, so the slots are read in order rather than counted.
  let slot = 0;
  if (INTEGER.test(rest[slot] ?? "") && !INTEGER.test(rest[slot + 1] ?? "0")) {
    slot += 1;
  }
  const month = rest[slot] !== undefined && !INTEGER.test(rest[slot]);
  if (month) {
    slot += 1;
  }
  const year = INTEGER.test(rest[slot] ?? "");

  if (!month) {
    // One integer is a year until a month follows it, which is what would make
    // it a day, so both are still open.
    return {
      calendars: false,
      months: year ? calendar : null,
      epochs: year ? calendar : null,
      keywords: [],
      complete: year,
    };
  }
  return {
    calendars: false,
    months: null,
    epochs: year ? calendar : null,
    keywords: [],
    complete: year,
  };
}

export function dateSlot(
  scheme: GedcomScheme,
  typed: string,
  grammar: DateGrammar,
): DateSlot {
  const tokens = completedTokens(typed);

  if (grammar === "exact") {
    // day month year, in the Gregorian calendar and with no epoch.
    return tokens.length === 1
      ? { ...NOTHING, months: DEFAULT_CALENDAR }
      : NOTHING;
  }

  const opening = grammar === "period" ? PERIOD_MODIFIERS : MODIFIERS;
  if (tokens.length === 0) {
    return {
      calendars: true,
      months: DEFAULT_CALENDAR,
      epochs: null,
      keywords: opening,
    };
  }

  const modifier = opening.includes(tokens[0]) ? tokens[0] : null;
  const body = modifier === null ? tokens : tokens.slice(1);
  const connector = modifier === null ? undefined : CONNECTORS[modifier];

  // "BET a AND b" and "FROM a TO b" hold two dates; the cursor is in the one
  // after the connector once it has been typed.
  const at = connector === undefined ? -1 : body.indexOf(connector);
  const reading = readDate(scheme, at === -1 ? body : body.slice(at + 1));

  return {
    calendars: reading.calendars,
    months: reading.months,
    epochs: reading.epochs,
    keywords:
      connector !== undefined && at === -1 && reading.complete
        ? [connector]
        : [],
  };
}
