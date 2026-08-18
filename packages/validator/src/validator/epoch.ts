/**
 * 5.5.1 carries no epoch in `YEAR_GREG` at all. The only statement about one is
 * prose — "A (B.C.) appended to the <YEAR> indicates a date before the birth of
 * Christ" — with no dated example, so neither the spelling nor the delimiter is
 * fixed, and exports write `BC`, `B.C.` and `BCE` alike. See issue #239.
 *
 * GEDCOM 7 pins its epoch in the schema, which date-v7.ts reads from there, so
 * nothing below belongs to it.
 */
export const EPOCH_SRC = "(?:[Bb][Cc][Ee]|[Bb]\\.?[Cc]\\.?)";

const EPOCH_REGEXP = new RegExp(`^${EPOCH_SRC}$`);

export function isEpoch(token: string | undefined): boolean {
  return token !== undefined && EPOCH_REGEXP.test(token);
}
