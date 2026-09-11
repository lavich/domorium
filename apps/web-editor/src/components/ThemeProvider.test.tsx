// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

beforeEach(() => document.documentElement.classList.remove("dark"));
afterEach(cleanup);

function Shown() {
  const { resolvedTheme } = useTheme();
  return <span data-testid="theme">{resolvedTheme}</span>;
}

const shown = () => screen.getByTestId("theme").textContent;

it("reads the theme the head script applied before the first paint", () => {
  document.documentElement.classList.add("dark");

  render(
    <ThemeProvider>
      <Shown />
    </ThemeProvider>,
  );

  expect(shown()).toBe("dark");
});

// The button that changes it is the pages' own, driven by the script in the
// head; nothing tells React, so it watches the class instead.
it("follows the class when something outside React changes it", async () => {
  render(
    <ThemeProvider>
      <Shown />
    </ThemeProvider>,
  );
  expect(shown()).toBe("light");

  document.documentElement.classList.add("dark");
  await waitFor(() => expect(shown()).toBe("dark"));

  document.documentElement.classList.remove("dark");
  await waitFor(() => expect(shown()).toBe("light"));
});
