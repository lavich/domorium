import { PATHS } from "./paths";

/**
 * The landing page draws the editor and links to it; this exchanges the drawing
 * for the editor itself, in place, when a reader asks for it. Until then the
 * page carries none of the application, and with no script at all the controls
 * are the links they already are.
 *
 * The page runs this from its head, where the widget does not exist yet, so the
 * click is caught on the document rather than on the controls.
 * `widgetScript.test.ts` runs it against a real DOM in that order.
 */
export const widgetScript = `(function () {
  var editorPath = ${JSON.stringify(PATHS.editor)};
  var embeddedPath = editorPath + "?embed=1";
  var closest = function (node, selector) {
    return node && node.closest ? node.closest(selector) : null;
  };
  document.addEventListener("click", function (event) {
    var run = closest(event.target, "[data-editor-run]");
    var expand = closest(event.target, "[data-editor-expand]");
    var widget = closest(event.target, "[data-editor-widget]");
    if (!widget || (!run && !expand)) {
      return;
    }
    var frame = widget.querySelector("[data-editor-frame]");
    if (!frame) {
      return;
    }
    if (expand) {
      if (!frame.requestFullscreen) {
        return;
      }
      event.preventDefault();
      var away = expand.getAttribute("href") || editorPath;
      frame.requestFullscreen().catch(function () {
        window.location.assign(away);
      });
      return;
    }
    if (frame.querySelector("iframe")) {
      return;
    }
    event.preventDefault();
    var editor = document.createElement("iframe");
    editor.src = embeddedPath;
    editor.title = "The Domorium GEDCOM editor";
    editor.setAttribute("allow", "fullscreen");
    editor.style.cssText = "display:block;width:100%;height:100%;border:0";
    frame.appendChild(editor);
    var preview = widget.querySelector("[data-editor-preview]");
    if (preview) {
      preview.hidden = true;
    }
    run.hidden = true;
    var toExpand = widget.querySelector("[data-editor-expand]");
    if (toExpand) {
      toExpand.hidden = false;
    }
  });
})();`;
