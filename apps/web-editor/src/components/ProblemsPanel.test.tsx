// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProblemsPanel } from "./ProblemsPanel";
import type { WebDiagnostic } from "@/editor/types";

afterEach(cleanup);

const diagnostic = (
  line: number,
  severity: WebDiagnostic["severity"],
  code: string,
  message: string,
): WebDiagnostic => ({
  severity,
  code,
  message,
  from: line * 10,
  to: line * 10 + 4,
  line,
  character: 2,
});

const many = (
  count: number,
  severity: WebDiagnostic["severity"],
  code: string,
  message: string,
  from = 0,
) =>
  Array.from({ length: count }, (_, index) =>
    diagnostic(from + index, severity, code, message),
  );

describe("ProblemsPanel", () => {
  it("says there is nothing to report when there is nothing", () => {
    render(<ProblemsPanel diagnostics={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nothing to report/)).toBeTruthy();
  });

  it("shows a lone diagnostic as one row, with no disclosure", () => {
    render(
      <ProblemsPanel
        diagnostics={[diagnostic(6, "error", "VAL002", "Missing required tag")]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Missing required tag")).toBeTruthy();
    expect(screen.getByText(/Line 7, Column 3/)).toBeTruthy();
    expect(screen.queryByRole("button", { expanded: false })).toBeNull();
  });

  it("gathers repeats of one statement into a group that counts them", () => {
    render(
      <ProblemsPanel
        diagnostics={many(4542, "warning", "VAL001", "Unknown tag RIN", 60)}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Unknown tag RIN")).toHaveLength(1);
    expect(screen.getByText(/4542 places/)).toBeTruthy();
    expect(screen.getByText(/first at line 61/)).toBeTruthy();
  });

  it("counts the findings and the kinds of them", () => {
    render(
      <ProblemsPanel
        diagnostics={[
          ...many(3, "warning", "VAL001", "Unknown tag RIN"),
          ...many(2, "error", "VAL004", "Value for DATE", 10),
        ]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText(/2 kinds/)).toBeTruthy();
  });

  it("puts errors above warnings, and the larger group first within a severity", () => {
    render(
      <ProblemsPanel
        diagnostics={[
          ...many(2, "warning", "VAL001", "a warning"),
          ...many(1, "error", "VAL004", "a small error", 10),
          ...many(5, "error", "VAL002", "a large error", 20),
        ]}
        onSelect={vi.fn()}
      />,
    );
    const rendered = screen
      .getAllByRole("button")
      .map((button) => button.textContent ?? "")
      .filter((text) => /error|warning/.test(text));
    expect(rendered[0]).toContain("a large error");
    expect(rendered[1]).toContain("a small error");
    expect(rendered.at(-1)).toContain("a warning");
  });

  it("opens a small error group and leaves a warning group shut", () => {
    render(
      <ProblemsPanel
        diagnostics={[
          ...many(3, "error", "VAL004", "an error"),
          ...many(3, "warning", "VAL001", "a warning", 10),
        ]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Line [123],/)).toHaveLength(3);
    expect(screen.queryByText(/Line 11,/)).toBeNull();
  });

  // The panel used to render one row per finding: 12 442 of them on a real
  // export, 50 302 DOM nodes, and the page stopped answering.
  it("keeps a large group shut even when it is errors", () => {
    render(
      <ProblemsPanel
        diagnostics={many(1780, "error", "VAL004", "Value for DATE")}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Line 1,/)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("shows the first fifty places of an opened group, then offers the rest", async () => {
    const user = userEvent.setup();
    render(
      <ProblemsPanel
        diagnostics={many(300, "warning", "VAL001", "Unknown tag RIN")}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getAllByText(/^Line \d+, Column 3$/)).toHaveLength(50);

    await user.click(screen.getByRole("button", { name: /Show 200 more/ }));
    expect(screen.getAllByText(/^Line \d+, Column 3$/)).toHaveLength(250);
  });

  it("selects the place a reader clicks, not the group", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const diagnostics = many(3, "warning", "VAL001", "Unknown tag RIN", 40);
    render(<ProblemsPanel diagnostics={diagnostics} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(screen.getByText("Line 42, Column 3"));
    expect(onSelect).toHaveBeenCalledWith(diagnostics[1]);
  });
});
