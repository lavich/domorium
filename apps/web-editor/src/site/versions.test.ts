// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderToStaticMarkup } from "react-dom/server";

import { PATHS, pageAt } from "./routes";
import { VERSION_SOURCES, versionsScript } from "./versions";

const landing = renderToStaticMarkup(pageAt(PATHS.home)?.body);
const vscodePage = renderToStaticMarkup(pageAt(PATHS.vscode)?.body);

const answers: Record<string, string> = {
  [VERSION_SOURCES.vscode.url]: "vscode-v1.7.2",
  [VERSION_SOURCES.obsidian.url]: "v1.12.0",
  [VERSION_SOURCES.jetbrains.url]: "v1.7.1",
  [VERSION_SOURCES.codemirror.url]: "v2.1.0",
};

const answer = (value: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve({ value }) });

let fetchMock = vi.fn((url: string) => answer(answers[url]));

const slots = (product: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-version="${product}"]`),
];

const shown = (product: string) =>
  slots(product).map((slot) => (slot.hidden ? null : slot.textContent));

const armed: [string, EventListener][] = [];

const load = (body = landing) => {
  document.body.innerHTML = "";
  Object.defineProperty(document, "readyState", {
    value: "loading",
    configurable: true,
  });
  const attach = document.addEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation(
    (type, listener, options) => {
      armed.push([type, listener as EventListener]);
      attach(type, listener as EventListener, options);
    },
  );
  new Function(versionsScript)();
  vi.mocked(document.addEventListener).mockRestore();
  document.body.innerHTML = body;
  Object.defineProperty(document, "readyState", {
    value: "interactive",
    configurable: true,
  });
  document.dispatchEvent(new Event("DOMContentLoaded"));
};

beforeEach(() => {
  sessionStorage.clear();
  fetchMock = vi.fn((url: string) => answer(answers[url]));
  vi.stubGlobal("fetch", fetchMock);
});

const unloadPreviousPage = () => {
  for (const [type, listener] of armed.splice(0)) {
    document.removeEventListener(type, listener);
  }
};

afterEach(() => {
  unloadPreviousPage();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the versions script", () => {
  it("fills every slot of a product once the body is parsed", async () => {
    load();

    await vi.waitFor(() => {
      expect(shown("vscode")).toEqual(["v1.7.2"]);
      expect(shown("obsidian")).toEqual(["v1.12.0"]);
      expect(shown("jetbrains")).toEqual(["v1.7.1"]);
      expect(shown("codemirror")).toEqual(["v2.1.0"]);
    });
  });

  it("reads the version as a word of its own", async () => {
    load();
    await vi.waitFor(() => expect(shown("codemirror")).toEqual(["v2.1.0"]));

    const npm = slots("codemirror")[0]?.closest("a");
    expect(npm?.textContent?.replace(/\s+/g, " ").trim()).toBe("On npm v2.1.0");
    expect(
      slots("vscode")[0]?.parentElement?.textContent?.replace(/\s+/g, " "),
    ).toBe("released v1.7.2");
  });

  it("skips a slot it has no source for and fills the rest", async () => {
    load(
      `<span data-version="other" hidden></span><span data-version="vscode" hidden></span>`,
    );

    await vi.waitFor(() => expect(shown("vscode")).toEqual(["v1.7.2"]));
    expect(shown("other")).toEqual([null]);
  });

  it("asks only the sources the page has a slot for, without a referrer", async () => {
    load(vscodePage);
    await vi.waitFor(() => expect(shown("vscode")).toEqual(["v1.7.2"]));
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      VERSION_SOURCES.vscode.url,
    ]);
    fetchMock.mockClear();
    sessionStorage.clear();
    unloadPreviousPage();
    load();
    await vi.waitFor(() => expect(shown("obsidian")).toEqual(["v1.12.0"]));

    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual(
      Object.values(VERSION_SOURCES)
        .map(({ url }) => url)
        .sort(),
    );
    fetchMock.mockClear();
    unloadPreviousPage();
    load(`<span data-version="jetbrains" hidden></span>`);
    await vi.waitFor(() => expect(shown("jetbrains")).toEqual(["v1.7.1"]));
    expect(fetchMock).not.toHaveBeenCalled();
    for (const [, init] of fetchMock.mock.calls as unknown as [
      string,
      RequestInit,
    ][]) {
      expect(init.referrerPolicy).toBe("no-referrer");
      expect(init.credentials).toBe("omit");
    }
  });

  it("asks the four places the design names", () => {
    expect(Object.values(VERSION_SOURCES).map(({ url }) => url)).toEqual([
      "https://img.shields.io/github/v/tag/lavich/domorium.json?filter=vscode-v*&sort=semver",
      "https://img.shields.io/github/v/release/lavich/domorium-obsidian.json",
      "https://img.shields.io/jetbrains/plugin/v/33323.json",
      "https://img.shields.io/npm/v/@domorium/codemirror.json",
    ]);
  });

  it.each([
    ["an error status", () => answer("v2.1.0", false)],
    ["a failed request", () => Promise.reject(new Error("offline"))],
    ["a retired badge", () => answer("retired badge")],
    ["markup", () => answer("v<img src=x onerror=alert(1)>")],
    ["a value with another prefix", () => answer("x2.1.0")],
    ["no value", () => answer(undefined)],
  ])("leaves a slot hidden on %s", async (_case, reply) => {
    fetchMock.mockImplementation((url: string) =>
      url === VERSION_SOURCES.codemirror.url ? reply() : answer(answers[url]),
    );
    load();

    await vi.waitFor(() => expect(shown("jetbrains")).toEqual(["v1.7.1"]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(shown("codemirror")).toEqual([null]);
    expect(slots("codemirror")[0]?.textContent).toBe("");
  });

  it("gives up on a source that does not answer within five seconds", async () => {
    vi.useFakeTimers();
    let aborted = false;
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        }),
    );
    load();

    await vi.advanceTimersByTimeAsync(4999);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(aborted).toBe(true);
    expect(shown("vscode")).toEqual([null]);
  });

  it("ignores an answer that arrives late from a fetch that cannot be cancelled", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (url: string) =>
        new Promise((resolve) => {
          setTimeout(() => resolve(answer(answers[url])), 6000);
        }),
    );
    load(`<span data-version="vscode" hidden></span>`);

    await vi.advanceTimersByTimeAsync(6000);

    expect(shown("vscode")).toEqual([null]);
  });

  it("does not trust a kept value that is not a version", async () => {
    sessionStorage.setItem("domorium-version:vscode", "retired badge");
    load(`<span data-version="vscode" hidden></span>`);

    await vi.waitFor(() => expect(shown("vscode")).toEqual(["v1.7.2"]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a version kept earlier in the tab without asking again", async () => {
    sessionStorage.setItem("domorium-version:vscode", "1.7.2");
    load(`<span data-version="vscode" hidden></span>`);

    await vi.waitFor(() => expect(shown("vscode")).toEqual(["v1.7.2"]));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks again after a failure rather than keeping it", async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.reject(new Error("offline")),
    );
    load(`<span data-version="vscode" hidden></span>`);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(shown("vscode")).toEqual([null]);

    unloadPreviousPage();
    load(`<span data-version="vscode" hidden></span>`);

    await vi.waitFor(() => expect(shown("vscode")).toEqual(["v1.7.2"]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still shows versions where session storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    load(`<span data-version="vscode" hidden></span>`);

    await vi.waitFor(() => expect(shown("vscode")).toEqual(["v1.7.2"]));
  });
});
