// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

it("restores and applies the saved dark theme", () => {
  localStorage.setItem("domorium-theme", "dark");
  vi.stubGlobal("matchMedia", vi.fn());

  render(
    <ThemeProvider>
      <span>child</span>
    </ThemeProvider>,
  );

  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("switches to light and persists the choice", () => {
  localStorage.setItem("domorium-theme", "dark");
  vi.stubGlobal("matchMedia", vi.fn());

  function SwitchTheme() {
    const { setTheme } = useTheme();
    useEffect(() => setTheme("light"), [setTheme]);
    return null;
  }

  act(() => {
    render(
      <ThemeProvider>
        <SwitchTheme />
      </ThemeProvider>,
    );
  });

  expect(document.documentElement.classList.contains("dark")).toBe(false);
  expect(localStorage.getItem("domorium-theme")).toBe("light");
});
