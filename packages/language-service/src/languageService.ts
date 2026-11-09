import {
  type ASTNode,
  GedcomDocument,
  type CreateDocumentOptions,
  type GedcomDateValue,
  type VersionResolution,
} from "@domorium/validator";

import { getCompletionItems } from "./libs/completion/completion";
import { LINE_TERMINATOR } from "./libs/position/lineTerminators";
import { getCodeActions, overlaps } from "./libs/codeActions/codeActions";
import { getFixAll, isFixAllable } from "./libs/codeActions/fixAll";
import { levelFolding } from "./libs/folding/levelFolding";
import { validateValue } from "./libs/structure/validateValue";
import { describe, refusal } from "./libs/structure/describe";
import {
  addStructure,
  removeStructure,
  setValue,
  type EditContext,
} from "./libs/structure/edit";
import { structureAt, structurePath } from "./libs/structure/locate";
import { recordLabel } from "./libs/symbols/recordLabel";
import { getHover } from "./libs/hover/hover";
import { levelIndent } from "./libs/indent/levelIndent";
import { documentLinks } from "./libs/links/documentLinks";
import {
  moveFileLinks,
  retargetFileLinks,
} from "./libs/links/retargetFileLinks";
import { mediaAt } from "./libs/media/mediaAt";
import { ReferenceIndex } from "./libs/references/referenceIndex";
import {
  getDocumentHighlights,
  getReferences,
} from "./libs/references/references";
import { recordPreview } from "./libs/preview/recordPreview";
import { prepareRename, rename } from "./libs/rename/rename";
import {
  semanticTokens,
  type SemanticToken,
} from "./libs/semantic/semanticTokens";
import { documentSymbols } from "./libs/symbols/documentSymbols";
import type {
  CompletionItem,
  CodeAction,
  Diagnostic,
  DocumentHighlight,
  DocumentLink,
  DocumentVersion,
  EditRefusal,
  DocumentSymbol,
  FoldingRange,
  Hover,
  InlayHint,
  MediaReference,
  OffsetRange,
  PointerCandidate,
  Position,
  PrepareRenameResult,
  Range,
  RecordPreview,
  RecordPreviewOptions,
  StructureDescription,
  StructureEditResult,
  StructureInput,
  StructureValueInput,
  ValueCheckResult,
  ReferenceOptions,
  WorkspaceEdit,
  WorkspaceEditResult,
} from "./types";

export class GedcomLanguageService {
  private text = "";
  private document = new GedcomDocument();
  private referenceIndex = new ReferenceIndex([]);
  private version: DocumentVersion = 0;
  private foldingRanges: FoldingRange[] | undefined;
  private foldingByStartLine: Map<number, FoldingRange> | undefined;
  private recordsByTag: Map<string, PointerCandidate[]> | undefined;

  // options describe the text, not one parse of it, so they outlive an update.
  constructor(
    text = "",
    version: DocumentVersion = 0,
    private readonly options: CreateDocumentOptions = {},
  ) {
    this.update(text, version);
  }

  update(text: string, version: DocumentVersion = this.version + 1): void {
    this.text = text;
    this.version = version;
    this.foldingRanges = undefined;
    this.foldingByStartLine = undefined;
    this.recordsByTag = undefined;
    const document = new GedcomDocument();
    document.createDocument(text, this.options);
    this.document = document;
    this.referenceIndex = new ReferenceIndex(
      document.getNodes(),
      (node) => document.getPointerTargetTag(node),
      (node) => document.isRecordDeclaration(node),
    );
  }

  getDocument(): GedcomDocument {
    return this.document;
  }

  getDiagnostics(): Diagnostic[] {
    return this.document.getErrors().map((error) => ({
      ...error,
      severity: error.level,
    }));
  }

  getVersionResolution(): VersionResolution | undefined {
    return this.document.getVersionResolution();
  }

  readDate(payload: string): GedcomDateValue | null {
    return this.document.readDate(payload);
  }

  getCompletionItems(position: Position): CompletionItem[] {
    return getCompletionItems(this.document, position, this.getLine(position));
  }

  getHover(position: Position): Hover | null {
    return getHover(this.document, this.document.getNodes(), position);
  }

  getDefinitionRanges(position: Position): Range[] {
    const occurrence = this.referenceIndex.at(position);
    return occurrence
      ? (this.referenceIndex.get(occurrence.id)?.declarations ?? []).map(
          ({ range }) => range,
        )
      : [];
  }

