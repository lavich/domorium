## Why

A host that wants to show a photograph on hover cannot ask for one. `DocumentLink` carries `{ range, targetText, kind }` — enough to open a file, silent about whether it is an image and about which part of it a reference points at. GEDCOM 7 puts a `CROP` on the multimedia _link_, so one group photograph referenced by five people carries five different rectangles; that is the whole point of the structure, and nothing in the shared layer exposes it. Asked for as lavich/domorium#189; lavich/domorium-obsidian#85 is the consumer waiting on it.

## What Changes

- A new position query on `GedcomLanguageService`: `getMediaAt(position): MediaReference | null`, beside the existing `getRecordPreview`.
- `MediaReference` names the file as written, how to read it, what the format says it is, the caption the author wrote, and the rectangle when the position is a link that carries a usable one.
- Both dialects answer. GEDCOM 7 reads `FORM` as a media type and `CROP` from the link; 5.5.1 reads `FORM` from its closed format list and has no `CROP` at all, including the inline form with `FILE` beneath `OBJE`.
- `getDocumentLinks` is unchanged. It takes no position and returns the whole document's links; the media answer needs a position and needs a pointer resolved to a record.
- No breaking change. The query is additive and the existing types keep their shapes.

## Capabilities

### New Capabilities

- `language-service/media-at-position`: answering, for a position, the media a GEDCOM line refers to — the file, its kind, what the format says it is, its caption, and the crop rectangle a link names.

### Modified Capabilities

None. `language-service/record-preview` is the pattern this follows and is not itself changed.

## Impact

- `packages/language-service`: a new `src/libs/media/` module, a new method on `GedcomLanguageService`, and new exported types. A minor release.
- `packages/language-server`: `connection.onHover` already folds `getRecordPreview` into the standard LSP hover response; the media answer rides the same rail, so VS Code and JetBrains reach it without a custom LSP request. This is the lesson of #259, which found the record preview stranded above the layer those two hosts consume.
- `packages/codemirror`: nothing required. It re-exports types from `language-service`, and whether `MediaReference` joins them is a separate decision driven by a consumer.
- Hosts: the whole image reaches all four hosts. **The crop reaches two.** Obsidian and the web editor have a real DOM, where a container with `overflow: hidden` crops for free. A VS Code hover renders Markdown with no CSS, and LSP4IJ renders JetBrains hovers through Swing's HTML, so neither can crop without image processing or a webview. That asymmetry is a property of the hosts; the layer returns the rectangle to all of them.
- The web editor inverts Obsidian's constraint: a browser cannot reach a file sitting beside the `.ged` a user opened unless a directory handle was granted, so `file-relative` is largely unusable there while `http` is fine. Obsidian is the opposite — it has the vault and promises no network requests.
