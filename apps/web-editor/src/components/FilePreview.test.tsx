// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ImagePreview, MarkdownPreview } from "./FilePreview";

afterEach(cleanup);

describe("a note in a preview", () => {
  // The note comes out of someone else's export: it is content, not markup to run.
  it("shows what it carries without running any of it", () => {
    const note =
      '# Note\n<script>window.pwned = true</script>\n<img src=x onerror="window.pwned = true">\n';
    render(<MarkdownPreview name="notes.md" text={note} />);

    const preview = screen.getByLabelText("Preview of notes.md");
    expect(preview.querySelector("script")).toBeNull();
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.textContent).toContain(
      "<script>window.pwned = true</script>",
    );
    expect((window as unknown as { pwned?: boolean }).pwned).toBeUndefined();
  });

  it("says it cannot be edited", () => {
    render(<MarkdownPreview name="notes.md" text="# Note" />);

    expect(screen.getByText("read-only")).toBeTruthy();
  });
});

describe("an image in a preview", () => {
  const created: string[] = [];
  const revoked: string[] = [];

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: (blob: Blob) => {
        const url = `blob:${created.length}-${blob.size}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => revoked.push(url),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows the image it was asked to load", async () => {
    const load = vi.fn(() => Promise.resolve(new Blob([new Uint8Array(2048)])));
    render(
      <ImagePreview
        name="portrait.jpg"
        path="media/portrait.jpg"
        load={load}
      />,
    );

    await waitFor(() =>
      expect(screen.getByAltText("portrait.jpg")).toBeTruthy(),
    );
    expect(load).toHaveBeenCalledWith("media/portrait.jpg");
    expect(screen.getByText("2 KB")).toBeTruthy();
  });

  // A folder of photographs would otherwise be held for the rest of the session.
  it("releases the URL it held when the preview is closed", async () => {
    const load = vi.fn(() => Promise.resolve(new Blob([new Uint8Array(8)])));
    const view = render(
      <ImagePreview
        name="portrait.jpg"
        path="media/portrait.jpg"
        load={load}
      />,
    );

    await waitFor(() => expect(created).toHaveLength(1));
    view.unmount();

    expect(revoked).toEqual(created);
  });

  it("releases the previous URL when another image takes its place", async () => {
    const load = vi.fn((path: string) =>
      Promise.resolve(new Blob([new Uint8Array(path.length)])),
    );
    const view = render(
      <ImagePreview name="one.jpg" path="media/one.jpg" load={load} />,
    );
    await waitFor(() => expect(created).toHaveLength(1));

    view.rerender(
      <ImagePreview name="two.jpg" path="media/two.jpg" load={load} />,
    );
    await waitFor(() => expect(created).toHaveLength(2));

    expect(revoked).toEqual([created[0]]);
  });

  it("says so when the file cannot be read", async () => {
    const load = vi.fn(() =>
      Promise.reject(new Error("portrait.jpg is not in this folder")),
    );
    render(
      <ImagePreview
        name="portrait.jpg"
        path="media/portrait.jpg"
        load={load}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(/could not be shown/)).toBeTruthy(),
    );
    expect(screen.getByText("portrait.jpg is not in this folder")).toBeTruthy();
  });
});
