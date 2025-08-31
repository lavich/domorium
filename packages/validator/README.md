

```typescript
abstract class GedcomDocument {
  readonly documentUri: string;
  private nodes: ASTNode[];
  public pointers: Map<Pointer, ASTNode[]>;
  public xrefs: Map<Xref, ASTNode[]>;
  private errors: Errors[];

  abstract createDocument(text: string): GedcomDocument;
  abstract updateDocument(text: string, range: Range): GedcomDocument;
  abstract getErrors(range?: Range, lang?: string): Errors[];
  abstract getDefinition(node: ASTNode, lang?: string): string;
  abstract getNodes(range?: Range): ASTNode[];
}
```
