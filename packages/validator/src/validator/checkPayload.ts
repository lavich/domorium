import type { ASTNode, ASTToken } from "../parser";
import { TokenNames } from "../parser/lexer";
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
  if (
    value !== "" &&
    scheme.payload[rule.type]?.type === null &&
    !TAKES_A_VALUE_DESPITE_THE_SCHEME.has(rule.type)
  ) {
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

// 5.5.1 describes EVENT_DESCRIPTOR as the value "usually assigned to the EVEN
// tag", of a person or a family, though only the family's grammar line shows it,
// and the hand-kept scheme gives neither a payload.
const TAKES_A_VALUE_DESPITE_THE_SCHEME = new Set([
  "https://gedcom.io/terms/v5.5.1/FAM-EVEN",
  "https://gedcom.io/terms/v5.5.1/INDI-EVEN",
]);

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
