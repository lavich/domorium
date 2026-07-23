import { GedcomDocument } from "@domorium/validator";

import { getCompletionItems } from "./libs/completion/completion";
import { findDefinitionRanges } from "./libs/definition/definition";
import { levelFolding } from "./libs/folding/levelFolding";
import { getHover } from "./libs/hover/hover";
import { levelIndent } from "./libs/indent/levelIndent";
import { ReferenceIndex } from "./libs/references/referenceIndex";
import {
  getDocumentHighlights,
  getReferences,
} from "./libs/references/references";
import {
  semanticTokens,
  type SemanticToken,
} from "./libs/semantic/semanticTokens";
import { documentSymbols } from "./libs/symbols/documentSymbols";
import type {
  CompletionItem,
  Diagnostic,
  DocumentHighlight,
  DocumentSymbol,
  FoldingRange,
  Hover,
  InlayHint,
  Position,
  Range,
  ReferenceOptions,
} from "./types";

export class GedcomLanguageService {
  private text = "";
  private document = new GedcomDocument();
  private referenceIndex = new ReferenceIndex([]);

  constructor(text = "") {
    this.update(text);
  }

  update(text: string): void {
    this.text = text;
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

  private getLinePrefix(position: Position): string {
    const line = this.text.split(/\r?\n/, position.line + 1)[position.line] ?? "";
    return line.slice(0, position.character);
  }
}
