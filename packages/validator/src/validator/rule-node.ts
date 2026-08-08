import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { ASTNode, resolveValue } from "../parser";
import { GedcomError } from "../types/errors";
import { parseTagDef } from "./extensions";

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
  | "tag-def"
  | null;

// Reserved GEDCOM 7 pointer meaning "deliberately empty" — valid in the
// value slot of any pointer-type payload, regardless of the target
// record type, and doesn't correspond to any real declared record.
const VOID_POINTER = "@VOID@";

// A payload may be omitted whenever its data type admits the empty string, and
// an empty payload and a missing one are the same thing. These are the GEDCOM 7
// data types whose grammar matches the empty string:
//
//   Text       = *anychar                             (and Special = Text)
//   List:Text  = listItem *(listDelim listItem), listItem = [ … ]
//   DateValue  = [ date / DatePeriod / dateRange / dateApprox ]
//   DatePeriod = [ %s"TO" D date ] / %s"FROM" D date [ D %s"TO" D date ]
//   Age        = [[ageBound D] ageDuration]
//
// v5.5.1 shares the xsd:string payload URI but sizes its string payloads
// {SIZE=1:…}, so there an omitted payload really is missing. The structure type
// is namespaced per version, which is what gates the set below.
const OMITTABLE_PAYLOADS = new Set([
  "http://www.w3.org/2001/XMLSchema#string",
  "https://gedcom.io/terms/v7/type-List#Text",
  "https://gedcom.io/terms/v7/type-Date",
  "https://gedcom.io/terms/v7/type-Date#period",
  "https://gedcom.io/terms/v7/type-Age",
]);

const GEDCOM_7_TYPE_PREFIX = "https://gedcom.io/terms/v7/";

const MAX_LISTED_VALUES = 10;

function formatValueSet(values: string[] | null): string {
  if (!values?.length) {
    return "";
  }
  const listed = values.slice(0, MAX_LISTED_VALUES).join(", ");
  const omitted = values.length - MAX_LISTED_VALUES;
  return omitted > 0 ? `${listed}, … ${omitted} more` : listed;
}

// Hour may be 1 or 2 digits (both "8:38" and "08:38" are valid) per both
// v5.5.1 (HOUR is {SIZE=1:2}) and v7; minute/second are always 2 digits.
const TIME_BASE_SRC = "(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
// v5.5.1's TIME_VALUE has no UTC marker.
const TIME_REGEXP = new RegExp(`^${TIME_BASE_SRC}$`);
// v7's Time additionally allows a trailing "Z" for UTC.
const TIME_REGEXP_V7 = new RegExp(`^${TIME_BASE_SRC}Z?$`);
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

// Flattening every pointer in the document costs O(document), and a RuleNode
// is built for each validated node — doing it in the constructor made
// validation cost grow with nodes × pointers. The map is rebuilt by every
// parse and never mutated afterwards, so the flattened form can be cached
// against it without going stale. Consumers only read the array.
const flattenedPointers = new WeakMap<Map<string, ASTNode[]>, ASTNode[]>();

function flattenPointers(pointers: Map<string, ASTNode[]>): ASTNode[] {
  const cached = flattenedPointers.get(pointers);
  if (cached) {
    return cached;
  }
  const flattened = Array.from(pointers.values()).flatMap((v) => v);
  flattenedPointers.set(pointers, flattened);
  return flattened;
}

// Which xrefs a pointer may name, grouped by the record tag it points at.
// Checking that used to filter every pointer in the document and build a fresh
// array of candidates for each pointer-bearing node, so a file whose records
// reference each other — which is every real one — cost records × pointers.
const pointerTargets = new WeakMap<
  Map<string, ASTNode[]>,
  Map<string, Set<string>>
>();

function targetsByTag(
  pointers: Map<string, ASTNode[]>,
): Map<string, Set<string>> {
  const cached = pointerTargets.get(pointers);
  if (cached) {
    return cached;
  }
  const index = new Map<string, Set<string>>();
  for (const node of flattenPointers(pointers)) {
    const tag = node.tokens.TAG?.value;
    const xref = node.tokens.POINTER?.value;
    if (!tag || !xref) {
      continue;
    }
    let targets = index.get(tag);
    if (!targets) {
      targets = new Set();
      index.set(tag, targets);
    }
    targets.add(xref);
  }
  pointerTargets.set(pointers, index);
  return index;
}

