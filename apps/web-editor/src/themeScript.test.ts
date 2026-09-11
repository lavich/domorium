// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_KEY, themeScript } from "./theme";

/**
 * The script arms one listener on the document, which a page loads once and
 * these tests load per case — so each case takes its listener back off, or the
 * next click would cycle the theme as many times as the script has run.
 */
const armed: [string, EventListener][] = [];

const run = () => {
  const attach = document.addEventListener.bind(document);
  const spy = vi
    .spyOn(document, "addEventListener")
    .mockImplementation((type, listener, options) => {
      armed.push([type, listener as EventListener]);
      attach(type, listener as EventListener, options);
    });
  new Function(themeScript)();
  spy.mockRestore();
};

const stubSystemDark = (matches: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );

const toggle = () =>
  document.querySelector<HTMLElement>("[data-theme-toggle]") as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  delete document.documentElement.dataset.themeChoice;
  document.body.innerHTML = '<button type="button" data-theme-toggle></button>';
  stubSystemDark(false);
});

afterEach(() => {
  for (const [type, listener] of armed.splice(0)) {
    document.removeEventListener(type, listener);
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the theme script on a static page", () => {
  it("applies a stored choice", () => {
    localStorage.setItem(THEME_KEY, "dark");

    run();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.themeChoice).toBe("dark");
  });

  it("follows the system where nothing was chosen", () => {
    stubSystemDark(true);

    run();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.themeChoice).toBe("system");
  });

  it("takes the next choice on a click and remembers it", () => {
    localStorage.setItem(THEME_KEY, "system");
    run();

    toggle().click();

    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.dataset.themeChoice).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    toggle().click();

    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    toggle().click();

    expect(localStorage.getItem(THEME_KEY)).toBe("system");
  });

  it("says which choice the button will make next", () => {
    localStorage.setItem(THEME_KEY, "light");

    run();

    expect(toggle().getAttribute("aria-label")).toMatch(/dark/i);
  });

  // The script runs in the head, where the button does not exist yet.
  it("labels the button once the page has been parsed", () => {
    document.body.innerHTML = "";
    localStorage.setItem(THEME_KEY, "light");
    run();

    document.body.innerHTML =
      '<button type="button" data-theme-toggle></button>';
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(toggle().getAttribute("aria-label")).toMatch(/dark/i);
  });

  it("leaves a click elsewhere alone", () => {
    localStorage.setItem(THEME_KEY, "light");
    run();

    document.body.click();

    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("stays silent where the browser refuses storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(() => run()).not.toThrow();
    expect(() => toggle().click()).not.toThrow();
  });
});
