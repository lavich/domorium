import type { ASTNode, ASTToken } from "../parser";
import { TokenNames } from "../parser/lexer";
import { filePathProblem, type FilePathProblem } from "../payload/filePath";
import type { GedcomScheme, GedcomType } from "../schemes/schema-types";
import { GedcomTag } from "../schemes/schema-types";
import { GedcomErrorCode, type GedcomError } from "../types/errors";
import type { PayloadProblem } from "../types/structure";
import { emptyExtensions, isExtensionTag, undocumentedTag } from "./extensions";
import type { ExtensionContext } from "./extensions";
import { lineBreaksOf } from "./lineBreaks";
import { RuleNode } from "./rule-node";
import { getRules, tooManyError, unknownTagError } from "./validate";

const XREF_PAYLOAD = /^@[A-Za-z0-9_]+@$/;

const ORIGIN = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 0 },
};

function token(name: TokenNames, value: string): ASTToken {
  return {
    name,
    value,
    startOffset: 0,
    endOffset: value.length,
    range: ORIGIN,
  };
}

function lineOf(tag: string, value: string): ASTNode {
  const tokens: ASTNode["tokens"] = {
    [TokenNames.TAG]: token(TokenNames.TAG, tag),
  };
  if (XREF_PAYLOAD.test(value)) {
    tokens[TokenNames.XREF] = token(TokenNames.XREF, value);
  } else if (value) {
    tokens[TokenNames.VALUE] = token(TokenNames.VALUE, value);
  }
  return {
    startOffset: 0,
    endOffset: value.length,
    range: ORIGIN,
    tokens,
    children: [],
    level: 0,
  };
}

export function checkPayload(
  scheme: GedcomScheme,
  pointers: Map<string, ASTNode[]>,
  extensions: ExtensionContext,
  parentType: GedcomType,
  tag: string,
  value: string,
  occurrences: number,
  replacing?: ASTNode,
): PayloadProblem[] {
  const rules = getRules(scheme, parentType);
  if (!rules) {
    return [];
  }
  const problems: GedcomError[] = [];
  const gedcomTag = GedcomTag(tag);
  if (isExtensionTag(gedcomTag)) {
    if (extensions.requireDeclaration && !extensions.tags.has(gedcomTag)) {
      problems.push(undocumentedTag(gedcomTag, ORIGIN));
    }
    return problems;
  }
  const rule = rules.get(gedcomTag);
  if (!rule) {
    return [unknownTagError(rules, gedcomTag, scheme.tag[parentType], ORIGIN)];
  }
  if (occurrences + 1 > rule.max) {
    problems.push(tooManyError(gedcomTag, scheme.tag[parentType], ORIGIN));
  }
  if (value !== "" && scheme.payload[rule.type]?.type === null) {
    return [...problems.map(toPayloadProblem), valueNotAllowed(tag)];
  }
  if (
    !value.trim() &&
    parentType === "" &&
    replacing &&
    rule.type.startsWith(GEDCOM_7) &&
    scheme.payload[rule.type]?.type !== null &&
    replacing.children.every(isContinuation)
  ) {
    return [...problems.map(toPayloadProblem), emptyStructure(tag)];
  }
  if (/[\r\n]/.test(value) && !lineBreaksOf(scheme, rule.type).lineBreaks) {
    problems.push({
      code: GedcomErrorCode.SpansLines,
      message: `Value for ${tag} cannot span lines`,
      range: ORIGIN,
      level: "error",
    });
    return problems.map(toPayloadProblem);
  }
  const pathProblem =
    scheme.payload[rule.type]?.type === FILE_PATH
      ? localPathProblem(value.trim())
      : undefined;
  if (pathProblem) {
    return [
      ...problems.map(toPayloadProblem),
      fileTargetUnsupported(tag, pathProblem),
    ];
  }
  const ruleNode = new RuleNode(
    scheme,
    pointers,
    extensions ?? emptyExtensions(),
  );
  for (const error of ruleNode.validate(lineOf(tag, value), rule.type)) {
    if (error.code !== GedcomErrorCode.EmptyEvent) {
      problems.push(error);
    }
  }
  return problems.map(toPayloadProblem);
}

const GEDCOM_7 = "https://gedcom.io/terms/v7/";

const FILE_PATH = "https://gedcom.io/terms/v7/type-FilePath";

// A one-letter scheme is a drive letter, which makes a path, not a URL.
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]+:/u;

const localPathProblem = (value: string): FilePathProblem | undefined =>
  URI_SCHEME.test(value) ? undefined : filePathProblem(value);

const isContinuation = (node: ASTNode): boolean => {
  const tag = node.tokens.TAG?.value;
  return tag === "CONT" || tag === "CONC";
};

function valueNotAllowed(tag: string): PayloadProblem {
  return {
    code: GedcomErrorCode.ValueNotAllowed,
    message: `${tag} takes no value`,
    data: { tag },
    level: "error",
  };
}

function fileTargetUnsupported(
  tag: string,
  pathProblem: FilePathProblem,
): PayloadProblem {
  return {
    code: GedcomErrorCode.FileTargetUnsupported,
    message: `Value for ${tag} names no file beside the document (${pathProblem})`,
    data: { tag, pathProblem },
    level: "error",
  };
}

function emptyStructure(tag: string): PayloadProblem {
  return {
    code: GedcomErrorCode.EmptyStructure,
    message: `${tag} needs a value or a substructure`,
    data: { tag },
    level: "error",
  };
}

const toPayloadProblem = ({
  code,
  message,
  data,
  level,
}: GedcomError): PayloadProblem => ({
  code,
  message,
  ...(data ? { data } : {}),
  level,
});