export class RuleNode {
  pointers: ASTNode[];
  private readonly pointerMap: Map<string, ASTNode[]>;

  constructor(
    private readonly scheme: GedcomScheme,
    pointers: Map<string, ASTNode[]>,
  ) {
    this.pointerMap = pointers;
    this.pointers = flattenPointers(pointers);
  }

  /** Whether `xref` names a record of the kind this pointer type expects. */
  private isPointerTarget(tagType: GedcomType, xref: string): boolean {
    const { to } = this.getFieldType(tagType);
    if (!to) {
      return false;
    }
    return (
      targetsByTag(this.pointerMap).get(this.scheme.tag[to])?.has(xref) ?? false
    );
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
      case "https://gedcom.io/terms/v7/type-TagDef":
        type = "tag-def";
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

  /** Whether the specification allows this structure to carry no payload. */
  private mayOmitPayload(tagType: GedcomType): boolean {
    return (
      tagType.startsWith(GEDCOM_7_TYPE_PREFIX) &&
      OMITTABLE_PAYLOADS.has(this.scheme.payload[tagType]?.type ?? "")
    );
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
      return [...(targetsByTag(this.pointerMap).get(pointerTag) ?? [])];
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
    const entry = Object.entries(this.scheme.tag).find(([, t]) => t === tag);
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

    if (!value && this.mayOmitPayload(tagType)) {
      return errors;
    }

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
      case "tag-def":
        if (!parseTagDef(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be an extension tag and its URI (e.g. "_SKYPEID http://xmlns.com/foaf/0.1/skypeID")`,
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
            message: `Value for ${TAG?.value} should be in set [${formatValueSet(availableValues)}]`,
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
            message: `Value for ${TAG?.value} should be in set [${formatValueSet(availableValues)}]`,
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
      case "time": {
        // Only v7's type-Time allows a trailing "Z" (UTC); v5.5.1's
        // TIME_VALUE has no such marker, so the check is keyed off the
        // raw payload URI rather than the shared "time" field type.
        const isV7Time =
          this.scheme.payload[tagType]?.type ===
          "https://gedcom.io/terms/v7/type-Time";
        const regexp = isV7Time ? TIME_REGEXP_V7 : TIME_REGEXP;
        if (!value || !regexp.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be correct time`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
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
        const XREF = node.tokens.XREF;
        const isXrefExist = !!XREF?.value;
        const isXrefValid =
          isXrefExist &&
          (XREF.value === VOID_POINTER ||
            this.isPointerTarget(tagType, XREF.value));
        const hasChildren = node.children.length !== 0;
        if ((isXrefExist && !isXrefValid) || (!isXrefExist && !hasChildren)) {
          const targetTag = fieldType.to
            ? this.scheme.tag[fieldType.to]
            : undefined;
          // An xref that names nothing is a different problem from a payload
          // that is not an xref at all. The second is what a program writes
          // when it puts a URL or a title where a citation belongs, and there
          // the candidates are no help — the shape is what's wrong.
          //
          // getAvailableValues is only needed to name those candidates, so it
          // runs here rather than for every pointer in the document.
          const message = isXrefExist
            ? `Value for ${TAG?.value} should be in set [${formatValueSet(this.getAvailableValues(tagType))}]`
            : `Value for ${TAG?.value} should be a pointer to a ${targetTag ? `${targetTag} record` : "record"}, written as "@xref@"`;
          errors.push({
            code:
              isXrefExist && XREF?.value !== VOID_POINTER
                ? "unresolved-xref"
                : "VAL",
            message,
            data:
              isXrefExist && XREF?.value !== VOID_POINTER
                ? {
                    xref: XREF?.value,
                    requiredRecordTag: fieldType.to
                      ? this.scheme.tag[fieldType.to]
                      : undefined,
                  }
                : undefined,
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
