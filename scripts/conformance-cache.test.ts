import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  matchesRecord,
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

  // write is mkdir then writeFileSync, so an interrupted one leaves a file of
  // no bytes. A zero-length Uint8Array is truthy, and the run failed on a hash
  // mismatch rather than fetching the file again.
  it("is a miss when an interrupted write left no bytes behind", () => {
    const path = pathOf(directory, "official", "empty.ged");
    write(path, new Uint8Array([0x30]));
    writeFileSync(path, "");
    expect(read(path)).toBeUndefined();
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

// An entry is written once and read on every later run, and its key is a hash
// of the corpus records rather than of what upstream serves. Cached bytes the
// record does not vouch for would be restored and fail identically until
// someone purged the cache by hand.
describe("matchesRecord", () => {
  it("holds bytes the record vouches for", () => {
    expect(matchesRecord("abc123", "abc123")).toBe(true);
  });

  it("refuses bytes that are not what was recorded", () => {
    expect(matchesRecord("truncated", "abc123")).toBe(false);
  });

  it("holds anything when the record is being rewritten", () => {
    expect(matchesRecord("whatever", undefined)).toBe(true);
  });
});

describe("a file that went through the cache", () => {
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
