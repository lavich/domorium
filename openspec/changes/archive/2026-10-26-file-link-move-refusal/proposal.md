## Why

`retargetFileLinks` writes a GEDCOM 7 `FILE` payload that the same package refuses to read back as a link. Moving a photograph to a place above the document's folder gives `../photos/marie.jpg`. `documentLinks` does not count a local payload with a `..` segment as a link (`packages/language-service/src/libs/links/documentLinks.ts:86-93`), and `retargetFileLinks` writes it anyway, without a word (`retargetFileLinks.ts:48-66`). The Obsidian plugin hit this on its first try and now restates the rule itself (`domorium-obsidian/src/vault/renamedMedia.ts:66-73`), which puts format knowledge in a host. Reported as lavich/domorium#188. It blocks #260, which wires the same edit into VS Code.

## The requirement, as the user decided it

2026-10-26, asked whether the refusal should change the existing method's return type (a major release), arrive as a new method (a minor release), or ride as a field on the existing result: **"Новый метод, minor 2.3.0"** — a new method, minor release 2.3.0.

## What Changes

- A new method on `GedcomLanguageService`, `moveFileLinks(from, to)`, answering `WorkspaceEditResult | EditRefusal` in the shape `rename()` already answers.
- It refuses, with a new refusal code `unwritable-file-target`, when payloads name `from` and the payload it would write for `to` would not be read back, by this package's own lexer and link reading, as one relative link naming `to`. In GEDCOM 7 that leaves a `..` segment, a leading `/` and an empty path; in 5.5.1 anything the link reading does not take as relative (a drive, a root, anything before a `:`), a payload the line reads as a pointer (`@x@`), a control character or unpaired surrogate, and surrounding whitespace.
- A move to the path a payload already names changes nothing, and answers so without refusing, whatever that path is.
- With no payload naming `from`, it answers an empty edit and does not refuse: there is nothing to write.
- `retargetFileLinks(from, to)` keeps its behavior and is marked deprecated in favor of the new method. No breaking change; removing it waits for the next major release, which this change does not schedule.

## Capabilities

### New Capabilities

- `language-service/file-link-move`: rewriting the `FILE` payloads that name a moved file, and refusing a move whose new place the dialect cannot spell.

### Modified Capabilities

None.

## Impact

- `packages/language-service`: the new method, one new member of `EditRefusalCode`, a deprecation note, tests, README and CHANGELOG. A minor release, 2.3.0, made later by a separate release PR.
- The rule is the reader itself: the payload to write is parsed and read by the same `GedcomDocument` and `documentLinks` that read a document, so reading and writing cannot disagree again. Dependencies still point down; no new dependency is added.
- `packages/language-server`, `packages/codemirror`: unchanged. Neither calls either method.
- Editor hosts: none change in this repository. The Obsidian plugin can drop its own `..` check after 2.3.0 is published; that is a change in `domorium-obsidian`, outside this one. #260 will call the new method from VS Code.
