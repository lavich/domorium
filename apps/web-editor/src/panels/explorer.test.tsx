// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InApp, testApp } from "@/cordis/testing";
import { EditorWorkspace } from "@/components/EditorWorkspace";
import { createMemoryGateway } from "@/workspace/memoryGateway";

afterEach(cleanup);

const wide = () => {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
};

describe("the explorer, as a plugin", () => {
  it("reads the workspace it is given and rereads it when another is opened", async () => {
    wide();
    const app = await testApp();
    render(
      <InApp app={app}>
        <EditorWorkspace theme="light" onFollowLink={() => {}} />
      </InApp>,
    );

    await act(async () => {
      await app.ctx.gateways.open(
        createMemoryGateway({ "tree.ged": "0 HEAD\n" }, { name: "First" }),
      );
    });
    expect(await screen.findByText("tree.ged")).toBeTruthy();

    await act(async () => {
      await app.ctx.gateways.open(
        createMemoryGateway({ "other.ged": "0 HEAD\n" }, { name: "Second" }),
      );
    });
    expect(await screen.findByText("other.ged")).toBeTruthy();
    expect(screen.queryByText("tree.ged")).toBeNull();
  });

  it("rereads the workspace when something is written into it", async () => {
    wide();
    const app = await testApp();
    const gateway = createMemoryGateway({ "tree.ged": "0 HEAD\n" });
    render(
      <InApp app={app}>
        <EditorWorkspace theme="light" onFollowLink={() => {}} />
      </InApp>,
    );
    await act(async () => {
      await app.ctx.gateways.open(gateway);
    });

    await act(async () => {
      await gateway.create("copy.ged", "0 HEAD\n");
      app.ctx.emit("files/changed");
    });

    expect(await screen.findByText("copy.ged")).toBeTruthy();
  });

  // What the arrangement is for: the panel goes away with the plugin.
  it("takes its rail button with it when it is unplugged", async () => {
    wide();
    const app = await testApp();
    render(
      <InApp app={app}>
        <EditorWorkspace theme="light" onFollowLink={() => {}} />
      </InApp>,
    );
    expect(screen.getByRole("button", { name: "Files" })).toBeTruthy();

    const explorer = [...app.ctx.registry.values()].find(
      (runtime) => runtime.name === "panel-explorer",
    );
    await act(async () => {
      for (const fiber of explorer?.fibers ?? []) {
        await fiber.dispose();
      }
    });

    expect(screen.queryByRole("button", { name: "Files" })).toBeNull();
  });
});
