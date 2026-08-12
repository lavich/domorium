import {
  GedcomDocument,
  type CreateDocumentOptions,
  type VersionResolution,
} from "@domorium/validator";

import { getCompletionItems } from "./libs/completion/completion";
import { getCodeActions } from "./libs/codeActions/codeActions";
import { levelFolding } from "./libs/folding/levelFolding";
import { getHover } from "./libs/hover/hover";
import { levelIndent } from "./libs/indent/levelIndent";
import { documentLinks } from "./libs/links/documentLinks";
import { retargetFileLinks } from "./libs/links/retargetFileLinks";
import { ReferenceIndex } from "./libs/references/referenceIndex";
import {
  getDocumentHighlights,
  getReferences,
} from "./libs/references/references";
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
  OffsetRange,
  Position,
  PrepareRenameResult,
  Range,
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

  getCompletionItems(position: Position): CompletionItem[] {
    return getCompletionItems(
      this.document,
      position,
      this.getLinePrefix(position),
    );
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

  /** from and to are plain paths, relative to the document. */
  retargetFileLinks(from: string, to: string): WorkspaceEdit {
    return retargetFileLinks({
      links: this.getDocumentLinks(),
      dialect: this.document.getDialect(),
      from,
      to,
      version: this.version,
    });
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
      },
      range,
      diagnostics,
      expectedVersion,
    );
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

  private getLinePrefix(position: Position): string {
    const line =
      this.text.split(/\r?\n/, position.line + 1)[position.line] ?? "";
    return line.slice(0, position.character);
  }
}
