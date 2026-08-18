## Why

Pointing at an XREF shows the record it names in Obsidian and in the web editor,
and shows nothing in VS Code or a JetBrains IDE. Those two hosts do not lack the
feature by choice — the code that computes it sits one layer above the one they
consume.

[`findRecordPreview`](../../../packages/codemirror/src/recordPreview.ts) is the
whole of it, and its only dependency on CodeMirror is the container the text
arrived in:

```ts
const position = offsetToPosition(doc, offset);
const [definition] = service.getDefinitionRanges(position);
const endLine = service.getFoldingRangeAt(startLine)?.endLine ?? startLine;
```

Pointer → definition → record extent, expressed in two
`@domorium/language-service` methods. Nothing in that answer is CodeMirror.

#171 already moved this feature once, out of the Obsidian plugin and into
`@domorium/codemirror`, on the test ADR-0005 states: behavior another host would
also need belongs in the shared package, and the fix is to move it down rather
than duplicate it. That move stopped at the CodeMirror layer because both hosts
being compared were CodeMirror hosts. Two of the four are not, and the same test
applied to them points one layer further down.

There is a second, smaller reason. `getHover` answers only where the position is
on a tag, so in the LSP hosts a pointer payload has no hover at all — not a
sparse one, none.

## What Changes

- `@domorium/language-service` gains a method that answers the preview from a
  position: the range of the record a pointer names, the range of the pointer
  itself, and whether the record was cut short. No editor type in the signature.
- `findRecordPreview` becomes an adapter over that method and **keeps its current
  signature**, so the Obsidian plugin and the web editor need no change and see
  no behavior change.
- `packages/language-server` composes the hover it sends: where the position is
  on a pointer, the record's text as a fenced block; otherwise the existing tag
  documentation. VS Code and JetBrains gain the preview with no line of code in
  either plugin.
- Markdown stays in the adapter. `Hover.contents.kind` remains `"plaintext"`,
  because the CodeMirror host renders hover contents through `textContent` — that
  is what #59 fixed, and widening the union would undo it.

Deliberately not moved: the coloured run assembly (`getRecordPreviewRuns`,
`toPreviewRuns`), `recordPreviewHover`, and the pointer decoration. Those need
`EditorState` and `highlightingFor`, they are CodeMirror, and they stay.

One limitation is accepted rather than solved: with no TextMate grammar (#58),
the fenced block renders uncoloured in VS Code. The record is legible either way,
and colour arrives with that issue rather than this one.

## Capabilities

### New Capabilities

- `language-service/record-preview`: the record an XREF names is answered from
  the shared layer, so every host — CodeMirror or LSP — can show it, and none has
  to recompute it.

### Modified Capabilities

None. No existing spec describes hover or the record preview.

## Impact

- **Layers:** `language-service` gains a method; `codemirror` keeps its public
  surface and loses the body behind it; `language-server` composes a hover.
  Dependency direction is unchanged and still points down — both `codemirror` and
  `language-server` already depend on `language-service`, and `language-service`
  gains no new dependency at all.
- **Editor hosts:** VS Code and JetBrains gain the record preview on hover.
  Obsidian and the web editor are unaffected by construction: the function they
  call keeps its name, signature, and result.
- **Releases:** two publishing units are touched, and `@domorium/codemirror`
  depends on `@domorium/language-service` by version range, so this ships the way
  #171 did — `language-service` published first, `codemirror` against the
  published version. `language-server` is internal and rides with the apps.
- **Documentation:** the `language-service` README and its usage example, the
  `codemirror` README where it describes `findRecordPreview`, and a changelog
  entry for each package whose version moves.
