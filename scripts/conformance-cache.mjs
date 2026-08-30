import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export function refreshRequested(value) {
  return value === "1" || value === "true";
}

export function pathOf(directory, corpus, name) {
  if (!name || name === "." || name === ".." || name !== basename(name)) {
    return undefined;
  }
  return join(directory, corpus, name);
}

export function read(path) {
  try {
    const bytes = new Uint8Array(readFileSync(path));
    // mkdir then writeFileSync is not one act, so an interrupted write leaves a
    // file of no bytes — and an empty Uint8Array is truthy.
    return bytes.length === 0 ? undefined : bytes;
  } catch {
    return undefined;
  }
}

/**
 * Whether fetched bytes may be held. An entry is written once and read by every
 * later run, and its key covers the corpus records rather than what upstream
 * serves, so bytes the record does not vouch for would outlive the run that
 * fetched them. No expectation means the record is being rewritten.
 */
export function matchesRecord(sha256, expected) {
  return expected === undefined || sha256 === expected;
}

export function write(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
