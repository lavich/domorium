export type DateModifier =
  "ABT" | "CAL" | "EST" | "BEF" | "AFT" | "BET" | "FROM" | "TO" | "INT";

export interface GedcomDate {
  /** In the GEDCOM 7 spelling, so 5.5.1's `FRENCH R` is `FRENCH_R`. */
  calendar: string;
  day?: number;
  month?: string;
  /** Counted in `calendar` and `epoch`: a Hebrew year is not a Gregorian one. */
  year: number;
  /** The year after `year`, where 5.5.1 writes both as `1750/51`. */
  dualYear?: number;
  /** `BCE` however 5.5.1 spells it, or an extension tag. */
  epoch?: string;
}

export interface GedcomDateValue {
  modifier?: DateModifier;
  /** Two for `BET` and for a `FROM` that has a `TO`; none for a bare phrase. */
  dates: GedcomDate[];
  /** 5.5.1's parenthesised text, without the parentheses. */
  phrase?: string;
  text: string;
}
