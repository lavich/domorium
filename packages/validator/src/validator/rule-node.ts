import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { ASTNode, resolveValue } from "../parser";
import { GedcomError, GedcomErrorCode } from "../types/errors";
import {
  emptyExtensions,
  ExtensionContext,
  isExtensionTag,
  parseTagDef,
  resolveTag,
  undocumentedTag,
} from "./extensions";
import { impossibleDays } from "./calendarDays";
import { EPOCH_SRC } from "./epoch";
import {
  isValidDateExact,
  isValidDatePeriod,
  isValidDateValue,
} from "./date-v7";

type FieldType =
  | "boolean"
  | "string"
  | "nonNegativeInteger"
  | "select"
  | "multiselect"
  | "date"
  | "date-v7"
  | "date-period"
  | "date-period-v7"
  | "date-exact"
  | "date-exact-v7"
  | "time"
  | "time-v7"
  | "pointer"
  | "age"
  | "age-v7"
  | "personal-name"
  | "latitude"
  | "longitude"
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

// 5.5.1 writes these two ways, and the schema names only the pointer form:
//
//   n NOTE @<XREF:NOTE>@   |  n NOTE [SUBMITTER_TEXT | NULL]
//   n SOUR @<XREF:SOUR>@   |  n SOUR <SOURCE_DESCRIPTION>
//
// See docs/adr/0010-two-form-structures-in-5-5-1.md.
const TEXT_OR_POINTER = new Set([
  "https://gedcom.io/terms/v5.5.1/NOTE-XREF_NOTE",
  "https://gedcom.io/terms/v5.5.1/SOUR-XREF_SOUR",
]);

