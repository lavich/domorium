import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { hoveredPointerField, setHoveredPointer } from "./pointerDecoration.js";
import { findRecordPreview, type RecordPreview } from "./recordPreview.js";
import type { EditorLanguageService } from "./service.js";

const DEFAULT_MAX_LINES = 24;

export interface RecordPreviewHoverOptions {
  language: EditorLanguageService;
  /** Lines of a record to reach for before reporting it cut short. */
  maxLines?: number;
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

/**
 * The gesture, not the surface: which pointer answers, when it is marked and
 * when it is let go. What the preview is drawn on is the host's to decide.
 */
export function recordPreviewHover(
  options: RecordPreviewHoverOptions,
): Extension {
  let shown: number | null = null;

  const settle = (
    view: EditorView,
    preview: RecordPreview | null,
    event: MouseEvent | null,
  ): void => {
    const transition = previewTransition(shown, preview);
    shown = transition.shown;
    if (transition.action === "keep") {
      return;
    }
    if (transition.action === "hide") {
      view.dispatch({ effects: setHoveredPointer.of(null) });
      options.hide(view);
      return;
    }
    view.dispatch({ effects: setHoveredPointer.of(preview!.pointer) });
    options.show(preview!, view, event!);
  };

  // The field comes with the gesture: it is what the gesture marks, and a host
  // that forgot it would dispatch into a state that cannot hold the mark.
  return [
    hoveredPointerField,
    EditorView.domEventHandlers({
      mousemove: (event, view) => {
        if (!event.metaKey && !event.ctrlKey) {
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
      keyup: (event, view) => {
        if (!event.metaKey && !event.ctrlKey) {
          settle(view, null, null);
        }
      },
    }),
  ];
}
