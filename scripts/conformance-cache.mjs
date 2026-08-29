// The copy of the corpus a CI run may keep between jobs, addressed by the
// directory `CONFORMANCE_CACHE` names. It is a byte source and never a verdict:
// what comes out of it is hashed against the record exactly as a fetched file
// is, so it cannot serve a file the record does not describe. See
// docs/adr/0013-cache-the-fetched-corpora-in-ci.md.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * A workflow renders a boolean input into the environment as the string
 * `false`, which is truthy wherever a string is.
 */
export function refreshRequested(value) {
  return value === "1" || value === "true";
}

/**
 * A corpus name is a key in a record file, so it addresses a path only while it
 * is a plain file name; anything else reaches outside the directory it was
 * given, and is left to the fetch instead. The corpora are kept apart because a
 * name is unique within one record rather than across both.
 */
export function pathOf(directory, corpus, name) {
  if (!name || name === "." || name === ".." || name !== basename(name)) {
    return undefined;
  }
  return join(directory, corpus, name);
}

/** The bytes held for an entry, or nothing at all when they cannot be read. */
export function read(path) {
  try {
    return new Uint8Array(readFileSync(path));
  } catch {
    return undefined;
  }
}

export function write(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
