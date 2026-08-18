import { GedcomError, GedcomErrorCode } from "../types/errors";
import { ASTNode, ASTToken } from "../parser";
import { buildAst } from "../parser/ast";
import { ConfigurableLexer, TokenNames } from "../parser/lexer";
import { GedcomValidator } from "../validator";
import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { RuleNode } from "../validator/rule-node";
import { getGedcomVersion } from "../validator/getGedcomVersion";
import {
  resolveGedcomVersion,
  schemaForDialect,
  type GedcomDialect,
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

export interface CreateDocumentOptions {
  /** Text that is part of a document rather than one of its own. */
  fragment?: boolean;
  /** A fragment carries no header, so the rules are named rather than read. */
  dialect?: GedcomDialect;
}

/** The scanner's own words name an offset and a count of skipped characters. */
function unreadableLine(skipped: string): string {
  if (skipped.startsWith("@")) {
    return "An xref holds letters, digits and underscore between two @ marks, so this line cannot be read";
  }
  return `This line cannot be read from ${JSON.stringify(skipped)} onward`;
}

/** Reported only because a fragment ends where it does. */
const BOUNDED_BY_FRAGMENT = new Set<string>([
  GedcomErrorCode.UnresolvedXref,
  GedcomErrorCode.UndocumentedTag,
]);

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

    // A stumble before the line's tag leaves its structure unknown, so what the
    // lexer reads on from there is a fragment rather than the file's own tag. A
    // stumble after the tag is only a junk tail: the line is read, and its xref
    // is what rename works from. See #234.
    const tagColumns = new Map<number, number>();
    lexingResult.tokens.forEach((token) => {
      if (token.tokenType.name !== TokenNames.TAG) {
        return;
      }
      const line = token.startLine ?? 0;
      const column = token.startColumn ?? 0;
      tagColumns.set(line, Math.min(tagColumns.get(line) ?? column, column));
    });

    const unreadable = new Set<number>();
    const reported = new Set<number>();
    lexingResult.errors.forEach((error) => {
      const line = error.line ?? 0;
      const column = error.column ?? 0;
      if (column < (tagColumns.get(line) ?? Infinity)) {
        unreadable.add(line);
      }
      if (reported.has(line)) {
        return;
      }
      reported.add(line);
      this.errors.push({
        code: GedcomErrorCode.Lexer,
        message: unreadableLine(
          input.slice(error.offset, error.offset + error.length),
        ),
        range: {
          start: { line, character: column },
          end: { line, character: column + error.length },
        },
        level: "warning",
      });
    });

    const tokens = unreadable.size
      ? lexingResult.tokens.filter(
          (token) => !unreadable.has(token.startLine ?? -1),
        )
      : lexingResult.tokens;
    const result = buildAst(tokens, input);
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

  createDocument(
    text: string,
    options: CreateDocumentOptions = {},
  ): GedcomDocument {
    const { nodes, pointers, xrefs } = this.parseGedcom(text);
    this.nodes = nodes;
    this.pointers = pointers;
    this.xRefs = xrefs;
    this.errors.push(...this.validateLevels(nodes));

    const resolution = resolveGedcomVersion(nodes);
    this.resolution = resolution;

    if (
      options.fragment &&
      options.dialect &&
      resolution.kind === "undetermined"
    ) {
      this.applyScheme(nodes, schemaForDialect(options.dialect), options);
      return this;
    }

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

    if (resolution.kind === "paf") {
      const named = resolution.system
        ? ` (\`1 SYST ${resolution.system}\`)`
        : "";
      this.errors.push({
        code: GedcomErrorCode.PersonalAncestralFile,
        message: `The header names a system before GEDC${named}, so this is a Personal Ancestral File and is not checked against a GEDCOM specification`,
        range: resolution.range,
        level: "warning",
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
        message: `GEDCOM ${resolution.version} is checked against the ${resolution.dialect} schema; the two differ, so some diagnostics may not apply and others may be missing`,
        range: resolution.range,
        level: "warning",
      });
    }

    this.applyScheme(nodes, resolution, options);
    return this;
  }

  private applyScheme(
    nodes: ASTNode[],
    choice: {
      scheme: GedcomScheme;
      requiresSchmaDeclaration: boolean;
    },
    options: CreateDocumentOptions,
  ): void {
    this.scheme = choice.scheme;
    this.requiresSchmaDeclaration = choice.requiresSchmaDeclaration;
    const { context, errors } = collectExtensions(
      nodes,
      this.requiresSchmaDeclaration,
      this.scheme,
    );
    this.extensions = context;
    this.errors.push(...errors);
    const validator = new GedcomValidator(
      this.pointers,
      context,
      options.fragment ?? false,
    );
    // Passed explicitly: validate() otherwise chooses a schema of its own.
    this.errors.push(
      ...validator.validate(this.nodes, GedcomType(""), this.scheme),
    );
    if (options.fragment) {
      this.errors = this.errors.filter(
        (error) => !BOUNDED_BY_FRAGMENT.has(error.code),
      );
    }
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

  getDialect(): GedcomDialect | undefined {
    return this.resolution && "dialect" in this.resolution
      ? this.resolution.dialect
      : undefined;
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
