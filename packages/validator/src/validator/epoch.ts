/**
 * 5.5.1 carries no epoch in `YEAR_GREG` at all. The only statement about one is
 * prose — "A (B.C.) appended to the <YEAR> indicates a date before the birth of
 * Christ" — with no dated example, so neither the spelling nor the delimiter is
 * fixed, and exports write `BC`, `B.C.` and `BCE` alike. See issue #239.
 *
 * GEDCOM 7 pins its own epoch in the schema (`epoch = %s"BCE" / extTag`), which
 * date-v7.ts reads from there; this is the 5.5.1 reader's alone.
 */
export const EPOCH_SRC = "(?:[Bb][Cc][Ee]|[Bb]\\.?[Cc]\\.?)";

const EPOCH_REGEXP = new RegExp(`^${EPOCH_SRC}$`);

/** Whether a token marks the era, in any spelling 5.5.1 leaves open. */
export function isEpoch(token: string | undefined): boolean {
  return token !== undefined && EPOCH_REGEXP.test(token);
}
