import { GedcomDocument } from "@domorium/validator";

import { getCompletionItems } from "./libs/completion/completion";
import { findDefinitionRanges } from "./libs/definition/definition";
import { levelFolding } from "./libs/folding/levelFolding";
import { getHover } from "./libs/hover/hover";
import { levelIndent } from "./libs/indent/levelIndent";
import { documentLinks } from "./libs/links/documentLinks";
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
  Diagnostic,
  DocumentHighlight,
  DocumentLink,
  DocumentVersion,
  EditRefusal,
  DocumentSymbol,
  FoldingRange,
  Hover,
  InlayHint,
  Position,
  PrepareRenameResult,
  Range,
  ReferenceOptions,
  WorkspaceEditResult,
} from "./types";

export class GedcomLanguageService {
  private text = "";
  private document = new GedcomDocument();
  private referenceIndex = new ReferenceIndex([]);
  private version: DocumentVersion = 0;

  constructor(text = "", version: DocumentVersion = 0) {
    this.update(text, version);
  }

  update(text: string, version: DocumentVersion = this.version + 1): void {
    this.text = text;
    this.version = version;
    const document = new GedcomDocument();
    document.createDocument(text);
    this.document = document;
    this.referenceIndex = new ReferenceIndex(document.getNodes());
  }

  getDiagnostics(): Diagnostic[] {
    return this.document.getErrors().map((error) => ({
      ...error,
      severity: error.level,
    }));
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
    return findDefinitionRanges(
      this.document.getNodes(),
      this.document.pointers,
      position,
    );
  }

  getSemanticTokens(): SemanticToken[] {
    return semanticTokens(this.document.getNodes());
  }

  getDocumentSymbols(): DocumentSymbol[] {
    return documentSymbols(this.document.getNodes());
  }

  getFoldingRanges(): FoldingRange[] {
    return levelFolding(this.document.getNodes());
  }

  getInlayHints(): InlayHint[] {
    return levelIndent(this.document.getNodes());
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
    return documentLinks(this.document.getNodes());
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
    const line = this.text.split(/\r?\n/, position.line + 1)[position.line] ?? "";
    return line.slice(0, position.character);
  }
}
