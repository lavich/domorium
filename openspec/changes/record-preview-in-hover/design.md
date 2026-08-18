## Context

See proposal.md — Why. The constraints that shape the approach, none of them
negotiable:

- `@domorium/language-service` may not import an editor API or an LSP type, and
  declares its own protocol-shaped types in `src/types.ts`.
- `Hover.contents.kind` is the literal `"plaintext"`, and the CodeMirror host
  renders `hover.contents.value` through `textContent`. Widening that union puts
  markup source in front of a reader — the defect #59 closed.
- `getHover` answers only where the position resolves to a tag, so a pointer
  payload has no hover in an LSP host today. Nothing has to be preserved there.
- `@domorium/codemirror` depends on `@domorium/language-service` by version range,
  and both publish independently (ADR-0003).

## Goals / Non-Goals

**Goals:**

- One implementation of "which record does this pointer name, and how much of it
  fits", consumable by a host that has never heard of CodeMirror.
- VS Code and JetBrains gain the preview without either plugin changing.
- The Obsidian plugin and the web editor keep calling the same function and get
  the same result.

**Non-Goals:**

- Colouring the record in an LSP host. That needs a TextMate grammar (#58).
- Moving the colouring, the decoration, or the hover gesture out of CodeMirror.
- Anything crossing files. The server knows only open documents (#157), and a
  pointer's target is in the same file by definition, so this change does not
  meet that limit.

## Decisions

### The answer is ranges, not text

`getRecordPreview(position, { maxLines })` returns the record's `Range`, the
pointer's `Range`, and `truncated`, or `null`. It does not return the record's
text.

Every caller already holds the document: the CodeMirror adapter has `doc`, and the
server has the `TextDocument` it was handed, whose `getText(range)` does exactly
this. Returning the text as well would put a second copy of the same bytes in the
answer and give two callers two different ways to obtain one thing.

_Alternative considered:_ include `text`. Rejected for the duplication above. The
adapter would have thrown it away, since it needs offsets to build decorations.

### `maxLines` stays a parameter

The shared layer does not choose how much fits — a hover tooltip in an IDE, a
`HoverPopover` in Obsidian, and a preview panel in the web editor have different
room, and the current CodeMirror code already takes this from its caller.

### The server marks the record up as a fenced block

`onHover` asks for the record preview first. Where it answers, the server sends
`MarkupKind.Markdown` whose value is the record's text inside a fence tagged
`gedcom`, with the pointer's range as the hover range. Where it does not answer,
the server sends `service.getHover(position)` exactly as it does now.

Markdown rather than plain text because a fence guarantees the line structure
survives and the characters in a GEDCOM value are not read as formatting, and
because a fence is where colour will appear once #58 exists. `MarkupKind` is an
LSP type, so this belongs in `language-server` and nowhere below it.

_Alternative considered:_ `MarkupKind.PlainText`. Rejected — it offers no
guarantee about how a host reflows the lines, and closes the door on colour.

### Precedence, not merging

A pointer hover and a tag hover never describe the same span: one is keyed to the
pointer's range, the other to the tag's. The server picks the record preview when
there is one and the tag hover otherwise, rather than concatenating them into a
hover with two subjects and one range.

### `toPreviewRuns` stays in CodeMirror

It splits a record by semantic token, which sounds shared, and it takes CodeMirror
`Text` only for `sliceString`, which sounds like an easy change.

It stays anyway. The runs exist to be handed to `highlightingFor`, which is
CodeMirror and cannot move. Moving the splitting down while the colouring stays up
would cut one concern across two layers — the objection #171 raised, applied to a
different pair of layers. The line is drawn where the answer stops being about
GEDCOM and starts being about rendering.

### No new ADR

The rule asks for one where a decision is expensive to reverse. This change makes
no new decision: ADR-0005 already states the test ("behavior another host would
also need belongs in the shared package … the fix is to move it down"), and this
applies it to a third layer. ADR-0003 already governs the publishing order. What
is new is a public method, and where the boundary now runs — recorded above and in
the `language-service` README, which is where the obligation in AGENTS.md puts it.

## Risks / Trade-offs

- **A hover on a large record floods the tooltip** → `maxLines` is required, not
  optional, and the answer says when it cut.
- **A GEDCOM value containing three backticks breaks the fence** → the fence is
  built longer than the longest run of backticks in the record. A note carrying
  Markdown is not hypothetical; `NOTE` payloads hold arbitrary text.
- **Hover cost on a large file** → the work is two lookups against the reference
  index and the folding range, the same two the CodeMirror hosts already pay per
  hover. It does not reparse. The five-second freeze in #210 is the index being
  built on update, which this change neither adds to nor relieves.
- **LSP4IJ may render the fence differently from VS Code** → verified in the
  JetBrains host as its own task, not assumed. If the block arrives unreadable
  there, the fallback is plain text for that host only, decided in the adapter.
- **Two packages ship in sequence** → `codemirror` must not be published against
  an unpublished `language-service`. The task list keeps them in order and the
  release itself stays a separate, deliberate act.

## Migration Plan

1. `language-service`: the method, its tests, README and usage example, changelog
   entry. Minor bump — additive.
2. `codemirror`: `findRecordPreview` becomes the adapter, its tests keep asserting
   the same results through the same signature, changelog entry. Its dependency
   range moves to the new `language-service` minor.
3. `language-server`: hover composition and its tests. Internal, no version of its
   own.
4. The two plugins pick it up when VS Code and JetBrains are next released.

Rollback is local: the adapter keeps the public signature, so restoring the old
body in `codemirror` restores the previous behavior without touching a consumer.

## Open Questions

- How many lines the LSP hover should show. It is one number in the adapter,
  changeable without touching the specs, the shared method, or the task list.
