import type { ASTNode, ASTToken } from "../parser";
import { TokenNames } from "../parser/lexer";
import type { GedcomScheme, GedcomType } from "../schemes/schema-types";
import { GedcomTag } from "../schemes/schema-types";
import { GedcomErrorCode } from "../types/errors";
import type { PayloadProblem } from "../types/structure";
import { emptyExtensions, isExtensionTag, undocumentedTag } from "./extensions";
import type { ExtensionContext } from "./extensions";
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
): PayloadProblem[] {
  const rules = getRules(scheme, parentType);
  if (!rules) {
    return [];
  }
  const problems = [];
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
  return problems.map(({ code, message, level }) => ({ code, message, level }));
}
