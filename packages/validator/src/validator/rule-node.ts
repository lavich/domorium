import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { ASTNode, resolveValue } from "../parser";
import { GedcomError } from "../types/errors";

type FieldType =
  | "boolean"
  | "string"
  | "nonNegativeInteger"
  | "select"
  | "multiselect"
  | "date"
  | "date-period"
  | "date-exact"
  | "time"
  | "pointer"
  | "age"
  | "personal-name"
  | "media-type"
  | "language-tag"
  | null;

const TIME_REGEXP = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
const AGE_REGEXP =
  /^[<>]\s(?:CHILD|INFANT|STILLBORN|\d+y(?:\s\d+m)?(?:\s\d+w)?(?:\s\d+d)?|\d+m(?:\s\d+w)?(?:\s\d+d)?|\d+w(?:\s\d+d)?|\d+d)$|^(?:CHILD|INFANT|STILLBORN|\d+y(?:\s\d+m)?(?:\s\d+w)?(?:\s\d+d)?|\d+m(?:\s\d+w)?(?:\s\d+d)?|\d+w(?:\s\d+d)?|\d+d)$/;
// A name, with at most one pair of slashes delimiting the surname, e.g.
// "John /Doe/" or "John /Doe/ Jr.". Zero slashes (unstructured name) is
// also valid.
const PERSONAL_NAME_REGEXP = /^[^/]*(?:\/[^/]*\/[^/]*)?$/;
// type/subtype[; parameter=value ...], per RFC 6838 restricted-name tokens.
const MEDIA_TYPE_REGEXP =
  /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*(;\s*[\w-]+=[^;]+)*$/;
const LATITUDE_REGEXP = /^[NS]\d+(\.\d+)?$/;
const LONGITUDE_REGEXP = /^[EW]\d+(\.\d+)?$/;
// RFC 5646 (BCP 47) language tag, adapted from the official ABNF in
// Appendix B of the RFC: grandfathered tags, or
// language["-"script]["-"region]*("-"variant)*("-"extension)*["-"privateuse],
// or a standalone privateuse tag.
const LANGUAGE_TAG_REGEXP = new RegExp(
  "^(?:" +
    // grandfathered
    "(?:en-GB-oed" +
    "|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu" +
    "|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE" +
    "|art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang)" +
    "|(?:" +
    "(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4}|[A-Za-z]{5,8})" + // language
    "(?:-[A-Za-z]{4})?" + // script
    "(?:-(?:[A-Za-z]{2}|[0-9]{3}))?" + // region
    "(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*" + // variant
    "(?:-[0-9A-WY-Za-wy-z](?:-[A-Za-z0-9]{2,8})+)*" + // extension
    "(?:-x(?:-[A-Za-z0-9]{1,8})+)?" + // privateuse
    ")" +
    "|(?:x(?:-[A-Za-z0-9]{1,8})+)" + // privateuse-only
    ")$",
  "i",
);

const MONTH_REGEXP_SRC = "(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)";
const YEAR_REGEXP_SRC = "\\d+(?:/\\d{2})?";
const DATE_EXACT_REGEXP = new RegExp(
  `^\\d{1,2}\\s${MONTH_REGEXP_SRC}\\s${YEAR_REGEXP_SRC}$`,
);
// Leading calendar escape, e.g. "@#DHEBREW@ 1 TISHREI 5761". Only the
// Gregorian calendar's grammar is validated (see design doc); any other
// escape name is accepted with just a non-empty-remainder check, so
// real-world non-Gregorian files aren't blocked.
const CALENDAR_ESCAPE_REGEXP = /^@#D([A-Z][A-Z ]*)@\s*/;

function stripCalendarEscape(value: string): {
  calendar: string | null;
  rest: string;
} {
  const match = value.match(CALENDAR_ESCAPE_REGEXP);
  if (!match) {
    return { calendar: null, rest: value };
  }
  return { calendar: match[1], rest: value.slice(match[0].length) };
}

function isValidGregorianDate(value: string, regexp: RegExp): boolean {
  const { calendar, rest } = stripCalendarEscape(value);
  const isNonGregorianCalendar = calendar !== null && calendar !== "GREGORIAN";
  return isNonGregorianCalendar ? !!rest : regexp.test(rest);
}

// Day requires a month: "(?:\d{1,2}\s)?MONTH\s" only ever matches together,
// so a bare "DAY YEAR" (no month) never matches.
const GREGORIAN_DATE_SRC = `(?:(?:\\d{1,2}\\s)?${MONTH_REGEXP_SRC}\\s)?${YEAR_REGEXP_SRC}`;
const GREGORIAN_DATE_WITH_EPOCH_SRC = `${GREGORIAN_DATE_SRC}(?:\\s(?:BCE|B\\.C\\.))?`;
// "FROM <date> [TO <date>]" / "TO <date>" — shared by DATE_VALUE (where it's
// one of several modifiers) and DATE_PERIOD (where it's the only grammar).
const DATE_PERIOD_SRC =
  `FROM\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}(?:\\sTO\\s${GREGORIAN_DATE_WITH_EPOCH_SRC})?` +
  "|" +
  `TO\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}`;

