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
    return new Uint8Array(readFileSync(path));
  } catch {
    return undefined;
  }
}

export function write(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
