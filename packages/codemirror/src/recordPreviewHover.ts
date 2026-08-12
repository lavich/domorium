import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import {
  hoveredPointer,
  hoveredPointerField,
  setHoveredPointer,
} from "./pointerDecoration.js";
import { findRecordPreview, type RecordPreview } from "./recordPreview.js";
import type { EditorLanguageService } from "./service.js";

const DEFAULT_MAX_LINES = 24;

export interface RecordPreviewHoverOptions {
  language: EditorLanguageService;
  /** Lines of a record to reach for before reporting it cut short. */
  maxLines?: number;
  /**
   * Whether an event asks for a preview. Defaults to the platform modifier,
   * which is a convention rather than a rule: a host whose users configure the
   * gesture answers from that setting instead.
   */
  trigger?: (event: MouseEvent) => boolean;
  /** Draw the preview. The event carries the element a popover can hang from. */
  show(preview: RecordPreview, view: EditorView, event: MouseEvent): void;
  hide(view: EditorView): void;
}

export interface PreviewTransition {
  action: "show" | "hide" | "keep";
  shown: number | null;
}

export function previewTransition(
  shown: number | null,
  preview: RecordPreview | null,
): PreviewTransition {
  if (!preview) {
    return shown === null
      ? { action: "keep", shown: null }
      : { action: "hide", shown: null };
  }
  return preview.pointer.from === shown
    ? { action: "keep", shown }
    : { action: "show", shown: preview.pointer.from };
}

/** Close an open preview. Anything may say so, not only the gesture. */
export function clearRecordPreview(view: EditorView): void {
  view.dispatch({ effects: setHoveredPointer.of(null) });
}

/**
 * The gesture, not the surface: which pointer answers, and when it is let go.
 * What opens a preview and what it is drawn on are the host's to decide.
 */
export function recordPreviewHover(
  options: RecordPreviewHoverOptions,
): Extension {
  const trigger =
    options.trigger ?? ((event: MouseEvent) => event.metaKey || event.ctrlKey);

  const settle = (
    view: EditorView,
    preview: RecordPreview | null,
    event: MouseEvent | null,
  ): void => {
    const shown = hoveredPointer(view.state)?.from ?? null;
    const transition = previewTransition(shown, preview);
    if (transition.action === "keep") {
      return;
    }
    if (transition.action === "hide") {
      clearRecordPreview(view);
      return;
    }
    view.dispatch({ effects: setHoveredPointer.of(preview!.pointer) });
    options.show(preview!, view, event!);
  };

  // The field comes with the gesture: it is what the gesture marks, and a host
  // that forgot it would dispatch into a state that cannot hold the mark.
  return [
    hoveredPointerField,
    // hide answers the mark going away rather than the gesture letting go, so
    // a host that clears the preview for its own reasons is told about it.
    EditorView.updateListener.of((update) => {
      if (hoveredPointer(update.startState) && !hoveredPointer(update.state)) {
        options.hide(update.view);
      }
    }),
    EditorView.domEventHandlers({
      mousemove: (event, view) => {
        if (!trigger(event)) {
          settle(view, null, event);
          return;
        }
        const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
        settle(
          view,
          offset === null
            ? null
            : findRecordPreview(
                view.state,
                options.language,
                offset,
                options.maxLines ?? DEFAULT_MAX_LINES,
              ),
          event,
        );
      },
      mouseleave: (_event, view) => {
        settle(view, null, null);
      },
      // Only while the editor has focus. A host that wants more listens where
      // it can and calls clearRecordPreview.
      keyup: (event, view) => {
        if (!event.metaKey && !event.ctrlKey) {
          settle(view, null, null);
        }
      },
    }),
  ];
}