const DATE_VALUE_REGEXP = new RegExp(
  "^(?:" +
    `(?:ABT|CAL|EST)\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}` +
    "|" +
    `(?:BEF|AFT)\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}` +
    "|" +
    `BET\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}\\sAND\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}` +
    "|" +
    DATE_PERIOD_SRC +
    "|" +
    `INT\\s${GREGORIAN_DATE_WITH_EPOCH_SRC}\\s\\([^()]*\\)` +
    "|" +
    `${GREGORIAN_DATE_WITH_EPOCH_SRC}` +
    "|" +
    "\\([^()]*\\)" +
    ")$",
);

const DATE_PERIOD_REGEXP = new RegExp(`^(?:${DATE_PERIOD_SRC})$`);

export class RuleNode {
  pointers: ASTNode[];

  constructor(
    private readonly scheme: GedcomScheme,
    pointers: Map<string, ASTNode[]>,
  ) {
    this.pointers = Array.from(pointers.values()).flatMap((v) => v);
  }

  getFieldType(tagType: GedcomType): {
    type: FieldType;
    isList: boolean;
    to: GedcomType | undefined;
  } {
    const payload = this.scheme.payload[tagType];
    let type: FieldType;
    let isList = false;
    let to: GedcomType | undefined = undefined;
    switch (payload?.type) {
      case "Y|<NULL>":
        type = "boolean";
        break;
      case "http://www.w3.org/2001/XMLSchema#string":
        type = "string";
        break;
      case "http://www.w3.org/2001/XMLSchema#Language":
        type = "language-tag";
        break;
      case "http://www.w3.org/ns/dcat#mediaType":
        type = "media-type";
        break;
      case "https://gedcom.io/terms/v7/type-Name":
      case "https://gedcom.io/terms/v5.5.1/type-NAME_PERSONAL":
        type = "personal-name";
        break;
      case "https://gedcom.io/terms/v7/type-List#Text":
        type = "string";
        isList = true;
        break;
      case "http://www.w3.org/2001/XMLSchema#nonNegativeInteger":
        type = "nonNegativeInteger";
        break;
      case "https://gedcom.io/terms/v7/type-Enum":
        type = "select";
        break;
      case "https://gedcom.io/terms/v7/type-List#Enum":
        type = "multiselect";
        break;
      case "https://gedcom.io/terms/v7/type-Date":
      case "https://gedcom.io/terms/v5.5.1/type-DATE_VALUE":
        type = "date";
        break;
      case "https://gedcom.io/terms/v7/type-Date#period":
      case "https://gedcom.io/terms/v5.5.1/type-DATE_PERIOD":
        type = "date-period";
        break;
      case "https://gedcom.io/terms/v7/type-Date#exact":
      case "https://gedcom.io/terms/v5.5.1/type-DATE_EXACT":
        type = "date-exact";
        break;
      case "https://gedcom.io/terms/v7/type-Time":
      case "https://gedcom.io/terms/v5.5.1/type-TIME_VALUE":
        type = "time";
        break;
      case "https://gedcom.io/terms/v7/type-Age":
      case "https://gedcom.io/terms/v5.5.1/type-AGE_AT_EVENT":
        type = "age";
        break;
      case "pointer":
        type = "pointer";
        to = payload.to;
        break;
      case null:
        type = null;
        break;
      default:
        type = "string";
    }
    return { type, isList, to };
  }

  getAvailableValues(tagType: GedcomType): string[] | null {
    const fieldType = this.getFieldType(tagType);
    const payload = this.scheme.payload[tagType];
    if (
      (fieldType.type === "select" || fieldType.type === "multiselect") &&
      payload.set
    ) {
      return Object.keys(this.scheme.set[payload.set]);
    }
    if (fieldType.type === "pointer" && fieldType.to) {
      const pointerTag = this.scheme.tag[fieldType.to];
      const pointersNode = this.pointers.filter(
        (pointer) => pointer.tokens.TAG?.value === pointerTag,
      );
      return pointersNode.map((node) => node.tokens.POINTER?.value || "");
    }
    return null;
  }

  /**
   * CONT/CONC are universal line-continuation tags: they are deliberately
   * left out of `substructure` (see validate.ts, which skips them before
   * doing any substructure lookup), so they never appear on the walk done
   * by getNodeType below. Resolve their type directly from the flat
   * type->tag table instead.
   */
  private getUniversalType(tag: GedcomTag): GedcomType | undefined {
    const entry = Object.entries(this.scheme.tag).find(
      ([, t]) => t === tag,
    );
    return entry ? GedcomType(entry[0]) : undefined;
  }

