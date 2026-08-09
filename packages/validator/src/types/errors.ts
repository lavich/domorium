import { Range } from "./position";

/**
 * Every code this package emits. A consumer filters, suppresses or offers a
 * fix by code, so each kind of problem needs one of its own.
 */
export enum GedcomErrorCode {
  /** A tag the schema does not define in this position. */
  UnknownTag = "VAL001",
  /** A structure the schema requires is absent. */
  MissingTag = "VAL002",
  /** The payload is absent where one is required. */
  MissingValue = "VAL003",
  /** The payload is present and does not match its data type. */
  IncorrectValue = "VAL004",
  /** The payload is not one of the values the schema permits here. */
  ShouldBeSetValue = "VAL005",
  /** A pointer payload that is not written as a pointer. */
  MissingRef = "VAL006",
  /** More occurrences than the cardinality allows. */
  ManyOccurrences = "VAL007",
  /** A GEDCOM 7 extension tag used without a HEAD.SCHMA declaration. */
  UndocumentedTag = "VAL008",
  /** A tag declared more than once in HEAD.SCHMA. */
  DuplicateDeclaration = "VAL009",
  /** An event with neither a payload nor substructures asserts nothing. */
  EmptyEvent = "VAL010",
  /** A pointer whose xref names no record of the required type. */
  UnresolvedXref = "unresolved-xref",
  /** A line whose level cannot follow the line above it. */
  InvalidLevel = "invalid-level",
  /** The text could not be tokenized. */
  Lexer = "LEXER",
  /** The tokens could not be assembled into a tree. */
  Parser = "PARSER",
}

export interface GedcomError {
  code: string;
  message: string;
  hint?: string;
  data?: {
    xref?: string;
    requiredRecordTag?: string;
    expectedLevel?: number;
  };
  range: Range;
  level: "error" | "warning" | "info";
}
