## Context

See proposal.md — Why. What constrains the approach:

- The editor is one document at a time. Only the GEDCOM surface is mounted for the
  active tab, and switching tabs remounts it against the new document's text, so
  every report is asynchronous with respect to the tab that is in front.
- The workspace reducer already owns everything else that is per-file — the kept
  text, the modified flag, the editor key — and `mapFile` already routes an action
  by path.
- A preview holds no document and no dirty flag, which is what keeps "unsaved" a
  question only a GEDCOM tab can answer. Nothing here may give a preview one.
- The panels exist only above 768px. Below it the pane is the whole window and
  there is no problems column to scope.

## Goals / Non-Goals

**Goals:**

- What the window says about the file in front is true of that file.
- Closing a file forgets what was said about it, without a second owner to prune.
- The problems panel reads as part of the document's frame.

**Non-Goals:**

- The decomposition of `App.tsx` (#247) and the disclosure idioms (#246).
- Diagnostics for a document that is not in front. Nothing lints a background tab,
  and a per-file count in the explorer would need that.
- Editing or validating a markdown file. A preview stays a preview.

## Decisions

### The report lives on the file, not beside it

`OpenFile` gains `report: DocumentReport | null`, and the reducer gains
`{ type: "reported"; path; report }` routed through `mapFile`.

The alternative was a `Map<path, DocumentReport>` in `App` beside the reducer.
It keeps the reducer about files, at the price of an owner that has to be pruned
on every close and every workspace replacement — two places that must agree about
which files exist. That drift is what #247 objects to, and the reducer already
answers the question the map would answer.

Routing by path is not defensive dressing: the editor is destroyed and recreated
on a tab switch, so a lint finishing after the switch would otherwise land on the
document that replaced it. `mapFile` drops an action whose path names no open
file, and matches on path rather than on "the active one".

### The report is a union, discriminated by kind

```ts
type DocumentReport =
  | { kind: "gedcom"; status: WebEditorStatus; diagnostics: WebDiagnostic[] }
  | { kind: "markdown"; lines: number }
  | {
      kind: "image";
      format: string;
      width: number;
      height: number;
      bytes: number;
    };
```

One channel from every surface, one field on the file, and the status bar switches
on the same discriminant the surface already switches on. The alternative — GEDCOM
reports through the reducer, previews derived at render — was rejected because the
facts a preview states are not derivable from the path: only the preview has read
the blob, and only the browser knows the pixels.

`kind` repeats `OpenFile.kind` for the file's current report and could be read from
there instead. It is carried on the report because it is the report that the status
bar renders, and a report whose shape had to be confirmed against a second field
would be a report that can disagree with itself.

### The problems column moves inside the pane

`DocumentPane` renders the tab strip, then either the surface alone or a horizontal
`ResizablePanelGroup` of the surface and the problems column. The proportions and
the handle are the ones in place today; what changes is where the group sits.

Beneath the editor was the alternative, and it is the stronger reading of "inside
the file's frame" — full width for long messages, the IDE idiom. It was not taken:
it costs the editor its height on a short window, and the findings of a real vendor
export are read by scrolling a list, which a column serves better than a strip.

### Whether the panel is open stays a preference of the window

`problemsOpen` and `explorerOpen` remain in `EditorWorkspace`. Scoping the report
to the document does not mean scoping the reader's furniture to it: a reader who
closed the panel on one GEDCOM file did not ask for it back on the next.

### The rail's button is disabled, not removed

On a tab that is not a GEDCOM file the problems button loses its badge and its
`aria-disabled`, keeping its place in the rail. Removing it would shift the two
buttons above it as the reader switches tabs, and a control that moves under the
pointer is worse than one that says it has nothing to show.

### No ADR

Nothing here is expensive to reverse. The layers do not move, no package boundary
changes, and the whole change is one app's internal ownership. The decision that
would need an ADR — where the boundary between the shared packages and a host runs
— is untouched.

## Risks / Trade-offs

- **The reducer now holds a large array.** A vendor export reports tens of
  thousands of diagnostics, and each lint replaces the array on the file. It is the
  same array, at the same frequency, that `App` holds in `useState` today; what
  changes is which object owns it. No copy per keystroke is introduced.
- **A remounted editor re-lints.** Returning to a GEDCOM tab shows the report kept
  on the file, then the freshly computed one. Keeping the report is what stops the
  panel from emptying while the lint runs.
- **Image dimensions arrive after the bytes.** The status bar reads the size as
  soon as the blob is read and the dimensions when the `img` loads, so the two
  facts appear a frame apart rather than the bar waiting for both.
- **A test can no longer reach the panel through `App` alone.** Opening a
  non-GEDCOM file needs a granted folder, which a browser gives only to a real
  gesture. The evidence lives at the `DocumentPane`, `StatusBar` and reducer level,
  where a workspace with two tabs can simply be constructed.

## Migration Plan

One app, one commit's worth of moves, no consumer to migrate: the reducer gains the
action, `DocumentPane` is extracted from `EditorWorkspace` with the group inside it,
`App` loses two pieces of state, and the previews gain a callback. Rollback is a
revert; nothing outside `apps/web-editor` has seen a change.

## Open Questions

None. What a preview's facts should read as — `Markdown · read-only`, `JPEG ·
1 024 × 768 · 210 KB` — is settled in the spec, and changing the wording later
touches one component.
