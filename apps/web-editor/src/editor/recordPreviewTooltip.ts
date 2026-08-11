import {
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import { showTooltip, type Tooltip } from "@codemirror/view";
import {
  getRecordPreviewRuns,
  type EditorLanguageService,
  type RecordPreview,
} from "@domorium/codemirror";

export const setRecordPreview = StateEffect.define<RecordPreview | null>();

export function recordPreviewTooltip(
  language: EditorLanguageService,
): Extension {
  const field = StateField.define<Tooltip | null>({
    create: () => null,
    update(tooltip, transaction) {
      for (const effect of transaction.effects) {
        if (effect.is(setRecordPreview)) {
          return effect.value === null
            ? null
            : previewTooltip(language, effect.value);
        }
      }
      return transaction.docChanged ? null : tooltip;
    },
    provide: (self) => showTooltip.from(self),
  });
  return field;
}

export function buildPreviewDom(
  state: EditorState,
  language: EditorLanguageService,
  preview: RecordPreview,
): HTMLElement {
  const dom = document.createElement("pre");
  dom.className = "gedcom-record-preview";
  for (const run of getRecordPreviewRuns(state, language, preview)) {
    const span = dom.appendChild(document.createElement("span"));
    span.textContent = run.text;
    if (run.className) {
      span.className = run.className;
    }
  }
  if (preview.truncated) {
    dom.appendChild(document.createTextNode("\n…"));
  }
  return dom;
}

function previewTooltip(
  language: EditorLanguageService,
  preview: RecordPreview,
): Tooltip {
  return {
    pos: preview.pointer.from,
    end: preview.pointer.to,
    // Below, and left to flip when it does not fit: above, it covers the
    // application's own header, which CodeMirror cannot see.
    create: (view) => ({ dom: buildPreviewDom(view.state, language, preview) }),
  };
}