  /**
   * Pass a range to be answered about part of the document. A viewport is
   * forty lines, and converting a whole document to paint them was most of
   * what remained of the pause after an edit.
   */
  getSemanticTokens(range?: OffsetRange): SemanticToken[] {
    return semanticTokens(this.document.getNodes(), range);
  }

  getDocumentSymbols(): DocumentSymbol[] {
    return documentSymbols(this.document.getNodes());
  }

  /**
   * Computed once per parse. The fold gutter asks for every visible line on
   * every view update, and walking the tree each time cost tens of
   * milliseconds per line on a large document.
   */
  getFoldingRanges(): FoldingRange[] {
    this.foldingRanges ??= levelFolding(this.document.getNodes());
    return this.foldingRanges;
  }

  /** The fold starting on this line, if any. A lookup, not a scan. */
  getFoldingRangeAt(line: number): FoldingRange | undefined {
    if (!this.foldingByStartLine) {
      this.foldingByStartLine = new Map();
      for (const range of this.getFoldingRanges()) {
        // The outermost fold starting on a line wins, as the first match did.
        if (!this.foldingByStartLine.has(range.startLine)) {
          this.foldingByStartLine.set(range.startLine, range);
        }
      }
    }
    return this.foldingByStartLine.get(line);
  }

  getRecordPreview(
    position: Position,
    { maxLines }: RecordPreviewOptions,
  ): RecordPreview | null {
    return recordPreview(
      {
        index: this.referenceIndex,
        text: this.text,
        foldEndLine: (startLine) => this.getFoldingRangeAt(startLine)?.endLine,
      },
      position,
      maxLines,
    );
  }

  getMediaAt(position: Position): MediaReference | null {
    return mediaAt(
      {
        nodes: this.document.getNodes(),
        index: this.referenceIndex,
        dialect: this.document.getDialect(),
      },
      position,
    );
  }

  getInlayHints(range?: OffsetRange): InlayHint[] {
    return levelIndent(this.document.getNodes(), range);
  }

  getReferenceIndex(): ReferenceIndex {
    return this.referenceIndex;
  }

  getReferences(position: Position, options: ReferenceOptions): Range[] {
    return getReferences(this.referenceIndex, position, options);
  }

  getDocumentHighlights(position: Position): DocumentHighlight[] {
    return getDocumentHighlights(this.referenceIndex, position);
  }

  getDocumentLinks(): DocumentLink[] {
    return documentLinks(this.document.getNodes(), this.document.getDialect());
  }

  /**
   * from and to are plain paths, relative to the document.
   *
   * @deprecated Use `moveFileLinks`, which refuses a target the dialect cannot
   * carry, such as `../` in GEDCOM 7, where this writes it.
   */
  retargetFileLinks(from: string, to: string): WorkspaceEdit {
    return retargetFileLinks(this.fileMove(from, to));
  }

  /** from and to are plain paths, relative to the document. */
  moveFileLinks(from: string, to: string): WorkspaceEditResult | EditRefusal {
    return moveFileLinks(this.fileMove(from, to));
  }

  private fileMove(from: string, to: string) {
    return {
      links: this.getDocumentLinks(),
      dialect: this.document.getDialect(),
      text: this.text,
      from,
      to,
      version: this.version,
    };
  }

  getCodeActions(
    range: Range,
    diagnostics: Diagnostic[],
    expectedVersion: DocumentVersion,
  ): CodeAction[] | EditRefusal {
    return getCodeActions(
      {
        text: this.text,
        index: this.referenceIndex,
        currentDiagnostics: this.getDiagnostics(),
        version: this.version,
        dialect: this.document.getDialect(),
        nodes: this.document.getNodes(),
      },
      range,
      diagnostics,
      expectedVersion,
    );
  }

  fixAllableAt(range: Range): boolean {
    return this.getDiagnostics().some(
      (diagnostic) =>
        isFixAllable(diagnostic) && overlaps(diagnostic.range, range),
    );
  }

  getFixAll(expectedVersion: DocumentVersion): CodeAction[] | EditRefusal {
    return getFixAll(
      {
        text: this.text,
        version: this.version,
        diagnostics: this.getDiagnostics(),
        revalidate: (text) =>
          new GedcomDocument().createDocument(text, this.options).getErrors(),
      },
      expectedVersion,
    );
  }