// 5.5.1 writes this production in lower case — [bmp gif jpg ole pcx tif wav] —
// while its LDS status productions are upper case, so a file writing `JPG` has
// the right value in the wrong case rather than a value the specification does
// not have. One policy for every set would be wrong in one direction or the
// other, which is why this names the set rather than the comparison.
const CASE_INSENSITIVE_SETS = new Set([
  "https://gedcom.io/terms/v5.5.1/enumset-MULTIMEDIA_FORMAT",
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

// An absent payload is one problem whatever type was expected, so it keeps its
// own code and every rule reports it alike.
function valueError(
  node: ASTNode,
  message: string,
  code: GedcomErrorCode = GedcomErrorCode.IncorrectValue,
): GedcomError {
  return {
    code: resolveValue(node).trim() ? code : GedcomErrorCode.MissingValue,
    message: `Value for ${node.tokens.TAG?.value} ${message}`,
    range: node.tokens.VALUE?.range || node.range,
    level: "error",
  };
}

function impossibleDayErrors(node: ASTNode, value: string): GedcomError[] {
  return impossibleDays(value).map(({ day, month, length }) =>
    valueError(
      node,
      `names ${day} ${month}, and ${month} has ${length} days`,
      GedcomErrorCode.ImpossibleDay,
    ),
  );
}

// Hour may be 1 or 2 digits (both "8:38" and "08:38" are valid) per both
// v5.5.1 (HOUR is {SIZE=1:2}) and v7; minute/second are always 2 digits.
const TIME_BASE_SRC = "(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
// v5.5.1's TIME_VALUE has no UTC marker.
const TIME_REGEXP = new RegExp(`^${TIME_BASE_SRC}$`);
// v7's Time additionally allows a trailing "Z" for UTC.
const TIME_REGEXP_V7 = new RegExp(`^${TIME_BASE_SRC}Z?$`);
const AGE_BODY_SRC =
  "(?:CHILD|INFANT|STILLBORN|\\d+y(?:\\s\\d+m)?(?:\\s\\d+w)?(?:\\s\\d+d)?|\\d+m(?:\\s\\d+w)?(?:\\s\\d+d)?|\\d+w(?:\\s\\d+d)?|\\d+d)";
// v7: Age = [[ageBound D] ageDuration], years = Integer %x79 — the delimiter is
// required and the unit letter is case-sensitive. 5.5.1: [ < | > | <NULL>]
// [ YYy MMm DDDd | … | CHILD ] — neither rule appears, and exports write both.
const AGE_REGEXP_V7 = new RegExp(`^(?:[<>]\\s)?${AGE_BODY_SRC}$`);
const AGE_REGEXP = new RegExp(`^(?:[<>]\\s*)?${AGE_BODY_SRC}$`, "i");
// A name, with at most one pair of slashes delimiting the surname, e.g.
// "John /Doe/" or "John /Doe/ Jr.". Zero slashes (unstructured name) is
// also valid.
const PERSONAL_NAME_REGEXP = /^[^/]*(?:\/[^/]*\/[^/]*)?$/;
// type/subtype[; parameter=value ...], per RFC 6838 restricted-name tokens.
const MEDIA_TYPE_REGEXP =
  /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*(;\s*[\w-]+=[^;]+)*$/;
const NON_NEGATIVE_INTEGER_REGEXP = /^\d+$/;
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
//
// v5.5.1 syntax, and everything below it is the v5.5.1 reader. GEDCOM 7 dates
// are parsed in date-v7.ts.
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
const GREGORIAN_DATE_WITH_EPOCH_SRC = `${GREGORIAN_DATE_SRC}(?:\\s?${EPOCH_SRC})?`;
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

// How a declared payload URI is read. Both versions name several of the same
// readings under different URIs, and `pointer` is absent because it is the one
// payload whose declaration carries a target as well as a type. Every payload
// type either scheme declares appears here; a test over both says so.
export const PAYLOAD_FIELD_TYPES: Record<string, Exclude<FieldType, null>> = {
  "Y|<NULL>": "boolean",

  "http://www.w3.org/2001/XMLSchema#string": "string",
  "https://gedcom.io/terms/v7/type-List#Text": "string",
  // Read as free text, though five of these have a grammar the specification
  // states and this file does not read: v7's FilePath and anyURI, and the
  // comma-separated lists NAME_PIECE_GIVEN, NAME_PIECE_NICKNAME and
  // EVENTS_RECORDED. #112
  "http://www.w3.org/2001/XMLSchema#anyURI": "string",
  "https://gedcom.io/terms/v7/type-FilePath": "string",
  "https://gedcom.io/terms/v5.5.1/type-CHARACTER_SET": "string",
  "https://gedcom.io/terms/v5.5.1/type-EVENTS_RECORDED": "string",
  "https://gedcom.io/terms/v5.5.1/type-GEDCOM_FORM": "string",
  "https://gedcom.io/terms/v5.5.1/type-LANGUAGE_ID": "string",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PIECE_GIVEN": "string",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PIECE_NICKNAME": "string",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PIECE_PREFIX": "string",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PIECE_SUFFIX": "string",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PIECE_SURNAME": "string",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PIECE_SURNAME_PREFIX": "string",
  "https://gedcom.io/terms/v5.5.1/type-PERMANENT_RECORD_FILE_NUMBER": "string",
  "https://gedcom.io/terms/v5.5.1/type-PLACE_NAME": "string",
  "https://gedcom.io/terms/v5.5.1/type-SOURCE_MEDIA_TYPE": "string",

  "http://www.w3.org/2001/XMLSchema#Language": "language-tag",
  "http://www.w3.org/ns/dcat#mediaType": "media-type",
  "http://www.w3.org/2001/XMLSchema#nonNegativeInteger": "nonNegativeInteger",
  "https://gedcom.io/terms/v7/type-TagDef": "tag-def",

  "https://gedcom.io/terms/v7/type-Latitude": "latitude",
  "https://gedcom.io/terms/v5.5.1/type-PLACE_LATITUDE": "latitude",
  "https://gedcom.io/terms/v7/type-Longitude": "longitude",
  "https://gedcom.io/terms/v5.5.1/type-PLACE_LONGITUDE": "longitude",

  "https://gedcom.io/terms/v7/type-Name": "personal-name",
  "https://gedcom.io/terms/v5.5.1/type-NAME_PERSONAL": "personal-name",

  "https://gedcom.io/terms/v7/type-Enum": "select",
  "https://gedcom.io/terms/v7/type-List#Enum": "multiselect",
  // 5.5.1 states its closed value sets in the primitive definitions, not in
  // an enumeration vocabulary, so each names its set in the scheme. See #112.
  "https://gedcom.io/terms/v5.5.1/type-CERTAINTY_ASSESSMENT": "select",
  "https://gedcom.io/terms/v5.5.1/type-PEDIGREE_LINKAGE_TYPE": "select",
  "https://gedcom.io/terms/v5.5.1/type-RESTRICTION_NOTICE": "select",
  "https://gedcom.io/terms/v5.5.1/type-ORDINANCE_PROCESS_FLAG": "select",
  "https://gedcom.io/terms/v5.5.1/type-CHILD_LINKAGE_STATUS": "select",
  "https://gedcom.io/terms/v5.5.1/type-ADOPTED_BY_WHICH_PARENT": "select",
  "https://gedcom.io/terms/v5.5.1/type-MULTIMEDIA_FORMAT": "select",
  "https://gedcom.io/terms/v5.5.1/type-LDS_BAPTISM_DATE_STATUS": "select",
  "https://gedcom.io/terms/v5.5.1/type-LDS_ENDOWMENT_DATE_STATUS": "select",
  "https://gedcom.io/terms/v5.5.1/type-LDS_CHILD_SEALING_DATE_STATUS": "select",
  "https://gedcom.io/terms/v5.5.1/type-LDS_SPOUSE_SEALING_DATE_STATUS":
    "select",

  "https://gedcom.io/terms/v7/type-Date": "date-v7",
  "https://gedcom.io/terms/v5.5.1/type-DATE_VALUE": "date",
  "https://gedcom.io/terms/v7/type-Date#period": "date-period-v7",
  "https://gedcom.io/terms/v5.5.1/type-DATE_PERIOD": "date-period",
  "https://gedcom.io/terms/v7/type-Date#exact": "date-exact-v7",
  "https://gedcom.io/terms/v5.5.1/type-DATE_EXACT": "date-exact",

  "https://gedcom.io/terms/v7/type-Time": "time-v7",
  "https://gedcom.io/terms/v5.5.1/type-TIME_VALUE": "time",

  "https://gedcom.io/terms/v7/type-Age": "age-v7",
  "https://gedcom.io/terms/v5.5.1/type-AGE_AT_EVENT": "age",
};

interface ValueRule {
  test: (
    value: string,
    scheme: GedcomScheme,
    extensions: ExtensionContext,
  ) => boolean;
  message: string;
  /** A date the grammar accepts may still name a day its month does not have. */
  calendarDays?: true;
}

// The readings that are a predicate and a sentence. What is left in `collect`
// is what is not that shape: a boolean carries its own code, an enumeration
// reads the scheme, a pointer resolves an xref, and an absent string is
// reported against the tag rather than the value.
const VALUE_RULES: Partial<Record<Exclude<FieldType, null>, ValueRule>> = {
  latitude: {
    test: (value) => LATITUDE_REGEXP.test(value),
    message: `should be correct latitude (e.g. "N18.150944")`,
  },
  longitude: {
    test: (value) => LONGITUDE_REGEXP.test(value),
    message: `should be correct longitude (e.g. "W46.6")`,
  },
  "personal-name": {
    test: (value) => PERSONAL_NAME_REGEXP.test(value),
    message: `should be a name, with the surname (if any) wrapped in a single pair of slashes (e.g. "John /Doe/")`,
  },
  "media-type": {
    test: (value) => MEDIA_TYPE_REGEXP.test(value),
    message: `should be a media type in the form "type/subtype" (e.g. "image/jpeg")`,
  },
  "language-tag": {
    test: (value) => LANGUAGE_TAG_REGEXP.test(value),
    message: `should be a valid RFC 5646 language tag (e.g. "en", "en-US")`,
  },
  "tag-def": {
    test: (value) => !!parseTagDef(value),
    message: `should be an extension tag and its URI (e.g. "_SKYPEID http://xmlns.com/foaf/0.1/skypeID")`,
  },
  nonNegativeInteger: {
    test: (value) => NON_NEGATIVE_INTEGER_REGEXP.test(value),
    message: "should be a whole number, zero or greater",
  },
  time: {
    test: (value) => TIME_REGEXP.test(value),
    message: "should be correct time",
  },
  "time-v7": {
    test: (value) => TIME_REGEXP_V7.test(value),
    message: "should be correct time",
  },
  age: {
    test: (value) => AGE_REGEXP.test(value),
    message: `should be correct age (e.g. "35y 11m 8w 21d", "< 1y", "CHILD")`,
  },
  "age-v7": {
    test: (value) => AGE_REGEXP_V7.test(value),
    message: `should be correct age (e.g. "35y 11m 8w 21d", "< 1y", "CHILD")`,
  },
  date: {
    test: (value) => isValidGregorianDate(value, DATE_VALUE_REGEXP),
    message: `should be a valid Gregorian date value (e.g. "12 JAN 2000", "ABT 1950", "BET 1900 AND 1910", "FROM 1900 TO 1910", "(unknown)")`,
    calendarDays: true,
  },
  "date-v7": {
    test: isValidDateValue,
    message: `should be a valid date value (e.g. "12 JAN 2000", "ABT 1950", "BET 1900 AND 1910", "JULIAN 3 MAR 1721", "1000 BCE")`,
    calendarDays: true,
  },
  "date-period": {
    test: (value) => isValidGregorianDate(value, DATE_PERIOD_REGEXP),
    message: `should be a valid date period (e.g. "FROM 1900 TO 1910", "TO 1920")`,
    calendarDays: true,
  },
  "date-period-v7": {
    test: isValidDatePeriod,
    message: `should be a valid date period (e.g. "FROM 1900 TO 1910", "TO 1920")`,
    calendarDays: true,
  },
  "date-exact": {
    test: (value) => isValidGregorianDate(value, DATE_EXACT_REGEXP),
    message: `should be an exact date in day month year order (e.g. "1 APR 1911")`,
    calendarDays: true,
  },
  "date-exact-v7": {
    test: isValidDateExact,
    message: `should be an exact date in day month year order (e.g. "1 APR 1911")`,
    calendarDays: true,
  },
};

// Which xrefs a pointer may name, grouped by the record tag it points at.
// A RuleNode is built for each validated node, so indexing per node would cost
// records × pointers. The map is rebuilt by every parse and never mutated
// afterwards, so the index can be cached against it without going stale.
const pointerTargets = new WeakMap<
  Map<string, ASTNode[]>,
  Map<string, Set<string>>
>();

function targetsByTag(
  pointers: Map<string, ASTNode[]>,
  extensions: ExtensionContext,
): Map<string, Set<string>> {
  const cached = pointerTargets.get(pointers);
  if (cached) {
    return cached;
  }
  const index = new Map<string, Set<string>>();
  for (const nodes of pointers.values()) {
    for (const node of nodes) {
      const tag = node.tokens.TAG?.value;
      const xref = node.tokens.POINTER?.value;
      if (!tag || !xref) {
        continue;
      }
      // A record written under an aliased tag is a record of the standard type,
      // so a pointer naming either tag finds it.
      for (const key of new Set([tag, resolveTag(extensions, tag)])) {
        let targets = index.get(key);
        if (!targets) {
          targets = new Set();
          index.set(key, targets);
        }
        targets.add(xref);
      }
    }
  }
  pointerTargets.set(pointers, index);
  return index;
}

export class RuleNode {
  constructor(
    private readonly scheme: GedcomScheme,
    private readonly pointerMap: Map<string, ASTNode[]>,
    private readonly extensions: ExtensionContext = emptyExtensions(),
  ) {}

  /** Whether `xref` names a record of the kind this pointer type expects. */
  private isPointerTarget(tagType: GedcomType, xref: string): boolean {
    const { to } = this.getFieldType(tagType);
    if (!to) {
      return false;
    }
    return (
      targetsByTag(this.pointerMap, this.extensions)
        .get(this.scheme.tag[to])
        ?.has(xref) ?? false
    );
  }

  getFieldType(tagType: GedcomType): {
    type: FieldType;
    to: GedcomType | undefined;
  } {
    const payload = this.scheme.payload[tagType];
    if (payload?.type === "pointer") {
      return { type: "pointer", to: payload.to };
    }
    // A payload URI the table does not name is one the schema describes and
    // this file does not. Reading it as a required non-empty string would
    // report a missing value on every structure that legitimately omits it,
    // so an unnamed type is one nothing is said about. #112
    return {
      type: PAYLOAD_FIELD_TYPES[payload?.type ?? ""] ?? null,
      to: undefined,
    };
  }

  private mayOmitPayload(tagType: GedcomType): boolean {
    return (
      tagType.startsWith(GEDCOM_7_TYPE_PREFIX) &&
      OMITTABLE_PAYLOADS.has(this.scheme.payload[tagType]?.type ?? "")
    );
  }

  // An enumeration may be extended with values matching extTag, but may not
  // borrow a standard value belonging to another enumeration set.
  private validateEnumeration(
    values: string[],
    tagType: GedcomType,
    node: ASTNode,
  ): GedcomError[] {
    const range = node.tokens.VALUE?.range || node.range;
    const availableValues = this.getAvailableValues(tagType);
    const errors: GedcomError[] = [];

    const undocumented = new Set(
      values.filter(
        (value) =>
          isExtensionTag(value) &&
          this.extensions.requireDeclaration &&
          !this.extensions.tags.has(GedcomTag(value)),
      ),
    );
    for (const value of undocumented) {
      errors.push(undocumentedTag(GedcomTag(value), range));
    }

    const set = this.scheme.payload[tagType]?.set;
    const fold = set !== undefined && CASE_INSENSITIVE_SETS.has(set);
    const permitted = fold
      ? availableValues?.map((value) => value.toLowerCase())
      : availableValues;
    const borrowed = values.some(
      (value) =>
        !isExtensionTag(value) &&
        !permitted?.includes(fold ? value.toLowerCase() : value),
    );
    if (borrowed) {
      errors.push(
        valueError(
          node,
          `should be in set [${formatValueSet(availableValues)}]`,
          GedcomErrorCode.ShouldBeSetValue,
        ),
      );
    }

    return errors;
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
      return [
        ...(targetsByTag(this.pointerMap, this.extensions).get(pointerTag) ??
          []),
      ];
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
      const step = tempNode.tokens.TAG?.value;
      if (!step) {
        return GedcomType("");
      }
      stack.push(GedcomTag(step));
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
    this.collect(errors, node, _tagType);
    return errors;
  }

  collect(errors: GedcomError[], node: ASTNode, _tagType?: GedcomType): void {
    const tagType = _tagType || this.getNodeType(node);
    const fieldType = this.getFieldType(tagType);
    const value = resolveValue(node).trim();
    const TAG = node.tokens.TAG;

    if (!value && this.mayOmitPayload(tagType)) {
      return;
    }
    if (fieldType.type === null) {
      return;
    }

    const rule = VALUE_RULES[fieldType.type];
    if (rule) {
      if (!value || !rule.test(value, this.scheme, this.extensions)) {
        errors.push(valueError(node, rule.message));
      } else if (rule.calendarDays) {
        errors.push(...impossibleDayErrors(node, value));
      }
      return;
    }

    switch (fieldType.type) {
      case "boolean":
        if (value && value !== "Y") {
          errors.push(valueError(node, "should be Y or null"));
        } else if (!value && node.children.length === 0) {
          // The Y convention exists so that processors which prune lines
          // having neither a value nor a subordinate line cannot drop the
          // assertion. Such a line is what they prune.
          errors.push({
            code: GedcomErrorCode.EmptyEvent,
            message: `${TAG?.value} has neither a payload nor substructures, so it asserts nothing and other software may drop it — write "Y" to assert the event happened, or give it a DATE, PLAC or NOTE`,
            range: TAG?.range || node.range,
            level: "warning",
          });
        }
        break;
      case "string":
        if (!value) {
          errors.push({
            code: GedcomErrorCode.MissingValue,
            message: `Missing value for ${TAG?.value}`,
            range: TAG?.range || node.range,
            level: "error",
          });
        }
        break;
      case "select":
        errors.push(...this.validateEnumeration([value], tagType, node));
        break;
      case "multiselect":
        errors.push(
          ...this.validateEnumeration(
            value.split(",").map((item) => item.trim()),
            tagType,
            node,
          ),
        );
        break;
      case "pointer": {
        const XREF = node.tokens.XREF;
        const isXrefExist = !!XREF?.value;
        const isXrefValid =
          isXrefExist &&
          (XREF.value === VOID_POINTER ||
            this.isPointerTarget(tagType, XREF.value));
        const hasChildren = node.children.length !== 0;
        const isText = TEXT_OR_POINTER.has(tagType) && !isXrefExist;
        if (
          !isText &&
          ((isXrefExist && !isXrefValid) || (!isXrefExist && !hasChildren))
        ) {
          const targetTag = fieldType.to
            ? this.scheme.tag[fieldType.to]
            : undefined;
          const target = targetTag ? `${targetTag} record` : "record";
          // An xref that names nothing is a different problem from a payload
          // that is not an xref at all. The second is what a program writes
          // when it puts a URL or a title where a citation belongs, and there
          // the shape is what's wrong rather than the identifier.
          const message = isXrefExist
            ? `No ${target} carries ${XREF.value}`
            : `Value for ${TAG?.value} should be a pointer to a ${target}, written as "@xref@"`;
          errors.push({
            code:
              isXrefExist && XREF?.value !== VOID_POINTER
                ? GedcomErrorCode.UnresolvedXref
                : GedcomErrorCode.MissingRef,
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
  }
}
