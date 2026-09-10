// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { widgetScript } from "./widget";

/**
 * The script arms listeners on the elements it finds, which a page loads once
 * and these tests load per case — so each case runs against a fresh widget and
 * gives its listeners back.
 */
const armed: [EventTarget, string, EventListener][] = [];

const markup = `
  <figure data-editor-widget>
    <div data-editor-frame style="height: 460px">
      <div data-editor-preview>the drawn editor</div>
    </div>
    <a href="/editor/" data-editor-run>Run the editor here</a>
    <a href="/editor/" data-editor-expand hidden>Full screen</a>
  </figure>
`;

const run = () => {
  const targets = [document, ...document.querySelectorAll("*")];
  const originals = targets.map((target) => {
    const attach = target.addEventListener.bind(target);
    vi.spyOn(target, "addEventListener").mockImplementation(
      (type, listener, options) => {
        armed.push([target, type, listener as EventListener]);
        attach(type, listener as EventListener, options);
      },
    );
    return target;
  });
  new Function(widgetScript)();
  for (const target of originals) {
    vi.mocked(target.addEventListener).mockRestore();
  }
};

const find = <T extends HTMLElement>(selector: string) =>
  document.querySelector<T>(selector) as T;

const clickOn = (element: HTMLElement) => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
};

// The page runs this from its head, so the widget does not exist yet: every
// case arms the script first and only then hands it a parsed body.
beforeEach(() => {
  document.body.innerHTML = "";
  run();
  document.body.innerHTML = markup;
});

afterEach(() => {
  for (const [target, type, listener] of armed.splice(0)) {
    target.removeEventListener(type, listener);
  }
  vi.restoreAllMocks();
});

describe("the editor widget's script", () => {
  it("puts the editor in the frame on the first click", () => {
    const event = clickOn(find("[data-editor-run]"));

    const frame = find("[data-editor-frame] iframe") as HTMLIFrameElement;
    expect(event.defaultPrevented).toBe(true);
    expect(frame).not.toBeNull();
    // Embedded, so the editor leaves the site's chrome to the page around it.
    expect(frame.getAttribute("src")).toBe("/editor/?embed=1");
    expect(frame.getAttribute("title")).toBeTruthy();
  });

  it("hides what it replaces and offers the whole window instead", () => {
    clickOn(find("[data-editor-run]"));

    expect(find("[data-editor-preview]").hidden).toBe(true);
    expect(find("[data-editor-run]").hidden).toBe(true);
    expect(find("[data-editor-expand]").hidden).toBe(false);
  });

  it("loads the editor once, however often it is asked", () => {
    clickOn(find("[data-editor-run]"));
    clickOn(find("[data-editor-run]"));

    expect(
      document.querySelectorAll("[data-editor-frame] iframe"),
    ).toHaveLength(1);
  });

  it("takes the frame full screen where the browser can", () => {
    clickOn(find("[data-editor-run]"));
    const frame = find("[data-editor-frame]");
    const request = vi.fn(() => Promise.resolve());
    frame.requestFullscreen = request;

    const event = clickOn(find("[data-editor-expand]"));

    expect(event.defaultPrevented).toBe(true);
    expect(request).toHaveBeenCalledOnce();
  });

  it("lets the link do the work where it cannot", () => {
    clickOn(find("[data-editor-run]"));
    const frame: { requestFullscreen?: () => Promise<void> } = find(
      "[data-editor-frame]",
    );
    delete frame.requestFullscreen;

    const event = clickOn(find("[data-editor-expand]"));

    expect(event.defaultPrevented).toBe(false);
  });

  it("leaves a page without the widget alone", () => {
    document.body.innerHTML =
      '<p>no widget here</p><a href="/editor/">Editor</a>';

    const event = clickOn(find("a"));

    expect(event.defaultPrevented).toBe(false);
  });
});
