import { describe, expect, it } from "vitest";

import {
  countMentioning,
  decodeText,
  scanAfterRenames,
} from "./closedDocuments";

const utf16le = (text: string) =>
  new Uint8Array([
    0xff,
    0xfe,
    ...[...text].flatMap((c) => [c.charCodeAt(0), 0]),
  ]);

describe("closed GEDCOM files that may still name a renamed file", () => {
  it("decodes UTF-8, and UTF-16 by its byte-order mark", () => {
    expect(decodeText(new TextEncoder().encode("1 FILE é.jpg"))).toBe(
      "1 FILE é.jpg",
    );
    expect(decodeText(utf16le("1 FILE a.jpg"))).toBe("1 FILE a.jpg");
    expect(decodeText(new Uint8Array([0xfe, 0xff, 0, 0x61]))).toBe("a");
  });

  it("names each closed file once, however many renamed files it names", async () => {
    const files = [
      ["one.ged", new TextEncoder().encode("1 FILE a.jpg\n1 FILE b.jpg")],
      ["two.ged", utf16le("1 FILE b%2Ejpg")],
      ["three.ged", new TextEncoder().encode("1 FILE c.jpg")],
    ] as const;

    await expect(
      countMentioning(files, ["media/a.jpg", "media/b.jpg"], () => false),
    ).resolves.toEqual(["one.ged", "two.ged"]);
  });

  it("skips a file it cannot read", async () => {
    await expect(
      countMentioning(
        [
          ["gone.ged", Promise.reject(new Error("gone"))],
          ["here.ged", new TextEncoder().encode("1 FILE a.jpg")],
        ],
        ["a.jpg"],
        () => false,
      ),
    ).resolves.toEqual(["here.ged"]);
  });

  it("stops counting once cancelled", async () => {
    await expect(
      countMentioning(
        [["a.ged", new TextEncoder().encode("1 FILE a.jpg")]],
        ["a.jpg"],
        () => true,
      ),
    ).resolves.toBeUndefined();
  });

  it("keeps the names of a rename whose scan a newer one interrupted", async () => {
    const asked: string[][] = [];
    const warned: string[][] = [];
    let release = () => {};
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const scan = scanAfterRenames(
      async (paths, cancelled) => {
        asked.push(paths);
        if (asked.length === 1) {
          await first;
        }
        return cancelled() ? undefined : paths;
      },
      (paths, found) => warned.push([...paths, ...found]),
    );

    const a = scan(["a.jpg"]);
    const b = scan(["b.jpg"]);
    release();
    await Promise.all([a, b]);

    expect(asked.at(-1)).toEqual(["a.jpg", "b.jpg"]);
    expect(warned).toEqual([["a.jpg", "b.jpg", "a.jpg", "b.jpg"]]);
  });

  it("does not carry the names of a failed scan into the next", async () => {
    const asked: string[][] = [];
    const scan = scanAfterRenames(
      async (paths) => {
        asked.push(paths);
        if (asked.length === 1) {
          throw new Error("unreadable");
        }
        return [];
      },
      () => {},
    );

    await scan(["a.jpg"]);
    await scan(["z.jpg"]);

    expect(asked).toEqual([["a.jpg"], ["z.jpg"]]);
  });

  it("warns about nothing when nothing mentions the files", async () => {
    const warned: string[][] = [];
    await scanAfterRenames(
      async () => [],
      (_paths, found) => warned.push(found),
    )(["a.jpg"]);

    expect(warned).toEqual([]);
  });
});
