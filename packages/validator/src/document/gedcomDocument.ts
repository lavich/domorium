import { GedcomError, GedcomErrorCode } from "../types/errors";
import { ASTNode, ASTToken } from "../parser";
import { buildAst } from "../parser/ast";
import { ConfigurableLexer } from "../parser/lexer";
import { GedcomValidator } from "../validator";
import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { RuleNode } from "../validator/rule-node";
import { getGedcomVersion } from "../validator/getGedcomVersion";
import {
  resolveGedcomVersion,
  type VersionResolution,
} from "../validator/versionRegistry";
import {
  collectExtensions,
  emptyExtensions,
  ExtensionContext,
  isExtensionTag,
} from "../validator/extensions";
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
  private resolution: VersionResolution | undefined;
  private requiresSchmaDeclaration = false;
  private extensions: ExtensionContext = emptyExtensions();

  private parseGedcom(input: string) {
    const gedcomLexer = new ConfigurableLexer({ zeroBased: true });
    const lexingResult = gedcomLexer.tokenize(input);
    this.errors = [];
    lexingResult.errors.forEach((error) => {
      this.errors.push({
        code: GedcomErrorCode.Lexer,
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
    const result = buildAst(lexingResult.tokens, input);
    result.malformed.forEach((node) => {
      this.errors.push({
        code: GedcomErrorCode.Parser,
        message: "Every GEDCOM line must begin with a level number",
        range: node.range,
        level: "warning",
      });
    });
    return result;
  }

  createDocument(text: string): GedcomDocument {
    const { nodes, pointers, xrefs } = this.parseGedcom(text);
    this.nodes = nodes;
    this.pointers = pointers;
    this.xRefs = xrefs;
    this.errors.push(...this.validateLevels(nodes));

    const resolution = resolveGedcomVersion(nodes);
    this.resolution = resolution;

    if (resolution.kind === "undetermined") {
      // The schema is kept so completions can help write the header that will
      // name the version; nothing is validated against it.
      this.scheme = resolution.scheme;
      this.requiresSchmaDeclaration = resolution.requiresSchmaDeclaration;
      this.errors.push({
        code: GedcomErrorCode.UndeterminedVersion,
        message:
          "No GEDCOM version in HEAD.GEDC.VERS, so the file cannot be checked against a specification",
        range: resolution.range,
        level: "error",
      });
      return this;
    }

    if (resolution.kind === "unsupported") {
      this.errors.push({
        code: GedcomErrorCode.UnsupportedVersion,
        message: `GEDCOM ${resolution.version} is not supported, so the file cannot be checked against a specification`,
        range: resolution.range,
        level: "error",
      });
      return this;
    }

    if (resolution.kind === "substituted") {
      this.errors.push({
        code: GedcomErrorCode.SubstitutedVersion,
        message: `GEDCOM ${resolution.version} is checked against the ${resolution.using} schema; the two differ, so some diagnostics may not apply and others may be missing`,
        range: resolution.range,
        level: "warning",
      });
    }

    this.scheme = resolution.scheme;
    this.requiresSchmaDeclaration = resolution.requiresSchmaDeclaration;
    const { context, errors } = collectExtensions(
      nodes,
      this.requiresSchmaDeclaration,
      this.scheme,
    );
    this.extensions = context;
    this.errors.push(...errors);
    const validator = new GedcomValidator(pointers, context);
    // Passed explicitly: validate() otherwise chooses a schema of its own.
    this.errors.push(
      ...validator.validate(this.nodes, GedcomType(""), this.scheme),
    );
    return this;
  }

  private validateLevels(nodes: ASTNode[], expectedLevel = 0): GedcomError[] {
    const errors: GedcomError[] = [];
    for (const node of nodes) {
      if (node.level !== expectedLevel) {
        errors.push({
          code: GedcomErrorCode.InvalidLevel,
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
    const tag = node.tokens.TAG?.value;
    if (tag && isExtensionTag(tag)) {
      const uri = this.extensions.tags.get(GedcomTag(tag));
      return uri ? `Extension tag (${uri})` : "Extension tag";
    }
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

  isRecordDeclaration(node: ASTNode): boolean {
    if (
      !this.scheme ||
      node.level !== 0 ||
      node.parent ||
      !node.tokens.POINTER
    ) {
      return false;
    }
    const tag = node.tokens.TAG?.value;
    const type = tag
      ? this.scheme.substructure[GedcomType("")]?.[GedcomTag(tag)]?.type
      : undefined;
    return type?.includes("/record-") === true;
  }

  getVersion(): string | undefined {
    return getGedcomVersion(this.nodes);
  }

  getVersionResolution(): VersionResolution | undefined {
    return this.resolution;
  }

  getCompletions(position: Position, lineText: string): GedcomCompletion[] {
    if (!this.scheme) {
      return [];
    }
    return getGedcomCompletions({
      nodes: this.nodes,
      pointers: this.pointers,
      scheme: this.scheme,
      extensions: this.extensions,
      isGedcom7: this.requiresSchmaDeclaration,
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
