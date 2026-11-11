const PERSON_LINKS = new Set(["FAMC", "FAMS"]);
const FAMILY_LINKS = new Set(["CHIL", "HUSB", "WIFE"]);

/**
 * A pointer the standard pairs with a pointer on the record it names. The
 * `FAMC` of an event is the same pair as that of a person.
 */
export function hasReciprocal(
  structurePath: readonly string[],
  tag: string,
): boolean {
  const [record, event] = structurePath;
  if (structurePath.length === 1) {
    return (
      (record === "INDI" && PERSON_LINKS.has(tag)) ||
      (record === "FAM" && FAMILY_LINKS.has(tag))
    );
  }
  return (
    structurePath.length === 2 &&
    record === "INDI" &&
    event !== undefined &&
    tag === "FAMC"
  );
}
