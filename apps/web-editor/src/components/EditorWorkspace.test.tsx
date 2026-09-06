// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorWorkspace } from "./EditorWorkspace";
import { InApp, testApp } from "@/cordis/testing";
import type { DocumentReport } from "@/editor/types";
import { fileKindOf, type WorkspaceAction } from "@/workspace/workspace";

vi.mock("@/editor/GedcomEditor", () => ({
  GedcomEditor: () => <div aria-label="GEDCOM editor" />,
}));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const checked: DocumentReport = {
  kind: "gedcom",
  status: { line: 0, character: 0, resolution: undefined },
  diagnostics: [
    {
      severity: "error",
      code: "VAL001",
      message: "unknown tag",
      from: 0,
      to: 4,
      line: 0,
      character: 0,
    },
  ],
};

const open = (path: string) =>
  ({
    type: "file-opened",
    path,
    kind: fileKindOf(path),
    text: fileKindOf(path) === "image" ? null : "0 HEAD\n",
  }) as const;

const workspaceWith = async (...actions: WorkspaceAction[]) => {
  const app = await testApp(
    { type: "workspace-opened", name: "Webb Family", writable: true },
    ...actions,
  );
  return render(
    <InApp app={app}>
      <EditorWorkspace theme="light" onFollowLink={vi.fn()} />
    </InApp>,
  );
};

const bar = () => screen.getByRole("contentinfo").textContent ?? "";

describe("what the window says about the tab in front", () => {
  it("counts a GEDCOM document's findings and states its version", async () => {
    await workspaceWith(open("tree.ged"), {
      type: "reported",
      path: "tree.ged",
      report: checked,
    });

    expect(screen.getByRole("button", { name: "1 problem" })).toBeTruthy();
    expect(bar()).toContain("No version");
    expect(bar()).toContain("1 issue");
  });

  // The bar read the version and the count of the file the reader had left.
  it("counts nothing and states nothing of a file it does not check", async () => {
    await workspaceWith(
      open("tree.ged"),
      { type: "reported", path: "tree.ged", report: checked },
      open("media/portrait.jpg"),
      {
        type: "reported",
        path: "media/portrait.jpg",
        report: {
          kind: "image",
          format: "JPEG",
          bytes: 2048,
          width: 1024,
          height: 768,
        },
      },
    );

    const problems = screen.getByRole("button", {
      name: "Problems, for a GEDCOM file",
    }) as HTMLButtonElement;
    expect(problems.disabled).toBe(true);
    expect(bar()).not.toContain("issue");
    expect(bar()).toContain("1024 × 768");
  });

  it("says nothing of a document until it has been checked", async () => {
    await workspaceWith(open("tree.ged"));

    expect(screen.getByRole("button", { name: "0 problems" })).toBeTruthy();
    expect(bar()).toBe("read locally — nothing is uploaded");
  });
});