  getNodeType(node: ASTNode): GedcomType {
    const tag = node.tokens.TAG?.value;
    if (tag === "CONT" || tag === "CONC") {
      return this.getUniversalType(GedcomTag(tag)) ?? GedcomType("");
    }

    const stack: GedcomTag[] = [];

    let tempNode: ASTNode | undefined = node;
    while (tempNode) {
      stack.push(GedcomTag(tempNode.tokens.TAG!.value!));
      tempNode = tempNode.parent;
    }

    let type = GedcomType("");
    let lastElem = stack.pop();
    while (lastElem) {
      const substr = this.scheme.substructure[type];
      const entry = substr?.[lastElem];
      if (!entry) {
        return GedcomType("");
      }
      type = entry.type;
      lastElem = stack.pop();
    }

    return type;
  }

  validate(node: ASTNode, _tagType?: GedcomType): GedcomError[] {
    const errors: GedcomError[] = [];
    const tagType = _tagType || this.getNodeType(node);
    const fieldType = this.getFieldType(tagType || this.getNodeType(node));
    const VALUE = node.tokens.VALUE;
    const value = resolveValue(node).trim();
    const TAG = node.tokens.TAG;
    switch (fieldType.type) {
      case "boolean":
        if (value !== "Y" && (value || node.children.length === 0)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be Y or null`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "string": {
        // LATI/LONG share the generic XMLSchema#string payload type in the
        // schema (there is no dedicated URI for them), so the format check
        // is keyed off the resolved tag name instead.
        const rawTag = this.scheme.tag[tagType];
        if (rawTag === "LATI" || rawTag === "LONG") {
          const isLati = rawTag === "LATI";
          const re = isLati ? LATITUDE_REGEXP : LONGITUDE_REGEXP;
          if (!value || !re.test(value)) {
            errors.push({
              code: "VAL",
              message: `Value for ${TAG?.value} should be correct ${
                isLati ? "latitude" : "longitude"
              } (e.g. "${isLati ? "N18.150944" : "W46.6"}")`,
              range: VALUE?.range || node.range,
              level: "error",
            });
          }
          break;
        }
        if (!value) {
          errors.push({
            code: "VAL",
            message: `Missing value for ${TAG?.value}`,
            range: TAG?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "personal-name":
        if (!value || !PERSONAL_NAME_REGEXP.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be a name, with the surname (if any) wrapped in a single pair of slashes (e.g. "John /Doe/")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "media-type":
        if (!value || !MEDIA_TYPE_REGEXP.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be a media type in the form "type/subtype" (e.g. "image/jpeg")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "language-tag":
        if (!value || !LANGUAGE_TAG_REGEXP.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be a valid RFC 5646 language tag (e.g. "en", "en-US")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "nonNegativeInteger":
        if (!value || parseInt(value) < 0) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be number and greater than 0`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;

      case "select": {
        const availableValues = this.getAvailableValues(tagType);
        if (!value || !availableValues?.includes(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be in set [${availableValues}]`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "multiselect": {
        const availableValues = this.getAvailableValues(tagType);
        const values = value?.split(",").map((v) => v.trim());
        const isValid = values?.every((v) =>
          availableValues?.includes(v.trim()),
        );
        if (!isValid) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be in set [${availableValues}]`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "date": {
        if (!isValidGregorianDate(value, DATE_VALUE_REGEXP)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be a valid Gregorian date value (e.g. "12 JAN 2000", "ABT 1950", "BET 1900 AND 1910", "FROM 1900 TO 1910", "(unknown)")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "date-period": {
        if (!isValidGregorianDate(value, DATE_PERIOD_REGEXP)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be a valid date period (e.g. "FROM 1900 TO 1910", "TO 1920")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "date-exact": {
        if (!isValidGregorianDate(value, DATE_EXACT_REGEXP)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be an exact date in day month year order (e.g. "1 APR 1911")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "time":
        if (!value || !TIME_REGEXP.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be correct time`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "age":
        if (!value || !AGE_REGEXP.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be correct age (e.g. "35y 11m 8w 21d", "< 1y", "CHILD")`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "pointer": {
        const availableValues = this.getAvailableValues(tagType);

        const XREF = node.tokens.XREF;
        const isXrefExist = !!XREF?.value;
        const isXrefValid =
          isXrefExist && availableValues?.includes(XREF?.value);
        const hasChildren = node.children.length !== 0;
        if ((isXrefExist && !isXrefValid) || (!isXrefExist && !hasChildren)) {
          errors.push({
            code: "VAL",
            message: hasChildren
              ? `Value for ${TAG?.value} should be in set [${availableValues}]`
              : `Value for ${TAG?.value} should be POINTER`,
            range: XREF?.range || TAG?.range || node.range,
            level: "error",
          });
        }
        break;
      }
    }
    return errors;
  }
}
