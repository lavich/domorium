import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The corpus copy a CI run keeps between jobs. What matters here is that the
// cache cannot change what the check concludes: bytes that go through it come
// back reading exactly as fetched bytes do, an entry it cannot serve is a miss
// rather than a failure, and a name that is not a plain file name never
// addresses a path.
import {
  pathOf,
  read,
  refreshRequested,
  write,
  // @ts-expect-error — a .mjs script module, deliberately outside the
  // typechecked source tree.
} from "./conformance-cache.mjs";
import {
  contentOf,
  // @ts-expect-error — a .mjs script module, deliberately outside the
  // typechecked source tree.
} from "./conformance-record.mjs";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "conformance-cache-"));
});

afterEach(() => {
  rmSync(directory, { force: true, recursive: true });
});

describe("refreshRequested", () => {
  it("is off for the string a workflow renders a false boolean into", () => {
    expect(refreshRequested("false")).toBe(false);
  });

  it("is off when unset, empty or zero", () => {
    expect(refreshRequested(undefined)).toBe(false);
    expect(refreshRequested("")).toBe(false);
    expect(refreshRequested("0")).toBe(false);
  });

  it("is on for true and for 1", () => {
    expect(refreshRequested("true")).toBe(true);
    expect(refreshRequested("1")).toBe(true);
  });
});

describe("pathOf", () => {
  it("keeps the corpora apart, so a shared name is two entries", () => {
    expect(pathOf("/cache", "official", "age.ged")).not.toBe(
      pathOf("/cache", "vendor", "age.ged"),
    );
  });

  it("puts the entry inside the directory it was given", () => {
    expect(pathOf("/cache", "official", "age.ged")).toBe(
      join("/cache", "official", "age.ged"),
    );
  });

  it("refuses a name that reaches outside that directory", () => {
    expect(pathOf("/cache", "official", "../../etc/passwd")).toBeUndefined();
    expect(pathOf("/cache", "official", "..")).toBeUndefined();
    expect(pathOf("/cache", "official", ".")).toBeUndefined();
    expect(pathOf("/cache", "official", "nested/age.ged")).toBeUndefined();
    expect(pathOf("/cache", "official", "")).toBeUndefined();
  });
});

describe("read", () => {
  it("is a miss rather than a failure when nothing is held", () => {
    expect(read(join(directory, "official", "absent.ged"))).toBeUndefined();
  });

  it("is a miss rather than a failure when the path is a directory", () => {
    expect(read(directory)).toBeUndefined();
  });
});

describe("write", () => {
  it("creates the corpus directory under a cache that is still empty", () => {
    const path = pathOf(directory, "vendor", "export.ged");
    write(path, new Uint8Array([0x30, 0x20, 0x48, 0x45, 0x41, 0x44]));
    expect(read(path)).toEqual(
      new Uint8Array([0x30, 0x20, 0x48, 0x45, 0x41, 0x44]),
    );
  });
});

describe("a file that went through the cache", () => {
  // The whole safety of caching rests on this: the recorded SHA-256 is what
  // makes a wrong file visible, so a copy has to read as the fetch it stood in
  // for — byte for byte, BOM included.
  it("reads exactly as the bytes that were fetched", () => {
    const fetched = new Uint8Array([
      0xef, 0xbb, 0xbf, 0x30, 0x20, 0x48, 0x45, 0x41, 0x44, 0x0a,
    ]);
    const path = pathOf(directory, "official", "bom.ged");
    write(path, fetched);
    expect(contentOf(read(path))).toEqual(contentOf(fetched));
  });

  it("hashes what it holds, so altered bytes cannot pass as the record", () => {
    const original = new Uint8Array([0x30, 0x20, 0x48, 0x45, 0x41, 0x44]);
    const path = pathOf(directory, "official", "age.ged");
    write(path, original);
    writeFileSync(path, "0 HEADER");
    expect(contentOf(read(path)).sha256).not.toBe(contentOf(original).sha256);
  });
});