  describeStructure(
    position: Position,
    tag?: string,
  ): StructureDescription | EditRefusal {
    const dialect = this.document.getValidatedDialect();
    if (!dialect) {
      return refusal(
        "no-dialect",
        "The document was checked against no dialect.",
      );
    }
    const node = structureAt(this.document.getNodes(), position.line);
    const shape = node && this.document.getStructureShape(node, tag);
    if (!node || !shape) {
      return refusal(
        tag === undefined || !node ? "not-a-structure" : "unknown-path",
        "There is no structure to describe there.",
      );
    }
    const path = structurePath(node);
    return describe(
      this.describeContext(),
      dialect,
      shape,
      tag === undefined ? path : [...path, tag],
      tag === undefined ? node : undefined,
    );
  }

  /** With `replacing`, the position is the occurrence a set would overwrite. */
  validateValue(
    position: Position,
    tag: string,
    value: StructureValueInput,
    options: { replacing?: boolean } = {},
  ): ValueCheckResult | EditRefusal {
    return validateValue(
      this.editContext(),
      position,
      tag,
      value,
      options.replacing === true,
    );
  }

  addStructure(
    position: Position,
    tag: string,
    input: StructureInput,
    expectedVersion: DocumentVersion,
  ): StructureEditResult | EditRefusal {
    return addStructure(
      this.editContext(),
      position,
      tag,
      input,
      expectedVersion,
    );
  }

  setValue(
    position: Position,
    value: StructureValueInput,
    expectedVersion: DocumentVersion,
  ): StructureEditResult | EditRefusal {
    return setValue(this.editContext(), position, value, expectedVersion);
  }

  removeStructure(
    position: Position,
    expectedVersion: DocumentVersion,
  ): StructureEditResult | EditRefusal {
    return removeStructure(this.editContext(), position, expectedVersion);
  }

  private editContext(): EditContext {
    return {
      text: this.text,
      version: this.version,
      document: this.document,
      options: this.options,
      diagnostics: () => this.getDiagnostics(),
    };
  }

  /** `path` is tags from a record joined by dots, such as `INDI.NAME.TRAN`. */
  describeSchemaPath(path: string): StructureDescription | EditRefusal {
    const dialect = this.document.getValidatedDialect();
    if (!dialect) {
      return refusal(
        "no-dialect",
        "The document was checked against no dialect.",
      );
    }
    const tags = path.split(".");
    const shape = this.document.getStructureShapeAtPath(tags);
    return shape
      ? describe(this.describeContext(), dialect, shape, tags)
      : refusal("unknown-path", `The dialect has no structure ${path}.`);
  }

  private describeContext() {
    return {
      document: this.document,
      version: this.version,
      candidates: (tag: string) => this.records().get(tag) ?? [],
    };
  }

  private records(): Map<string, PointerCandidate[]> {
    if (!this.recordsByTag) {
      const byXref = new Map<string, ASTNode>();
      const roots = this.document
        .getNodes()
        .filter((node) => this.document.isRecordDeclaration(node));
      for (const node of roots) {
        byXref.set(node.tokens.POINTER?.value ?? "", node);
      }
      const resolve = (xref: string) => byXref.get(xref);
      const map = new Map<string, PointerCandidate[]>();
      for (const node of roots) {
        const tag = node.tokens.TAG?.value ?? "";
        const label = recordLabel(node, resolve);
        const list = map.get(tag) ?? [];
        list.push({
          xref: node.tokens.POINTER?.value ?? "",
          ...(label ? { label } : {}),
        });
        map.set(tag, list);
      }
      this.recordsByTag = map;
    }
    return this.recordsByTag;
  }

  prepareRename(position: Position): PrepareRenameResult | EditRefusal {
    return prepareRename(this.referenceIndex, position, this.version);
  }

  rename(
    position: Position,
    newName: string,
    expectedVersion: DocumentVersion,
  ): WorkspaceEditResult | EditRefusal {
    return rename(
      this.referenceIndex,
      position,
      newName,
      expectedVersion,
      this.version,
    );
  }

  private getLine(position: Position): string {
    return (
      this.text.split(LINE_TERMINATOR, position.line + 1)[position.line] ?? ""
    );
  }
}
