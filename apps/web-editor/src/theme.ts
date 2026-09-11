/**
 * One theme choice for the whole domain: the editor reads it through
 * `ThemeProvider`, and the static pages through the script below, which is the
 * only JavaScript they carry.
 */
export const THEME_KEY = "domorium-theme";

/** The order the button walks, starting from the choice a first visit has. */
export const THEME_ORDER = ["system", "light", "dark"] as const;

export type ThemeChoice = (typeof THEME_ORDER)[number];

export function nextTheme(current: string | null): ThemeChoice {
  // Anything unrecognised reads as the first choice, which is what a first
  // visit has, so the click after it lands on the second.
  const at = Math.max(0, THEME_ORDER.indexOf(current as ThemeChoice));
  return THEME_ORDER[(at + 1) % THEME_ORDER.length];
}

/**
 * Runs in `<head>`, so the class is on `<html>` before the first paint and a
 * reader who chose dark never meets a white flash. It also arms the button in
 * the page's header — the pages hide it until this has run, because without it
 * there is nothing for it to do.
 *
 * The order below has to stay the order of THEME_ORDER; the script is text and
 * cannot import it. `themeScript.test.ts` runs this against a real DOM.
 */
export const themeScript = `(function () {
  var order = ${JSON.stringify(THEME_ORDER)};
  var key = ${JSON.stringify(THEME_KEY)};
  var root = document.documentElement;
  var read = function () {
    try {
      var value = localStorage.getItem(key);
      return order.indexOf(value) === -1 ? "system" : value;
    } catch (error) {
      return "system";
    }
  };
  var systemIsDark = function () {
    try {
      return !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (error) {
      return false;
    }
  };
  var apply = function (choice) {
    root.dataset.themeChoice = choice;
    root.classList.toggle("dark", choice === "dark" || (choice === "system" && systemIsDark()));
    var next = order[(order.indexOf(choice) + 1) % order.length];
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-label", "Switch to the " + next + " theme");
    }
  };
  apply(read());
  // Again once the button exists: the head runs this before the body is parsed.
  document.addEventListener("DOMContentLoaded", function () {
    apply(read());
  });
  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest && event.target.closest("[data-theme-toggle]");
    if (!button) {
      return;
    }
    var choice = order[(order.indexOf(read()) + 1) % order.length];
    try {
      localStorage.setItem(key, choice);
    } catch (error) {
      // A browser that refuses storage still gets the theme for this page.
    }
    apply(choice);
  });
  try {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (read() === "system") {
        apply("system");
      }
    });
  } catch (error) {
    // Safari below 14 has no listener here, and the choice still applies.
  }
})();`;
