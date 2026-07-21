import type {
  CompletionItem,
  Diagnostic,
  DocumentSymbol,
  FoldingRange,
  Hover,
  InlayHint,
  Position,
  Range,
} from "vscode-languageserver-protocol";
import { DiagnosticSeverity } from "vscode-languageserver-protocol";

import { GedcomDocument } from "@domorium/validator";

import { getCompletionItems } from "./libs/completion/completion";
import { findDefinitionRanges } from "./libs/definition/definition";
import { levelFolding } from "./libs/folding/levelFolding";
import { getHover } from "./libs/hover/hover";
import { levelIndent } from "./libs/indent/levelIndent";
import {
  semanticTokens,
  type SemanticToken,
} from "./libs/semantic/semanticTokens";
import { documentSymbols } from "./libs/symbols/documentSymbols";

export class GedcomLanguageService {
  private text = "";
  private document = new GedcomDocument();

  constructor(text = "") {
    this.update(text);
  }

  update(text: string): void {
    this.text = text;
    const document = new GedcomDocument();
    document.createDocument(text);
    this.document = document;
  }

  getDiagnostics(): Diagnostic[] {
    return this.document.getErrors().map((error) => ({
      ...error,
      severity:
        error.level === "error"
          ? DiagnosticSeverity.Error
          : error.level === "warning"
            ? DiagnosticSeverity.Warning
            : DiagnosticSeverity.Information,
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

  private getLinePrefix(position: Position): string {
    const line = this.text.split(/\r?\n/, position.line + 1)[position.line] ?? "";
    return line.slice(0, position.character);
  }
}
