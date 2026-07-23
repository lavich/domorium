import { GedcomError } from "../types/errors";
import { ASTNode, ASTToken } from "../parser";
import { ConfigurableLexer, gedcomLexerDefinition } from "../parser/lexer";
import { GedcomParser } from "../parser/parser";
import { GedcomVisitor } from "../parser/visitor";
import { GedcomValidator } from "../validator";
import { GedcomScheme } from "../schemes/schema-types";
import { RuleNode } from "../validator/rule-node";
import { getGedcomVersion } from "../validator/getGedcomVersion";
import {
  getGedcomCompletions,
  type GedcomCompletion,
} from "../completion/completion";
import type { Position } from "../types/position";

export class GedcomDocument {
  private nodes: ASTNode[] = [];
  public pointers = new Map<string, ASTNode[]>();
  public xRefs = new Map<string, ASTToken[]>();
  private errors: GedcomError[] = [];
  private scheme: GedcomScheme | undefined;

  private parseGedcom(input: string) {
    const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
    const lexingResult = gedcomLexer.tokenize(input);
    this.errors = [];
    lexingResult.errors.forEach((error) => {
      this.errors.push({
        code: "LEXER",
        message: error.message,
        range: {
          start: { line: error.line ?? 0, character: error.column ?? 0 },
          end: {
            line: error.line ?? 0,
            character: (error.column ?? 0) + error.length,
          },
        },
        level: "warning",
      });
    });
    const parser = new GedcomParser(gedcomLexerDefinition);
    parser.input = lexingResult.tokens;
    const cst = parser.root();
    parser.errors.forEach((error) => {
      this.errors.push({
        code: "PARSER",
        message: error.message,
        range: {
          start: {
            line: error.token.startLine ?? 0,
            character: error.token.startColumn ?? 0,
          },
          end: {
            line: error.token.endLine ?? 0,
            character: error.token.endColumn ?? 0,
          },
        },
        level: "warning",
      });
    });
    const visitor = new GedcomVisitor();
    return visitor.root(cst);
  }

  createDocument(text: string): GedcomDocument {
    const { nodes, pointers, xrefs } = this.parseGedcom(text);
    this.nodes = nodes;
    this.pointers = pointers;
    this.xRefs = xrefs;
    this.errors.push(...this.validateLevels(nodes));
    const validator = new GedcomValidator(pointers);
    this.scheme = validator.setScheme(this.nodes);
    this.errors.push(...validator.validate(this.nodes));
    return this;
  }

  private validateLevels(nodes: ASTNode[], expectedLevel = 0): GedcomError[] {
    const errors: GedcomError[] = [];
    for (const node of nodes) {
      if (node.level !== expectedLevel) {
        errors.push({
          code: "invalid-level",
          message: `Level ${node.level} should be ${expectedLevel}`,
          data: { expectedLevel },
          range: node.tokens.LEVEL?.range ?? {
            start: node.range.start,
            end: node.range.start,
          },
          level: "error",
        });
      }
      errors.push(...this.validateLevels(node.children, node.level + 1));
    }
    return errors;
  }

  getLabel(node: ASTNode): string | undefined {
    if (!this.scheme) {
      return undefined;
    }
    const type = new RuleNode(this.scheme, this.pointers).getNodeType(node);
    return this.scheme.label[type]?.["en-US"];
  }

  getPointerTargetTag(node: ASTNode): string | undefined {
    if (!this.scheme) {
      return undefined;
    }
    const ruleNode = new RuleNode(this.scheme, this.pointers);
    const fieldType = ruleNode.getFieldType(ruleNode.getNodeType(node));
    return fieldType.type === "pointer" && fieldType.to
      ? this.scheme.tag[fieldType.to]
      : undefined;
  }

  getCompletions(position: Position, lineText: string): GedcomCompletion[] {
    if (!this.scheme) {
      return [];
    }
    const version = getGedcomVersion(this.nodes);
    return getGedcomCompletions({
      nodes: this.nodes,
      pointers: this.pointers,
      scheme: this.scheme,
      isGedcom7: !version?.startsWith("5"),
      position,
      lineText,
    });
  }

  updateDocument(_text: string, _range: Range): GedcomDocument {
    return this;
  }

  getErrors(_lang?: string): GedcomError[] {
    return this.errors;
  }

  getNodes(_range?: Range): ASTNode[] {
    return this.nodes;
  }
}
