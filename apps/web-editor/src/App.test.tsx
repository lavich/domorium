// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { LINKS } from "./constants/links";
import type { GedcomEditorHandle } from "./editor/types";

vi.mock("./editor/GedcomEditor", () => ({
  GedcomEditor: forwardRef<
    GedcomEditorHandle,
    {
      initialText: string;
      onChange(text: string): void;
      onDiagnosticsChange(diagnostics: []): void;
    }
  >(function MockGedcomEditor(
    { initialText, onChange, onDiagnosticsChange },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      destroy: vi.fn(),
      focusDiagnostic: vi.fn(),
      setTheme: vi.fn(),
    }));
    return (
      <textarea
        aria-label="GEDCOM editor"
        defaultValue={initialText}
        onChange={(event) => {
          onChange(event.target.value);
          onDiagnosticsChange([]);
        }}
      />
    );
  }),
}));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("0 HEAD\n0 TRLR\n"),
    }),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders direct product links and a local-first editor", async () => {
    render(<App />);

    expect(
      (await screen.findByRole("link", { name: /VS Code/i })).getAttribute(
        "href",
      ),
    ).toBe(LINKS.vscode);
    expect(
      screen.getByRole("link", { name: /Obsidian/i }).getAttribute("href"),
    ).toBe(LINKS.obsidian);
    expect(
      screen.getByRole("link", { name: /JetBrains/i }).getAttribute("href"),
    ).toBe(LINKS.jetbrains);
    expect(
      screen.getByRole("link", { name: /GitHub/i }).getAttribute("href"),
    ).toBe(LINKS.github);
    expect(screen.getByLabelText("GEDCOM editor")).not.toBeNull();
    expect(
      screen.getByRole("heading", {
        name: /open, validate and edit GEDCOM locally/i,
      }),
    ).not.toBeNull();
  });

  it("loads a GEDCOM file and protects modified work before reset", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");

    const input = screen.getByLabelText("Open GEDCOM file");
    await user.upload(input, new File(["0 HEAD\n0 TRLR"], "family.ged"));
    expect(await screen.findByText("family.ged")).not.toBeNull();

    await user.clear(screen.getByLabelText("GEDCOM editor"));
    await user.type(screen.getByLabelText("GEDCOM editor"), "0 HEAD");
    expect(screen.getByText("Modified")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(
      screen.getByRole("alertdialog", { name: /discard your changes/i }),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("family.ged")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    await waitFor(() => expect(screen.getByText("Demo")).not.toBeNull());
  });
});
